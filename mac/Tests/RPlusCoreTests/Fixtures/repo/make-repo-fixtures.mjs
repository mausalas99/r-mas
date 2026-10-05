// Makes the data-layer parity fixtures (blobs, canonical JSON, audit chain, change log, patients).
// Run with Electron's Node (the app's real engine):
//   ELECTRON_RUN_AS_NODE=1 <Electron binary> make-repo-fixtures.mjs <path to better-sqlite3-multiple-ciphers>
// Synthetic data only. Swift tests in Repo*Tests.swift read these files and must match byte for byte.
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const lib = resolve(here, '../../../../../packages/core/lib');
const Database = createRequire(import.meta.url)(resolve(process.argv[2]));
const mod = (f) => import(join(lib, f));

const { applyMigrations } = await mod('db/schema.mjs');
const { canonicalStringify } = await mod('db/canonical-json.mjs');
const blobs = await mod('db/clinical-blobs.mjs');
const adapter = await mod('clinical-repo/adapters/blobs.mjs');

const out = (name, value) => writeFileSync(join(here, name), JSON.stringify(value, null, 1) + '\n');
const freshDb = (file) => {
  for (const s of ['', '-wal', '-shm']) rmSync(join(here, file) + s, { force: true });
  const db = new Database(join(here, file));
  db.pragma('journal_mode = DELETE');
  applyMigrations(db);
  return db;
};

// ---- slice 1: canonical JSON + blobs ----------------------------------------------------------
const canonicalInputs = [
  '{}', '[]', 'null', 'true', '"x"', '0', '-0', '1', '-1.5', '0.1', '100', '1e21', '1e-7', '1.5e300', '5e-324',
  '123456789012345680000', '0.000001', '1.2345e-7', '4503599627370496', '1e+21', '12e2',
  '{"b":1,"a":2,"c":{"z":1,"y":[3,{"q":1,"p":2}]}}',
  '{"b":1,"10":2,"2":3,"a":4,"01":5}',
  '{"é":1,"e":2,"z":3,"Z":4,"~":5,"\u{1F600}":6,"｡":7}',
  '{"a":1,"a":2,"b":3}',
  '{"s":"quote\\" slash\\\\ tab\\t nl\\n cr\\r bs\\b ff\\f ctl\\u0001\\u001f del\\u007f"}',
  '{"s":"\\u2028\\u2029 \\u00e9 \\ud83d\\ude00 / \\/"}',
  '{"nested":[[],{},[[]],[{"k":null}]],"n":null,"t":true,"f":false}',
  ' \n{ "sp" : [ 1 , 2 ] }\t',
  '{"patients":[{"id":"p2","cama":"12","nombre":"Paciente Sintético"},{"id":"p1","cama":"3"}]}',
];
out('canonical.json', canonicalInputs.map((input) => {
  const v = JSON.parse(input);
  return { input, stringify: JSON.stringify(v), canonical: canonicalStringify(v) };
}));
// Text that JSON.parse rejects. Swift must reject it too.
out('canonical-invalid.json', ['', '{', '[1,]', '{"a":1,}', "{'a':1}", '01', '1.', '.5', '+1', 'NaN', '"\n"', '{"a" 1}', '[1] x', 'nul']);

{
  const db = freshDb('blobs.db');
  const patients = [{ id: 'p1', nombre: 'Paciente Sintético Uno', cama: '10' }, { id: 'p2', nombre: 'Paciente Sintético Dos', cama: '11' }];
  const stamp = '2026-10-01T10:00:00.000Z';
  adapter.saveClinicalBlobValue(db, 'patients', patients, stamp);
  adapter.saveClinicalBlobValue(db, 'notes', { p2: { estado: 'estable' }, 10: 'n10', p1: { estado: 'delicado' }, 2: 'n2' }, stamp);
  adapter.saveClinicalBlobValue(db, 'indicaciones', { p1: { texto: 'dieta blanda' } }, stamp);
  blobs.upsertBlob(db, 'labHistory', 'not json', stamp); // corrupt text: loader must fall back
  blobs.upsertBlob(db, 'vpoByPatient', '[1,2]', stamp); // wrong shape: loader must fall back
  blobs.upsertBlob(db, 'medCatalog', '[{"n":"x"}]', stamp);
  blobs.upsertBlob(db, 'todos', '', stamp); // empty text
  blobs.upsertBlob(db, 'listadoProblemas', '{"p1":["a"]}', '2026-10-01T10:00:00.000Z');
  blobs.upsertBlob(db, 'notes', blobs.getBlob(db, 'notes'), '2026-10-02T11:00:00.000Z'); // upsert path
  blobs.upsertBlob(db, '__reg:77', '{"x":1}', stamp);
  blobs.deleteBlobs(db, ['__reg:77', '  ', 'nope']);
  const keys = ['patients', 'notes', 'indicaciones', 'labHistory', 'vpoByPatient', 'medCatalog', 'todos', 'listadoProblemas', 'absent'];
  out('blobs-expected.json', {
    loadAll: blobs.loadAllBlobs(db),
    updatedAt: Object.fromEntries(db.prepare("SELECT blob_key, updated_at FROM clinical_blob").all().map((r) => [r.blob_key, r.updated_at])),
    loaded: Object.fromEntries(keys.map((k) => [k, canonicalStringify(adapter.loadClinicalBlobValue(db, k))])),
  });
  db.close();
}

// ---- slice 2: forensic audit chain ------------------------------------------------------------
const audit = await mod('db/forensic-audit.mjs');
{
  // metaText undefined = no meta argument. Index-like keys and falsy values are the traps.
  const metas = [
    undefined, 'null', '{}', '0', '""', 'false', '7', '"str"', '[2,1]',
    '{"b":1,"a":[2,{"z":1,"y":2}]}', '{"10":1,"2":2,"x":3,"é":4}', '{"p":"Paciente Sintético","n":1.5e-7}',
  ];
  const events = metas.map((metaText, i) => ({
    clientId: `client-${i % 3}`, eventType: ['LOGIN', 'EXPORT', 'EDIT_NOTE'][i % 3], metaText,
    timestamp: `2026-10-0${1 + (i % 9)}T0${i % 10}:15:30.${String(100 + i)}Z`,
  }));
  const parse = (t) => (t === undefined ? undefined : JSON.parse(t));

  // Chain made by Node's own append function on a real DB (real clock).
  const db = freshDb('audit.db');
  db.transaction(() => {
    for (const e of events) audit.appendAuditInTransaction(db, { clientId: e.clientId, eventType: e.eventType, meta: parse(e.metaText) });
  })();
  const rows = db.prepare('SELECT * FROM forensic_audit_chain ORDER BY id').all();
  db.close();

  // Same chain with fixed timestamps, built with the pure functions: Swift's append must match.
  let prev = audit.GENESIS_PREVIOUS_HASH;
  const fixed = events.map((e, i) => {
    const row = { id: i + 1, timestamp: e.timestamp, client_id: e.clientId, event_type: e.eventType,
      payload_hash: audit.hashPayload(parse(e.metaText)), previous_hash: prev };
    row.current_hash = audit.computeBlockHash(row);
    prev = row.current_hash;
    return row;
  });
  const tamper = (fn) => fixed.map((r, i) => fn({ ...r }, i));
  out('audit-expected.json', {
    events,
    payloadHashes: events.map((e) => audit.hashPayload(parse(e.metaText))),
    nodeRows: rows,
    nodeVerify: audit.verifyChainRows(rows),
    fixed,
    verifyCases: [
      { name: 'intact', rows: fixed, expect: audit.verifyChainRows(fixed) },
      { name: 'empty', rows: [], expect: audit.verifyChainRows([]) },
      { name: 'payload edited', rows: tamper((r, i) => (i === 2 ? { ...r, payload_hash: 'f'.repeat(64) } : r)), expect: null },
      { name: 'link broken', rows: tamper((r, i) => (i === 4 ? { ...r, previous_hash: '1'.repeat(64) } : r)), expect: null },
      { name: 'bad genesis', rows: tamper((r, i) => (i === 0 ? { ...r, previous_hash: '1'.repeat(64) } : r)), expect: null },
      { name: 'event type edited', rows: tamper((r, i) => (i === 7 ? { ...r, event_type: 'DELETE' } : r)), expect: null },
    ].map((c) => ({ ...c, expect: audit.verifyChainRows(c.rows) })),
  });
}

// ---- slice 3: clinical change log -------------------------------------------------------------
const log = await mod('clinical-repo/change-log.mjs');
{
  const inputs = [
    { commandType: 'clinical.persistSnapshot', blobKeys: ['patients', 'notes'], patientId: null, actorId: 'u1', origin: 'ui' },
    { commandType: 'patient.upsert', blobKeys: ['patients'], patientId: 'p1', actorId: null, origin: '  lan  ' },
    { commandType: 'patient.delete', blobKeys: ['patients'], patientId: 'p2', actorId: 'u2', origin: '   ', registro: ' 12345 ' },
    { blobKeys: [], patientId: '', actorId: '' },
    { commandType: 'x', blobKeys: ['a"b', 'é', 'tab\t'], patientId: 'ñ', actorId: 'quote"', origin: 'nube', registro: '' },
    { commandType: 'patient.upsert', blobKeys: ['patients'], patientId: 'p3', actorId: 'u1' },
  ];
  const db = freshDb('changelog.db');
  const ids = inputs.map((r) => log.appendClinicalChangeLog(db, r));
  const stamped = log.markClinicalChangesSynced(db, [ids[1], ' ', 'nope', ids[1]], '2026-10-03T00:00:00.000Z');
  const again = log.markClinicalChangesSynced(db, [ids[1]], '2026-10-04T00:00:00.000Z');
  const listed = (opts) => log.listUnsyncedClinicalChanges(db, opts);
  const mask = (r) => ({ ...r, change_id: r.change_id.replace(/^chg_[0-9a-f]{32}$/, '<id>'), created_at: r.created_at.replace(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/, '<ts>') });
  out('changelog-expected.json', {
    inputs,
    // Table as Node left it, ids and times masked (they come from the clock and the UUID generator).
    masked: db.prepare('SELECT * FROM clinical_change_log ORDER BY id').all().map((r) => ({ ...mask(r), id: undefined })),
    stamped, again,
    rawIds: ids,
    list: {
      default: listed(100), zero: listed(0), negative: listed(-5), two: listed(2), huge: listed(9999),
      noArg: log.listUnsyncedClinicalChanges(db),
      byIds: listed({ changeIds: [ids[3], ids[0], ' ', ids[1]] }),
      byIdsWithLimit: listed({ changeIds: [ids[5]], limit: 1 }),
      emptyIds: listed({ changeIds: [], limit: 2 }),
    },
    parse: [
      ['["a","b"]', null], ['["a"," b ","","__reg:55","__reg:7"]', null], ['"[\\"x\\",\\"__reg:9\\"]"', null], ['"not json"', null],
      ['"  "', null], ['"{\\"a\\":1}"', null], ['{"a":1}', null], ['null', null], ['5', null], ['[1,0,null,"z",false]', null],
      ['"[\\"__reg:\\"]"', null],
    ].map(([rawText]) => {
      const raw = JSON.parse(rawText);
      return { rawText, expect: log.parseBlobKeysAndRegistro(raw) };
    }),
    registroKeys: [' 12 ', '', '  ', 'x'].map((r) => ({ registro: r, expect: log.registroBlobKey(r) })),
  });
  db.close();
}

// ---- slice 4: patients (census blob + commands) -----------------------------------------------
const repo = await mod('clinical-repo/index.mjs');
const assign = await mod('db/clinical-access-assignments.mjs');
{
  const db = freshDb('commands.db');
  const steps = [
    { cmd: { type: 'clinical.persistSnapshot', patients: [{ id: 'p1', nombre: 'Paciente Sintético Uno', cama: '10' }, { id: 'p2', cama: '11', nombre: 'Dos' }], notes: { p1: { estado: 'estable' }, p2: { estado: 'delicado' } }, indicaciones: { p1: { texto: 'dieta' } } }, meta: { actorId: 'u1', source: 'ui' } },
    { cmd: { type: 'clinical.persistSnapshot', patients: [{ id: 'p1', nombre: 'Paciente Sintético Uno', cama: '10' }, { id: 'p2', cama: '11', nombre: 'Dos' }] }, meta: { actorId: 'u1' } },
    { cmd: { type: 'patient.upsert', patient: { id: ' p3 ', nombre: 'Tres', cama: '12' } }, meta: { actorId: 'u9', source: 'lan' } },
    { cmd: { type: 'patient.upsert', patient: { cama: '99', id: 'p1', nombre: 'Uno editado', extra: { z: 1, a: 2 } } }, meta: {} },
    { cmd: { type: 'patient.upsert', patient: { id: 5, nombre: 'Numérico' } }, meta: { actorId: '', source: '  ' } },
    { cmd: { type: 'patient.upsert', patient: { nombre: 'sin id' } } },
    { cmd: { type: 'patient.upsert', patient: { id: null } } },
    { cmd: { type: 'patient.upsert', patient: { id: '   ' } } },
    { cmd: { type: 'patient.upsert', patient: null } },
    { cmd: { type: 'patient.upsert', patient: [] } },
    { cmd: { type: 'patient.upsert' } },
    { cmd: { type: 'patient.delete', patientId: 'p2', registro: '777' } },
    { cmd: { type: 'patient.delete', patientId: '' } },
    { cmd: { type: 'patient.delete', patientId: '   ', registro: '5' } },
    { cmd: { type: 'patient.delete', patientId: 5 } },
    { cmd: { type: 'patient.delete', patientId: 'nobody' }, meta: { actorId: 'u2' } },
    { cmd: { type: 'clinical.persistSnapshot', patients: null } },
    { cmd: { type: 'clinical.persistSnapshot', notes: [] } },
    { cmd: { type: 'clinical.persistSnapshot', notes: { p1: { estado: 'otro' } } }, meta: { source: 'nube' } },
    { cmd: { type: 'clinical.persistSnapshot' } },
    { cmd: { type: 'clinical.persistSnapshot', medCatalog: {} } },
    { cmd: { type: 'nope' } },
    { cmd: {} },
  ];
  const blob = (k) => blobs.getBlob(db, k);
  const results = steps.map(({ cmd, meta }) => {
    const r = repo.executeClinicalCommand(db, cmd, meta);
    return {
      cmdText: JSON.stringify(cmd), meta: meta ?? null,
      ok: r.ok, error: r.error ?? null, changedKeys: r.changedKeys ?? null, hasChangeId: !!r.changeId,
      patients: blob('patients'), notes: blob('notes'), indicaciones: blob('indicaciones'),
      logCount: db.prepare('SELECT count(*) AS n FROM clinical_change_log').get().n,
    };
  });
  const maskRow = (r) => ({ ...r, id: undefined, change_id: '<id>', created_at: '<ts>' });
  out('commands-expected.json', {
    results,
    log: db.prepare('SELECT * FROM clinical_change_log ORDER BY id').all().map(maskRow),
    patientsLoaded: canonicalStringify(adapter.loadClinicalBlobValue(db, 'patients')),
    censusIds: [...assign.loadCensusPatientIdSet(db)].sort(),
  });
  // Census edge cases: bad text, wrong shape, odd ids.
  const cases = ['not json', '{"a":1}', '[]', '[{"id":"a"},{"id":" b "},{"id":0},{"id":null},null,5,{"x":1},{"id":7}]', ''];
  out('census-expected.json', cases.map((raw) => {
    blobs.upsertBlob(db, 'patients', raw, '2026-10-01T00:00:00.000Z');
    return { raw, ids: [...assign.loadCensusPatientIdSet(db)].sort() };
  }));
  db.close();
}
{
  const db = freshDb('assignments.db');
  assign.ensureClinicalPatientRow(db, ' p1 ');
  assign.ensureClinicalPatientRow(db, 'p1');
  assign.ensureClinicalPatientRow(db, '  ');
  db.exec(`INSERT INTO teams (team_id, name, service, on_call_day_index) VALUES ('t1','Equipo 1','Sala',0), ('t2','Equipo 2','Sala',1)`);
  assign.assignPatientToTeam(db, { patientId: 'p1', teamId: 't1', effectiveAt: '2026-10-01T00:00:00.000Z' });
  assign.assignPatientToTeam(db, { patientId: 'p1', teamId: 't2', effectiveAt: '2026-10-03T00:00:00.000Z' });
  assign.assignPatientToTeam(db, { patientId: 'p1', teamId: '', effectiveAt: '2026-10-05T00:00:00.000Z' });
  assign.assignPatientToTeam(db, { patientId: 'p9', teamId: 't1', effectiveAt: '2026-10-02T00:00:00.000Z' });
  const nows = ['2026-09-30T00:00:00.000Z', '2026-10-01T00:00:00.000Z', '2026-10-04T00:00:00.000Z', '2026-10-06T00:00:00.000Z'];
  out('assignments-expected.json', {
    patientIds: db.prepare('SELECT id FROM patients ORDER BY id').all().map((r) => r.id),
    active: ['p1', 'p9', 'nobody', ' ', ' p1 '].flatMap((p) => nows.map((now) => ({ patientId: p, now, team: assign.fetchActivePatientTeamId(db, p, now) }))),
  });
  db.close();
}

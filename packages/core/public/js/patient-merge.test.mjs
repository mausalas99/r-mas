import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeAnteriores,
  withMergedAnteriores,
  mergePatientDocuments,
  editAnterior,
  deleteAnterior,
  liveAnteriores,
  mergePatientEntry,
  mergeLanPatientEntrySources,
  mergeLabHistorySets,
  entryMatchKey,
  filterEntriesByPatientDeletes,
  entryUpdatedAt,
  monitoreoUpdatedAt,
  mergeEventualidades,
  cloneEntry,
  stampDocUpdatedAt,
  incomingDocWinsLww,
} from './patient-merge.mjs';
import { emptyMonitoreo } from './features/estado-actual-data.mjs';

test('entryUpdatedAt incluye textoGuardado.savedAt de monitoreo', () => {
  const e = {
    patient: {
      id: 'p1',
      monitoreo: {
        historial: [],
        textoGuardado: { text: 'x', savedAt: '2026-05-20T12:00:00.000Z' },
      },
    },
    note: { fecha: '01/01/2026' },
    labHistory: [],
  };
  assert.equal(entryUpdatedAt(e), '2026-05-20T12:00:00.000Z');
});

test('entryUpdatedAt incluye el recordedAt m?s reciente del historial', () => {
  const e = {
    patient: {
      id: 'p1',
      monitoreo: {
        historial: [
          { id: '1', recordedAt: '2026-04-01T08:00:00.000Z' },
          { id: '2', recordedAt: '2026-05-21T10:00:00.000Z' },
        ],
        textoGuardado: { text: '', savedAt: '2026-05-01T00:00:00.000Z' },
      },
    },
    note: {},
    labHistory: [],
  };
  assert.equal(entryUpdatedAt(e), '2026-05-21T10:00:00.000Z');
});

test('monitoreoUpdatedAt incluye estadoClinicoUpdatedAt', () => {
  assert.equal(
    monitoreoUpdatedAt({
      estadoClinicoUpdatedAt: '2026-08-03T12:00:00.000Z',
      historial: [{ id: '1', recordedAt: '2026-08-03T10:00:00.000Z' }],
      textoGuardado: { text: '', savedAt: '2026-08-03T11:00:00.000Z' },
    }),
    '2026-08-03T12:00:00.000Z'
  );
});

test('monitoreoUpdatedAt combina historial y texto guardado', () => {
  assert.equal(
    monitoreoUpdatedAt({
      historial: [{ id: '1', recordedAt: '2026-01-01T00:00:00.000Z' }],
      textoGuardado: { text: 'x', savedAt: '2026-06-01T00:00:00.000Z' },
    }),
    '2026-06-01T00:00:00.000Z'
  );
});

test('monitoreoUpdatedAt usa el recordedAt más reciente del historial (no el primero)', () => {
  assert.equal(
    monitoreoUpdatedAt({
      historial: [
        { id: '1', recordedAt: '2026-08-05T08:00:00.000Z' },
        { id: '2', recordedAt: '2026-08-05T10:00:00.000Z' },
        { id: '3', recordedAt: '2026-08-05T12:00:00.000Z' },
      ],
    }),
    '2026-08-05T12:00:00.000Z'
  );
});

test('monitoreoUpdatedAt historial gana a textoGuardado más viejo', () => {
  assert.equal(
    monitoreoUpdatedAt({
      historial: [
        { id: '1', recordedAt: '2026-08-05T08:00:00.000Z' },
        { id: '2', recordedAt: '2026-08-05T14:00:00.000Z' },
      ],
      textoGuardado: { text: 'x', savedAt: '2026-08-05T09:00:00.000Z' },
    }),
    '2026-08-05T14:00:00.000Z'
  );
});

test('monitoreoUpdatedAt usa savedAt (no recordedAt) para el reloj de sync — recordedAt es hora clínica editable y empata fácil entre registros rápidos', () => {
  assert.equal(
    monitoreoUpdatedAt({
      historial: [
        // Same clinical minute (user-picked recordedAt) on both rows — only the
        // real save-time savedAt distinguishes which one is actually newer.
        { id: '1', recordedAt: '2026-08-05T08:00:00.000Z', savedAt: '2026-08-05T08:00:12.331Z' },
        { id: '2', recordedAt: '2026-08-05T08:00:00.000Z', savedAt: '2026-08-05T08:00:47.902Z' },
      ],
    }),
    '2026-08-05T08:00:47.902Z'
  );
});

test('mergePatientEntry conserva medPharmProfile m?s reciente', () => {
  const older = {
    patient: { id: 'p', registro: 'R' },
    note: { fecha: '01/01/2026' },
    labHistory: [],
    medPharmProfile: {
      months: {
        '2026-05': { lastSomePasteAt: '2026-05-01T00:00:00.000Z', rows: [{ rowKey: 'a' }] },
      },
    },
  };
  const newer = {
    patient: { id: 'p', registro: 'R' },
    note: { fecha: '10/01/2026' },
    labHistory: [],
    medPharmProfile: {
      months: {
        '2026-05': { lastSomePasteAt: '2026-06-01T00:00:00.000Z', rows: [{ rowKey: 'b' }] },
      },
    },
  };
  const merged = mergePatientEntry(older, newer);
  assert.equal(merged.medPharmProfile.months['2026-05'].rows[0].rowKey, 'b');
});

test('mergePatientEntry fusiona monitoreo con mergeMonitoreo si ambos tienen carga', () => {
  const longHist = {
    historial: [
      { id: 'x', recordedAt: '2026-01-02T00:00:00.000Z', vitals: { fc: '90' } },
      { id: 'y', recordedAt: '2026-01-03T00:00:00.000Z', vitals: { fc: '100' } },
    ],
    textoGuardado: { text: '', savedAt: null },
  };
  const shortHist = {
    historial: [{ id: 'z', recordedAt: '2026-01-04T00:00:00.000Z', vitals: { fc: '110' } }],
    textoGuardado: { text: '', savedAt: null },
  };
  const newerNote = {
    patient: { id: 'p', registro: 'R', nombre: 'X', monitoreo: shortHist },
    note: { fecha: '10/01/2026' },
    labHistory: [],
  };
  const olderNote = {
    patient: { id: 'p', registro: 'R', nombre: 'X', monitoreo: longHist },
    note: { fecha: '01/01/2026' },
    labHistory: [],
  };
  const m = mergePatientEntry(olderNote, newerNote);
  assert.equal(m.patient.monitoreo.historial.length, 3);
  assert.equal(m.patient.monitoreo.historial[0].id, 'x');
  assert.equal(m.patient.monitoreo.historial[2].id, 'z');
});

test('mergePatientEntry conserva solo el monitoreo del lado que tiene datos', () => {
  const withText = {
    patient: {
      id: 'p',
      registro: 'R',
      monitoreo: {
        historial: [],
        textoGuardado: { text: 'solo ac?', savedAt: '2026-02-01T00:00:00.000Z' },
      },
    },
    note: { fecha: '05/01/2026' },
    labHistory: [],
  };
  const emptyMon = {
    patient: {
      id: 'p',
      registro: 'R',
      monitoreo: { historial: [], textoGuardado: { text: '', savedAt: null } },
    },
    note: { fecha: '01/01/2026' },
    labHistory: [],
  };
  const m = mergePatientEntry(emptyMon, withText);
  assert.equal(m.patient.monitoreo.textoGuardado.text, 'solo ac?');
});

test('mergePatientEntry conserva monitoreo local solo con estado cl?nico general', () => {
  const localMon = emptyMonitoreo();
  localMon.estadoClinico.four = '15';
  const withEc = {
    patient: { id: 'p', registro: 'R', monitoreo: localMon },
    note: { fecha: '05/01/2026' },
    labHistory: [],
  };
  const withoutMon = {
    patient: { id: 'p', registro: 'R' },
    note: { fecha: '01/01/2026' },
    labHistory: [],
  };
  const m = mergePatientEntry(withoutMon, withEc);
  assert.equal(m.patient.monitoreo.estadoClinico.four, '15');
});

test('cloneEntry copia monitoreo en profundidad', () => {
  const inner = {
    historial: [{ id: 'h1', recordedAt: '2026-01-01T00:00:00.000Z' }],
    textoGuardado: { text: 't', savedAt: null },
  };
  const e = {
    patient: { id: 'p1', registro: 'x', monitoreo: inner },
    note: {},
    labHistory: [],
  };
  const c = cloneEntry(e);
  c.patient.monitoreo.historial.push({ id: 'h2', recordedAt: '2026-01-02T00:00:00.000Z' });
  assert.equal(e.patient.monitoreo.historial.length, 1);
});

test('entryMatchKey usa registro cuando existe', () => {
  assert.equal(entryMatchKey({ patient: { id: 'a', registro: '123' } }), 'reg:123');
  assert.equal(entryMatchKey({ patient: { id: 'a', registro: '' } }), 'id:a');
});

test('mergeLanPatientEntrySources une pacientes distintos sin borrar', () => {
  const merged = mergeLanPatientEntrySources([
    { entries: [{ patient: { id: 'p1', registro: 'A', nombre: 'UNO' }, note: { fecha: '01/01/2026' }, labHistory: [] }] },
    { entries: [{ patient: { id: 'p2', registro: 'B', nombre: 'DOS' }, note: { fecha: '02/01/2026' }, labHistory: [] }] },
  ]);
  assert.equal(merged.length, 2);
});

test('mergePatientEntry combina labHistory por id', () => {
  const a = {
    patient: { id: 'p1', registro: 'X', nombre: 'A' },
    note: {},
    labHistory: [{ id: '1', fecha: '01/01/2026', resLabs: ['Hb 10'] }],
  };
  const b = {
    patient: { id: 'p1', registro: 'X', nombre: 'A' },
    note: {},
    labHistory: [{ id: '2', fecha: '02/01/2026', resLabs: ['Hb 12'] }],
  };
  const m = mergePatientEntry(a, b);
  assert.equal(m.labHistory.length, 2);
});

test('mergeLabHistorySets gana el set m?s reciente con mismo id', () => {
  const out = mergeLabHistorySets(
    [{ id: '100', fecha: '01/01/2026', resLabs: ['viejo'] }],
    [{ id: '100', fecha: '10/01/2026', resLabs: ['nuevo'] }]
  );
  assert.equal(out.length, 1);
  assert.match(String(out[0].resLabs), /nuevo/);
});

test('mergeLabHistorySets keeps SOME sourceText over newer parsed-only Nube', () => {
  const some =
    'Expediente: 1\nNombre: Ana\nFecha Registro: 13/08/2026 08:00\nHEMATOLOGÍA\n';
  const out = mergeLabHistorySets(
    [
      {
        id: '100',
        fecha: '13/08/2026',
        hora: '08:00',
        sourceText: some,
        resLabs: ['QS\tK 3.1*'],
        updatedAt: '2026-08-13T08:00:00.000Z',
      },
    ],
    [
      {
        id: '100',
        fecha: '13/08/2026',
        hora: '08:00',
        resLabs: ['QS\tK 9.9*'],
        updatedAt: '2026-08-13T09:00:00.000Z',
      },
    ]
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].sourceText, some);
  assert.match(String(out[0].resLabs), /K 3\.1/);
});

test('mergeLabHistorySets drops Nube clones with the same analyte values', () => {
  const out = mergeLabHistorySets(
    [{ id: 'local', fecha: '13/08/2026', hora: '11:40', resLabs: ['COAG\tTP 12.9 TTP 39.3* INR 1.1'] }],
    [{ id: 'nube', fecha: '13/08/2026', hora: '11:41', resLabs: ['COAG TP 12.9 TTP 39.3* INR 1.1'] }]
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'local');
});

test('mergePatientEntry fusiona pendientes por id', () => {
  const a = {
    patient: { id: 'p1', registro: 'R1' },
    todos: [{ id: 't1', text: 'viejo', updatedAt: '2026-01-01T00:00:00Z' }],
  };
  const b = {
    patient: { id: 'p1', registro: 'R1' },
    todos: [{ id: 't1', text: 'nuevo', updatedAt: '2026-01-15T00:00:00Z' }],
  };
  const m = mergePatientEntry(a, b);
  assert.equal(m.todos.length, 1);
  assert.equal(m.todos[0].text, 'nuevo');
});

test('mismo registro fusiona nota m?s reciente', () => {
  const merged = mergeLanPatientEntrySources([
    {
      entries: [
        {
          patient: { id: 'local', registro: 'R1', nombre: 'PAC' },
          note: { fecha: '01/01/2026', evolucion: 'vieja' },
          labHistory: [],
        },
      ],
    },
    {
      entries: [
        {
          patient: { id: 'remote', registro: 'R1', nombre: 'PAC' },
          note: { fecha: '15/01/2026', evolucion: 'nueva' },
          labHistory: [],
        },
      ],
    },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].note.evolucion, 'nueva');
});

test('filterEntriesByPatientDeletes quita entrada aunque el host sea m?s reciente', () => {
  const entries = [
    {
      patient: { id: 'p1', registro: 'R1', nombre: 'PAC', lanUpdatedAt: '2026-06-06T20:00:00.000Z' },
      note: { fecha: '01/01/2026' },
      labHistory: [],
    },
  ];
  const filtered = filterEntriesByPatientDeletes(entries, [
    {
      id: 'p1',
      registro: 'R1',
      updatedAt: '2026-06-06T12:00:00.000Z',
      deleted: true,
    },
  ]);
  assert.equal(filtered.length, 0);
});

test('filterEntriesByPatientDeletes quita entrada si delete es m?s reciente', () => {
  const entries = [
    {
      patient: { id: 'p1', registro: 'R1', nombre: 'PAC', lanUpdatedAt: '2026-05-16T08:00:00.000Z' },
      note: { fecha: '01/01/2026' },
      labHistory: [],
    },
  ];
  const filtered = filterEntriesByPatientDeletes(entries, [
    {
      id: 'p1',
      registro: 'R1',
      updatedAt: '2026-05-16T12:00:00.000Z',
      deleted: true,
    },
  ]);
  assert.equal(filtered.length, 0);
});

test('filterEntriesByPatientDeletes conserva readmisi?n con mismo registro e id distinto', () => {
  const entries = [
    {
      patient: { id: 'p-new', registro: 'R1', nombre: 'READMIT', lanUpdatedAt: '2026-06-10T08:00:00.000Z' },
      note: { fecha: '10/06/2026' },
      labHistory: [],
    },
  ];
  const filtered = filterEntriesByPatientDeletes(entries, [
    {
      id: 'p-old',
      registro: 'R1',
      updatedAt: '2026-06-01T12:00:00.000Z',
      deleted: true,
    },
  ]);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].patient.id, 'p-new');
});

test('mergeEventualidades une entradas de ambos lados por id', () => {
  const merged = mergeEventualidades(
    { entries: [{ id: 'ev_a', at: '2026-06-01T10:00:00.000Z', text: 'A' }] },
    { entries: [{ id: 'ev_b', at: '2026-06-02T10:00:00.000Z', text: 'B' }] }
  );
  assert.equal(merged.entries.length, 2);
});

test('mergeEventualidades respeta deletedIds y no resurrecta', () => {
  const merged = mergeEventualidades(
    {
      entries: [{ id: 'ev_b', at: '2026-06-02T10:00:00.000Z', text: 'B' }],
      deletedIds: { ev_a: '2026-06-03T12:00:00.000Z' },
      updatedAt: '2026-06-03T12:00:00.000Z',
    },
    {
      entries: [
        { id: 'ev_a', at: '2026-06-01T10:00:00.000Z', text: 'A' },
        { id: 'ev_b', at: '2026-06-02T10:00:00.000Z', text: 'B' },
      ],
    }
  );
  assert.equal(merged.entries.length, 1);
  assert.equal(merged.entries[0].id, 'ev_b');
  assert.equal(merged.deletedIds.ev_a, '2026-06-03T12:00:00.000Z');
});

test('mergeEventualidades conserva labsText no vacío', () => {
  const merged = mergeEventualidades(
    { entries: [], labsText: 'BH Hb 9' },
    { entries: [{ id: 'ev_b', at: '2026-06-02T10:00:00.000Z', text: 'B' }], labsText: '' }
  );
  assert.equal(merged.entries.length, 1);
  assert.equal(merged.labsText, 'BH Hb 9');
  const both = mergeEventualidades(
    { entries: [], labsText: 'BH' },
    { entries: [], labsText: 'BH + QS gluc 120' }
  );
  assert.equal(both.labsText, 'BH + QS gluc 120');
});

test('mergePatientEntry conserva eventualidades de ambos peers', () => {
  const a = {
    patient: {
      id: 'p1',
      registro: 'R1',
      eventualidades: { entries: [{ id: 'ev_a', at: '2026-06-01T10:00:00.000Z', text: 'A' }] },
    },
    note: { fecha: '01/06/2026' },
    labHistory: [],
  };
  const b = {
    patient: {
      id: 'p1',
      registro: 'R1',
      eventualidades: { entries: [{ id: 'ev_b', at: '2026-06-02T10:00:00.000Z', text: 'B' }] },
    },
    note: { fecha: '02/06/2026' },
    labHistory: [],
  };
  const m = mergePatientEntry(a, b);
  assert.equal(m.patient.eventualidades.entries.length, 2);
});

test('mergePatientEntry conserva diagnósticos del peer más reciente', () => {
  const stale = {
    patient: {
      id: 'p1',
      registro: 'R1',
      nombre: 'PAC',
      lanUpdatedAt: '2026-06-01T10:00:00.000Z',
    },
    note: {},
    labHistory: [],
  };
  const withDx = {
    patient: {
      id: 'p1',
      registro: 'R1',
      nombre: 'PAC',
      lanUpdatedAt: '2026-06-02T12:00:00.000Z',
      diagnosticosList: ['DM2', 'IRC', ''],
      diagnosticosText: '1. DM2\n2. IRC',
      censoMedsText: 'MEROPENEM',
    },
    note: {},
    labHistory: [],
  };
  const m = mergePatientEntry(stale, withDx);
  assert.deepEqual(
    (m.patient.diagnosticosList || []).filter(Boolean),
    ['DM2', 'IRC']
  );
  assert.match(String(m.patient.diagnosticosText || ''), /DM2/);
  assert.equal(m.patient.censoMedsText, 'MEROPENEM');
});

test('mergePatientEntry no borra diagnósticos locales si el peer reciente viene vacío', () => {
  const localDx = {
    patient: {
      id: 'p1',
      registro: 'R1',
      lanUpdatedAt: '2026-06-01T10:00:00.000Z',
      diagnosticosList: ['NEUMONÍA', ''],
      diagnosticosText: '1. NEUMONÍA',
    },
    note: {},
    labHistory: [],
  };
  const peerEmpty = {
    patient: {
      id: 'p1',
      registro: 'R1',
      lanUpdatedAt: '2026-06-03T08:00:00.000Z',
      nombre: 'PAC ACTUALIZADO',
      diagnosticosList: [''],
    },
    note: {},
    labHistory: [],
  };
  const m = mergePatientEntry(localDx, peerEmpty);
  assert.equal(m.patient.nombre, 'PAC ACTUALIZADO');
  assert.deepEqual(
    (m.patient.diagnosticosList || []).filter(Boolean),
    ['NEUMONÍA']
  );
});

test('stampDocUpdatedAt: two saves in a row give strictly increasing clocks', () => {
  const doc = {};
  stampDocUpdatedAt(doc);
  const first = doc.updatedAt;
  stampDocUpdatedAt(doc);
  assert.ok(doc.updatedAt > first);
  doc.updatedAt = new Date(Date.now() + 60_000).toISOString(); // clock skew: stamp still moves forward
  const skewed = doc.updatedAt;
  stampDocUpdatedAt(doc);
  assert.ok(doc.updatedAt > skewed);
});

test('incomingDocWinsLww: newer or equal wins, older loses, a missing clock keeps the old replace', () => {
  const a = { updatedAt: '2026-09-29T10:00:00.000Z' };
  assert.equal(incomingDocWinsLww(a, { updatedAt: '2026-09-29T11:00:00.000Z' }), true);
  assert.equal(incomingDocWinsLww(a, { updatedAt: '2026-09-29T10:00:00.000Z' }), true);
  assert.equal(incomingDocWinsLww(a, { updatedAt: '2026-09-29T09:00:00.000Z' }), false);
  assert.equal(incomingDocWinsLww({}, { updatedAt: '2026-09-29T09:00:00.000Z' }), true);
  assert.equal(incomingDocWinsLww(a, {}), true);
});

// ── Anteriores (past copies of exports) ──
const snap = (fecha, guardada, evolucion = '') => ({ fecha, guardada, evolucion });

test('union on fecha, newest guardada wins per fecha, newest first', () => {
  const a = [snap('02/10/2026', '2026-10-02T10:00:00.000Z', 'A-viejo'), snap('01/10/2026', '2026-10-01T09:00:00.000Z')];
  const b = [snap('02/10/2026', '2026-10-02T12:00:00.000Z', 'B-nuevo'), snap('30/09/2026', '2026-09-30T08:00:00.000Z')];
  const out = mergeAnteriores(a, b);
  assert.deepEqual(out.map((s) => s.fecha), ['02/10/2026', '01/10/2026', '30/09/2026']);
  assert.equal(out[0].evolucion, 'B-nuevo');
});

test('caps at 30 and keeps the newest', () => {
  const many = Array.from({ length: 40 }, (_, i) =>
    snap(`d${i}`, new Date(Date.UTC(2026, 0, 1 + i)).toISOString())
  );
  const out = mergeAnteriores(many.slice(0, 20), many.slice(20));
  assert.equal(out.length, 30);
  assert.equal(out[0].fecha, 'd39');
  assert.equal(out[29].fecha, 'd10');
});

test('a snapshot without fecha is keyed by the day of guardada', () => {
  const out = mergeAnteriores([snap('', '2026-10-02T10:00:00.000Z', 'x')], [snap('', '2026-10-02T11:00:00.000Z', 'y')]);
  assert.equal(out.length, 1);
  assert.equal(out[0].evolucion, 'y');
});

test('partial or older payload never erases local anteriores', () => {
  const local = { updatedAt: '2026-10-02T12:00:00.000Z', anteriores: [snap('02/10/2026', '2026-10-02T12:00:00.000Z')] };
  assert.equal(withMergedAnteriores(local, { updatedAt: '2026-10-01T00:00:00.000Z' }).anteriores.length, 1);
  assert.equal(withMergedAnteriores(local, { updatedAt: '2026-10-03T00:00:00.000Z', anteriores: [] }).anteriores.length, 1);
  assert.equal(withMergedAnteriores(local, null).anteriores.length, 1);
});

test('incoming winner keeps copies only the local side has', () => {
  const local = { updatedAt: '2026-10-01T00:00:00.000Z', evolucion: 'local', anteriores: [snap('01/10/2026', '2026-10-01T00:00:00.000Z')] };
  const incoming = { updatedAt: '2026-10-03T00:00:00.000Z', evolucion: 'remoto', anteriores: [snap('03/10/2026', '2026-10-03T00:00:00.000Z')] };
  const out = withMergedAnteriores(incoming, local);
  assert.equal(out.evolucion, 'remoto');
  assert.deepEqual(out.anteriores.map((s) => s.fecha), ['03/10/2026', '01/10/2026']);
});

test('no anteriores on either side adds none (no key churn)', () => {
  const doc = { updatedAt: 'x', evolucion: 'a' };
  assert.equal(withMergedAnteriores(doc, { evolucion: 'b' }), doc);
});

test('patient merge keeps anteriores from both nota copies', () => {
  const a = { note: { updatedAt: '2026-10-01T00:00:00.000Z', anteriores: [snap('01/10/2026', '2026-10-01T00:00:00.000Z')] }, indicaciones: {} };
  const b = { note: { updatedAt: '2026-10-03T00:00:00.000Z', anteriores: [snap('03/10/2026', '2026-10-03T00:00:00.000Z')] }, indicaciones: {} };
  const out = mergePatientDocuments(a, b);
  assert.deepEqual(out.note.anteriores.map((s) => s.fecha), ['03/10/2026', '01/10/2026']);
});

test('edit keeps fecha, moves guardada forward, and beats the other device\'s older copy', () => {
  const old = snap('02/10/2026', '2026-10-02T10:00:00.000Z', 'viejo');
  const doc = { anteriores: [old] };
  assert.equal(editAnterior(doc, '02/10/2026', { evolucion: 'corregido' }), true);
  assert.equal(doc.anteriores[0].evolucion, 'corregido');
  assert.equal(doc.anteriores[0].fecha, '02/10/2026');
  assert.ok(doc.anteriores[0].guardada > old.guardada);
  const merged = mergeAnteriores(doc.anteriores, [old]);
  assert.equal(merged[0].evolucion, 'corregido');
});

test('delete leaves a tombstone: hidden here, and the other device\'s older copy stays dead after a union', () => {
  const old = snap('02/10/2026', '2026-10-02T10:00:00.000Z', 'x');
  const doc = { anteriores: [old, snap('01/10/2026', '2026-10-01T10:00:00.000Z')] };
  assert.equal(deleteAnterior(doc, '02/10/2026'), true);
  assert.deepEqual(liveAnteriores(doc).map((s) => s.fecha), ['01/10/2026']);
  const merged = { anteriores: mergeAnteriores(doc.anteriores, [old]) };
  assert.deepEqual(liveAnteriores(merged).map((s) => s.fecha), ['01/10/2026']);
});

test('a new export on a deleted day brings the copy back', () => {
  const doc = { anteriores: [snap('02/10/2026', '2026-10-02T10:00:00.000Z')] };
  deleteAnterior(doc, '02/10/2026');
  const fresh = snap('02/10/2026', new Date(Date.now() + 5000).toISOString(), 'nuevo');
  doc.anteriores = mergeAnteriores([fresh], doc.anteriores);
  assert.equal(liveAnteriores(doc)[0].evolucion, 'nuevo');
});

test('edit or delete of an unknown key changes nothing', () => {
  const doc = { anteriores: [snap('02/10/2026', '2026-10-02T10:00:00.000Z')] };
  assert.equal(editAnterior(doc, 'nope', { evolucion: 'x' }), false);
  assert.equal(deleteAnterior(doc, 'nope'), false);
  assert.equal(liveAnteriores({}).length, 0);
});

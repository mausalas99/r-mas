import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  getPatients,
  getLabHistory,
  getNotes,
  getIndicaciones,
  getVpoByPatient,
  getListadoProblemas,
  getMedPharmProfileByPatient,
} from '../../app-state.mjs';
import { encodePersistSnapshotOps } from '../../../../lib/clinical-repo/sync/op-encoder-persist.mjs';
import { applyOps, emptyState } from '../../../../cloud/sync-worker/src/lww.js';
import { cloudStateToLanEntries, opsToLanEntries } from '../cloud-sync/pull-apply-state.mjs';
import {
  getLabHistoryRevision,
  resetLabHistoryCacheForTests,
} from '../../lab-history-cache.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import {
  applyLanPatientEntries,
  isPlaceholderPatientName,
  configurePatientEntries,
} from './patient-entries.mjs';

describe('applyLanPatientEntries on Nube path', () => {
  /** @type {typeof patients} */
  let patientsBefore;

  beforeEach(() => {
    patientsBefore = getPatients().slice();
    getPatients().length = 0;
    configurePatientEntries({
      ensureUniquePatientName(name) {
        return String(name || 'PACIENTE');
      },
      applyImportEntry(entry) {
        return String(entry?.patient?.id || 'imported-id');
      },
      findPatientByRegistro() {
        return null;
      },
    });
  });

  afterEach(() => {
    getPatients().length = 0;
    getPatients().push(...patientsBefore);
    resetLabHistoryCacheForTests();
  });

  it('applies cloud census without configurePatientEntries wiring', () => {
    assert.doesNotThrow(function () {
      const result = applyLanPatientEntries(
        [
          {
            patient: {
              id: 'cloud-p1',
              nombre: 'PACIENTE NUBE',
              registro: '12345',
            },
            note: {},
            indicaciones: {},
            labHistory: [],
          },
        ],
        { skipTeamScopeFilter: true }
      );
      assert.equal(result.added, 1);
    });
    assert.equal(getPatients().length, 1);
    assert.equal(getPatients()[0].nombre, 'PACIENTE NUBE');
  });

  it('same-time eventualidad on two devices: the one that lost the room LWW re-stamps the union so it gets re-pushed', () => {
    const mine = { id: 'ev-a', at: '2026-09-25T10:00:00.000Z', text: 'DEMO DESDE A' };
    const theirs = { id: 'ev-b', at: '2026-09-25T10:00:01.000Z', text: 'DEMO DESDE B' };
    getPatients().push({ id: 'e1', eventualidades: { entries: [mine], updatedAt: '2026-09-25T10:00:00.000Z' } });
    const incoming = { entries: [theirs], updatedAt: '2026-09-25T10:00:01.000Z' };
    applyLanPatientEntries([{ patient: { id: 'e1', eventualidades: incoming } }], { skipTeamScopeFilter: true });
    const ev = getPatients()[0].eventualidades;
    assert.deepEqual(ev.entries.map((e) => e.id).sort(), ['ev-a', 'ev-b']);
    assert.ok(ev.updatedAt > incoming.updatedAt, 'union must carry a newer clock than the room copy');
  });

  it('eventualidades equal to the room copy keep the room clock (no re-push ping-pong)', () => {
    const row = { id: 'ev-a', at: '2026-09-25T10:00:00.000Z', text: 'DEMO' };
    getPatients().push({ id: 'e2', eventualidades: { entries: [row], updatedAt: '2026-09-25T10:00:00.000Z' } });
    applyLanPatientEntries(
      [{ patient: { id: 'e2', eventualidades: { entries: [row], updatedAt: '2026-09-25T10:00:00.000Z' } } }],
      { skipTeamScopeFilter: true }
    );
    assert.equal(getPatients()[0].eventualidades.updatedAt, '2026-09-25T10:00:00.000Z');
  });

  it('same-time estado actual med on two devices: local category kept and the clock moves past the room copy', () => {
    getPatients().push({
      id: 'm1',
      monitoreo: { estadoClinico: { abx: 'DEMO ABX A' }, manualMeds: { abx: ['DEMO ABX A'] }, estadoClinicoUpdatedAt: '2026-09-25T10:00:00.000Z' },
    });
    const incoming = { estadoClinico: { analgesia: 'DEMO ANALGESIA B' }, manualMeds: { analgesia: ['DEMO ANALGESIA B'] }, estadoClinicoUpdatedAt: '2026-09-25T10:00:01.000Z' };
    applyLanPatientEntries([{ patient: { id: 'm1', monitoreo: incoming } }], { skipTeamScopeFilter: true });
    const mon = getPatients()[0].monitoreo;
    assert.deepEqual(mon.manualMeds.abx, ['DEMO ABX A']);
    assert.deepEqual(mon.manualMeds.analgesia, ['DEMO ANALGESIA B']);
    assert.ok(mon.estadoClinicoUpdatedAt > incoming.estadoClinicoUpdatedAt);
  });

  it('keeps a newer local key when a peer blob is newer only from an unrelated touch', () => {
    getPatients().push({
      id: 'k1',
      diagnosticosList: ['DX-A', ''],
      lanUpdatedAt: '2026-09-23T10:00:00.000Z',
      fieldClocks: { diagnosticosList: '2026-09-23T10:00:00.000Z' },
    });
    applyLanPatientEntries(
      [
        {
          patient: {
            id: 'k1',
            diagnosticosList: ['DX-B', ''],
            lanUpdatedAt: '2026-09-23T11:00:00.000Z',
            fieldClocks: { diagnosticosList: '2026-09-23T09:00:00.000Z' },
          },
        },
      ],
      { skipTeamScopeFilter: true }
    );
    const p = getPatients()[0];
    assert.deepEqual(p.diagnosticosList, ['DX-A', '']);
    // Re-push stamp: blob clock moves past the peer's so the merged blob wins next.
    assert.ok(p.lanUpdatedAt > '2026-09-23T11:00:00.000Z');
  });

  it('takes a newer peer key, even a cleared one, by key clock', () => {
    getPatients().push({
      id: 'k2',
      diagnosticosList: ['DX-A', ''],
      lanUpdatedAt: '2026-09-23T12:00:00.000Z',
      fieldClocks: { diagnosticosList: '2026-09-23T08:00:00.000Z' },
    });
    applyLanPatientEntries(
      [
        {
          patient: {
            id: 'k2',
            diagnosticosList: [''],
            lanUpdatedAt: '2026-09-23T10:00:00.000Z',
            fieldClocks: { diagnosticosList: '2026-09-23T10:00:00.000Z' },
          },
        },
      ],
      { skipTeamScopeFilter: true }
    );
    const p = getPatients()[0];
    assert.deepEqual(p.diagnosticosList, ['']);
    assert.equal(p.fieldClocks.diagnosticosList, '2026-09-23T10:00:00.000Z');
  });

  it('a partial ops-fold entry with no note key must not wipe an existing note', () => {
    getPatients().push({ id: 'p-note', nombre: 'ANA', registro: '9', lanUpdatedAt: '2026-08-06T10:00:00.000Z' });
    getNotes()['p-note'] = { texto: 'Manejo actual: continuar antibiótico' };
    getIndicaciones()['p-note'] = { texto: 'Dieta blanda' };
    try {
      // Only cuarto/cama changed this poll — the fold never saw a note/indicaciones op for this pid.
      applyLanPatientEntries(
        [{ patient: { id: 'p-note', registro: '9', cuarto: '204' } }],
        { skipTeamScopeFilter: true }
      );
      assert.equal(getNotes()['p-note'].texto, 'Manejo actual: continuar antibiótico');
      assert.equal(getIndicaciones()['p-note'].texto, 'Dieta blanda');
    } finally {
      delete getNotes()['p-note'];
      delete getIndicaciones()['p-note'];
    }
  });

  it('VPO, problem list and drug profile ride desktop A → Worker → desktop B, and a fields-only poll keeps them', () => {
    const vpo = { texto: 'Riesgo quirúrgico ASA II', updatedAt: '2026-09-26T09:00:00.000Z' };
    const listado = { items: [{ id: 'pr1', texto: 'HAS' }], updatedAt: '2026-09-26T09:01:00.000Z' };
    const pharm = { alergias: 'Penicilina', updatedAt: '2026-09-26T09:02:00.000Z' };
    // Desktop A saves the three maps → projector ops.
    const ops = encodePersistSnapshotOps({
      commandType: 'clinical.persistSnapshot',
      blobKeys: ['patients', 'vpoByPatient', 'listadoProblemas', 'medPharmProfileByPatient'],
      blobs: {
        patients: [{ id: 'p-rt', nombre: 'DEMO RT', registro: '777', lanUpdatedAt: '2026-09-26T08:00:00.000Z' }],
        vpoByPatient: { 'p-rt': vpo },
        listadoProblemas: { 'p-rt': listado },
        medPharmProfileByPatient: { 'p-rt': pharm },
      },
      actorId: 'dev-a',
      fallbackUpdatedAt: '2026-09-26T09:05:00.000Z',
    });
    // Worker accepts every op (no unsupported_path).
    const { state, rejected } = applyOps(emptyState(), ops);
    assert.deepEqual(rejected, []);
    try {
      // Desktop B full-state pull adds the patient with all three.
      applyLanPatientEntries(cloudStateToLanEntries(state), { skipTeamScopeFilter: true });
      assert.deepEqual(getVpoByPatient()['p-rt'], vpo);
      assert.deepEqual(getListadoProblemas()['p-rt'], listado);
      assert.deepEqual(getMedPharmProfileByPatient()['p-rt'], pharm);
      // Peer edits the VPO → ops-mode pull updates it on B.
      const vpo2 = { texto: 'Riesgo quirúrgico ASA III', updatedAt: '2026-09-26T10:00:00.000Z' };
      applyLanPatientEntries(
        opsToLanEntries([{ path: 'entries/p-rt/vpo', value: vpo2, updatedAt: vpo2.updatedAt, actorId: 'dev-a' }]),
        { skipTeamScopeFilter: true }
      );
      assert.deepEqual(getVpoByPatient()['p-rt'], vpo2);
      // A later poll that only moved the bed must not wipe any of them.
      applyLanPatientEntries(
        opsToLanEntries([
          { path: 'entries/p-rt/fields', value: { registro: '777', cama: '12' }, updatedAt: '2026-09-26T11:00:00.000Z', actorId: 'dev-a' },
        ]),
        { skipTeamScopeFilter: true }
      );
      assert.deepEqual(getVpoByPatient()['p-rt'], vpo2);
      assert.deepEqual(getListadoProblemas()['p-rt'], listado);
      assert.deepEqual(getMedPharmProfileByPatient()['p-rt'], pharm);
    } finally {
      delete getVpoByPatient()['p-rt'];
      delete getListadoProblemas()['p-rt'];
      delete getMedPharmProfileByPatient()['p-rt'];
      delete getNotes()['p-rt'];
      delete getIndicaciones()['p-rt'];
      delete getLabHistory()['p-rt'];
    }
  });

  it('isPlaceholderPatientName detects default admit labels', () => {
    assert.equal(isPlaceholderPatientName('PACIENTE SIN NOMBRE'), true);
    assert.equal(isPlaceholderPatientName('cynthia'), false);
    assert.equal(isPlaceholderPatientName(''), true);
    assert.equal(isPlaceholderPatientName('SIN NOMBRE (3)'), true);
    assert.equal(isPlaceholderPatientName('SIN NOMBRE (COPIA)'), true);
    assert.equal(isPlaceholderPatientName('cynthia (2)'), false);
  });

  it('does not let PACIENTE SIN NOMBRE overwrite CYNTHIA when remote clock is newer', () => {
    getPatients().push({
      id: 'p-cynthia',
      nombre: 'CYNTHIA',
      registro: '1',
      lanUpdatedAt: '2026-08-06T10:00:00.000Z',
    });
    const result = applyLanPatientEntries(
      [
        {
          patient: {
            id: 'p-cynthia',
            nombre: 'PACIENTE SIN NOMBRE',
            registro: '1',
            lanUpdatedAt: '2026-08-06T18:00:00.000Z',
          },
          note: {},
          indicaciones: {},
          labHistory: [],
        },
      ],
      { skipTeamScopeFilter: true }
    );
    assert.equal(result.updated, 1);
    assert.equal(getPatients()[0].nombre, 'CYNTHIA');
  });

  it('takes newer remote Datos fields: sala and ingreso dates', () => {
    getPatients().push({
      id: 'p-datos',
      nombre: 'ANA',
      registro: '7',
      sala: 'A',
      fiuxFecha: '01/09/2026',
      lanUpdatedAt: '2026-09-20T10:00:00.000Z',
    });
    applyLanPatientEntries(
      [
        {
          patient: {
            id: 'p-datos',
            nombre: 'ANA',
            registro: '7',
            sala: 'B',
            fiuxFecha: '02/09/2026',
            fimiFecha: '03/09/2026',
            lanUpdatedAt: '2026-09-20T12:00:00.000Z',
          },
        },
      ],
      { skipTeamScopeFilter: true }
    );
    const p = getPatients()[0];
    assert.equal(p.sala, 'B');
    assert.equal(p.fiuxFecha, '02/09/2026');
    assert.equal(p.fimiFecha, '03/09/2026');
  });

  it('a peer Datos edit wins by its own key clock even when the local patient clock is newer', () => {
    getPatients().push({
      id: 'p-key',
      nombre: 'ANA',
      registro: '8',
      fiuxFecha: '01/09/2026',
      cama: '2',
      lanUpdatedAt: '2026-09-20T12:00:00.000Z',
      fieldClocks: { cama: '2026-09-20T12:00:00.000Z' },
    });
    applyLanPatientEntries(
      [
        {
          patient: {
            id: 'p-key',
            nombre: 'ANA',
            registro: '8',
            fiuxFecha: '02/09/2026',
            cama: '1',
            lanUpdatedAt: '2026-09-20T11:00:00.000Z',
            fieldClocks: { fiuxFecha: '2026-09-20T11:00:00.000Z', cama: '2026-09-20T09:00:00.000Z' },
          },
        },
      ],
      { skipTeamScopeFilter: true }
    );
    const p = getPatients()[0];
    assert.equal(p.fiuxFecha, '02/09/2026');
    assert.equal(p.cama, '2');
  });

  it('accepts a real remote name when local is still the placeholder', () => {
    getPatients().push({
      id: 'p-cynthia',
      nombre: 'PACIENTE SIN NOMBRE',
      registro: '1',
      lanUpdatedAt: '2026-08-06T18:00:00.000Z',
    });
    applyLanPatientEntries(
      [
        {
          patient: {
            id: 'p-cynthia',
            nombre: 'CYNTHIA LOPEZ',
            registro: '1',
            lanUpdatedAt: '2026-08-06T10:00:00.000Z',
          },
          note: {},
          indicaciones: {},
          labHistory: [],
        },
      ],
      { skipTeamScopeFilter: true }
    );
    assert.equal(getPatients()[0].nombre, 'CYNTHIA LOPEZ');
  });

  it('does not let older remote diagnoses overwrite newer local ones', () => {
    getPatients().push({
      id: 'p-dx',
      nombre: 'CYNTHIA',
      registro: '7',
      diagnosticosList: ['CHOQUE SÉPTICO', ''],
      diagnosticosText: '1. CHOQUE SÉPTICO',
      lanUpdatedAt: '2026-08-14T18:00:00.000Z',
    });
    applyLanPatientEntries(
      [
        {
          patient: {
            id: 'p-dx',
            nombre: 'CYNTHIA',
            registro: '7',
            diagnosticosList: ['NAC', ''],
            diagnosticosText: '1. NAC',
            lanUpdatedAt: '2026-08-14T10:00:00.000Z',
          },
          note: {},
          indicaciones: {},
          labHistory: [],
        },
      ],
      { skipTeamScopeFilter: true }
    );
    assert.deepEqual(
      (getPatients()[0].diagnosticosList || []).filter(Boolean),
      ['CHOQUE SÉPTICO']
    );
  });

  it('takes remote diagnoses when the remote clock is newer', () => {
    getPatients().push({
      id: 'p-dx',
      nombre: 'CYNTHIA',
      registro: '7',
      diagnosticosList: ['CHOQUE SÉPTICO', ''],
      diagnosticosText: '1. CHOQUE SÉPTICO',
      lanUpdatedAt: '2026-08-14T10:00:00.000Z',
    });
    applyLanPatientEntries(
      [
        {
          patient: {
            id: 'p-dx',
            nombre: 'CYNTHIA',
            registro: '7',
            diagnosticosList: ['NAC', ''],
            diagnosticosText: '1. NAC',
            lanUpdatedAt: '2026-08-14T18:00:00.000Z',
          },
          note: {},
          indicaciones: {},
          labHistory: [],
        },
      ],
      { skipTeamScopeFilter: true }
    );
    assert.deepEqual((getPatients()[0].diagnosticosList || []).filter(Boolean), ['NAC']);
  });

  it('bumps lab history revision when Nube labs land on an existing patient', () => {
    resetLabHistoryCacheForTests();
    getPatients().push({
      id: 'p-labs',
      nombre: 'HIPOLITO',
      registro: '9',
    });
    getLabHistory()['p-labs'] = [];
    const before = getLabHistoryRevision('p-labs');
    applyLanPatientEntries(
      [
        {
          patient: { id: 'p-labs', nombre: 'HIPOLITO', registro: '9' },
          note: {},
          indicaciones: {},
          labHistory: [
            {
              id: 's1',
              fecha: '13/08/2026',
              hora: '08:00',
              resLabs: ['QS\tK 3.1*'],
            },
          ],
        },
      ],
      { skipTeamScopeFilter: true }
    );
    assert.ok(getLabHistoryRevision('p-labs') > before);
    assert.equal(getLabHistory()['p-labs'].length, 1);
  });
});

describe('applyLanPatientEntries team-scope filter on iPad mirror', () => {
  const prevUser = clinicalSessionContext.user;
  const prevScope = clinicalSessionContext.scopeContext;
  const prevMobile = globalThis.__RPC_MOBILE_WEB__;

  beforeEach(() => {
    globalThis.__RPC_MOBILE_WEB__ = true;
    clinicalSessionContext.user = { user_id: 'r1' };
    clinicalSessionContext.scopeContext = {
      teams: [
        {
          team_id: 't-mine',
          service: 'Sala',
          sala: 'Sala 1',
          members: [{ user_id: 'r1' }],
        },
      ],
      assignments: [],
      guardias: [],
      now: '2026-06-02T12:00:00.000Z',
    };
    clinicalSessionContext.guardiasMap = new Map();
  });

  afterEach(() => {
    clinicalSessionContext.user = prevUser;
    clinicalSessionContext.scopeContext = prevScope;
    clinicalSessionContext.guardiasMap = new Map();
    if (prevMobile) globalThis.__RPC_MOBILE_WEB__ = prevMobile;
    else delete globalThis.__RPC_MOBILE_WEB__;
  });

  it('adds a brand-new patient even though its team assignment has not synced yet', () => {
    const result = applyLanPatientEntries(
      [
        {
          patient: {
            id: 'p-brand-new',
            nombre: 'RECIEN ADMITIDO',
            registro: '77',
            servicio: 'Onco',
            sala: 'Sala 9',
          },
          note: {},
          indicaciones: {},
          labHistory: [],
        },
      ],
      {}
    );
    assert.equal(result.added, 1);
    const added = getPatients().find((p) => p.id === 'p-brand-new');
    assert.ok(added);
    assert.ok(added.lanUpdatedAt);
  });

  it('still hides a foreign patient the iPad already knows about', () => {
    getPatients().push({
      id: 'p-foreign',
      nombre: 'AJENO',
      registro: '78',
      servicio: 'Onco',
      sala: 'Sala 9',
    });
    const result = applyLanPatientEntries(
      [
        {
          patient: {
            id: 'p-foreign',
            nombre: 'AJENO ACTUALIZADO',
            registro: '78',
            servicio: 'Onco',
            sala: 'Sala 9',
          },
          note: {},
          indicaciones: {},
          labHistory: [],
        },
      ],
      {}
    );
    assert.equal(result.updated, 0);
    assert.equal(getPatients().find((p) => p.id === 'p-foreign').nombre, 'AJENO');
  });
});

describe('applyLanPatientEntries UI persist', () => {
  it('debounces SQLCipher persist and does not remount lab/EA panels', () => {
    const text = readFileSync(fileURLToPath(new URL('./patient-entries.mjs', import.meta.url)), 'utf8');
    const applyStart = text.indexOf('export function applyLanPatientEntries');
    const applyFn = text.slice(applyStart, applyStart + 900);
    assert.match(applyFn, /persistClinicalState\(\{ domains: \['patients'\] \}\)/);
    assert.match(applyFn, /scheduleIdleClinicalPersist/);
    assert.doesNotMatch(applyFn, /persistClinicalState\(\{ immediate: true \}\)/);
    const refreshStart = text.indexOf('function refreshLanPatientUiAfterApply');
    const refreshEnd = text.indexOf('export function applyLanPatientEntries');
    const refresh = text.slice(refreshStart, refreshEnd);
    assert.match(refresh, /renderPatientListLanSilent/);
    assert.doesNotMatch(refresh, /renderLabHistoryPanel/);
    assert.doesNotMatch(refresh, /syncHeavy/);
  });
});

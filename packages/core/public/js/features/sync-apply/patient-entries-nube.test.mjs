import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getPatients } from '../../app-state.mjs';
import { resetLabHistoryCacheForTests } from '../../lab-history-cache.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { applyLanPatientEntries, configurePatientEntries } from './patient-entries.mjs';

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

  it('room copy that never absorbs our extras: the second pull does not re-stamp the clock (no 12 s re-push loop)', () => {
    getPatients().push({
      id: 'loop1',
      monitoreo: { estadoClinico: { abx: 'DEMO ABX A' }, manualMeds: { abx: ['DEMO ABX A'] }, estadoClinicoUpdatedAt: '2026-09-25T10:00:00.000Z' },
    });
    const incoming = () => ({ estadoClinico: { analgesia: 'DEMO B' }, manualMeds: { analgesia: ['DEMO B'] }, estadoClinicoUpdatedAt: '2026-09-25T10:00:01.000Z' });
    applyLanPatientEntries([{ patient: { id: 'loop1', monitoreo: incoming() } }], { skipTeamScopeFilter: true });
    const first = getPatients()[0].monitoreo.estadoClinicoUpdatedAt;
    for (const t0 = Date.now(); Date.now() - t0 < 5; ); // a re-stamp must show as a different ms
    applyLanPatientEntries([{ patient: { id: 'loop1', monitoreo: incoming() } }], { skipTeamScopeFilter: true });
    assert.equal(getPatients()[0].monitoreo.estadoClinicoUpdatedAt, first);
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

});


import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

let store = {};
const mockStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});

const prevWindow = globalThis.window;
globalThis.window = { localStorage: mockStorage };

const appState = await import('./app-state.mjs');
const {
  persistClinicalState,
  flushPersistClinicalState,
  resetPersistClinicalStateForTests,
} = await import('./clinical-repo-persist.mjs');
const {
  getNotes,
  getPatients,
  resetClinicalReadModelForTests,
} = await import('./clinical-read-model.mjs');

describe('clinical-repo-persist', () => {
  let commands;

  beforeEach(() => {
    store = {};
    commands = [];
    resetPersistClinicalStateForTests();
    resetClinicalReadModelForTests();
    appState.setSaveStateHooks({ before: null, after: null, onSaveResult: null });
    appState.setPatients([]);
    appState.setNotes({});
    appState.setIndicaciones({});
    appState.setLabHistory({});
    appState.setMedRecetaByPatient({});
    appState.setMedPharmProfileByPatient({});
    appState.setRecetaHuByPatient({});
    globalThis.window = {
      localStorage: mockStorage,
      electronAPI: {
        dbClinicalCommand: async (payload) => {
          commands.push(payload);
          const cmd = payload.command || {};
          const base = {
            ok: true,
            changedKeys: ['patients', 'notes'],
            changeId: 'chg_persist',
          };
          if (payload?.meta?.echoSnapshot === false) return base;
          return {
            ...base,
            patients: cmd.patients,
            notes: cmd.notes,
            indicaciones: cmd.indicaciones,
            labHistory: cmd.labHistory,
            medRecetaByPatient: cmd.medRecetaByPatient,
            medPharmProfileByPatient: cmd.medPharmProfileByPatient,
            recetaHuByPatient: cmd.recetaHuByPatient,
            listadoProblemas: cmd.listadoProblemas,
            vpoByPatient: cmd.vpoByPatient,
          };
        },
      },
    };
  });

  afterEach(() => {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
  });

  it('persistClinicalState sends clinical.persistSnapshot via IPC', async () => {
    appState.setPatients([{ id: 'p1', nombre: 'Ana' }]);
    appState.setNotes({ p1: { estudios: 'rx' } });
    const res = await persistClinicalState({ immediate: true, source: 'ui-test' });
    assert.equal(res.ok, true);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].command.type, 'clinical.persistSnapshot');
    assert.equal(commands[0].meta.source, 'ui-test');
    assert.equal(commands[0].meta.echoSnapshot, false);
    assert.equal(commands[0].command.patients[0].id, 'p1');
    assert.equal(commands[0].command.notes.p1.estudios, 'rx');
  });

  it('persistClinicalState domains sends only those snapshot keys', async () => {
    appState.setPatients([{ id: 'p1', nombre: 'Ana' }]);
    appState.setNotes({ p1: { estudios: 'rx' } });
    appState.setLabHistory({ p1: [{ id: 'l1' }] });
    const res = await persistClinicalState({
      immediate: true,
      source: 'domains-test',
      domains: ['patients'],
    });
    assert.equal(res.ok, true);
    assert.ok(commands[0].command.patients);
    assert.equal(commands[0].command.notes, undefined);
    assert.equal(commands[0].command.labHistory, undefined);
  });

  it('persistClinicalState does not echo snapshot blobs into the read model', async () => {
    appState.setPatients([{ id: 'p1', nombre: 'Ana' }]);
    appState.setNotes({ p1: 'nota' });
    await persistClinicalState({ immediate: true });
    assert.equal(commands[0].meta.echoSnapshot, false);
    assert.equal(getPatients().length, 0);
    assert.deepEqual(getNotes(), {});
  });

  it('persistClinicalState does not require isClinicalRepoPersistEnabled', async () => {
    const { setClinicalRepoPersistEnabled } = await import('./clinical-repo-flag.mjs');
    setClinicalRepoPersistEnabled(false);
    appState.setPatients([{ id: 'p2', nombre: 'Luis' }]);
    const res = await persistClinicalState({ immediate: true });
    assert.equal(res.ok, true);
    assert.equal(commands[0].command.type, 'clinical.persistSnapshot');
  });

  it('persistClinicalState returns ok:false on IPC failure without throwing', async () => {
    globalThis.window.electronAPI.dbClinicalCommand = async () => ({
      ok: false,
      error: 'persist_failed',
    });
    appState.setPatients([{ id: 'p1' }]);
    const res = await persistClinicalState({ immediate: true });
    assert.equal(res.ok, false);
    assert.match(String(res.error || ''), /persist_failed/);
  });

  it('without IPC applies snapshot to read model (web memory path)', async () => {
    globalThis.window = { localStorage: mockStorage };
    appState.setPatients([{ id: 'p3', nombre: 'Web' }]);
    appState.setNotes({ p3: 'mem' });
    const res = await persistClinicalState({ immediate: true });
    assert.equal(res.ok, true);
    assert.equal(getPatients()[0].id, 'p3');
    assert.equal(getNotes('p3'), 'mem');
  });

  it('runs before/after hooks', async () => {
    const order = [];
    appState.setSaveStateHooks({
      before() {
        order.push('before');
      },
      after() {
        order.push('after');
      },
    });
    appState.setPatients([{ id: 'p1' }]);
    await persistClinicalState({ immediate: true });
    assert.deepEqual(order, ['before', 'after']);
  });

  it('flushPersistClinicalState re-runs after in-flight persist', async () => {
    let release;
    let calls = 0;
    globalThis.window.electronAPI.dbClinicalCommand = async (payload) => {
      calls += 1;
      if (calls === 1) {
        await new Promise((resolve) => {
          release = resolve;
        });
      }
      const cmd = payload.command || {};
      return {
        ok: true,
        changedKeys: ['patients'],
        changeId: 'chg_' + calls,
        patients: cmd.patients,
      };
    };
    appState.setPatients([{ id: 'p1', nombre: 'A' }]);
    const first = persistClinicalState({ immediate: true });
    appState.setPatients([{ id: 'p1', nombre: 'B' }]);
    const flushed = flushPersistClinicalState();
    assert.equal(typeof release, 'function');
    release();
    await Promise.all([first, flushed]);
    assert.ok(calls >= 2);
  });

  it('overlapping immediate persists coalesce; final snapshot has latest mutation', async () => {
    let release;
    let calls = 0;
    const persistedNombres = [];
    globalThis.window.electronAPI.dbClinicalCommand = async (payload) => {
      calls += 1;
      const cmd = payload.command || {};
      const nombre = Array.isArray(cmd.patients) && cmd.patients[0] ? cmd.patients[0].nombre : null;
      persistedNombres.push(nombre);
      if (calls === 1) {
        await new Promise((resolve) => {
          release = resolve;
        });
      }
      return {
        ok: true,
        changedKeys: ['patients'],
        changeId: 'chg_' + calls,
        patients: cmd.patients,
      };
    };
    appState.setPatients([{ id: 'p1', nombre: 'A' }]);
    const first = persistClinicalState({ immediate: true, source: 'overlap-1' });
    appState.setPatients([{ id: 'p1', nombre: 'B' }]);
    const second = persistClinicalState({ immediate: true, source: 'overlap-2' });
    appState.setPatients([{ id: 'p1', nombre: 'C' }]);
    const third = persistClinicalState({ immediate: true, source: 'overlap-3' });
    assert.equal(typeof release, 'function');
    release();
    const results = await Promise.all([first, second, third]);
    assert.ok(results.every((r) => r && r.ok === true));
    // First in-flight used A; one coalesced follow-up re-snapshots at start → C (not B).
    assert.equal(calls, 2);
    assert.equal(persistedNombres[0], 'A');
    assert.equal(persistedNombres[persistedNombres.length - 1], 'C');
  });

  it('non-immediate persistClinicalState debounces (~400ms) and snapshots latest', async () => {
    const { mock } = await import('node:test');
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    try {
      let calls = 0;
      const persistedNombres = [];
      globalThis.window.electronAPI.dbClinicalCommand = async (payload) => {
        calls += 1;
        const cmd = payload.command || {};
        const nombre = Array.isArray(cmd.patients) && cmd.patients[0] ? cmd.patients[0].nombre : null;
        persistedNombres.push(nombre);
        return {
          ok: true,
          changedKeys: ['patients'],
          changeId: 'chg_deb_' + calls,
          patients: cmd.patients,
        };
      };
      appState.setPatients([{ id: 'p1', nombre: 'A' }]);
      const p1 = persistClinicalState({ source: 'deb-1' });
      appState.setPatients([{ id: 'p1', nombre: 'B' }]);
      const p2 = persistClinicalState({ source: 'deb-2' });
      assert.equal(calls, 0);
      mock.timers.tick(399);
      assert.equal(calls, 0);
      mock.timers.tick(1);
      await Promise.all([p1, p2]);
      assert.equal(calls, 1);
      assert.equal(persistedNombres[0], 'B');
    } finally {
      mock.timers.reset();
    }
  });
});

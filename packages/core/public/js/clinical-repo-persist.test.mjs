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
  resetPersistClinicalStateForTests,
  scheduleIdleClinicalPersist,
} = await import('./clinical-repo-persist.mjs');
const { cancelDeferredIdleWork } = await import('./deferred-work.mjs');
const {
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

  it('a patients-only persist inside the debounce window keeps a pending full save (sync pull during a receta save)', async () => {
    appState.setPatients([{ id: 'p1', nombre: 'Ana' }]);
    appState.setNotes({ p1: { estudios: 'rx' } });
    const full = persistClinicalState();
    const partial = persistClinicalState({ domains: ['patients'] });
    await Promise.all([full, partial]);
    assert.equal(commands.length, 1);
    assert.ok(commands[0].command.patients);
    assert.equal(commands[0].command.notes.p1.estudios, 'rx');
  });

  it('the idle full save survives a tab / patient switch (was: cancelled, and its flag stayed stuck, so synced receta never reached disk)', async () => {
    const { mock } = await import('node:test');
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    try {
      appState.setPatients([{ id: 'p1', nombre: 'Ana' }]);
      appState.setMedRecetaByPatient({ p1: { items: [{ id: 'm1' }] } });
      scheduleIdleClinicalPersist();
      cancelDeferredIdleWork();
      mock.timers.tick(8000);
      mock.timers.tick(400);
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(commands.length, 1);
      assert.equal(commands[0].command.medRecetaByPatient.p1.items[0].id, 'm1');
    } finally {
      mock.timers.reset();
    }
  });
});

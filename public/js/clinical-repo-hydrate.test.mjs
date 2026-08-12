import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  hydrateClinicalRepoIntoReadModel,
  canHydrateClinicalRepoFromDb,
} from './clinical-repo-hydrate.mjs';
import {
  getPatients,
  getNotes,
  getIndicaciones,
  getLabHistory,
  getMedRecetaByPatient,
  getMedPharmProfileByPatient,
  getRecetaHuByPatient,
  getListadoProblemas,
  getVpoByPatient,
  subscribeClinicalReadModel,
  resetClinicalReadModelForTests,
} from './clinical-read-model.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('clinical-repo-hydrate', () => {
  const prev = globalThis.window;

  beforeEach(() => {
    resetClinicalReadModelForTests();
    globalThis.window = { electronAPI: {} };
  });

  afterEach(() => {
    if (prev === undefined) delete globalThis.window;
    else globalThis.window = prev;
  });

  it('canHydrateClinicalRepoFromDb detects dbClinicalLoadAll', () => {
    assert.equal(canHydrateClinicalRepoFromDb(), false);
    globalThis.window.electronAPI.dbClinicalLoadAll = async () => ({ ok: true, blobs: {} });
    assert.equal(canHydrateClinicalRepoFromDb(), true);
  });

  it('loads blobs via dbClinicalLoadAll and applies into read model', async () => {
    let source = null;
    subscribeClinicalReadModel((detail) => {
      source = detail && detail.source;
    });
    globalThis.window.electronAPI.dbClinicalLoadAll = async () => ({
      ok: true,
      blobs: {
        patients: JSON.stringify([{ id: 'p1', nombre: 'Ana' }]),
        notes: JSON.stringify({ p1: 'nota db' }),
        indicaciones: JSON.stringify({ p1: 'ind db' }),
        labHistory: JSON.stringify({ p1: [{ id: 'lab1' }] }),
        medRecetaByPatient: JSON.stringify({ p1: { meds: 1 } }),
        medPharmProfileByPatient: JSON.stringify({ p1: { pharm: 1 } }),
        recetaHuByPatient: JSON.stringify({ p1: { hu: 1 } }),
        listadoProblemas: JSON.stringify({ p1: { problemas: [] } }),
        vpoByPatient: JSON.stringify({ p1: { v: 1 } }),
      },
    });

    const res = await hydrateClinicalRepoIntoReadModel();
    assert.equal(res.ok, true);
    assert.equal(res.source, 'db');
    assert.equal(source, 'hydrate');
    assert.equal(getPatients()[0]?.nombre, 'Ana');
    assert.equal(getNotes('p1'), 'nota db');
    assert.equal(getIndicaciones('p1'), 'ind db');
    assert.equal(getLabHistory('p1')[0]?.id, 'lab1');
    assert.deepEqual(getMedRecetaByPatient('p1'), { meds: 1 });
    assert.deepEqual(getMedPharmProfileByPatient('p1'), { pharm: 1 });
    assert.deepEqual(getRecetaHuByPatient('p1'), { hu: 1 });
    assert.deepEqual(getListadoProblemas('p1'), { problemas: [] });
    assert.deepEqual(getVpoByPatient('p1'), { v: 1 });
  });

  it('falls back to storage clinical getters when DB IPC missing', async () => {
    globalThis.window = {
      electronAPI: {},
      __clinicalRepoHydrateStorage: {
        getPatients: () => [{ id: 'p2', nombre: 'Luis' }],
        getNotes: () => ({ p2: 'from-storage' }),
        getIndicaciones: () => ({ p2: 'ind' }),
        getLabHistory: () => ({ p2: [] }),
        getMedRecetaByPatient: () => ({}),
        getMedPharmProfileByPatient: () => ({}),
        getRecetaHuByPatient: () => ({}),
        getListadoProblemas: () => ({}),
        getVpoByPatient: () => ({}),
      },
    };
    const res = await hydrateClinicalRepoIntoReadModel({
      storage: globalThis.window.__clinicalRepoHydrateStorage,
    });
    assert.equal(res.ok, true);
    assert.equal(res.source, 'storage');
    assert.equal(getPatients()[0]?.nombre, 'Luis');
    assert.equal(getNotes('p2'), 'from-storage');
  });

  it('returns error when neither DB nor storage available', async () => {
    globalThis.window = {};
    const res = await hydrateClinicalRepoIntoReadModel();
    assert.equal(res.ok, false);
    assert.ok(res.error);
  });

  it('bootHydrateFromDb is the single hydrate wire (no boot-graph static)', () => {
    const appStateSrc = readFileSync(join(__dirname, 'app-state.mjs'), 'utf8');
    assert.match(appStateSrc, /clinical-repo-hydrate\.mjs/);
    assert.match(appStateSrc, /import\(['"]\.\/clinical-repo-hydrate\.mjs['"]\)/);
    assert.doesNotMatch(appStateSrc, /^import .+clinical-repo-hydrate/m);

    const unlockSrc = readFileSync(join(__dirname, 'features/db-unlock-completion.mjs'), 'utf8');
    assert.match(unlockSrc, /bootHydrateFromDb/);
    assert.doesNotMatch(unlockSrc, /clinical-repo-hydrate/);

    const appJs = readFileSync(join(__dirname, 'app.js'), 'utf8');
    const runtimes = readFileSync(join(__dirname, 'app-runtimes.mjs'), 'utf8');
    const shell = readFileSync(join(__dirname, 'app-shell.mjs'), 'utf8');
    for (const src of [appJs, runtimes, shell]) {
      assert.doesNotMatch(src, /clinical-repo-hydrate/);
      assert.doesNotMatch(src, /clinical-read-model/);
    }
  });
});

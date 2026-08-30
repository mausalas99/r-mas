import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setArchivedSectionCollapsed } from './patients-list.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const listSrc = readFileSync(join(dir, 'patients-list.mjs'), 'utf8');
const runtimesSrc = readFileSync(join(dir, '../app-runtimes.mjs'), 'utf8');

describe('patient list filter startup', () => {
  it('does not persist a full snapshot when defaulting archived/pinned', () => {
    const start = listSrc.indexOf('function ensurePatientUiState');
    const end = listSrc.indexOf('function isArchivedSectionCollapsed');
    assert.ok(start >= 0 && end > start);
    const fn = listSrc.slice(start, end);
    assert.doesNotMatch(fn, /persistClinicalState/);
    assert.match(fn, /p\.archived = false/);
    assert.match(fn, /p\.pinned = false/);
  });

  it('defers Filtros chrome after a silent census render', () => {
    const start = listSrc.indexOf('function renderPatientListNow');
    assert.ok(start >= 0);
    const fn = listSrc.slice(start, start + 900);
    assert.match(fn, /scheduleCensusFiltersBarSync/);
    assert.match(listSrc, /requestIdleCallback/);
    assert.match(fn, /syncClinicalCensusFiltersBar\(\)/);
  });

  it('census apply path asks for a silent list render', () => {
    const start = runtimesSrc.indexOf('renderPatientListLanSilent');
    assert.ok(start >= 0);
    const fn = runtimesSrc.slice(start, start + 220);
    assert.match(fn, /silent:\s*true/);
  });

  it('refreshes ronda nav ids after a FIJADOS drag reorder', () => {
    const start = listSrc.indexOf('function handlePatientSortZoneEnd');
    const end = listSrc.indexOf('function mountPatientListSortables');
    assert.ok(start >= 0 && end > start);
    const fn = listSrc.slice(start, end);
    assert.match(fn, /syncPatientsOrderFromDom\(\)/);
    assert.match(fn, /setLastRondaNavIds\(buildRondaNavIds\(zones\)\)/);
  });

  it('logs console.warn when setArchivedSectionCollapsed exceeds quota', () => {
    let store = {};
    const prev = globalThis.localStorage;
    
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    };

    let warned = null;
    const prevWarn = console.warn;
    console.warn = (msg, err) => { warned = { msg, err }; };
    globalThis.localStorage.setItem = () => {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    };
    try {
      setArchivedSectionCollapsed(true);
    } finally {
      console.warn = prevWarn;
      if (prev) globalThis.localStorage = prev;
    }
    assert.ok(warned, 'console.warn should be called on quota error');
    assert.match(warned.msg, /failed to write rpc-archived-section-collapsed/);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  readGuardiaSala,
  writeGuardiaSala,
  clearGuardiaSala,
  isGuardiaInitialLoadDone,
  markGuardiaInitialLoadDone,
} from './guardia-board-state.mjs';

function fakeStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };
}

describe('guardia sala declaration', () => {
  it('reads back what was written', () => {
    const storage = fakeStorage();
    writeGuardiaSala('Sala 2', storage);
    assert.equal(readGuardiaSala(storage), 'Sala 2');
  });

  it('returns empty when nothing declared', () => {
    assert.equal(readGuardiaSala(fakeStorage()), '');
  });

  it('expires after 24h', () => {
    const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const storage = fakeStorage({
      'guardia.sala': JSON.stringify({ sala: 'Sala 1', at: stale }),
    });
    assert.equal(readGuardiaSala(storage), '');
  });

  it('is still valid just under 24h', () => {
    const recent = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
    const storage = fakeStorage({
      'guardia.sala': JSON.stringify({ sala: 'Sala 1', at: recent }),
    });
    assert.equal(readGuardiaSala(storage), 'Sala 1');
  });

  it('clearGuardiaSala removes the declaration', () => {
    const storage = fakeStorage();
    writeGuardiaSala('Sala E', storage);
    clearGuardiaSala(storage);
    assert.equal(readGuardiaSala(storage), '');
  });

  it('ignores malformed stored value', () => {
    const storage = fakeStorage({ 'guardia.sala': 'not-json' });
    assert.equal(readGuardiaSala(storage), '');
  });
});

describe('guardia initial load flag', () => {
  it('starts false, then stays true once marked done', () => {
    assert.equal(isGuardiaInitialLoadDone(), false);
    markGuardiaInitialLoadDone();
    assert.equal(isGuardiaInitialLoadDone(), true);
    markGuardiaInitialLoadDone();
    assert.equal(isGuardiaInitialLoadDone(), true);
  });
});

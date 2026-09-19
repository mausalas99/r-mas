import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getCachedLabVerify, setCachedLabVerify } from './lab-verify-cache.mjs';

describe('lab-verify-cache', () => {
  const prev = globalThis.localStorage;

  beforeEach(() => {
    globalThis.localStorage = {
      store: {},
      getItem(key) {
        return this.store[key] ?? null;
      },
      setItem(key, value) {
        this.store[key] = String(value);
      },
      removeItem(key) {
        delete this.store[key];
      },
    };
  });

  afterEach(() => {
    if (prev) globalThis.localStorage = prev;
    else delete globalThis.localStorage;
  });

  it('returns null for a patient never checked', () => {
    assert.equal(getCachedLabVerify('p1'), null);
  });

  it('round-trips a check result, stamped with checkedAt', () => {
    setCachedLabVerify('p1', true, '2026-09-01 10:00');
    const cached = getCachedLabVerify('p1');
    assert.equal(cached.hasStudies, true);
    assert.equal(cached.lastFechaSolicitud, '2026-09-01 10:00');
    assert.ok(Number.isFinite(cached.checkedAt));
  });

  it('keeps entries for different patients apart', () => {
    setCachedLabVerify('p1', true, '2026-09-01 10:00');
    setCachedLabVerify('p2', false, null);
    assert.equal(getCachedLabVerify('p1').hasStudies, true);
    assert.equal(getCachedLabVerify('p2').hasStudies, false);
  });

  it('does nothing for an empty patientId', () => {
    setCachedLabVerify('', true, '2026-09-01 10:00');
    assert.equal(getCachedLabVerify(''), null);
  });

  it('survives a corrupted stored blob by treating it as empty', () => {
    globalThis.localStorage.setItem('rplus.labVerifyCache.v1', '{not json');
    assert.equal(getCachedLabVerify('p1'), null);
    setCachedLabVerify('p1', true, null);
    assert.equal(getCachedLabVerify('p1').hasStudies, true);
  });
});

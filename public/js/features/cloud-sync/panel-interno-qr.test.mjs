import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildInternoNubeUrl } from './panel-interno-qr.mjs';
import { setCloudSyncUrl, getCloudSyncUrl } from './settings.mjs';

function memoryStore() {
  const map = new Map();
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(String(k), String(v));
    },
    removeItem(k) {
      map.delete(String(k));
    },
    clear() {
      map.clear();
    },
  };
}

describe('buildInternoNubeUrl', () => {
  const prevLocal = globalThis.localStorage;

  beforeEach(() => {
    globalThis.localStorage = memoryStore();
    setCloudSyncUrl('https://rplus-sync.example.workers.dev');
  });

  afterEach(() => {
    globalThis.localStorage = prevLocal;
  });

  it('builds Worker interno URL with slug and encoded token (no LAN port)', () => {
    const url = buildInternoNubeUrl('Sala 1', 'tok/with+special');
    assert.equal(
      url,
      'https://rplus-sync.example.workers.dev/interno/sala-1?t=tok%2Fwith%2Bspecial'
    );
    assert.doesNotMatch(url, /:3738/);
    assert.doesNotMatch(url, /[?&]sala=/);
  });

  it('maps Torre HU slug and uses getCloudSyncUrl base', () => {
    setCloudSyncUrl('https://sync.test.workers.dev/');
    assert.equal(getCloudSyncUrl(), 'https://sync.test.workers.dev');
    const url = buildInternoNubeUrl('Torre HU', 'abc123');
    assert.equal(url, 'https://sync.test.workers.dev/interno/torre-hu?t=abc123');
  });

  it('returns empty string when sala slug or token is missing', () => {
    assert.equal(buildInternoNubeUrl('', 'tok'), '');
    assert.equal(buildInternoNubeUrl('Sala 1', ''), '');
    assert.equal(buildInternoNubeUrl('Unknown Ward', 'tok'), '');
  });

  it('accepts explicit baseUrl override', () => {
    const url = buildInternoNubeUrl('Sala E', 'x', 'https://custom.example.dev');
    assert.equal(url, 'https://custom.example.dev/interno/sala-e?t=x');
  });
});

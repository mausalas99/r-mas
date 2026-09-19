import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function src() {
  return readFileSync(fileURLToPath(new URL('./expediente-inner-cache.mjs', import.meta.url)), 'utf8');
}

describe('expediente-inner-cache — eventualidades cache key', () => {
  it('keys the eventualidades tab render cache off the store updatedAt', () => {
    const body = src();
    const start = body.indexOf('function eventualidadesCacheSuffix');
    assert.ok(start >= 0);
    const fn = body.slice(start, start + 300);
    assert.match(fn, /p\.eventualidades/);
    assert.match(fn, /ev\.updatedAt/);
  });

  it('mixes the eventualidades suffix into the cache key only for the eventualidades tab', () => {
    const body = src();
    const start = body.indexOf('function innerTabRenderCacheKey');
    assert.ok(start >= 0);
    const fn = body.slice(start, start + 900);
    assert.match(fn, /tab === "eventualidades"/);
    assert.match(fn, /key \+= "\|V" \+ eventualidadesCacheSuffix\(pid\)/);
  });
});

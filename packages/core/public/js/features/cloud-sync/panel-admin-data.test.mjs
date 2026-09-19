import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('loadAdminNetworkCensus restores + auto-refreshes verified labs', () => {
  const src = readFileSync(new URL('./panel-admin-data.mjs', import.meta.url), 'utf8');

  it('applies the cached verify state right after rendering, then kicks off a background re-check', () => {
    const start = src.indexOf('export async function loadAdminNetworkCensus');
    const end = src.indexOf('\n/**', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    assert.match(body, /el\.innerHTML = redCensusHtml\(census, scope\.users \|\| \[\]\)/);
    assert.match(body, /applyCachedLabVerifications\(root\)/);
    assert.match(body, /void autoVerifyStaleNetworkLabs\(root\)/);
    const cacheAt = body.indexOf('applyCachedLabVerifications(root)');
    const renderAt = body.indexOf('el.innerHTML = redCensusHtml');
    assert.ok(cacheAt > renderAt, 'cache restore must run after the rows exist in the DOM');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCensusRowsHtml } from './panel-rank-sections.mjs';

describe('buildCensusRowsHtml', () => {
  it('renders settings rows per sala', () => {
    const html = buildCensusRowsHtml();
    assert.match(html, /cloud-sync-settings-row/);
    assert.match(html, /lan-ops-census-row/);
    assert.match(html, /Sala 1|Torre HU/);
    assert.match(html, /eq ·/);
    assert.doesNotMatch(html, /<p class="lan-connect-card-hint"/);
  });
});

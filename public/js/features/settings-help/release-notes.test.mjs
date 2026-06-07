import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatCuratedReleaseNotesPlain } from './release-notes.mjs';

describe('release-notes', () => {
  it('resolves curated highlights for v-prefixed version', () => {
    const text = formatCuratedReleaseNotesPlain('v7.1.8');
    assert.ok(text.includes('Conectar al anfitrión'));
    assert.ok(!text.includes('Signos vitales'));
  });

  it('does not fall back to default for unknown future version', () => {
    assert.equal(formatCuratedReleaseNotesPlain('99.0.0'), '');
  });

  it('uses default when version omitted', () => {
    const text = formatCuratedReleaseNotesPlain('');
    assert.ok(text.includes('Conectar al anfitrión') || text.includes('transport'));
  });
});

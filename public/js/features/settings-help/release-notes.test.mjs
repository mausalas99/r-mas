import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCuratedReleaseNotesPlain,
  formatUpdaterReleaseNotesPlain,
} from './release-notes.mjs';

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
    assert.ok(
      text.includes('entrega') ||
        text.includes('censo') ||
        text.includes('Expediente') ||
        text.includes('equipo')
    );
  });

  it('updater prefers curated target version over stale feed notes', () => {
    const text = formatUpdaterReleaseNotesPlain('7.1.8', 'Signos vitales sin falsas alarmas');
    assert.ok(text.includes('Conectar al anfitrión'));
    assert.ok(!text.includes('Signos vitales'));
  });

  it('updater uses feed notes when no curated entry exists', () => {
    const feed = 'Cableado LAN transport — fix esbuild chunks.';
    const text = formatUpdaterReleaseNotesPlain('99.0.0', feed);
    assert.equal(text, feed);
  });
});

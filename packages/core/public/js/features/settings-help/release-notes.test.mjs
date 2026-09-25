import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCuratedReleaseNotesPlain,
  formatUpdaterReleaseNotesPlain,
} from './release-notes.mjs';
import {
  RELEASE_NOTES_HIGHLIGHTS,
  RELEASE_NOTES_HIGHLIGHTS_DEFAULT,
} from './release-notes-curated.mjs';

// data/release-notes-highlights.mjs only ever holds the current version — no
// history (onboarding covers that). These tests read the current version
// back out of the map instead of hardcoding one, so they keep working
// unchanged after every bump.
const currentVersion = Object.entries(RELEASE_NOTES_HIGHLIGHTS).find(
  ([, notes]) => notes === RELEASE_NOTES_HIGHLIGHTS_DEFAULT
)?.[0];
const currentTitle = RELEASE_NOTES_HIGHLIGHTS_DEFAULT[0]?.title;

describe('release-notes', () => {
  it('resolves curated highlights for v-prefixed version', () => {
    assert.ok(currentVersion, 'RELEASE_NOTES_HIGHLIGHTS must have exactly the current version');
    const text = formatCuratedReleaseNotesPlain('v' + currentVersion);
    assert.ok(text.includes(currentTitle));
  });

  it('does not fall back to default for unknown future version', () => {
    assert.equal(formatCuratedReleaseNotesPlain('99.0.0'), '');
  });

  it('uses default when version omitted', () => {
    const text = formatCuratedReleaseNotesPlain('');
    assert.ok(text.length > 0, 'default release notes must not be empty');
    assert.ok(!text.includes('Completar antes de publicar'));
    assert.ok(
      !RELEASE_NOTES_HIGHLIGHTS_DEFAULT.some((n) => String(n.title || '').trim() === 'TODO'),
      'default highlights must not use TODO placeholders'
    );
    assert.equal(text, formatCuratedReleaseNotesPlain(currentVersion));
  });

  it('updater prefers curated target version over stale feed notes', () => {
    const text = formatUpdaterReleaseNotesPlain(currentVersion, 'Texto de relleno del feed');
    assert.ok(text.includes(currentTitle));
    assert.ok(!text.includes('Texto de relleno del feed'));
  });

  it('updater uses feed notes when no curated entry exists', () => {
    const feed = 'Cableado LAN transport — fix esbuild chunks.';
    const text = formatUpdaterReleaseNotesPlain('99.0.0', feed);
    assert.equal(text, feed);
  });
});

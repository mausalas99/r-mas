import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';
import { RELEASE_NOTES_HIGHLIGHTS_DEFAULT } from '../../../data/release-notes-highlights.mjs';

const view = await loadJsx(import.meta.url, `import { AvailablePrimary, AvailableSecondary, ReadyPrimary } from './platform/updater/update-actions-view.jsx';
  import { ReleaseNotesList } from './settings-help/release-notes-view.jsx';
  export const availP = (isDowngrade) => renderToString(<AvailablePrimary isDowngrade={isDowngrade} />);
  export const availS = (isDowngrade) => renderToString(<AvailableSecondary isDowngrade={isDowngrade} />);
  export const ready = (isDowngrade) => renderToString(<ReadyPrimary isDowngrade={isDowngrade} />);
  export const notes = (n) => renderToString(<ReleaseNotesList notes={n} />);`);

// Markup of the createElement code in electron-handlers.mjs and release-notes.mjs before the port, same inputs.
const OLD = createRequire(import.meta.url)('./platform-updater-release-notes-old-html.json');

test('update-available buttons equal the old DOM, and are empty for a downgrade', () => {
  sameHtml(view.availP(false), OLD.availablePrimary, 'primary');
  sameHtml(view.availS(false), OLD.availableSecondary, 'secondary');
  assert.equal(view.availP(true), '');
  assert.equal(view.availS(true), '');
});

test('update-ready buttons equal the old DOM for upgrade and downgrade', () => {
  sameHtml(view.ready(false), OLD.readyUpgrade, 'upgrade');
  sameHtml(view.ready(true), OLD.readyDowngrade, 'downgrade');
});

test('release notes list equals the old DOM for the real curated notes', () => {
  sameHtml(view.notes(RELEASE_NOTES_HIGHLIGHTS_DEFAULT), OLD.notesDefault, 'default');
});

test('release notes list equals the old DOM for escaped titles, strong runs and missing fields', () => {
  const odd = [
    { title: 'A <b> & "x"', body: 'Hola <strong>mundo</strong> y <strong>más</strong> fin.' },
    { body: 'sin título' },
    { title: 'sin cuerpo' },
  ];
  sameHtml(view.notes(odd), OLD.notesOdd, 'odd');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml as same } from '../preact-html-compare.mjs';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const view = await loadJsx(import.meta.url, `import { DirectoryUsersModalBody, DirectoryMessage } from './teams-roster-directory-view.jsx';
  export const body = (p) => renderToString(<DirectoryUsersModalBody {...p} />);
  export const msg = (text) => renderToString(<DirectoryMessage text={text} />);`);

// Markup the string builders wrote before the port (users, teams and clock are in the file).
const OLD = createRequire(import.meta.url)('./teams-roster-directory-view-old-html.json');
// Preact closes void tags with `/>`; the old strings did not. Old templates left a space before `>` and a newline between text and a tag (one space when shown).
const sameHtml = (a, b, n) => same(a.replace(/\/>/g, '>'), b.replace(/ >/g, '>').replace(/([^>\s])\s*\n\s*</g, '$1 <'), n);

const { directoryUsersModalBodyProps } = await import('./teams-roster-directory-render.mjs');
const { directoryRt } = await import('./teams-roster-directory-state.mjs');
const { users, teams, now, opts } = OLD;
const props = (u, t, o, trace = []) => directoryUsersModalBodyProps(u, t, o, { now, trace });

test('body equals the old HTML (no teams, full, no delete rights)', () => {
  sameHtml(view.body(props(users, [], opts)), OLD.noTeams, 'noTeams');
  sameHtml(view.body(props(users, teams, opts)), OLD.full, 'full');
  sameHtml(view.body(props(users.slice(0, 3), teams, { canDelete: false, callerUserId: '' })), OLD.noDelete, 'noDelete');
});

test('body equals the old HTML with filters and collapsed/expanded ranks', () => {
  Object.assign(directoryRt, { filterQuery: 'an "x"', filterStatus: 'assigned', filterSala: 'Sala 2', filterActivity: 'inactive' });
  directoryRt.collapsedRanks.add('R2');
  directoryRt.expandedRanks.add('R1');
  try {
    sameHtml(view.body(props(users, teams, opts)), OLD.filtered, 'filtered');
  } finally {
    Object.assign(directoryRt, { filterQuery: '', filterStatus: 'all', filterSala: '', filterActivity: 'all' });
    directoryRt.collapsedRanks.clear();
    directoryRt.expandedRanks.clear();
  }
});

test('empty state equals the old HTML (plain, host has profiles, merge deferred)', () => {
  sameHtml(view.body(props([], teams, opts)), OLD.empty, 'empty');
  const get = { boundary: 'get', data: { ok: true, incomingUsers: 3 } };
  sameHtml(view.body(props([], teams, opts, [get])), OLD.emptyPending, 'pending');
  sameHtml(view.body(props([], teams, opts, [{ boundary: 'merge', data: { deferred: true } }, get])), OLD.emptyDeferred, 'deferred');
});

test('message escapes text', () => {
  assert.equal(view.msg('a <b>'), '<p class="clinical-teams-empty">a &lt;b></p>');
});

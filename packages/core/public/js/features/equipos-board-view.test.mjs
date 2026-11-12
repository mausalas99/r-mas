import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';
import { BOARDS, CLOUD, MESSAGES } from './equipos-board-view-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { Board, Message } from './equipos-board-view.jsx';
  export const board = (b, c, admin) => renderToString(<Board board={b} cloud={c} isAdmin={admin} />);
  export const message = (t) => renderToString(<Message text={t} />);`);

// Markup equipos-board.mjs wrote before the port, captured on the same scenarios.
const OLD = createRequire(import.meta.url)('./equipos-board-view-old-html.json');

test('messages equal the old HTML', () => {
  MESSAGES.forEach((m, i) => sameHtml(view.message(m), OLD.messages[i], 'message ' + i));
});

for (const [name, b] of Object.entries(BOARDS)) {
  for (const admin of [true, false]) {
    test(`board ${name} (${admin ? 'admin' : 'user'}) equals the old HTML`, () => {
      sameHtml(view.board(b, CLOUD, admin), OLD[name + (admin ? 'Admin' : 'User')], name);
    });
  }
}

test('only admins get purge buttons and the history/purge-all actions', () => {
  assert.match(view.board(BOARDS.full, CLOUD, true), /data-purge="lumify"[\s\S]*btn-equipos-purge-all/);
  assert.doesNotMatch(view.board(BOARDS.full, CLOUD, false), /data-purge|btn-equipos/);
});

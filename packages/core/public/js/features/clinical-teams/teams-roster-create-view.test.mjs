import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { NewTeamCard, CompositionHint } from './teams-roster-create-view.jsx';
  export const card = (p) => renderToString(<NewTeamCard {...p} />);
  export const hint = (parts) => renderToString(<CompositionHint parts={parts} />);`);

// Markup renderNewTeamCardHtml wrote before the port (users: R2, R1, R1 without sala, R4, Admin).
const OLD = createRequire(import.meta.url)('./teams-roster-create-view-old-html.json');
// Preact closes void tags with `/>`; the old strings did not. Old `selected ` left a space before `>`.
const fix = (s) => s.replace(/\/>/g, '>').replace(/ >/g, '>');

test('New team card equals the old HTML for every user and primary/secondary', async () => {
  const { clinicalSessionContext } = await import('../../clinical-session-context.mjs');
  const { newTeamCardProps } = await import('./teams-roster-create.mjs');
  for (const [name, c] of Object.entries(OLD.cards)) {
    clinicalSessionContext.user = c.user;
    sameHtml(fix(view.card(newTeamCardProps({ primary: c.primary }))), fix(c.html), name);
  }
});

test('composition hint draws the old paragraph, nothing when empty', () => {
  assert.equal(view.hint([]), '');
  assert.equal(view.hint(['2 R1', '1 R2']),
    '<p class="clinical-teams-hint clinical-teams-composition-hint">Composición: 2 R1, 1 R2.</p>');
  assert.equal(OLD.hints.Sala, '');
});

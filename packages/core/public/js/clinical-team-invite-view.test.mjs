import test from 'node:test';
import { loadJsx } from './features/preact-view-test-helpers.mjs';
import { sameHtml } from './features/preact-html-compare.mjs';
import OLD from './clinical-team-invite-view.old.json' with { type: 'json' };

const view = await loadJsx(import.meta.url, `import { BrowserGateCard } from './clinical-team-invite-view.jsx';
  export const gate = (code) => renderToString(<BrowserGateCard code={code} onDismiss={() => {}} />);`);

test('browser gate card equals the old innerHTML template', () => {
  sameHtml(view.gate(OLD.code), OLD.gate, 'gate');
});

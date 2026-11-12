import test from 'node:test';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';
import OLD from './panel-mobile-invite-view.old.json' with { type: 'json' };

const view = await loadJsx(import.meta.url, `import { InviteCard } from './panel-mobile-invite-view.jsx';
  export const card = () => renderToString(<InviteCard url="https://nube.example/m?x=1" />);`);

// The old card was built with element.style, which a browser writes as "margin: 0px 0px 8px;".
const norm = (s) => s.replace(/style="([^"]*)"/g, (_, v) =>
  'style="' + v.replace(/: /g, ':').replace(/; /g, ';').replace(/\b0px\b/g, '0').replace(/;?$/, ';') + '"');

test('invite card equals the old DOM', () => {
  sameHtml(norm(view.card()), norm(OLD.card), 'card');
});

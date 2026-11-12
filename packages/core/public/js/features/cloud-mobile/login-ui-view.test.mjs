import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';
import { CLINICAL_LAN_USERNAME_HINT_HTML, CLINICAL_LAN_DISPLAY_NAME_HINT_HTML } from '../../clinical-settings.mjs';
import OLD from './login-ui-view.old.json' with { type: 'json' };

const view = await loadJsx(import.meta.url, `import { LoginShell, LoadingShell } from './login-ui-view.jsx';
  export const shell = (mode, prefilled) => renderToString(<LoginShell mode={mode} prefilled={prefilled} />);
  export const loading = () => renderToString(<LoadingShell />);`);

// Preact writes void tags as <input ...> and a bare value, where the old strings had ` />`; HTML parses both the same.
const same = (got, old, name) => sameHtml(got.replace(/ ?\/>/g, '>'), old.replace(/ ?\/>/g, '>'), name);

test('sign-in shell equals the old strings', () => {
  same(view.shell('auth', 'x'), OLD.auth_blank, 'auth blank');
  same(view.shell('auth', 'dr"<mend>&oza'), OLD.auth_user, 'auth user');
});

test('join shell equals the old strings', () => {
  same(view.shell('join', ''), OLD.join_blank, 'join blank');
  same(view.shell('join', 'AB"<C>&'), OLD.join_code, 'join code');
});

test('waiting shell equals the old strings', () => same(view.loading(), OLD.loading, 'loading'));

test('the register hints say what the shared hint constants say', () => {
  const text = (h) => h.replace(/<[^>]+>/g, '');
  const html = view.shell('auth', '');
  assert.ok(text(html).includes(text(CLINICAL_LAN_USERNAME_HINT_HTML)));
  assert.ok(text(html).includes(text(CLINICAL_LAN_DISPLAY_NAME_HINT_HTML)));
  assert.ok(html.includes(CLINICAL_LAN_USERNAME_HINT_HTML));
});

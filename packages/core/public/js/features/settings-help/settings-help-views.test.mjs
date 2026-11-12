import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from '../preact-view-test-helpers.mjs';

// Old markup (innerHTML strings) captured from the code before the Preact port; synthetic labels only.
const fx = JSON.parse(fs.readFileSync(new URL('./settings-help-views.fixture.json', import.meta.url), 'utf8'));
const view = await loadJsx(import.meta.url, `
  import { HtmlNodes } from './simple-html-nodes.jsx';
  import { HelpArticle, HelpList } from './help-content-view.jsx';
  import { SettingsNavContent } from './settings-nav-view.jsx';
  export const nodes = (html) => renderToString(<HtmlNodes html={html} />);
  export const article = (a) => renderToString(<HelpArticle article={a} />);
  export const list = (p) => renderToString(<HelpList {...p} />);
  export const nav = (p) => renderToString(<SettingsNavContent {...p} />);`);

/** Old string and Preact output differ only in quoting / self-closing / entity spelling. */
const canon = (h) => h
  .replace(/='([^']*)'/g, (_, v) => '="' + v.replace(/"/g, '&quot;') + '"')
  .replace(/<(circle|path|rect)([^>]*?)\s*\/>/g, '<$1$2></$1>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

for (const [id, old] of Object.entries(fx.steps)) {
  test(`guardia step ${id} draws the old markup`, () => assert.equal(canon(view.nodes(old)), canon(old)));
}
for (const a of fx.articles) {
  test(`help article ${a.id} draws the old markup`, () => {
    assert.equal(canon(view.article(a)), canon('<h4>' + a.title + '</h4>' + a.html));
  });
}
for (const [key, old] of Object.entries(fx.nav)) {
  if (key === '_nube') continue;
  test(`settings nav icon ${key} draws the old markup`, () => {
    assert.equal(canon(view.nav({ iconKey: key, label: 'Etiqueta' })), canon(old));
  });
}
test('nube link draws the old markup', () => {
  assert.equal(canon(view.nav({ iconKey: 'nube', label: 'Nube y equipo ↗' })), canon(fx.nav._nube));
});
test('an unknown icon draws only the label', () => {
  assert.equal(view.nav({ iconKey: '', label: 'X' }), '<span>X</span>');
});

test('help list marks the open article and lists every title', () => {
  const html = view.list({ articles: fx.articles, query: '', currentId: fx.articles[1].id, onSelect() {} });
  assert.equal((html.match(/class="help-article-item"/g) || []).length, fx.articles.length - 1);
  assert.equal((html.match(/class="help-article-item active"/g) || []).length, 1);
  assert.match(html, /role="option"/);
});
test('help list with no match says so', () => {
  assert.equal(view.list({ articles: [], query: 'zzz', currentId: null, onSelect() {} }), '<div class="help-empty">Sin resultados para “zzz”.</div>');
});
test('markup outside the allowed tags is refused', async () => {
  assert.throws(() => view.nodes('<script>x</script>'), /not allowed/);
  assert.throws(() => view.nodes('<p>open'), /unclosed/);
});

import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal fake DOM: enough to serialize what buildLoader makes.
const el = (tag) => ({
  tag, attrs: {}, kids: [], className: '',
  setAttribute(k, v) { this.attrs[k] = v; },
  appendChild(k) { this.kids.push(k); return k; },
  remove() {},
  querySelector(sel) { return find(this, sel.slice(1)); },
  textContent: '',
});
const find = (n, cls) => n.className === cls ? n : n.kids.map((k) => find(k, cls)).find(Boolean);
const html = (n) => '<' + n.tag + (n.className ? ' class="' + n.className + '"' : '') +
  Object.entries(n.attrs).map(([k, v]) => ' ' + k + '="' + v + '"').join('') + '>' + n.kids.map(html).join('') + '</' + n.tag + '>';

test('Pegar SOME loader builds the markup the old innerHTML string made', async () => {
  let root;
  globalThis.document = { createElement: el, body: { appendChild(n) { root = n; } } };
  globalThis.requestAnimationFrame = (f) => f();
  const { runWithPasteLoader } = await import('./lab-paste-loader.mjs');
  await runWithPasteLoader([() => false]);
  assert.equal(
    html(root),
    '<div class="paste-loader" role="status" aria-live="polite"><div class="paste-loader-card"><div class="paste-loader-ring" aria-hidden="true"></div>' +
    '<div><div class="paste-loader-text"></div><div class="paste-loader-step"></div></div></div></div>'
  );
});

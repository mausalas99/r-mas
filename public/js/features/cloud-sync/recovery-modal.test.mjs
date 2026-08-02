import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { recoveryModalMarkup, showRecoveryCodeModal } from './recovery-modal.mjs';

const SAMPLE_CODE = 'R+AB3K-7NMP-Q2WX';

/** @param {string} sel @param {import('./recovery-modal.test.mjs').MiniNode} root */
function matchesSelector(node, sel) {
  if (!node.getAttribute) return false;
  if (sel.startsWith('[') && sel.endsWith(']')) {
    const attr = sel.slice(1, -1);
    return node.getAttribute(attr) !== null;
  }
  if (sel.startsWith('.')) {
    const cls = sel.slice(1);
    return (node.getAttribute('class') || '').split(/\s+/).includes(cls);
  }
  return node.tagName === sel.toUpperCase();
}

/** @param {import('./recovery-modal.test.mjs').MiniNode} root @param {string} sel */
function querySel(root, sel) {
  if (matchesSelector(root, sel)) return root;
  for (const child of root.children) {
    const hit = querySel(child, sel);
    if (hit) return hit;
  }
  return null;
}

/** @param {import('./recovery-modal.test.mjs').MiniNode} root @param {string} sel */
function querySelAll(root, sel) {
  const out = [];
  if (matchesSelector(root, sel)) out.push(root);
  for (const child of root.children) {
    out.push(...querySelAll(child, sel));
  }
  return out;
}

/** @param {string} html */
function parseSimpleHtml(html) {
  const nodes = [];
  const re = /<(\/?)([\w-]+)([^>]*)>|([^<]+)/g;
  const stack = [{ children: nodes }];
  let m;
  while ((m = re.exec(html))) {
    if (m[4]) {
      const text = m[4];
      if (!text.trim()) continue;
      const parent = stack[stack.length - 1];
      parent.children.push({ tagName: '#text', textContent: text, children: [] });
      continue;
    }
    const closing = m[1] === '/';
    const tag = m[2];
    const attrStr = m[3] || '';
    if (closing) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const el = createMiniElement(tag);
    const attrRe = /([\w-]+)(?:="([^"]*)")?/g;
    let am;
    while ((am = attrRe.exec(attrStr))) {
      el.setAttribute(am[1], am[2] ?? '');
    }
    stack[stack.length - 1].children.push(el);
    if (tag !== 'input' && tag !== 'img' && tag !== 'br') {
      stack.push(el);
    }
  }
  return nodes;
}

/** @param {string} tag */
function createMiniElement(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    parentNode: /** @type {import('./recovery-modal.test.mjs').MiniNode | null} */ (null),
    children: /** @type {import('./recovery-modal.test.mjs').MiniNode[]} */ ([]),
    attributes: /** @type {Record<string, string>} */ ({}),
    _listeners: /** @type {Record<string, Function[]>} */ ({}),
    _checked: false,
    _text: '',
    setAttribute(k, v) {
      this.attributes[k] = String(v);
    },
    getAttribute(k) {
      return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null;
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    remove() {
      if (!this.parentNode) return;
      const siblings = this.parentNode.children;
      const idx = siblings.indexOf(this);
      if (idx >= 0) siblings.splice(idx, 1);
      this.parentNode = null;
    },
    get textContent() {
      if (this.tagName === '#text') return this._text;
      return this.children.map((c) => c.textContent).join('');
    },
    set textContent(t) {
      if (this.tagName === '#text') {
        this._text = String(t);
        return;
      }
      this.children = [{ tagName: '#text', textContent: String(t), children: [], _text: String(t) }];
    },
    get innerHTML() {
      return this._innerHTML || '';
    },
    set innerHTML(html) {
      this._innerHTML = String(html);
      this.children = parseSimpleHtml(this._innerHTML);
      for (const child of this.children) child.parentNode = this;
    },
    get firstElementChild() {
      return this.children.find((c) => c.tagName !== '#text') || null;
    },
    querySelector(sel) {
      return querySel(this, sel);
    },
    querySelectorAll(sel) {
      return querySelAll(this, sel);
    },
    addEventListener(type, fn) {
      (this._listeners[type] ||= []).push(fn);
    },
    click() {
      const handlers = this._listeners.click || [];
      const ev = { target: this, preventDefault() {} };
      for (const fn of handlers) fn(ev);
    },
    get checked() {
      return this._checked;
    },
    set checked(v) {
      this._checked = !!v;
    },
  };
  return el;
}

function createMiniDom() {
  const body = createMiniElement('body');
  return {
    body,
    createElement(tag) {
      return createMiniElement(tag);
    },
    querySelector(sel) {
      return querySel(body, sel);
    },
  };
}

describe('recoveryModalMarkup', () => {
  it('includes code and required data attributes', () => {
    const html = recoveryModalMarkup(SAMPLE_CODE);
    assert.match(html, /data-recovery-code-modal/);
    assert.match(html, /data-recovery-continue/);
    assert.match(html, /data-recovery-confirm/);
    assert.match(html, /data-recovery-code/);
    assert.match(html, /R\+AB3K-7NMP-Q2WX/);
    assert.match(html, /Guardá este código de recuperación/);
    assert.match(html, /Lo guardé en un lugar seguro/);
  });

  it('escapes HTML in code and custom title', () => {
    const html = recoveryModalMarkup('<script>', 'Título <b>');
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /Título &lt;b&gt;/);
  });

  it('uses default title when omitted', () => {
    const html = recoveryModalMarkup(SAMPLE_CODE);
    assert.match(html, /Código de recuperación/);
  });
});

describe('showRecoveryCodeModal', () => {
  /** @type {ReturnType<typeof createMiniDom> | null} */
  let mini;
  let priorDoc;
  let priorWindow;

  beforeEach(() => {
    mini = createMiniDom();
    priorDoc = globalThis.document;
    priorWindow = globalThis.window;
    globalThis.document = /** @type {Document} */ (/** @type {unknown} */ (mini));
    globalThis.window = /** @type {Window} */ (
      /** @type {unknown} */ ({
        confirm() {
          return true;
        },
      })
    );
    mini.body.children = [];
  });

  afterEach(() => {
    globalThis.document = priorDoc;
    globalThis.window = priorWindow;
    mini = null;
  });

  it('shows code and resolves after continue with checkbox checked', async () => {
    const p = showRecoveryCodeModal({ code: SAMPLE_CODE });
    const el = mini.querySelector('[data-recovery-code-modal]');
    assert.ok(el);
    assert.match(el.textContent, /R\+AB3K-7NMP-Q2WX/);
    const confirmBox = el.querySelector('[data-recovery-confirm]');
    assert.ok(confirmBox);
    confirmBox.checked = true;
    const continueBtn = el.querySelector('[data-recovery-continue]');
    assert.ok(continueBtn);
    continueBtn.click();
    await p;
    assert.equal(mini.querySelector('[data-recovery-code-modal]'), null);
  });

  it('resolves after continue even when checkbox unchecked', async () => {
    let confirmCalls = 0;
    globalThis.window = /** @type {Window} */ (
      /** @type {unknown} */ ({
        confirm() {
          confirmCalls += 1;
          return true;
        },
      })
    );
    const p = showRecoveryCodeModal({ code: SAMPLE_CODE });
    const el = mini.querySelector('[data-recovery-code-modal]');
    assert.ok(el);
    el.querySelector('[data-recovery-continue]').click();
    await p;
    assert.equal(confirmCalls, 1);
    assert.equal(mini.querySelector('[data-recovery-code-modal]'), null);
  });
});

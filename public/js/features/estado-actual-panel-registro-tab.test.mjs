import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  REGISTRO_TAB_SKIP_SELECTOR,
  applyRegistroTabSkipAttributes,
  getRegistroTabSpineElements,
  moveRegistroTabFocus,
  handleRegistroTabKeydown,
} from './estado-actual-panel-registro-tab.mjs';

/** @typedef {ReturnType<typeof createMiniElement>} MiniNode */

/** @param {MiniNode} node @param {string} attr */
function nodeHasAttrValue(node, attr, expected) {
  const val = node.getAttribute(attr);
  if (val === null) return false;
  return expected === undefined || val === expected;
}

/** @param {MiniNode} node @param {string} sel */
function matchesAttrChainSelector(node, sel) {
  const attrParts = sel.match(/\[([\w-]+)(?:="([^"]*)")?\]/g);
  if (!attrParts || attrParts.join('') !== sel) return false;
  for (const part of attrParts) {
    const m = part.match(/\[([\w-]+)(?:="([^"]*)")?\]/);
    if (!m || !nodeHasAttrValue(node, m[1], m[2])) return false;
  }
  return true;
}

/** @param {MiniNode} node @param {string} sel */
function matchesSingleSelector(node, sel) {
  sel = sel.trim();
  if (!node.getAttribute) return false;
  if (sel.startsWith('#')) return node.getAttribute('id') === sel.slice(1);
  if (sel.startsWith('.')) {
    const cls = sel.slice(1);
    return (node.getAttribute('class') || '').split(/\s+/).includes(cls);
  }
  const notMatch = sel.match(/^\[([\w-]+)\]:not\(\[([\w-]+)="([^"]*)"\]\)$/);
  if (notMatch) {
    return nodeHasAttrValue(node, notMatch[1]) && node.getAttribute(notMatch[2]) !== notMatch[3];
  }
  if (sel.startsWith('[')) return matchesAttrChainSelector(node, sel);
  return node.tagName === sel.toUpperCase();
}

/** @param {MiniNode} node @param {string} sel */
function matchesSelector(node, sel) {
  if (sel.includes(',')) {
    return sel.split(',').some((part) => matchesSingleSelector(node, part.trim()));
  }
  return matchesSingleSelector(node, sel);
}

/** @param {MiniNode} root @param {string} sel */
function querySel(root, sel) {
  if (matchesSelector(root, sel)) return root;
  for (const child of root.children) {
    const hit = querySel(child, sel);
    if (hit) return hit;
  }
  return null;
}

/** @param {MiniNode} root @param {string} sel */
function querySelAll(root, sel) {
  if (sel.includes(',')) {
    const seen = new Set();
    /** @type {MiniNode[]} */
    const out = [];
    for (const part of sel.split(',')) {
      for (const el of querySelAll(root, part.trim())) {
        if (!seen.has(el)) {
          seen.add(el);
          out.push(el);
        }
      }
    }
    return out;
  }
  /** @type {MiniNode[]} */
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
    parentNode: /** @type {MiniNode | null} */ (null),
    children: /** @type {MiniNode[]} */ ([]),
    attributes: /** @type {Record<string, string>} */ ({}),
    _focused: false,
    _checked: false,
    setAttribute(k, v) {
      this.attributes[k] = String(v);
    },
    getAttribute(k) {
      return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null;
    },
    hasAttribute(k) {
      return Object.prototype.hasOwnProperty.call(this.attributes, k);
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    get innerHTML() {
      return this._innerHTML || '';
    },
    set innerHTML(html) {
      this._innerHTML = String(html);
      this.children = parseSimpleHtml(this._innerHTML);
      for (const child of this.children) child.parentNode = this;
    },
    querySelector(sel) {
      return querySel(this, sel);
    },
    querySelectorAll(sel) {
      return querySelAll(this, sel);
    },
    closest(sel) {
      let node = /** @type {MiniNode | null} */ (this);
      while (node) {
        if (matchesSelector(node, sel)) return node;
        node = node.parentNode;
      }
      return null;
    },
    matches(sel) {
      return matchesSelector(this, sel);
    },
    contains(other) {
      if (other === this) return true;
      for (const child of this.children) {
        if (child.contains && child.contains(other)) return true;
      }
      return false;
    },
    focus() {
      this._focused = true;
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

function mockFormHtml() {
  return (
    '<input id="ea-recorded-at" />' +
    '<div data-ea-vital-stack="tas" data-ea-layer-count="1">' +
    '<input data-ea-vital="tas" data-ea-layer-idx="0" />' +
    '<button type="button" data-ea-vital-add="tas">+1</button>' +
    '<input type="time" data-ea-altered="tas" />' +
    '</div>' +
    '<div data-ea-vital-stack="tad" data-ea-layer-count="1">' +
    '<input data-ea-vital="tad" data-ea-layer-idx="0" />' +
    '<button type="button" data-ea-vital-add="tad">+1</button>' +
    '</div>' +
    '<button type="button" id="ea-add-glu">+ Extra</button>' +
    '<div id="ea-glu-list">' +
    '<div class="ea-glu-row ea-glu-row--standard">' +
    '<input data-ea-glu-value value="" />' +
    '<input type="checkbox" data-ea-glu-altered />' +
    '<input data-ea-glu-rescue-units />' +
    '</div>' +
    '<div class="ea-glu-row ea-glu-row--standard">' +
    '<input data-ea-glu-value />' +
    '<input type="checkbox" data-ea-glu-altered />' +
    '</div>' +
    '</div>' +
    '<input id="ea-io-ing" />' +
    '<input id="ea-io-evac" />' +
    '<input id="ea-io-egr" />'
  );
}

describe('registro tab spine', () => {
  /** @type {MiniNode} */
  let form;
  /** @type {typeof globalThis.getComputedStyle | undefined} */
  let priorGetComputedStyle;

  beforeEach(() => {
    form = createMiniElement('form');
    form.setAttribute('id', 'ea-form');
    form.innerHTML = mockFormHtml();
    priorGetComputedStyle = globalThis.getComputedStyle;
    globalThis.getComputedStyle = () =>
      /** @type {CSSStyleDeclaration} */ (
        /** @type {unknown} */ ({ display: 'block', visibility: 'visible' })
      );
    applyRegistroTabSkipAttributes(form);
  });

  afterEach(() => {
    if (priorGetComputedStyle === undefined) delete globalThis.getComputedStyle;
    else globalThis.getComputedStyle = priorGetComputedStyle;
  });

  it('skip selector matches +1, Alterada, rescue, + Extra', () => {
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /data-ea-vital-add/);
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /data-ea-altered/);
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /data-ea-glu-altered/);
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /data-ea-glu-rescue-units/);
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /data-ea-glu-remove/);
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /ea-add-glu/);
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /ea-add-bomba/);
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /ea-bomba-enabled/);
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /data-ea-io-nc/);
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /ea-registro-paste-btn/);
  });

  it('marks skip controls tabindex=-1', () => {
    form.querySelectorAll(REGISTRO_TAB_SKIP_SELECTOR).forEach((el) => {
      assert.equal(el.getAttribute('tabindex'), '-1');
    });
  });

  it('spine order skips +1 and Alterada', () => {
    const spine = getRegistroTabSpineElements(form);
    assert.equal(spine[0].getAttribute('id'), 'ea-recorded-at');
    assert.equal(spine[1].getAttribute('data-ea-vital'), 'tas');
    assert.equal(spine[2].getAttribute('data-ea-vital'), 'tad');
    assert.equal(
      spine.every((el) => el.tagName !== 'BUTTON'),
      true
    );
    assert.equal(
      spine.every((el) => !el.hasAttribute('data-ea-glu-altered')),
      true
    );
    const gluValues = spine.filter((el) => el.hasAttribute('data-ea-glu-value'));
    assert.equal(gluValues.length, 2);
    assert.equal(spine[spine.length - 3].getAttribute('id'), 'ea-io-ing');
    assert.equal(spine[spine.length - 2].getAttribute('id'), 'ea-io-evac');
    assert.equal(spine[spine.length - 1].getAttribute('id'), 'ea-io-egr');
  });

  it('Tab from first glu goes to second glu not Alterada', () => {
    const spine = getRegistroTabSpineElements(form);
    const firstGlu = form.querySelector('[data-ea-glu-value]');
    assert.ok(firstGlu);
    firstGlu.focus();
    const next = moveRegistroTabFocus(form, firstGlu, 1);
    assert.equal(next, spine[spine.indexOf(firstGlu) + 1]);
    assert.ok(next && next.hasAttribute('data-ea-glu-value'));
    assert.equal(next.hasAttribute('data-ea-glu-altered'), false);
  });

  it('handleRegistroTabKeydown prevents default on spine Tab', () => {
    const firstGlu = form.querySelector('[data-ea-glu-value]');
    assert.ok(firstGlu);
    let prevented = false;
    const ev = {
      key: 'Tab',
      shiftKey: false,
      target: firstGlu,
      preventDefault() {
        prevented = true;
      },
    };
    handleRegistroTabKeydown(form, ev);
    assert.equal(prevented, true);
  });

  it('handleRegistroTabKeydown ignores non-Tab keys', () => {
    const firstGlu = form.querySelector('[data-ea-glu-value]');
    assert.ok(firstGlu);
    let prevented = false;
    handleRegistroTabKeydown(form, {
      key: 'Enter',
      shiftKey: false,
      target: firstGlu,
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, false);
  });
});

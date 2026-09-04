import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleVpoDxDelegationAction } from './vpo-panel-helpers.mjs';

/**
 * This test runner (`scripts/run-with-electron-node.mjs`) runs Electron as a bare Node
 * process — no real `document`. Build a tiny id-registry fake plus a hardcoded
 * querySelector stub for the one selector this code actually uses, so the real
 * markFieldInvalid/clearFieldInvalid wiring gets exercised, not skipped.
 */
function fakeDocument() {
  const byId = new Map();
  let activeElement = null;

  class FakeElement {
    constructor(tagName) {
      this.tagName = tagName;
      this._attrs = {};
      this._id = '';
      this.value = '';
      this.style = {};
      this.textContent = '';
      this.hidden = false;
      this.nextSibling = null;
    }
    get id() {
      return this._id;
    }
    set id(v) {
      if (this._id) byId.delete(this._id);
      this._id = v;
      if (v) byId.set(v, this);
    }
    setAttribute(k, v) {
      this._attrs[k] = String(v);
    }
    getAttribute(k) {
      return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null;
    }
    removeAttribute(k) {
      delete this._attrs[k];
    }
    focus() {
      activeElement = this;
    }
    insertAdjacentElement(position, el) {
      if (position === 'afterend') this.nextSibling = el;
      return el;
    }
    remove() {
      if (this._id) byId.delete(this._id);
    }
  }

  return {
    createElement: (tag) => new FakeElement(tag),
    getElementById: (id) => byId.get(id) || null,
    get activeElement() {
      return activeElement;
    },
  };
}

function fakeMount(ta) {
  return {
    querySelector(sel) {
      return sel === '[data-vpo-dx-paste]' ? ta : null;
    },
  };
}

function noopDeps() {
  return {
    showToast() {},
    scheduleSave() {},
    refreshDxListDom() {},
    commitDxList() {},
  };
}

describe('handleVpoDxDelegationAction dx-split-plus field-invalid marking', () => {
  beforeEach(() => {
    globalThis.document = fakeDocument();
  });
  afterEach(() => {
    delete globalThis.document;
  });

  it('marks the paste textarea invalid and focuses it when nothing parses', () => {
    const ta = document.createElement('textarea');
    ta.value = '';
    const mount = fakeMount(ta);

    handleVpoDxDelegationAction(mount, 'dx-split-plus', {}, noopDeps());

    assert.equal(ta.getAttribute('aria-invalid'), 'true');
    const describedBy = ta.getAttribute('aria-describedby');
    assert.ok(describedBy);
    assert.equal(document.getElementById(describedBy).textContent, 'Pega diagnósticos separados por +');
    assert.equal(document.activeElement, ta);
  });

  it('clears the invalid marking once the paste parses into diagnósticos', () => {
    const ta = document.createElement('textarea');
    ta.value = '';
    const mount = fakeMount(ta);
    const state = {};

    handleVpoDxDelegationAction(mount, 'dx-split-plus', state, noopDeps());
    assert.equal(ta.getAttribute('aria-invalid'), 'true');

    ta.value = 'HTA + DM2';
    handleVpoDxDelegationAction(mount, 'dx-split-plus', state, noopDeps());
    assert.equal(ta.getAttribute('aria-invalid'), null);
  });
});

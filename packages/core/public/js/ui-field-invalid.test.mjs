import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { markFieldInvalid, clearFieldInvalid } from './ui-field-invalid.mjs';

/**
 * This test runner (`scripts/run-with-electron-node.mjs`) runs Electron as a bare Node
 * process — no real `document`. Build a tiny fake DOM (id registry + attrs + focus)
 * so this helper's actual behavior gets exercised for real, not skipped.
 */
function fakeDocument() {
  const byId = new Map();
  let activeElement = null;

  class FakeElement {
    constructor(tagName) {
      this.tagName = tagName;
      this._attrs = {};
      this._id = '';
      this.style = {};
      this.hidden = false;
      this.textContent = '';
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
    _FakeElement: FakeElement,
  };
}

describe('ui-field-invalid', () => {
  beforeEach(() => {
    globalThis.document = fakeDocument();
  });

  it('marks a field invalid, links a visible error, and focuses it on failed validation', () => {
    const field = document.createElement('input');
    field.id = 'test-field-a';

    markFieldInvalid(field, 'Escribe algo aquí');

    assert.equal(field.getAttribute('aria-invalid'), 'true');
    const describedBy = field.getAttribute('aria-describedby');
    assert.ok(describedBy, 'aria-describedby should be set');
    const errEl = document.getElementById(describedBy);
    assert.ok(errEl, 'linked error element should exist and be reachable by id');
    assert.equal(errEl.textContent, 'Escribe algo aquí');
    assert.equal(errEl.hidden, false, 'the error text must be visible');
    assert.equal(field.nextSibling, errEl, 'error element is inserted right after the field');
    assert.equal(document.activeElement, field, 'focus should move to the field');

    clearFieldInvalid(field);

    assert.equal(field.getAttribute('aria-invalid'), null);
    assert.equal(field.getAttribute('aria-describedby'), null);
    assert.equal(document.getElementById(describedBy), null, 'error element should be removed');
  });

  it('reuses the same error element across repeated failures on one field', () => {
    const field = document.createElement('input');
    field.id = 'test-field-b';

    markFieldInvalid(field, 'Primer error');
    const id1 = field.getAttribute('aria-describedby');
    markFieldInvalid(field, 'Segundo error');
    const id2 = field.getAttribute('aria-describedby');

    assert.equal(id1, id2, 'should not create a second error node for the same field');
    assert.equal(document.getElementById(id2).textContent, 'Segundo error');
  });

  it('assigns a stable id to a field with no id of its own', () => {
    const field = document.createElement('textarea');
    assert.equal(field.id, '');

    markFieldInvalid(field, 'Campo requerido');

    assert.notEqual(field.id, '', 'a field with no id must get one so describedby can target it');
    assert.equal(field.getAttribute('aria-describedby'), field.id + '-error');
  });

  it('is a no-op when passed a missing field', () => {
    assert.doesNotThrow(() => markFieldInvalid(null, 'msg'));
    assert.doesNotThrow(() => clearFieldInvalid(null));
  });
});

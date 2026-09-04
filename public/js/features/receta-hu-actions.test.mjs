import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getRecetaHuByPatient } from '../app-state.mjs';
import { registerRecetaHuRuntime } from './receta-hu-shared.mjs';
import {
  recetaHuCommitMedFromCompose,
  recetaHuCommitLabFromCompose,
  recetaHuCommitProximaFromCompose,
} from './receta-hu-actions.mjs';

/**
 * This test runner (`scripts/run-with-electron-node.mjs`) runs Electron as a bare Node
 * process — no real `document`. receta-hu-actions.mjs only ever looks fields up by
 * id, so a tiny id-registry fake is enough to exercise the real code path.
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
    querySelector() {
      return null;
    }
  }

  function el(id) {
    const e = new FakeElement('input');
    e.id = id;
    return e;
  }

  return {
    createElement: (tag) => new FakeElement(tag),
    getElementById: (id) => byId.get(id) || null,
    get activeElement() {
      return activeElement;
    },
    _mount: el,
  };
}

describe('receta-hu-actions field-invalid marking', () => {
  beforeEach(() => {
    globalThis.document = fakeDocument();
  });
  afterEach(() => {
    delete globalThis.document;
    for (const k of Object.keys(getRecetaHuByPatient())) delete getRecetaHuByPatient()[k];
  });

  it('marks the medicamento field invalid and focuses it when the compose row is empty', () => {
    registerRecetaHuRuntime({ getActiveId: () => 'p-med' });
    document._mount('receta-hu-container');
    const nEl = document._mount('receta-hu-compose-med-n');
    document._mount('receta-hu-compose-med-p');
    document._mount('receta-hu-compose-med-d');

    recetaHuCommitMedFromCompose();

    assert.equal(nEl.getAttribute('aria-invalid'), 'true');
    const describedBy = nEl.getAttribute('aria-describedby');
    assert.ok(describedBy);
    assert.equal(
      document.getElementById(describedBy).textContent,
      'Escribe al menos un campo del medicamento'
    );
    assert.equal(document.activeElement, nEl);

    nEl.value = 'Paracetamol';
    recetaHuCommitMedFromCompose();
    assert.equal(nEl.getAttribute('aria-invalid'), null, 'clears once the row is valid');
  });

  it('marks the lab field invalid when the study name is empty', () => {
    registerRecetaHuRuntime({ getActiveId: () => 'p-lab' });
    document._mount('receta-hu-container');
    const inp = document._mount('receta-hu-compose-lab');

    recetaHuCommitLabFromCompose();
    assert.equal(inp.getAttribute('aria-invalid'), 'true');
    assert.ok(inp.getAttribute('aria-describedby'));
    assert.equal(document.activeElement, inp);

    inp.value = 'Hemograma';
    recetaHuCommitLabFromCompose();
    assert.equal(inp.getAttribute('aria-invalid'), null);
  });

  it('marks the consult-service field invalid when neither servicio nor texto is set', () => {
    registerRecetaHuRuntime({ getActiveId: () => 'p-proxima' });
    document._mount('receta-hu-compose-proxima-plazo');
    const sel = document._mount('receta-hu-consult-servicio');
    document._mount('receta-hu-compose-proxima-texto');
    document._mount('receta-hu-compose-proxima-fecha');

    recetaHuCommitProximaFromCompose();
    assert.equal(sel.getAttribute('aria-invalid'), 'true');
    assert.ok(sel.getAttribute('aria-describedby'));
    assert.equal(document.activeElement, sel);
  });
});

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  splitHourGroupHeaderText,
  restyleLabHourGroupHeaders,
  updateLabResultsCardTitle,
  syncLabResultsCardChrome,
} from './lab-results-card.mjs';

/**
 * This test runner (`scripts/run-with-electron-node.mjs`) runs Electron as a bare Node
 * process — no `document` global. Other renderer tests either stub a fake `document` object
 * or guard `typeof document === 'undefined'` and skip. Here we build a tiny real-enough fake
 * DOM (classList/appendChild/nextElementSibling/querySelectorAll by class) so the DOM
 * post-processing logic in lab-results-card.mjs gets exercised for real, not skipped.
 */
function classesOf(el) {
  return String(el.className || '').split(/\s+/).filter(Boolean);
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.className = '';
    this.children = [];
    this.parentNode = null;
    this._text = '';
  }
  get classList() {
    var self = this;
    return {
      contains: function (c) {
        return classesOf(self).indexOf(c) !== -1;
      },
    };
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  get nextElementSibling() {
    if (!this.parentNode) return null;
    var idx = this.parentNode.children.indexOf(this);
    return this.parentNode.children[idx + 1] || null;
  }
  set textContent(t) {
    this._text = String(t == null ? '' : t);
    this.children = [];
  }
  get textContent() {
    return this._text;
  }
  querySelectorAll(selector) {
    var cls = selector.replace(/^\./, '');
    var out = [];
    (function walk(el) {
      el.children.forEach(function (c) {
        if (classesOf(c).indexOf(cls) !== -1) out.push(c);
        walk(c);
      });
    })(this);
    return out;
  }
}

// `innerHTML` only needs to round-trip a plain string here: restyleLabHourGroupHeaders
// writes it once per header and the tests assert on the written markup — it is never
// re-parsed back into child elements, so a string store is enough for this fake DOM.
Object.defineProperty(FakeElement.prototype, 'innerHTML', {
  get: function () {
    return this._html || '';
  },
  set: function (html) {
    this._html = String(html);
    this._text = String(html).replace(/<[^>]*>/g, '');
  },
});

function fakeDocument() {
  return {
    createElement: function (tag) {
      return new FakeElement(tag);
    },
    body: new FakeElement('body'),
    _ids: Object.create(null),
    getElementById: function (id) {
      return this._ids[id] || null;
    },
  };
}

function el(tag, className, text) {
  var e = new FakeElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

/** `.out-line` row containing an altered `<strong class="lab-value-altered">` child, like the real markup. */
function alteredRow() {
  var row = el('div', 'out-line');
  row.appendChild(el('strong', 'lab-value-altered', 'Hb 8.2'));
  return row;
}

function normalRow() {
  var row = el('div', 'out-line');
  row.appendChild(el('span', '', 'VCM 88'));
  return row;
}

beforeEach(() => {
  delete globalThis.document;
});

describe('splitHourGroupHeaderText', () => {
  it('splits "HH:MM · Tipo" into hora/label', () => {
    assert.deepEqual(splitHourGroupHeaderText('11:44 · Toma de la mañana'), {
      hora: '11:44',
      label: 'Toma de la mañana',
    });
  });
  it('treats a header without a recognizable HH:MM prefix as label-only', () => {
    assert.deepEqual(splitHourGroupHeaderText('Envío'), { hora: '', label: 'Envío' });
  });
});

describe('restyleLabHourGroupHeaders', () => {
  it('splits the header into time/label spans and appends the altered count for that toma', () => {
    var box = el('div');
    var head = el('div', 'lab-hour-group-h', '11:44 · Toma de la mañana');
    box.appendChild(head);
    box.appendChild(alteredRow());
    box.appendChild(normalRow());
    box.appendChild(alteredRow());

    restyleLabHourGroupHeaders(box);

    assert.match(head.innerHTML, /<span class="lab-hour-time">11:44<\/span>/);
    assert.match(head.innerHTML, /<span class="lab-hour-label">Toma de la mañana · 2 alterados<\/span>/);
  });

  it('does not count values from a second toma into the first header', () => {
    var box = el('div');
    var headA = el('div', 'lab-hour-group-h', '11:44 · Mañana');
    var headB = el('div', 'lab-hour-group-h', '05:17 · Gasometría');
    box.appendChild(headA);
    box.appendChild(alteredRow());
    box.appendChild(headB);
    box.appendChild(alteredRow());
    box.appendChild(alteredRow());

    restyleLabHourGroupHeaders(box);

    assert.match(headA.innerHTML, /1 alterado</);
    assert.match(headB.innerHTML, /2 alterados</);
  });
});

describe('updateLabResultsCardTitle', () => {
  it('sets "Resultados · N alterados de M" from counted DOM values, excluding muted (-) entries', () => {
    globalThis.document = fakeDocument();
    var titleEl = el('span', '', 'Resultados');
    document._ids['lab-output-title-text'] = titleEl;
    var box = el('div');
    box.appendChild(el('span', 'lab-row-value lab-value-altered'));
    box.appendChild(el('span', 'lab-row-value'));
    box.appendChild(el('span', 'lab-row-value lab-row-value-muted'));

    updateLabResultsCardTitle(box);

    assert.equal(titleEl.textContent, 'Resultados · 1 alterado de 2');
  });

  it('falls back to plain "Resultados" when the box has no values', () => {
    globalThis.document = fakeDocument();
    var titleEl = el('span', '', 'stale');
    document._ids['lab-output-title-text'] = titleEl;
    updateLabResultsCardTitle(el('div'));
    assert.equal(titleEl.textContent, 'Resultados');
  });
});

describe('syncLabResultsCardChrome', () => {
  it('is a no-op (does not throw) when #lab-output-box is absent', () => {
    globalThis.document = fakeDocument();
    assert.doesNotThrow(() => syncLabResultsCardChrome());
  });
});

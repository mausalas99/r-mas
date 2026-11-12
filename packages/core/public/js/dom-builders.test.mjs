import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHeaderIcon } from './header-icons.mjs';
import { buildLabPanelSkeletonElement } from './ui-skeleton.mjs';

// A tiny DOM: just enough to build nodes and print them like the old HTML strings.
function fakeNode(tag) {
  return {
    tag, attrs: [], kids: [],
    set className(v) { this.setAttribute('class', v); },
    set id(v) { this.setAttribute('id', v); },
    setAttribute(k, v) { this.attrs.push([k, v]); },
    appendChild(n) { this.kids.push(n); },
    append(...ns) { ns.forEach((n) => this.kids.push(n)); },
  };
}
function print(n) {
  const a = n.attrs.map(([k, v]) => ` ${k}="${v}"`).join('');
  return n.kids.length ? `<${n.tag}${a}>${n.kids.map(print).join('')}</${n.tag}>` : n.tag === 'div' ? `<div${a}></div>` : `<${n.tag}${a}/>`;
}
globalThis.document = { createElementNS: (_ns, tag) => fakeNode(tag), createElement: (tag) => fakeNode(tag) };

const SVG = '<svg class="btn-header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

// The old strings from chrome.mjs and top-bar.mjs.
test('header icons match the old SVG strings', () => {
  assert.equal(print(buildHeaderIcon('sun')), SVG + '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>');
  assert.equal(print(buildHeaderIcon('moon')), SVG + '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>');
  assert.equal(print(buildHeaderIcon('help')), SVG + '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><path d="M12 17h.01"/></svg>');
});

// The old buildLabPanelSkeletonHtml string from ui-skeleton.mjs.
test('lab panel skeleton matches the old string', () => {
  assert.equal(
    print(buildLabPanelSkeletonElement()),
    '<div class="lab-panel-skeleton" id="lab-panel-loading" aria-busy="true" aria-label="Cargando Laboratorio">' +
      '<div class="skel-line lab-panel-skeleton-title"></div><div class="skel-card"></div>' +
      '<div class="skel-line" style="width:72%"></div><div class="skel-line" style="width:58%"></div><div class="skel-line" style="width:84%"></div></div>'
  );
});

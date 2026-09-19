import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { showMinVersionBlockingModal } from './min-version.mjs';

const GITHUB_BASE = 'https://github.com/mausalas99/r-mas/releases/download';

function makeEl(id, tag = 'div') {
  const el = { id, textContent: '', onclick: null, style: {}, classList: { classes: new Set(), add(c) { this.classes.add(c); }, contains(c) { return this.classes.has(c); } }, setAttribute() {} };
  return el;
}

describe('showMinVersionBlockingModal — download button', () => {
  let els, prevGetEl, prevApi, prevAddEl, prevDoc;

  beforeEach(() => {
    els = {
      'min-version-backdrop': makeEl('min-version-backdrop'),
      'min-version-meta': makeEl('min-version-meta'),
      'min-version-message': makeEl('min-version-message'),
      'min-version-check-btn': makeEl('min-version-check-btn', 'button'),
      'min-version-releases-btn': makeEl('min-version-releases-btn', 'button'),
      'update-modal-backdrop': makeEl('update-modal-backdrop'),
    };
    prevGetEl = globalThis.document;
    prevDoc = globalThis.document;
    globalThis.document = {
      getElementById: (id) => els[id] || null,
      addEventListener: () => {},
    };
    prevApi = globalThis.window;
    globalThis.window = { electronAPI: null };
  });

  afterEach(() => {
    globalThis.document = prevDoc;
    globalThis.window = prevApi;
  });

  it('sets Apple Silicon label and direct URL for darwin arm64', () => {
    showMinVersionBlockingModal('8.1.2', '8.1.4', null, { platform: 'darwin', arch: 'arm64' });
    const relBtn = els['min-version-releases-btn'];
    assert.match(relBtn.textContent, /Apple Silicon/i);
    const opened = [];
    globalThis.window = { electronAPI: { openExternal: (u) => opened.push(u) } };
    relBtn.onclick();
    assert.equal(opened.length, 1);
    assert.match(opened[0], /R\+-8\.1\.4-arm64\.dmg/);
    assert.ok(opened[0].startsWith(GITHUB_BASE));
  });

  it('sets Intel label and direct URL for darwin x64', () => {
    showMinVersionBlockingModal('8.1.2', '8.1.4', null, { platform: 'darwin', arch: 'x64' });
    const relBtn = els['min-version-releases-btn'];
    assert.match(relBtn.textContent, /Intel/i);
    const opened = [];
    globalThis.window = { electronAPI: { openExternal: (u) => opened.push(u) } };
    relBtn.onclick();
    assert.match(opened[0], /R\+-8\.1\.4-x64\.dmg/);
  });

  it('sets Windows label and direct URL for win32', () => {
    showMinVersionBlockingModal('8.1.2', '8.1.4', null, { platform: 'win32', arch: 'x64' });
    const relBtn = els['min-version-releases-btn'];
    assert.match(relBtn.textContent, /Windows/i);
    const opened = [];
    globalThis.window = { electronAPI: { openExternal: (u) => opened.push(u) } };
    relBtn.onclick();
    assert.match(opened[0], /R\+-8\.1\.4-x64\.exe/);
  });

  it('falls back to releases page when no platformInfo', () => {
    showMinVersionBlockingModal('8.1.2', '8.1.4', null, null);
    const relBtn = els['min-version-releases-btn'];
    const opened = [];
    globalThis.window = { electronAPI: { openExternal: (u) => opened.push(u) } };
    relBtn.onclick();
    assert.match(opened[0], /releases\/latest/);
  });

  it('opens backdrop', () => {
    showMinVersionBlockingModal('8.1.2', '8.1.4', null, null);
    assert.ok(els['min-version-backdrop'].classList.contains('open'));
  });

  it('sets meta text with versions', () => {
    showMinVersionBlockingModal('8.1.2', '8.1.4', null, null);
    assert.match(els['min-version-meta'].textContent, /8\.1\.2/);
    assert.match(els['min-version-meta'].textContent, /8\.1\.4/);
  });
});

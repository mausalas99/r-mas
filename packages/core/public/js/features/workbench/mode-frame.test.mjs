import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildModeFrameHtml, mountModeFrame } from './mode-frame.mjs';

describe('buildModeFrameHtml', () => {
  it('renders mode name, context, metadata and exactly one primary button', () => {
    const html = buildModeFrameHtml({
      modeName: 'Guardia',
      context: 'Sáb 17 ago · R2 Medina · 14:00 → 08:00',
      metadata: 'recepción 14:10',
      secondaryActions: [{ label: 'Censo PDF' }],
      primaryAction: { label: 'Entregar guardia' },
    });
    assert.match(html, /wb-mode-frame-name">Guardia</);
    assert.match(html, /wb-mode-frame-context">Sáb 17 ago/);
    assert.match(html, /wb-mode-frame-meta">recepción 14:10/);
    assert.match(html, /Censo PDF/);
    assert.match(html, /⌘\//);
    assert.match(html, /wb-btn-primary" data-wb-primary>Entregar guardia/);
    // Exactly one primary button.
    assert.equal((html.match(/wb-btn-primary/g) || []).length, 1);
  });

  it('makes the context span clickable only when onContextClick is passed', () => {
    const withHandler = buildModeFrameHtml({
      modeName: 'Guardia',
      context: 'Sáb 17 ago · R2 Medina',
      primaryAction: { label: 'Entregar guardia' },
      onContextClick: () => {},
    });
    assert.match(withHandler, /wb-mode-frame-context--clickable/);
    assert.match(withHandler, /data-wb-context role="button" tabindex="0"/);

    const withoutHandler = buildModeFrameHtml({
      modeName: 'Guardia',
      context: 'Sáb 17 ago · R2 Medina',
      primaryAction: { label: 'Entregar guardia' },
    });
    assert.doesNotMatch(withoutHandler, /wb-mode-frame-context--clickable/);
    assert.doesNotMatch(withoutHandler, /data-wb-context/);
  });

  it('omits the ⌘/ shortcut button when showShortcut is false', () => {
    const html = buildModeFrameHtml({
      modeName: 'Nota de evolución',
      primaryAction: { label: 'Firmar y cerrar' },
      showShortcut: false,
    });
    assert.doesNotMatch(html, /data-wb-shortcut/);
    assert.doesNotMatch(html, /⌘\//);
    assert.match(html, /wb-btn-primary" data-wb-primary>Firmar y cerrar/);
  });

  it('rejects more than two secondary actions', () => {
    assert.throws(() =>
      buildModeFrameHtml({
        modeName: 'X',
        primaryAction: { label: 'Y' },
        secondaryActions: [{ label: 'a' }, { label: 'b' }, { label: 'c' }],
      })
    );
  });

  it('requires a primary action', () => {
    assert.throws(() => buildModeFrameHtml({ modeName: 'X' }));
  });
});

describe('mountModeFrame', () => {
  it('wires secondary, shortcut and primary click handlers', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    let secondaryClicked = false;
    let shortcutClicked = false;
    let primaryClicked = false;
    mountModeFrame(host, {
      modeName: 'Guardia',
      secondaryActions: [{ label: 'Censo PDF', onClick: () => (secondaryClicked = true) }],
      onShortcut: () => (shortcutClicked = true),
      primaryAction: { label: 'Entregar guardia', onClick: () => (primaryClicked = true) },
    });
    host.querySelector('[data-wb-secondary="0"]').click();
    host.querySelector('[data-wb-shortcut]').click();
    host.querySelector('[data-wb-primary]').click();
    assert.equal(secondaryClicked, true);
    assert.equal(shortcutClicked, true);
    assert.equal(primaryClicked, true);
  });

  it('wires the context click handler when provided', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    let contextClicked = false;
    mountModeFrame(host, {
      modeName: 'Guardia',
      context: 'Sáb 17 ago · R2 Medina',
      primaryAction: { label: 'Entregar guardia' },
      onContextClick: () => (contextClicked = true),
    });
    host.querySelector('[data-wb-context]').click();
    assert.equal(contextClicked, true);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEmptyStateHtml, mountEmptyState } from './empty-state.mjs';

describe('buildEmptyStateHtml', () => {
  it('renders label, missing, when-arrives and an exit link, never a bare zero', () => {
    const html = buildEmptyStateHtml({
      label: 'Labs de hoy',
      missing: 'Todavía no hay resultados',
      whenArrives: 'Llegan entre 09:15 y 09:45',
      exitLabel: 'Ver labs de ayer',
      exitHref: '#labs-ayer',
    });
    assert.match(html, /wb-empty-label">Labs de hoy/);
    assert.match(html, /wb-empty-missing">Todavía no hay resultados/);
    assert.match(html, /wb-empty-when">Llegan entre 09:15 y 09:45/);
    assert.match(html, /wb-empty-exit" href="#labs-ayer"/);
    assert.doesNotMatch(html, />0</);
  });

  it('omits the exit link when no label is given', () => {
    const html = buildEmptyStateHtml({ label: 'X', missing: 'Y', whenArrives: 'Z' });
    assert.doesNotMatch(html, /wb-empty-exit/);
  });
});

describe('mountEmptyState', () => {
  it('wires the exit link click', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    let exited = false;
    mountEmptyState(host, { label: 'X', missing: 'Y', whenArrives: 'Z', exitLabel: 'Salir', onExit: () => (exited = true) });
    host.querySelector('[data-wb-empty-exit]').click();
    assert.equal(exited, true);
  });
});

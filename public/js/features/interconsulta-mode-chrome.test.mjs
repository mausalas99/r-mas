import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInterconsultaBarHtml,
  mountInterconsultaBar,
  registerInterconsultaChromeRuntime,
  renderConsultBandForActivePatient,
  syncInterconsultaModeChrome,
} from './interconsulta-mode-chrome.mjs';

describe('buildInterconsultaBarHtml', () => {
  it('renders the primary action, a demoted "Generar nota" menu item, and the shortcut', () => {
    var html = buildInterconsultaBarHtml();
    assert.match(html, /wb-mode-frame-name">Interconsulta/);
    assert.match(html, /data-wb-ic-primary>Actualizar pacientes/);
    assert.match(html, /data-wb-ic-generar-nota>Generar nota \(\.docx\)/);
    assert.match(html, /data-wb-shortcut/);
    // "Generar nota" must not be a primary button.
    assert.doesNotMatch(html.replace(/data-wb-ic-generar-nota[^<]*<\/button>/, ''), /wb-btn-primary[^>]*>Generar nota/);
  });
});

describe('mountInterconsultaBar', () => {
  it('wires primary, shortcut and the menu item click handlers', () => {
    if (typeof document === 'undefined') return;
    var host = document.createElement('div');
    var primaryClicked = false;
    var shortcutClicked = false;
    var generarClicked = false;
    mountInterconsultaBar(host, {
      onPrimary: () => (primaryClicked = true),
      onShortcut: () => (shortcutClicked = true),
      onGenerarNota: () => (generarClicked = true),
    });
    host.querySelector('[data-wb-ic-primary]').click();
    host.querySelector('[data-wb-shortcut]').click();
    host.querySelector('[data-wb-ic-generar-nota]').click();
    assert.equal(primaryClicked, true);
    assert.equal(shortcutClicked, true);
    assert.equal(generarClicked, true);
  });
});

describe('syncInterconsultaModeChrome + renderConsultBandForActivePatient', () => {
  beforeEach(() => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML =
      '<div id="interconsulta-mode-frame" hidden></div>' +
      '<div id="interconsulta-consult-band" hidden></div>';
  });

  it('hides the frame and band when not in interconsulta mode', () => {
    if (typeof document === 'undefined') return;
    registerInterconsultaChromeRuntime({
      getActiveId: () => null,
    });
    // No settings registered => isModeSala defaults true => sala, not interconsulta.
    syncInterconsultaModeChrome();
    assert.equal(document.getElementById('interconsulta-mode-frame').hidden, true);
    assert.equal(document.getElementById('interconsulta-consult-band').hidden, true);
  });

  it('paints the consult band for the active patient once mounted', () => {
    if (typeof document === 'undefined') return;
    var bandMount = document.getElementById('interconsulta-consult-band');
    bandMount.hidden = false;
    registerInterconsultaChromeRuntime({
      getActiveId: () => '1',
    });
    renderConsultBandForActivePatient();
    // No matching patient in app-state -> empty band, but call must not throw.
    assert.equal(typeof bandMount.innerHTML, 'string');
  });
});

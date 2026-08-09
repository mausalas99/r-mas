import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isMobileWeb,
  blockIfMobileDocExport,
  activateMobileWebRoot,
  syncMobileBarebonesChrome,
  syncMobileLabReferenceChrome,
  normalizeMobileAppTab,
  MOBILE_MAIN_APP_TABS,
} from './mobile-web.mjs';
import { getConsolidatedTabs, getSalidaSections, migrateGranularInner } from './expediente-tabs.mjs';

describe('mobile-web', () => {
  it('isMobileWeb es false sin flag', () => {
    try {
      localStorage.removeItem('rpc-mobile-mode');
    } catch (_e) { void _e; }
    var g = typeof globalThis !== 'undefined' ? globalThis : null;
    if (g) delete g.__RPC_MOBILE_WEB__;
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('rpc-mobile-web');
    }
    assert.equal(isMobileWeb(), false);
  });

  it('activateMobileWebRoot activa clase', () => {
    if (typeof document === 'undefined') return;
    activateMobileWebRoot();
    assert.equal(isMobileWeb(), true);
    assert.ok(document.documentElement.classList.contains('rpc-mobile-web'));
  });

  it('blockIfMobileDocExport solo en móvil', () => {
    if (typeof document === 'undefined') return;
    activateMobileWebRoot();
    assert.equal(blockIfMobileDocExport(), true);
  });

  it('barebones: sin pestaña Salida ni secciones salida', () => {
    activateMobileWebRoot();
    if (!isMobileWeb()) return;
    const SALA = { appMode: 'sala', hideManejoSection: false };
    assert.equal(getConsolidatedTabs(SALA).includes('salida'), false);
    assert.deepEqual(getSalidaSections(SALA), []);
    assert.equal(migrateGranularInner('listado', SALA), 'estadoActual');
    assert.equal(migrateGranularInner('recetaHu', SALA), 'estadoActual');
  });

  it('syncMobileBarebonesChrome oculta controles de header', () => {
    if (typeof document === 'undefined') return;
    activateMobileWebRoot();
    document.body.innerHTML =
      '<button id="btn-export-censo-header"></button>' +
      '<button id="profile-toggle-btn"></button>' +
      '<button id="btn-open-settings"></button>' +
      '<button id="itab-salida"></button>' +
      '<button id="btn-header-cmdk"></button>' +
      '<button id="btn-header-shortcuts"></button>' +
      '<button id="btn-open-learn"></button>' +
      '<button id="apptab-med"></button>' +
      '<button id="apptab-agenda"></button>' +
      '<div id="appcontent-med"></div>' +
      '<div id="appcontent-agenda"></div>' +
      '<div id="tour-dock" class="tour-dock-visible"></div>';
    syncMobileBarebonesChrome();
    assert.equal(document.getElementById('btn-export-censo-header').style.display, 'none');
    assert.equal(document.getElementById('profile-toggle-btn').style.display, 'none');
    assert.equal(document.getElementById('btn-open-settings').style.display, 'none');
    assert.equal(document.getElementById('itab-salida').style.display, 'none');
    assert.equal(document.getElementById('btn-header-cmdk').style.display, 'none');
    assert.equal(document.getElementById('btn-header-shortcuts').style.display, 'none');
    assert.equal(document.getElementById('btn-open-learn').style.display, 'none');
    assert.equal(document.getElementById('apptab-med').style.display, 'none');
    assert.equal(document.getElementById('apptab-agenda').style.display, 'none');
    assert.equal(document.getElementById('appcontent-med').style.display, 'none');
    assert.equal(document.getElementById('appcontent-agenda').style.display, 'none');
    assert.equal(document.getElementById('tour-dock').classList.contains('tour-dock-visible'), false);
  });

  it('normalizeMobileAppTab deja solo lab y nota', () => {
    activateMobileWebRoot();
    assert.equal(isMobileWeb(), true);
    assert.deepEqual(MOBILE_MAIN_APP_TABS, ['lab', 'nota']);
    assert.equal(normalizeMobileAppTab('lab'), 'lab');
    assert.equal(normalizeMobileAppTab('nota'), 'nota');
    assert.equal(normalizeMobileAppTab('med'), 'nota');
    assert.equal(normalizeMobileAppTab('agenda'), 'nota');
    assert.equal(normalizeMobileAppTab('lan'), 'lab');
  });

  it('syncMobileLabReferenceChrome muestra resultados y oculta ingreso SOME', () => {
    if (typeof document === 'undefined') return;
    activateMobileWebRoot();
    document.body.innerHTML =
      '<div id="lab-input-section"></div>' +
      '<div id="lab-diagrams-section"></div>' +
      '<div id="lab-banner"></div>' +
      '<div id="lab-output-section" style="display:none">' +
      '<div class="card-header lab-output-card-header">' +
      '<span class="lab-output-card-title" style="display:flex;align-items:center;gap:8px;">Resultados</span>' +
      '<div class="lab-output-header-tools"><div class="lab-history-date-picker">' +
      '<label class="lab-history-date-picker-label">Estudio</label></div></div>' +
      '</div></div>';
    syncMobileLabReferenceChrome();
    assert.equal(document.getElementById('lab-input-section').style.display, 'none');
    assert.equal(document.getElementById('lab-diagrams-section').style.display, 'none');
    assert.equal(document.getElementById('lab-output-section').style.display, 'flex');
    assert.ok(document.documentElement.classList.contains('rpc-mobile-lab-reference'));
    var title = document.querySelector('.lab-output-card-title');
    assert.equal(title.style.display, 'none');
    assert.equal(
      document.querySelector('.lab-history-date-picker-label').textContent,
      'Estudio'
    );
    var cardHeader = document.querySelector('#lab-output-section > .card-header');
    assert.equal(cardHeader.style.display, 'none');
  });
});

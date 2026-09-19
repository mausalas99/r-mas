import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInterconsultaBarHtml,
  mountInterconsultaBar,
  registerInterconsultaChromeRuntime,
  renderConsultBandForActivePatient,
  syncInterconsultaModeChrome,
  isInterconsultaGuardiaOnlyFilterActive,
  isInterconsultaPostguardiaHidden,
  showInterconsultaPatientView,
} from './interconsulta-mode-chrome.mjs';
import { patientsBridge } from './patients-bridge.mjs';
import { getPatients } from '../app-state.mjs';

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

  it('renders the "Solo guardia de hoy" board filter toggle', () => {
    var html = buildInterconsultaBarHtml();
    assert.match(html, /data-wb-ic-guardia-filter/);
    assert.match(html, /Solo guardia de hoy/);
  });

  it('renders the "Ocultar post-guardia" board toggle', () => {
    var html = buildInterconsultaBarHtml();
    assert.match(html, /data-wb-ic-hide-postguardia aria-pressed="false"/);
    assert.match(html, /Ocultar post-guardia/);
  });
});

describe('"Solo guardia de hoy" filter toggle', () => {
  it('toggles isInterconsultaGuardiaOnlyFilterActive and re-renders the patient list', () => {
    if (typeof document === 'undefined') return;
    var host = document.createElement('div');
    var renderCalls = [];
    registerInterconsultaChromeRuntime({
      renderPatientList: (opts) => renderCalls.push(opts),
    });
    mountInterconsultaBar(host, {});
    var btn = host.querySelector('[data-wb-ic-guardia-filter]');
    assert.ok(btn);
    assert.equal(btn.getAttribute('aria-pressed'), 'false');
    assert.equal(isInterconsultaGuardiaOnlyFilterActive(), false);

    btn.click();
    assert.equal(isInterconsultaGuardiaOnlyFilterActive(), true);
    assert.equal(btn.getAttribute('aria-pressed'), 'true');
    assert.equal(renderCalls.length, 1);
    assert.deepEqual(renderCalls[0], { force: true });

    btn.click();
    assert.equal(isInterconsultaGuardiaOnlyFilterActive(), false);
    assert.equal(btn.getAttribute('aria-pressed'), 'false');
    assert.equal(renderCalls.length, 2);
  });
});

describe('"Ocultar post-guardia" toggle', () => {
  it('toggles isInterconsultaPostguardiaHidden and updates aria-pressed', () => {
    if (typeof document === 'undefined') return;
    var host = document.createElement('div');
    var renderCalls = [];
    registerInterconsultaChromeRuntime({
      renderPatientList: (opts) => renderCalls.push(opts),
    });
    mountInterconsultaBar(host, {});
    var btn = host.querySelector('[data-wb-ic-hide-postguardia]');
    assert.ok(btn);
    assert.equal(btn.getAttribute('aria-pressed'), 'false');
    assert.equal(isInterconsultaPostguardiaHidden(), false);

    btn.click();
    assert.equal(isInterconsultaPostguardiaHidden(), true);
    assert.equal(btn.getAttribute('aria-pressed'), 'true');

    btn.click();
    assert.equal(isInterconsultaPostguardiaHidden(), false);
    assert.equal(btn.getAttribute('aria-pressed'), 'false');
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
      '<div id="patient-dashboard-mount" class="patient-dash"><div class="dash"></div></div>';
  });

  it('has no consult band row when not in interconsulta mode', () => {
    if (typeof document === 'undefined') return;
    registerInterconsultaChromeRuntime({
      getActiveId: () => null,
    });
    // No settings registered => isModeSala defaults true => sala, not interconsulta.
    syncInterconsultaModeChrome();
    assert.equal(document.getElementById('interconsulta-mode-frame').hidden, true);
    assert.equal(document.querySelector('.ic-consult-band'), null);
  });

  it('paints the consult band for the active patient once mounted', () => {
    if (typeof document === 'undefined') return;
    registerInterconsultaChromeRuntime({
      getActiveId: () => '1',
    });
    // No matching patient in app-state -> no band row, but call must not throw.
    renderConsultBandForActivePatient();
    assert.equal(document.querySelector('.ic-consult-band'), null);
  });

  it('editing a field writes it onto the active patient\'s consultInfo', () => {
    if (typeof document === 'undefined') return;
    var patient = { id: 'ic-edit-1' };
    getPatients().push(patient);
    registerInterconsultaChromeRuntime({ getActiveId: () => 'ic-edit-1' });
    renderConsultBandForActivePatient();
    var bandMount = document.querySelector('.ic-consult-band');
    assert.ok(bandMount);

    // Servicio solicitante is a catalog-picker trigger, not a text field —
    // see the "opens the categorized service picker" test below.
    var trigger = bandMount.querySelector('[data-ic-req-trigger]');
    assert.ok(trigger);

    var reasonInput = bandMount.querySelector('[data-consult-field="reason"]');
    reasonInput.value = 'Valoración por deterioro';
    reasonInput.dispatchEvent(new Event('change', { bubbles: true }));
    assert.equal(patient.consultInfo.reason, 'Valoración por deterioro');

    var statusSelect = bandMount.querySelector('[data-consult-field="followUpStatus"]');
    statusSelect.value = 'en_curso';
    statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
    assert.equal(patient.consultInfo.followUpStatus, 'en_curso');

    getPatients().length = getPatients().indexOf(patient);
  });

  it('clicking the servicio solicitante trigger opens the categorized service picker and writes the pick back', () => {
    if (typeof document === 'undefined') return;
    var patient = { id: 'ic-svc-1' };
    getPatients().push(patient);
    registerInterconsultaChromeRuntime({ getActiveId: () => 'ic-svc-1' });
    renderConsultBandForActivePatient();
    var bandMount = document.querySelector('.ic-consult-band');

    var trigger = bandMount.querySelector('[data-ic-req-trigger]');
    trigger.click();

    var pickBtn = document.querySelector('[data-svc-pick="card"]'); // Cardiología
    assert.ok(pickBtn);
    pickBtn.click();

    assert.equal(patient.consultInfo.requestingService, 'Cardiología');
    assert.equal(patient.servicio, 'Cardiología');

    getPatients().length = getPatients().indexOf(patient);
  });
});

describe('interconsulta navigation (board = main window, corrected 2026-08-25)', () => {
  var restoreSelectPatient;
  var selectedIds;

  async function enterInterconsultaMode() {
    var { attachProfileSettingsGetter } = await import('../profile-runtime.mjs');
    attachProfileSettingsGetter(() => ({ appMode: 'interconsulta' }));
  }

  async function leaveInterconsultaMode() {
    var { attachProfileSettingsGetter } = await import('../profile-runtime.mjs');
    attachProfileSettingsGetter(() => ({ appMode: 'sala' }));
  }

  beforeEach(() => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML =
      '<div id="interconsulta-mode-frame" hidden></div>' +
      '<div id="patient-dashboard-mount" class="patient-dash"><div class="dash"></div></div>' +
      '<div id="ic-board-mount" hidden></div>' +
      '<div id="empty-state"></div>' +
      '<div id="patient-view"></div>';
    document.documentElement.classList.remove('ic-board-mode', 'ic-board-view-open');
    selectedIds = [];
    var activeId = null;
    restoreSelectPatient = patientsBridge.selectPatient;
    patientsBridge.selectPatient = function (id) {
      selectedIds.push(id);
      activeId = id;
    };
    registerInterconsultaChromeRuntime({ getActiveId: () => activeId });
  });

  afterEach(async () => {
    if (typeof document === 'undefined') return;
    await leaveInterconsultaMode();
    syncInterconsultaModeChrome();
    patientsBridge.selectPatient = restoreSelectPatient;
  });

  it('hides the sidebar (via the ic-board-mode class) and shows the board as the default view', async () => {
    if (typeof document === 'undefined') return;
    await enterInterconsultaMode();
    syncInterconsultaModeChrome();
    assert.equal(document.documentElement.classList.contains('ic-board-mode'), true);
    assert.equal(document.getElementById('ic-board-mount').hidden, false);
    var backBtn = document.querySelector('[data-wb-ic-back]');
    assert.equal(backBtn.hidden, true);
    // The consult-info band (Servicio solicitante / Motivo / Seguimiento)
    // describes one patient — it has nothing to show on the board.
    assert.equal(document.querySelector('.ic-consult-band'), null);
    // No "← Tablero" row either — that only makes sense inside a patient.
    assert.equal(document.querySelector('[data-ic-back-to-board]'), null);
    // "Actualizar pacientes" now lives on the board itself, top-right.
    assert.ok(document.querySelector('[data-ic-board-refresh]'));
    // CSS backstop (layout.css) that force-hides #patient-view/#empty-state
    // while the board is open, regardless of any later inline-style setter.
    assert.equal(document.documentElement.classList.contains('ic-board-view-open'), true);
  });

  it('keeps the top INTERCONSULTA bar (← Tablero / Actualizar pacientes) removed even while active', async () => {
    if (typeof document === 'undefined') return;
    await enterInterconsultaMode();
    syncInterconsultaModeChrome();
    assert.equal(document.getElementById('interconsulta-mode-frame').hidden, true);
  });

  it('always shows the "+ Agregar" button, top-left of the board header', async () => {
    if (typeof document === 'undefined') return;
    await enterInterconsultaMode();
    syncInterconsultaModeChrome();
    var header = document.querySelector('.ic-board-header');
    assert.ok(header);
    var addBtn = header.querySelector('[data-ic-board-add]');
    assert.ok(addBtn);
    assert.match(addBtn.textContent, /\+ Agregar/);
    // Top-left: first child of the header, ahead of "Actualizar pacientes".
    assert.equal(header.firstElementChild, addBtn);
  });

  it('clicking a patient card swaps to the Resumen view and back/Esc return to the board', async () => {
    if (typeof document === 'undefined') return;
    var patient = { id: '42' };
    getPatients().push(patient);
    await enterInterconsultaMode();
    syncInterconsultaModeChrome();
    var boardMount = document.getElementById('ic-board-mount');
    var card = document.createElement('div');
    card.className = 'patient-card';
    card.setAttribute('data-patient-id', '42');
    boardMount.querySelector('#ic-team-board-mount').appendChild(card);

    card.click();
    assert.deepEqual(selectedIds, ['42']);
    assert.equal(boardMount.hidden, true);
    assert.ok(document.querySelector('.ic-consult-band'));
    // "← Tablero" now lives right above the patient name, not the retired frame bar.
    assert.ok(document.querySelector('[data-ic-back-to-board]'));
    assert.equal(document.documentElement.classList.contains('ic-board-view-open'), false);
    var backBtn = document.querySelector('[data-wb-ic-back]');
    assert.equal(backBtn.hidden, false);

    document.querySelector('[data-ic-back-to-board]').click();
    assert.equal(boardMount.hidden, false);
    assert.equal(document.querySelector('.ic-consult-band'), null);
    assert.equal(document.querySelector('[data-ic-back-to-board]'), null);
    assert.equal(document.documentElement.classList.contains('ic-board-view-open'), true);
    assert.equal(backBtn.hidden, true);

    // Drill in again, then leave via Esc instead of the button.
    card.click();
    assert.equal(boardMount.hidden, true);
    assert.ok(document.querySelector('.ic-consult-band'));
    assert.ok(document.querySelector('[data-ic-back-to-board]'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(boardMount.hidden, false);
    assert.equal(document.querySelector('.ic-consult-band'), null);
    assert.equal(document.querySelector('[data-ic-back-to-board]'), null);
    assert.equal(document.querySelector('[data-wb-ic-back]').hidden, true);

    getPatients().length = getPatients().indexOf(patient);
  });

  it('hides the consult band when switching from IC to Sala mid-patient', async () => {
    if (typeof document === 'undefined') return;
    var patient = { id: '1' };
    getPatients().push(patient);
    registerInterconsultaChromeRuntime({ getActiveId: () => '1' });
    await enterInterconsultaMode();
    syncInterconsultaModeChrome();
    showInterconsultaPatientView();
    assert.ok(document.querySelector('.ic-consult-band'));

    await leaveInterconsultaMode();
    syncInterconsultaModeChrome();
    assert.equal(document.querySelector('.ic-consult-band'), null);

    getPatients().length = getPatients().indexOf(patient);
  });

  it('restores the normal layout when leaving interconsulta mode', async () => {
    if (typeof document === 'undefined') return;
    await enterInterconsultaMode();
    syncInterconsultaModeChrome();
    assert.equal(document.documentElement.classList.contains('ic-board-mode'), true);

    await leaveInterconsultaMode();
    syncInterconsultaModeChrome();
    assert.equal(document.documentElement.classList.contains('ic-board-mode'), false);
    assert.equal(document.documentElement.classList.contains('ic-board-view-open'), false);
    assert.equal(document.getElementById('ic-board-mount').hidden, true);
  });

  it('shows only empty-state (not patient-view) when leaving interconsulta with no active patient', async () => {
    if (typeof document === 'undefined') return;
    registerInterconsultaChromeRuntime({ getActiveId: () => null });
    await enterInterconsultaMode();
    syncInterconsultaModeChrome();

    await leaveInterconsultaMode();
    syncInterconsultaModeChrome();
    assert.equal(document.getElementById('empty-state').style.display, 'flex');
    assert.equal(document.getElementById('patient-view').style.display, 'none');
  });

  it('shows only patient-view (not empty-state) when leaving interconsulta with an active patient', async () => {
    if (typeof document === 'undefined') return;
    registerInterconsultaChromeRuntime({ getActiveId: () => '42' });
    await enterInterconsultaMode();
    syncInterconsultaModeChrome();

    await leaveInterconsultaMode();
    syncInterconsultaModeChrome();
    assert.equal(document.getElementById('patient-view').style.display, 'flex');
    assert.equal(document.getElementById('empty-state').style.display, 'none');
  });
});

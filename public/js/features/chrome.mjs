/** Runtime hooks supplied by app.js once shell functions exist. */
let runtime = {
  switchAppTab() {},
  renderPatientList() {},
  scrollActiveRondaCardIntoView() {},
  renderProcedureAgendaPanel() {},
  getActiveAppTab() {
    return 'lab';
  },
  getActiveInner() {
    return 'todo';
  },
  getActiveId() {
    return null;
  },
  setRoundOverviewMode() {},
  renderPaseBoard() {},
};

var _openedDetailFromPase = false;

export function registerChromeRuntime(partial) {
  if (!partial || typeof partial !== 'object') return;
  Object.assign(runtime, partial);
}

const THEME_ICON_SUN =
  '<svg class="btn-header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
const THEME_ICON_MOON =
  '<svg class="btn-header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

const FONT_ZOOM_LS = 'rpc-font-zoom';
const HIGH_CONTRAST_LS = 'rpc-high-contrast';
const UI_DENSITY_LS = 'rpc-ui-density';

const I18N_ES = {
  'settings.appearance': 'Apariencia',
  'settings.themeGroup': 'Tema de la aplicación',
  'settings.themeLight': 'Claro',
  'settings.themeDark': 'Oscuro',
  'settings.fontSize': 'Tamaño de texto',
  'settings.fontSizeHint': 'Escala toda la interfaz (útil en pantallas pequeñas).',
  'settings.fontNormal': 'Normal',
  'settings.fontLarge': 'Grande',
  'settings.fontXLarge': 'Más grande',
  'settings.uiDensity': 'Modo de vista',
  'settings.uiDensityHint':
    'Normal: Laboratorio, Expediente, Medicamentos y Agenda en pestañas completas (vista Ronda centrada). Pase: resumen del paciente en una columna; pulsa un título de sección para abrir el detalle en Normal. ⌘P o Ctrl+P alterna.',
  'settings.densityNormal': 'Normal',
  'settings.densityPase': 'Pase',
  'settings.highContrast': 'Alto contraste',
  'settings.highContrastHint': 'Aumenta el contraste de texto y bordes para mejor legibilidad.',
  'settings.hcOff': 'Desactivado',
  'settings.hcOn': 'Activado',
  'settings.docsFolder': 'Carpeta de documentos',
  'settings.docsFolderHint': 'Los .docx generados se guardan aquí (si no eliges carpeta, se usa Descargas).',
  'settings.backup': 'Respaldo local',
  'settings.backupHint': 'Exporta o restaura pacientes, notas e indicaciones (JSON).',
  'settings.application': 'Aplicación',
  'settings.quickHelp': 'Centro de ayuda · atajos y tours',
  'settings.version': 'Versión',
  'settings.checkUpdates': 'Buscar actualizaciones…',
  'settings.open': 'Abrir ajustes',
  'settings.openTitle': 'Ajustes',
  'settings.teamSyncAria': 'Abrir conexión LAN y LiveSync (salas)',
  'settings.teamSyncTitle':
    'Conexión LAN (⇄): rol, enlace de invitación, salas LiveSync. Código del servidor (solo anfitrión avanzado): Ajustes → LAN · servidor en esta computadora. Paquete sync JSON: Ajustes → Respaldos, sync y recuperación.',
  'theme.toggle': 'Cambiar tema claro u oscuro',
  'theme.toggleTitle': 'Cambiar tema',
  'appTab.lab': 'Laboratorio',
  'appTab.nota': 'Expediente',
  'appTab.med': 'Medicamentos',
  'appTab.agenda': 'Agenda',
  'roundMode.hint': 'Ronda: paciente siguiente / anterior',
  'roundMode.seenTitle': 'Visto en ronda (se reinicia cada día)',
  'roundMode.sectionNota': 'Nota e indicaciones',
  'roundMode.sectionLabs': 'Laboratorio reciente',
  'roundMode.sectionTodos': 'Pendientes',
};

export function t(key) {
  if (I18N_ES && Object.prototype.hasOwnProperty.call(I18N_ES, key)) return I18N_ES[key];
  return key;
}

export function applyI18n() {
  const htmlEl = document.documentElement;
  if (htmlEl && htmlEl.getAttribute('lang') !== 'es') htmlEl.setAttribute('lang', 'es');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.type === 'button' || el.type === 'submit' || el.type === 'reset') el.value = val;
      else el.setAttribute('placeholder', val);
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', t(key));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  });
}

function syncThemeSettingsButtons() {
  const isDark = document.documentElement.classList.contains('dark');
  const lightBtn = document.getElementById('settings-theme-light');
  const darkBtn = document.getElementById('settings-theme-dark');
  if (lightBtn) lightBtn.classList.toggle('active', !isDark);
  if (darkBtn) darkBtn.classList.toggle('active', isDark);
}

export function syncThemeToggleIcon() {
  const themeBtn = document.getElementById('theme-toggle');
  if (!themeBtn) return;
  const isDark = document.documentElement.classList.contains('dark');
  themeBtn.innerHTML = isDark ? THEME_ICON_MOON : THEME_ICON_SUN;
}

export function setThemeMode(mode) {
  const isDark = mode === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  syncThemeToggleIcon();
  syncThemeSettingsButtons();
}

export function applyFontZoom() {
  let p = parseInt(localStorage.getItem(FONT_ZOOM_LS) || '100', 10);
  if (!Number.isFinite(p)) p = 100;
  if (p < 90) p = 90;
  if (p > 140) p = 140;
  document.documentElement.style.zoom = String(p / 100);
}

export function syncFontZoomButtons() {
  let p = parseInt(localStorage.getItem(FONT_ZOOM_LS) || '100', 10);
  if (p !== 100 && p !== 110 && p !== 125) p = 100;
  ['100', '110', '125'].forEach((v) => {
    const btn = document.getElementById('settings-font-' + v);
    if (btn) btn.classList.toggle('active', p === parseInt(v, 10));
  });
}

export function setFontZoom(pct) {
  localStorage.setItem(FONT_ZOOM_LS, String(pct));
  applyFontZoom();
  syncFontZoomButtons();
}

export function toggleTheme() {
  setThemeMode(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
}

function isHighContrast() {
  return localStorage.getItem(HIGH_CONTRAST_LS) === '1';
}

export function applyHighContrast() {
  document.documentElement.classList.toggle('high-contrast', isHighContrast());
}

export function syncHighContrastButtons() {
  const on = isHighContrast();
  const onBtn = document.getElementById('settings-hc-on');
  const offBtn = document.getElementById('settings-hc-off');
  if (onBtn) {
    onBtn.classList.toggle('active', on);
    onBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  if (offBtn) {
    offBtn.classList.toggle('active', !on);
    offBtn.setAttribute('aria-pressed', !on ? 'true' : 'false');
  }
}

export function setHighContrast(on) {
  localStorage.setItem(HIGH_CONTRAST_LS, on ? '1' : '0');
  applyHighContrast();
  syncHighContrastButtons();
}

export function toggleHighContrast() {
  setHighContrast(!isHighContrast());
}

export function getUiDensity() {
  const raw = localStorage.getItem(UI_DENSITY_LS);
  if (raw === 'pase' || raw === 'compact') return 'pase';
  if (raw === 'normal' || raw === 'comfortable') return 'normal';
  return 'normal';
}

export function isPaseMode() {
  return getUiDensity() === 'pase';
}

export function markOpenedDetailFromPaseBoard() {
  _openedDetailFromPase = true;
  syncPaseReturnHeaderBtn();
  syncPaseModeHeaderChip();
}

export function clearPaseDetailEscape() {
  _openedDetailFromPase = false;
  syncPaseReturnHeaderBtn();
  syncPaseModeHeaderChip();
}

function paseSectionLabelFromContext() {
  var tab = runtime.getActiveAppTab();
  if (tab === 'lab') return 'Laboratorio';
  if (tab === 'med') return 'Medicamentos';
  if (tab === 'agenda') return 'Agenda';
  if (tab === 'nota') {
    var inner = runtime.getActiveInner() || 'todo';
    if (inner === 'notas') return 'Nota';
    if (inner === 'indica') return 'Indicaciones';
    if (inner === 'tend') return 'Tendencias';
    if (inner === 'cult') return 'Cultivos';
    if (inner === 'listado') return 'Listado';
    if (inner === 'datos') return 'Datos';
    if (inner === 'todo') return 'Pendientes';
  }
  return 'Expediente';
}

export function syncPaseModeHeaderChip() {
  var chip = document.getElementById('header-pase-mode-chip');
  if (!chip) return;
  chip.style.display = getUiDensity() === 'pase' ? 'inline-flex' : 'none';
}

export function exitPaseModeFromHeader() {
  if (getUiDensity() !== 'pase') return;
  clearPaseDetailEscape();
  setUiDensity('normal');
}

export function syncPaseReturnHeaderBtn() {
  var show = _openedDetailFromPase && getUiDensity() === 'normal';
  var crumb = document.getElementById('header-pase-breadcrumb');
  var section = document.getElementById('header-pase-breadcrumb-section');
  var btn = document.getElementById('btn-header-return-pase');
  if (crumb) crumb.style.display = show ? 'inline-flex' : 'none';
  if (section && show) section.textContent = paseSectionLabelFromContext();
  if (btn) btn.style.display = 'none';
  syncPaseModeHeaderChip();
}

export function returnToPaseBoardFromDetail() {
  if (!_openedDetailFromPase) return;
  clearPaseDetailEscape();
  setUiDensity('pase');
  runtime.setRoundOverviewMode(true);
  runtime.switchAppTab('nota');
  if (typeof runtime.renderPaseBoard === 'function') runtime.renderPaseBoard();
}

export function applyUiDensity() {
  document.documentElement.classList.toggle('ui-density-normal', getUiDensity() === 'normal');
  const rondaHint = document.getElementById('sidebar-ronda-hint');
  if (rondaHint) {
    rondaHint.setAttribute('aria-hidden', getUiDensity() === 'pase' ? 'false' : 'true');
  }
  if (isPaseMode()) runtime.setRoundOverviewMode(true);
  var paseRoot = document.getElementById('appcontent-pase');
  if (isPaseMode() && paseRoot) {
    paseRoot.style.display = 'flex';
    paseRoot.style.flexDirection = 'column';
    paseRoot.style.flex = '1';
    paseRoot.style.minHeight = '0';
    paseRoot.style.overflow = 'hidden';
    paseRoot.setAttribute('aria-hidden', 'false');
  } else if (!isPaseMode() && paseRoot) {
    paseRoot.style.display = 'none';
    paseRoot.setAttribute('aria-hidden', 'true');
  }
  runtime.switchAppTab(runtime.getActiveAppTab());
  syncPaseReturnHeaderBtn();
  syncPaseModeHeaderChip();
  if (typeof runtime.syncLabOutputChrome === 'function') runtime.syncLabOutputChrome();
}

export function syncUiDensityButtons() {
  const d = getUiDensity();
  const normalBtn = document.getElementById('settings-density-normal');
  const paseBtn = document.getElementById('settings-density-pase');
  if (normalBtn) {
    normalBtn.classList.toggle('active', d === 'normal');
    normalBtn.setAttribute('aria-pressed', d === 'normal' ? 'true' : 'false');
  }
  if (paseBtn) {
    paseBtn.classList.toggle('active', d === 'pase');
    paseBtn.setAttribute('aria-pressed', d === 'pase' ? 'true' : 'false');
  }
}

export function setUiDensity(mode) {
  let m = mode === 'pase' || mode === 'compact' ? 'pase' : 'normal';
  if (mode === 'comfortable') m = 'normal';
  if (m === 'pase') clearPaseDetailEscape();
  localStorage.setItem(UI_DENSITY_LS, m);
  applyUiDensity();
  syncUiDensityButtons();
  runtime.renderPatientList();
  if (runtime.getActiveId()) {
    requestAnimationFrame(() => runtime.scrollActiveRondaCardIntoView());
  }
  if (runtime.getActiveAppTab() === 'agenda') runtime.renderProcedureAgendaPanel();
}

export function getProcedureAgendaRowPx() {
  return getUiDensity() === 'normal' ? 50 : 42;
}

export function initChromeAppearance() {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
  syncThemeToggleIcon();
  applyHighContrast();
  applyUiDensity();
  applyI18n();
  applyFontZoom();
  syncThemeSettingsButtons();
  syncFontZoomButtons();
  syncHighContrastButtons();
  syncUiDensityButtons();
}

export const windowHandlers = {
  toggleTheme,
  setThemeMode,
  setFontZoom,
  setUiDensity,
  setHighContrast,
  toggleHighContrast,
  returnToPaseBoardFromDetail,
  exitPaseModeFromHeader,
  t,
};

import { normalizeMotionMode, motionClassFor, ALL_MOTION_CLASSES } from '../motion-mode.mjs';
import { isModeSala } from '../mode-features.mjs';
import { openDatePopover, buildDatePopoverQuickFilters } from './workbench/date-popover.mjs';
import { buildLabDaysForCalendar, isoDateKeyLocal } from './workbench/header-date-popover-model.mjs';
import { ensureParsedLabHistory } from '../lab-history-set.mjs';
import { sortLabHistoryChronological } from '../tend-core.mjs';
import { daySelectValue } from '../lab-history-day-view.mjs';

/** Runtime hooks supplied by app.js once shell functions exist. */
let runtime = {
  switchAppTab() {},
  renderPatientList() {},
  scrollActiveRondaCardIntoView() {},
  renderProcedureAgendaPanel() {},
  getActiveAppTab() {
    return 'nota';
  },
  getActiveInner() {
    return 'resumen';
  },
  getActiveId() {
    return null;
  },
};

export function registerChromeRuntime(ctx) {
  if (!ctx || typeof ctx !== 'object') return;
  Object.assign(runtime, ctx);
}

const THEME_ICON_SUN =
  '<svg class="btn-header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
const THEME_ICON_MOON =
  '<svg class="btn-header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

const FONT_ZOOM_LS = 'rpc-font-zoom';
const HIGH_CONTRAST_LS = 'rpc-high-contrast';
const UI_DENSITY_LS = 'rpc-ui-density';
const MOTION_MODE_LS = 'rpc-motion-mode';

const I18N_ES = {
  'settings.appearance': 'Apariencia',
  'settings.theme': 'Tema',
  'settings.appearanceFoot':
    '⌘G/I/S cambian modo Guardia/Inter/Sala. Tamaño escala toda la interfaz. Mixto equilibra las animaciones.',
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
    'Normal: Paciente, Laboratorio, Manejo y Agenda en pestañas completas (vista Ronda centrada).',
  'settings.densityNormal': 'Normal',
  'settings.highContrast': 'Alto contraste',
  'settings.highContrastHint': 'Aumenta el contraste de texto y bordes para mejor legibilidad.',
  'settings.hcOff': 'Desactivado',
  'settings.hcOn': 'Activado',
  'settings.motion': 'Animaciones',
  'settings.motionHint': 'Sobrio: mínimas · Mixto: equilibrado (recomendado) · Expresivo: completas.',
  'settings.motionSobrio': 'Sobrio',
  'settings.motionMixto': 'Mixto',
  'settings.motionExpresivo': 'Expresivo',
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
    'LiveSync: crear o unirse a sala en vivo, copiar invitación. Código del servidor (avanzado): Ajustes → LAN · servidor en esta computadora. Paquete sync JSON: Ajustes → Respaldos, sync y recuperación.',
  'theme.toggle': 'Cambiar tema claro u oscuro',
  'theme.toggleTitle': 'Cambiar tema',
  'appTab.lab': 'Laboratorio',
  'appTab.nota': 'Paciente',
  'appTab.med': 'Manejo',
  'appTab.agenda': 'Agenda',
  'roundMode.hint': '↑ / ↓ · paciente siguiente / anterior',
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

export function getMotionMode() {
  return normalizeMotionMode(localStorage.getItem(MOTION_MODE_LS));
}

export function applyMotionMode() {
  const cls = motionClassFor(getMotionMode());
  ALL_MOTION_CLASSES.forEach((c) => document.documentElement.classList.remove(c));
  if (cls) document.documentElement.classList.add(cls);
}

export function syncMotionButtons() {
  const mode = getMotionMode();
  ['sobrio', 'mixto', 'expresivo'].forEach((m) => {
    const btn = document.getElementById('settings-motion-' + m);
    if (btn) {
      btn.classList.toggle('active', m === mode);
      btn.setAttribute('aria-pressed', m === mode ? 'true' : 'false');
    }
  });
}

export function setMotionMode(mode) {
  localStorage.setItem(MOTION_MODE_LS, normalizeMotionMode(mode));
  applyMotionMode();
  syncMotionButtons();
}

export function getUiDensity() {
  const raw = localStorage.getItem(UI_DENSITY_LS);
  if (raw === 'guardia') return 'guardia';
  return 'normal';
}

export function isGuardiaMode() {
  return getUiDensity() === 'guardia';
}

export function getWorkMode() {
  if (isGuardiaMode()) return 'guardia';
  var st = null;
  try {
    st = JSON.parse(localStorage.getItem('rpc-settings') || 'null');
  } catch {
    st = null;
  }
  return isModeSala(st) ? 'sala' : 'interconsulta';
}


export function collapseHeaderModeSeg() {
  var seg = document.getElementById('header-mode-seg');
  if (!seg) return;
  seg.classList.remove('is-expanded');
  seg.setAttribute('aria-expanded', 'false');
}

export function toggleHeaderModeSegExpand() {
  var seg = document.getElementById('header-mode-seg');
  if (!seg) return false;
  var next = !seg.classList.contains('is-expanded');
  seg.classList.toggle('is-expanded', next);
  seg.setAttribute('aria-expanded', next ? 'true' : 'false');
  return next;
}

function initHeaderModeSegInteractions() {
  if (typeof document === 'undefined' || document._rpcHeaderModeSegWired) return;
  document._rpcHeaderModeSegWired = true;
  var seg = document.getElementById('header-mode-seg');
  if (!seg) return;
  seg.setAttribute('aria-expanded', 'false');
  document.addEventListener('click', function (ev) {
    if (!seg.classList.contains('is-expanded')) return;
    if (seg.contains(ev.target)) return;
    collapseHeaderModeSeg();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && seg.classList.contains('is-expanded')) {
      collapseHeaderModeSeg();
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderModeSegInteractions);
  } else {
    initHeaderModeSegInteractions();
  }
}

/** Active patient's parsed lab history, newest-first (empty when no patient is active). */
function activePatientLabSets() {
  var pid = runtime.getActiveId();
  if (!pid) return { pid: null, sets: [] };
  var raw = ensureParsedLabHistory(pid, { readOnly: true });
  return { pid: pid, sets: sortLabHistoryChronological(raw || []) };
}

/**
 * README 11b: calendar popover anchored to the header date. Folds the
 * "Días con labs" quick-nav (mockup L262) into the same 286px popover.
 * Selecting a lab day switches to Laboratorio and jumps the day picker there.
 */
export function openHeaderDatePopoverFromChrome(ev) {
  if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
  var anchor = document.getElementById('today-date');
  if (!anchor) return;
  var today = new Date();
  var ctx = activePatientLabSets();
  var model = buildLabDaysForCalendar({ sets: ctx.sets, todayIso: isoDateKeyLocal(today) });
  openDatePopover(anchor, {
    today: today,
    hasData: model.hasData,
    loadedRangeLabel: model.loadedRangeLabel,
    quickFilters: buildDatePopoverQuickFilters({}),
    labDays: model.labDays,
    onSelectLabDay: function (dayKey) {
      var picked = model.labDays.find(function (d) {
        return d.dayKey === dayKey;
      });
      if (!ctx.pid || !picked || !picked.rawFecha) return;
      runtime.switchAppTab('lab');
      var value = daySelectValue(picked.rawFecha);
      import('./lab-panel-history.mjs').then(function (mod) {
        if (typeof mod.onLabHistoryDateChange === 'function') mod.onLabHistoryDateChange(value);
        if (typeof mod.syncLabHistoryDateSelect === 'function') {
          mod.syncLabHistoryDateSelect({ preferSetId: value });
        }
      });
    },
  });
}

export function syncHeaderModeSeg() {
  var seg = document.getElementById('header-mode-seg');
  if (!seg) return;
  var mode = getWorkMode();
  seg.querySelectorAll('.header-mode-seg-btn').forEach(function (btn) {
    var on = btn.dataset.mode === mode;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

export function toggleGuardiaMode() {
  if (isGuardiaMode()) {
    void import('./entrega-roster-panel.mjs').then(({ closeEntregaRosterPanel }) => {
      closeEntregaRosterPanel();
    });
    void import('./clinical-entrega.mjs').then(({ endEntregaPhase }) => {
      endEntregaPhase();
    });
    void import('./guardia-phase-bar.mjs').then(({ teardownGuardiaPhaseBar }) => {
      teardownGuardiaPhaseBar();
    });
    setUiDensity('normal');
    return;
  }
  setUiDensity('guardia');
}

export function exitGuardiaModeFromHeader() {
  if (isGuardiaMode()) setUiDensity('normal');
}

export function applyUiDensity() {
  const density = getUiDensity();
  document.documentElement.classList.toggle('ui-density-normal', density === 'normal');
  document.documentElement.classList.toggle('ui-density-guardia', density === 'guardia');
  const rondaHint = document.getElementById('sidebar-ronda-hint');
  if (rondaHint) {
    rondaHint.setAttribute('aria-hidden', density !== 'normal' ? 'false' : 'true');
  }
  var guardiaRoot = document.getElementById('appcontent-guardia');
  if (guardiaRoot && !isGuardiaMode()) {
    guardiaRoot.style.display = 'none';
    guardiaRoot.setAttribute('aria-hidden', 'true');
  }
  runtime.switchAppTab(runtime.getActiveAppTab());
  syncHeaderModeSeg();
  if (typeof runtime.renderPatientList === 'function') {
    runtime.renderPatientList({ silent: true });
  }
  if (typeof runtime.renderGuardiaBoard === 'function' && isGuardiaMode()) {
    runtime.renderGuardiaBoard();
  }
  if (typeof runtime.syncLabOutputChrome === 'function') runtime.syncLabOutputChrome();
}

export function syncUiDensityButtons() {
  const d = getUiDensity();
  const normalBtn = document.getElementById('settings-density-normal');
  if (normalBtn) {
    normalBtn.classList.toggle('active', d === 'normal');
    normalBtn.setAttribute('aria-pressed', d === 'normal' ? 'true' : 'false');
  }
}

export function setUiDensity(mode) {
  let m = mode === 'guardia' ? 'guardia' : 'normal';
  localStorage.setItem(UI_DENSITY_LS, m);
  applyUiDensity();
  syncUiDensityButtons();
  void import('./clinical-rotation-entry.mjs').then((mod) => {
    mod.syncClinicalRotationEntryChrome?.();
  });
  runtime.renderPatientList();
  if (runtime.getActiveId()) {
    requestAnimationFrame(() => runtime.scrollActiveRondaCardIntoView());
  }
  if (runtime.getActiveAppTab() === 'agenda') runtime.renderProcedureAgendaPanel();
  if (isGuardiaMode() && typeof runtime.renderGuardiaBoard === 'function') {
    runtime.renderGuardiaBoard();
  }
}

export function getProcedureAgendaRowPx() {
  return getUiDensity() === 'normal' ? 50 : 42;
}

export function initChromeAppearance() {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
  // Solo cuando main.js desactivó la aceleración por hardware (performance.json):
  // backdrop-filter caería a render por software, así que el glass degrada a no-blur.
  // (Antes comprobaba window.rpcAPI, global que no existe — nunca se aplicaba.)
  if (window.electronAPI && window.electronAPI.isSoftwareRender) {
    document.documentElement.classList.add('no-blur');
  }
  syncThemeToggleIcon();
  applyHighContrast();
  applyMotionMode();
  applyUiDensity();
  syncHeaderModeSeg();
  applyI18n();
  applyFontZoom();
  syncThemeSettingsButtons();
  syncFontZoomButtons();
  syncHighContrastButtons();
  syncMotionButtons();
  syncUiDensityButtons();
}

export function launchConfetti() {
  var colors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb7185'];
  for (var i = 0; i < 40; i++) {
    (function (idx) {
      setTimeout(function () {
        var el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left = Math.random() * 100 + 'vw';
        el.style.top = '-10px';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = Math.random() * 0.5 + 's';
        el.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
        document.body.appendChild(el);
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 3500);
      }, idx * 40);
    })(i);
  }
}

export const windowHandlers = {
  toggleTheme,
  setThemeMode,
  setFontZoom,
  setUiDensity,
  setHighContrast,
  toggleHighContrast,
  setMotionMode,
  toggleGuardiaMode,
  exitGuardiaModeFromHeader,
  openHeaderDatePopoverFromChrome,
  t,
};

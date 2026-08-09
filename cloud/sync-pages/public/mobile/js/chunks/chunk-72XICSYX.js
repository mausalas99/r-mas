import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";

// public/js/motion-mode.mjs
var MOTION_MODES = ["sobrio", "mixto", "expresivo"];
var ALL_MOTION_CLASSES = ["motion-sobrio", "motion-expresivo"];
function normalizeMotionMode(raw) {
  return MOTION_MODES.includes(raw) ? raw : "mixto";
}
function motionClassFor(mode) {
  const m = normalizeMotionMode(mode);
  return m === "mixto" ? null : "motion-" + m;
}

// public/js/features/chrome-pase-label.mjs
var NOTA_INNER_LABELS = {
  notas: "Nota",
  indica: "Indicaciones",
  tend: "Tendencias",
  cult: "Cultivos",
  listado: "Listado",
  datos: "Datos",
  todo: "Pendientes",
  manejo: "Manejo",
  recetaHu: "Receta HU"
};
var TAB_LABELS = {
  lab: "Laboratorio",
  med: "Manejo",
  agenda: "Agenda"
};
function paseSectionLabelFromTab(tab, inner) {
  if (TAB_LABELS[tab]) return TAB_LABELS[tab];
  if (tab !== "nota") return "Expediente";
  const key = inner || "todo";
  return NOTA_INNER_LABELS[key] || "Expediente";
}

// public/js/features/chrome.mjs
var runtime = {
  switchAppTab() {
  },
  renderPatientList() {
  },
  scrollActiveRondaCardIntoView() {
  },
  renderProcedureAgendaPanel() {
  },
  getActiveAppTab() {
    return "lab";
  },
  getActiveInner() {
    return "todo";
  },
  getActiveId() {
    return null;
  },
  setRoundOverviewMode() {
  },
  renderPaseBoard() {
  }
};
var _openedDetailFromPase = false;
function registerChromeRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(runtime, ctx);
}
var THEME_ICON_SUN = '<svg class="btn-header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
var THEME_ICON_MOON = '<svg class="btn-header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
var FONT_ZOOM_LS = "rpc-font-zoom";
var HIGH_CONTRAST_LS = "rpc-high-contrast";
var UI_DENSITY_LS = "rpc-ui-density";
var MOTION_MODE_LS = "rpc-motion-mode";
var I18N_ES = {
  "settings.appearance": "Apariencia",
  "settings.theme": "Tema",
  "settings.appearanceFoot": "\u2318G/I/P/S cambian modo Guardia/Inter/Pase/Sala. Tama\xF1o escala toda la interfaz. Mixto equilibra las animaciones.",
  "settings.themeGroup": "Tema de la aplicaci\xF3n",
  "settings.themeLight": "Claro",
  "settings.themeDark": "Oscuro",
  "settings.fontSize": "Tama\xF1o de texto",
  "settings.fontSizeHint": "Escala toda la interfaz (\xFAtil en pantallas peque\xF1as).",
  "settings.fontNormal": "Normal",
  "settings.fontLarge": "Grande",
  "settings.fontXLarge": "M\xE1s grande",
  "settings.uiDensity": "Modo de vista",
  "settings.uiDensityHint": "Normal: Laboratorio, Expediente, Manejo y Agenda en pesta\xF1as completas (vista Ronda centrada). Pase: resumen del paciente en una columna; pulsa un t\xEDtulo de secci\xF3n para abrir el detalle en Normal. \u2318P o Ctrl+P abre Modo Pase.",
  "settings.densityNormal": "Normal",
  "settings.densityPase": "Pase",
  "settings.highContrast": "Alto contraste",
  "settings.highContrastHint": "Aumenta el contraste de texto y bordes para mejor legibilidad.",
  "settings.hcOff": "Desactivado",
  "settings.hcOn": "Activado",
  "settings.motion": "Animaciones",
  "settings.motionHint": "Sobrio: m\xEDnimas \xB7 Mixto: equilibrado (recomendado) \xB7 Expresivo: completas.",
  "settings.motionSobrio": "Sobrio",
  "settings.motionMixto": "Mixto",
  "settings.motionExpresivo": "Expresivo",
  "settings.docsFolder": "Carpeta de documentos",
  "settings.docsFolderHint": "Los .docx generados se guardan aqu\xED (si no eliges carpeta, se usa Descargas).",
  "settings.backup": "Respaldo local",
  "settings.backupHint": "Exporta o restaura pacientes, notas e indicaciones (JSON).",
  "settings.application": "Aplicaci\xF3n",
  "settings.quickHelp": "Centro de ayuda \xB7 atajos y tours",
  "settings.version": "Versi\xF3n",
  "settings.checkUpdates": "Buscar actualizaciones\u2026",
  "settings.open": "Abrir ajustes",
  "settings.openTitle": "Ajustes",
  "settings.teamSyncAria": "Abrir conexi\xF3n LAN y LiveSync (salas)",
  "settings.teamSyncTitle": "LiveSync: crear o unirse a sala en vivo, copiar invitaci\xF3n. C\xF3digo del servidor (avanzado): Ajustes \u2192 LAN \xB7 servidor en esta computadora. Paquete sync JSON: Ajustes \u2192 Respaldos, sync y recuperaci\xF3n.",
  "theme.toggle": "Cambiar tema claro u oscuro",
  "theme.toggleTitle": "Cambiar tema",
  "appTab.lab": "Laboratorio",
  "appTab.nota": "Expediente",
  "appTab.med": "Manejo",
  "appTab.agenda": "Agenda",
  "roundMode.hint": "Ronda: paciente siguiente / anterior",
  "roundMode.seenTitle": "Visto en ronda (se reinicia cada d\xEDa)",
  "roundMode.sectionNota": "Nota e indicaciones",
  "roundMode.sectionLabs": "Laboratorio reciente",
  "roundMode.sectionTodos": "Pendientes"
};
function t(key) {
  if (I18N_ES && Object.prototype.hasOwnProperty.call(I18N_ES, key)) return I18N_ES[key];
  return key;
}
function applyI18n() {
  const htmlEl = document.documentElement;
  if (htmlEl && htmlEl.getAttribute("lang") !== "es") htmlEl.setAttribute("lang", "es");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const val = t(key);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      if (el.type === "button" || el.type === "submit" || el.type === "reset") el.value = val;
      else el.setAttribute("placeholder", val);
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria-label");
    if (key) el.setAttribute("aria-label", t(key));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.setAttribute("title", t(key));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", t(key));
  });
}
function syncThemeSettingsButtons() {
  const isDark = document.documentElement.classList.contains("dark");
  const lightBtn = document.getElementById("settings-theme-light");
  const darkBtn = document.getElementById("settings-theme-dark");
  if (lightBtn) lightBtn.classList.toggle("active", !isDark);
  if (darkBtn) darkBtn.classList.toggle("active", isDark);
}
function syncThemeToggleIcon() {
  const themeBtn = document.getElementById("theme-toggle");
  if (!themeBtn) return;
  const isDark = document.documentElement.classList.contains("dark");
  themeBtn.innerHTML = isDark ? THEME_ICON_MOON : THEME_ICON_SUN;
}
function setThemeMode(mode) {
  const isDark = mode === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
  syncThemeToggleIcon();
  syncThemeSettingsButtons();
}
function applyFontZoom() {
  let p = parseInt(localStorage.getItem(FONT_ZOOM_LS) || "100", 10);
  if (!Number.isFinite(p)) p = 100;
  if (p < 90) p = 90;
  if (p > 140) p = 140;
  document.documentElement.style.zoom = String(p / 100);
}
function syncFontZoomButtons() {
  let p = parseInt(localStorage.getItem(FONT_ZOOM_LS) || "100", 10);
  if (p !== 100 && p !== 110 && p !== 125) p = 100;
  ["100", "110", "125"].forEach((v) => {
    const btn = document.getElementById("settings-font-" + v);
    if (btn) btn.classList.toggle("active", p === parseInt(v, 10));
  });
}
function setFontZoom(pct) {
  localStorage.setItem(FONT_ZOOM_LS, String(pct));
  applyFontZoom();
  syncFontZoomButtons();
}
function toggleTheme() {
  setThemeMode(document.documentElement.classList.contains("dark") ? "light" : "dark");
}
function isHighContrast() {
  return localStorage.getItem(HIGH_CONTRAST_LS) === "1";
}
function applyHighContrast() {
  document.documentElement.classList.toggle("high-contrast", isHighContrast());
}
function syncHighContrastButtons() {
  const on = isHighContrast();
  const onBtn = document.getElementById("settings-hc-on");
  const offBtn = document.getElementById("settings-hc-off");
  if (onBtn) {
    onBtn.classList.toggle("active", on);
    onBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (offBtn) {
    offBtn.classList.toggle("active", !on);
    offBtn.setAttribute("aria-pressed", !on ? "true" : "false");
  }
}
function setHighContrast(on) {
  localStorage.setItem(HIGH_CONTRAST_LS, on ? "1" : "0");
  applyHighContrast();
  syncHighContrastButtons();
}
function toggleHighContrast() {
  setHighContrast(!isHighContrast());
}
function getMotionMode() {
  return normalizeMotionMode(localStorage.getItem(MOTION_MODE_LS));
}
function applyMotionMode() {
  const cls = motionClassFor(getMotionMode());
  ALL_MOTION_CLASSES.forEach((c) => document.documentElement.classList.remove(c));
  if (cls) document.documentElement.classList.add(cls);
}
function syncMotionButtons() {
  const mode = getMotionMode();
  ["sobrio", "mixto", "expresivo"].forEach((m) => {
    const btn = document.getElementById("settings-motion-" + m);
    if (btn) {
      btn.classList.toggle("active", m === mode);
      btn.setAttribute("aria-pressed", m === mode ? "true" : "false");
    }
  });
}
function setMotionMode(mode) {
  localStorage.setItem(MOTION_MODE_LS, normalizeMotionMode(mode));
  applyMotionMode();
  syncMotionButtons();
}
function getUiDensity() {
  const raw = localStorage.getItem(UI_DENSITY_LS);
  if (raw === "guardia") return "guardia";
  if (raw === "pase" || raw === "compact") return "pase";
  if (raw === "normal" || raw === "comfortable") return "normal";
  return "normal";
}
function isPaseMode() {
  return getUiDensity() === "pase";
}
function isGuardiaMode() {
  return getUiDensity() === "guardia";
}
function getWorkMode() {
  if (isGuardiaMode()) return "guardia";
  if (isPaseMode()) return "pase";
  var st = null;
  try {
    st = JSON.parse(localStorage.getItem("rpc-settings") || "null");
  } catch {
    st = null;
  }
  return isModeSala(st) ? "sala" : "interconsulta";
}
function collapseHeaderModeSeg() {
  var seg = document.getElementById("header-mode-seg");
  if (!seg) return;
  seg.classList.remove("is-expanded");
  seg.setAttribute("aria-expanded", "false");
}
function toggleHeaderModeSegExpand() {
  var seg = document.getElementById("header-mode-seg");
  if (!seg) return false;
  var next = !seg.classList.contains("is-expanded");
  seg.classList.toggle("is-expanded", next);
  seg.setAttribute("aria-expanded", next ? "true" : "false");
  return next;
}
function initHeaderModeSegInteractions() {
  if (typeof document === "undefined" || document._rpcHeaderModeSegWired) return;
  document._rpcHeaderModeSegWired = true;
  var seg = document.getElementById("header-mode-seg");
  if (!seg) return;
  seg.setAttribute("aria-expanded", "false");
  document.addEventListener("click", function(ev) {
    if (!seg.classList.contains("is-expanded")) return;
    if (seg.contains(ev.target)) return;
    collapseHeaderModeSeg();
  });
  document.addEventListener("keydown", function(ev) {
    if (ev.key === "Escape" && seg.classList.contains("is-expanded")) {
      collapseHeaderModeSeg();
    }
  });
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeaderModeSegInteractions);
  } else {
    initHeaderModeSegInteractions();
  }
}
function syncHeaderModeSeg() {
  var seg = document.getElementById("header-mode-seg");
  if (!seg) return;
  var mode = getWorkMode();
  seg.querySelectorAll(".header-mode-seg-btn").forEach(function(btn) {
    var on = btn.dataset.mode === mode;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}
function markOpenedDetailFromPaseBoard() {
  _openedDetailFromPase = true;
  syncPaseReturnHeaderBtn();
  syncHeaderModeSeg();
}
function clearPaseDetailEscape() {
  _openedDetailFromPase = false;
  syncPaseReturnHeaderBtn();
  syncHeaderModeSeg();
}
function paseSectionLabelFromContext() {
  return paseSectionLabelFromTab(runtime.getActiveAppTab(), runtime.getActiveInner());
}
function toggleGuardiaMode() {
  if (isGuardiaMode()) {
    void import("/mobile/js/chunks/entrega-roster-panel-WNJRUB53.js").then(({ closeEntregaRosterPanel }) => {
      closeEntregaRosterPanel();
    });
    void import("/mobile/js/chunks/clinical-entrega-WQA6Z52S.js").then(({ endEntregaPhase }) => {
      endEntregaPhase();
    });
    void import("/mobile/js/chunks/guardia-phase-bar-DNRRSUBM.js").then(({ teardownGuardiaPhaseBar }) => {
      teardownGuardiaPhaseBar();
    });
    setUiDensity("normal");
    return;
  }
  clearPaseDetailEscape();
  setUiDensity("guardia");
}
function exitGuardiaModeFromHeader() {
  if (isGuardiaMode()) setUiDensity("normal");
}
function exitPaseModeFromHeader() {
  if (getUiDensity() !== "pase") return;
  clearPaseDetailEscape();
  setUiDensity("normal");
}
function syncPaseReturnHeaderBtn() {
  var show = _openedDetailFromPase && getUiDensity() === "normal";
  var crumb = document.getElementById("header-pase-breadcrumb");
  var section = document.getElementById("header-pase-breadcrumb-section");
  var btn = document.getElementById("btn-header-return-pase");
  if (crumb) crumb.style.display = show ? "inline-flex" : "none";
  if (section && show) section.textContent = paseSectionLabelFromContext();
  if (btn) btn.style.display = "none";
  syncHeaderModeSeg();
}
function returnToPaseBoardFromDetail() {
  if (!_openedDetailFromPase) return;
  clearPaseDetailEscape();
  setUiDensity("pase");
  runtime.setRoundOverviewMode(true);
  runtime.switchAppTab("nota");
  if (typeof runtime.renderPaseBoard === "function") runtime.renderPaseBoard();
}
function applyUiDensity() {
  const density = getUiDensity();
  document.documentElement.classList.toggle("ui-density-normal", density === "normal");
  document.documentElement.classList.toggle("ui-density-guardia", density === "guardia");
  const rondaHint = document.getElementById("sidebar-ronda-hint");
  if (rondaHint) {
    rondaHint.setAttribute("aria-hidden", density !== "normal" ? "false" : "true");
  }
  if (isPaseMode()) runtime.setRoundOverviewMode(true);
  var paseRoot = document.getElementById("appcontent-pase");
  if (isPaseMode() && paseRoot) {
    paseRoot.style.display = "flex";
    paseRoot.style.flexDirection = "column";
    paseRoot.style.flex = "1";
    paseRoot.style.minHeight = "0";
    paseRoot.style.overflow = "hidden";
    paseRoot.setAttribute("aria-hidden", "false");
  } else if (paseRoot) {
    paseRoot.style.display = "none";
    paseRoot.setAttribute("aria-hidden", "true");
  }
  var guardiaRoot = document.getElementById("appcontent-guardia");
  if (guardiaRoot && !isGuardiaMode()) {
    guardiaRoot.style.display = "none";
    guardiaRoot.setAttribute("aria-hidden", "true");
  }
  runtime.switchAppTab(runtime.getActiveAppTab());
  syncPaseReturnHeaderBtn();
  syncHeaderModeSeg();
  if (typeof runtime.renderPatientList === "function") {
    runtime.renderPatientList({ silent: true });
  }
  if (typeof runtime.renderGuardiaBoard === "function" && isGuardiaMode()) {
    runtime.renderGuardiaBoard();
  }
  if (typeof runtime.syncLabOutputChrome === "function") runtime.syncLabOutputChrome();
}
function syncUiDensityButtons() {
  const d = getUiDensity();
  const normalBtn = document.getElementById("settings-density-normal");
  const paseBtn = document.getElementById("settings-density-pase");
  if (normalBtn) {
    normalBtn.classList.toggle("active", d === "normal");
    normalBtn.setAttribute("aria-pressed", d === "normal" ? "true" : "false");
  }
  if (paseBtn) {
    paseBtn.classList.toggle("active", d === "pase");
    paseBtn.setAttribute("aria-pressed", d === "pase" ? "true" : "false");
  }
}
function setUiDensity(mode) {
  let m = mode === "guardia" ? "guardia" : mode === "pase" || mode === "compact" ? "pase" : "normal";
  if (mode === "comfortable") m = "normal";
  if (m === "pase" || m === "guardia") clearPaseDetailEscape();
  localStorage.setItem(UI_DENSITY_LS, m);
  applyUiDensity();
  syncUiDensityButtons();
  void import("/mobile/js/chunks/clinical-rotation-entry-ZNLXERIG.js").then((mod) => {
    mod.syncClinicalRotationEntryChrome?.();
  });
  runtime.renderPatientList();
  if (runtime.getActiveId()) {
    requestAnimationFrame(() => runtime.scrollActiveRondaCardIntoView());
  }
  if (runtime.getActiveAppTab() === "agenda") runtime.renderProcedureAgendaPanel();
  if (isGuardiaMode() && typeof runtime.renderGuardiaBoard === "function") {
    runtime.renderGuardiaBoard();
  }
}
function getProcedureAgendaRowPx() {
  return getUiDensity() === "normal" ? 50 : 42;
}
function initChromeAppearance() {
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
  if (window.electronAPI && window.electronAPI.isSoftwareRender) {
    document.documentElement.classList.add("no-blur");
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
function launchConfetti() {
  var colors = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#fb7185"];
  for (var i = 0; i < 40; i++) {
    (function(idx) {
      setTimeout(function() {
        var el = document.createElement("div");
        el.className = "confetti-piece";
        el.style.left = Math.random() * 100 + "vw";
        el.style.top = "-10px";
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = Math.random() * 0.5 + "s";
        el.style.transform = "rotate(" + Math.random() * 360 + "deg)";
        document.body.appendChild(el);
        setTimeout(function() {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 3500);
      }, idx * 40);
    })(i);
  }
}
var windowHandlers = {
  toggleTheme,
  setThemeMode,
  setFontZoom,
  setUiDensity,
  setHighContrast,
  toggleHighContrast,
  setMotionMode,
  returnToPaseBoardFromDetail,
  exitPaseModeFromHeader,
  toggleGuardiaMode,
  exitGuardiaModeFromHeader,
  t
};

export {
  registerChromeRuntime,
  t,
  syncFontZoomButtons,
  syncHighContrastButtons,
  getUiDensity,
  isPaseMode,
  isGuardiaMode,
  collapseHeaderModeSeg,
  toggleHeaderModeSegExpand,
  syncHeaderModeSeg,
  markOpenedDetailFromPaseBoard,
  toggleGuardiaMode,
  exitPaseModeFromHeader,
  syncPaseReturnHeaderBtn,
  syncUiDensityButtons,
  setUiDensity,
  getProcedureAgendaRowPx,
  initChromeAppearance,
  launchConfetti,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-72XICSYX.js.map

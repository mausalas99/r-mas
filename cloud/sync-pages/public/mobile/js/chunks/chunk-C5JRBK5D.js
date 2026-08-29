import {
  openQuickHelp
} from "/mobile/js/chunks/chunk-X5Z2L3WJ.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/features/settings-help/shortcuts-data.mjs
function modKeyLabel() {
  if (typeof navigator !== "undefined" && navigator.platform && /Mac/i.test(navigator.platform)) {
    return "\u2318";
  }
  return "Ctrl";
}
var SHORTCUT_GROUPS = [
  {
    title: "Pesta\xF1as principales",
    items: [
      { keys: ["\u2318", "1"], label: "Paciente", hint: "Repite Resumen \u2192 Cl\xEDnico \u2192 Salida" },
      { keys: ["\u2318", "\u21A9"], label: "Volver a Resumen", hint: "Desde cualquier sitio" },
      { keys: ["\u2318", "2"], label: "Laboratorio", hint: "Repite Labs \u2192 Tendencias \u2192 Cultivos" },
      { keys: ["\u2318", "3"], label: "Manejo", hint: "Repite Manejo \u2194 Perfil" },
      { keys: ["\u2318", "4"], label: "Agenda", hint: "Repite semana actual" },
      { keys: ["\u2318", "\u21E7", "3"], label: "Manejo: Completa \u2194 Nombre+D\xEDa" },
      { keys: ["\u2318", "["], label: "Agenda \xB7 semana anterior" },
      { keys: ["\u2318", "]"], label: "Agenda \xB7 semana siguiente" }
    ]
  },
  {
    title: "Modos de trabajo",
    items: [
      { keys: ["\u2318", "G"], label: "Guardia" },
      { keys: ["\u2318", "I"], label: "Interconsulta" },
      { keys: ["\u2318", "S"], label: "Sala" }
    ]
  },
  {
    title: "Paciente y acciones",
    items: [
      { keys: ["\u2193"], label: "Paciente siguiente", hint: "No aplica al escribir" },
      { keys: ["\u2191"], label: "Paciente anterior", hint: "No aplica al escribir" },
      { keys: ["\u2318", "N"], label: "Nuevo paciente" },
      { keys: ["\u2318", "E"], label: "Estado actual" },
      { keys: ["\u2318", "T"], label: "Tendencias / Cultivos" },
      { keys: ["\u2318", "D"], label: "Datos del paciente" },
      { keys: ["\u2318", "M"], label: "Manejo" },
      { keys: ["\u2318", "\u21E7", "S"], label: "Guardar paciente activo" },
      { keys: ["\u2318", "\u21E7", "C"], label: "Copiar labs del equipo", hint: "Solo pacientes fijados" }
    ]
  },
  {
    title: "Aplicaci\xF3n",
    items: [
      { keys: ["\u2318", "/"], label: "Mostrar esta hoja de atajos" },
      { keys: ["\u2318", "K"], label: "Ir a secci\xF3n, paciente o acci\xF3n" },
      { keys: ["\u2318", ","], label: "Ajustes" },
      { keys: ["\u2318", "\u21E7", "P"], label: "Mi Perfil" },
      { keys: ["\u2318", "\u21E7", ","], label: "Importar JSON \xB7 sobrescribir conflictos" },
      { keys: ["Esc"], label: "Cerrar ventana o men\xFA" }
    ]
  }
];

// public/js/features/settings-help/shortcuts-modal.mjs
var peekMode = false;
var bodyRendered = false;
function modGlyph() {
  return modKeyLabel();
}
function formatKeyLabel(key) {
  var mod = modGlyph();
  return String(key).replace(/⌘/g, mod).replace(/Ctrl/g, mod);
}
function renderKeyGroup(keys) {
  return '<span class="shortcuts-key-group">' + keys.map(function(k) {
    return '<kbd class="shortcuts-key">' + esc(formatKeyLabel(k)) + "</kbd>";
  }).join("") + "</span>";
}
function renderShortcutsBody() {
  var container = document.getElementById("shortcuts-modal-body");
  if (!container) return;
  var mod = modGlyph();
  container.innerHTML = SHORTCUT_GROUPS.map(function(group) {
    return '<section class="shortcuts-section"><h4 class="shortcuts-section-title">' + esc(group.title) + '</h4><ul class="shortcuts-rows">' + group.items.map(function(item) {
      var hint = item.hint ? '<span class="shortcuts-row-hint">' + esc(item.hint) + "</span>" : "";
      return '<li class="shortcuts-row"><div class="shortcuts-row-copy"><span class="shortcuts-row-label">' + esc(item.label) + "</span>" + hint + "</div>" + renderKeyGroup(item.keys) + "</li>";
    }).join("") + "</ul></section>";
  }).join("");
  var hintMod = document.getElementById("shortcuts-modal-hint-mod");
  if (hintMod) hintMod.textContent = mod;
  var hdrBtn = document.getElementById("btn-header-shortcuts");
  if (hdrBtn) hdrBtn.title = "Atajos de teclado (" + mod + "/)";
  bodyRendered = true;
}
function syncPeekChrome() {
  var backdrop = document.getElementById("shortcuts-backdrop");
  if (!backdrop) return;
  backdrop.classList.toggle("shortcuts-backdrop--peek", peekMode);
}
function openShortcutsModal(opts) {
  var el = document.getElementById("shortcuts-backdrop");
  if (!el) return;
  peekMode = !!(opts && opts.peek);
  if (!bodyRendered) renderShortcutsBody();
  syncPeekChrome();
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
}
function closeShortcutsModal() {
  var el = document.getElementById("shortcuts-backdrop");
  if (!el) return;
  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
  el.classList.remove("shortcuts-backdrop--peek");
  peekMode = false;
  syncPeekChrome();
}
function closeShortcutsPeek() {
  if (peekMode) closeShortcutsModal();
}
function isShortcutsModalOpen() {
  var el = document.getElementById("shortcuts-backdrop");
  return el && el.classList.contains("open");
}
function isShortcutsPeekMode() {
  return peekMode;
}
function openShortcutsHelpCenter() {
  closeShortcutsModal();
  openQuickHelp("atajos");
}
function resetShortcutsModalStateForTests() {
  peekMode = false;
  bodyRendered = false;
}

export {
  openShortcutsModal,
  closeShortcutsModal,
  closeShortcutsPeek,
  isShortcutsModalOpen,
  isShortcutsPeekMode,
  openShortcutsHelpCenter,
  resetShortcutsModalStateForTests
};
//# sourceMappingURL=/js/chunks/chunk-C5JRBK5D.js.map

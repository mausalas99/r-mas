import { esc } from '../dom-escape.mjs';
// Undo, focus mode, unified search, plantillas extra, atajos (Bloque F)
import { getPatients, getNotes, getIndicaciones, getLabHistory, getMedRecetaByPatient, replaceAppStateFromBackupData, persistClinicalState } from "../app-state.mjs";
import { getPatientsForDisplay } from "../clinical-read-model-demo.mjs";
import { storage } from "../storage.js";
import { isPitchPatientIsolationActive } from "../tour-pitch-demo-seed.mjs";
import { handleCensusWalkKeydown } from "./patients-census-walk.mjs";
import { openConfirm } from "./workbench/confirm.mjs";

let rt = {
  getActiveId() {
    return null;
  },
  getSettings() {
    return /** @type {any} */ ({});
  },
  selectPatient(_id) {
    void _id;
  },
  switchAppTab(_t) {
    void _t;
  },
  switchInnerTab(_t) {
    void _t;
  },
  persistClinicalState() {},
  renderIndicaForm() {},
  closeSettingsDropdown() {},
  openAddModal() {},
  addAuditEntry() {},
  showToast() {},
  advanceRondaPatient(_dir) {
    void _dir;
  },
};

export function registerProductivityRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt, ctx);
}

var UNDO_STACK_KEY = "rpc-undo-stack";
var FOCUS_MODE_KEY = "rpc-focus-mode";
var UNDO_STACK_MAX = 5;

function cloneForUndo(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function buildUndoSnapshotPayload(label) {
  return {
    label: label || "operación",
    at: new Date().toISOString(),
    theme: localStorage.getItem("theme") || "light",
    activeId: rt.getActiveId(),
    data: {
      patients: cloneForUndo(getPatients()) || [],
      notes: cloneForUndo(getNotes()) || {},
      indicaciones: cloneForUndo(getIndicaciones()) || {},
      labHistory: cloneForUndo(getLabHistory()) || {},
      medRecetaByPatient: cloneForUndo(getMedRecetaByPatient()) || [],
      scheduledProcedures: cloneForUndo(storage.getScheduledProcedures()) || [],
      settings: cloneForUndo(rt.getSettings()) || {},
      medCatalog: cloneForUndo(storage.getMedCatalog()) || storage.getMedCatalog(),
    },
  };
}

function getUndoStack() {
  try {
    var arr = JSON.parse(localStorage.getItem(UNDO_STACK_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveUndoStack(stack) {
  var trimmed = (stack || []).slice(0, UNDO_STACK_MAX);
  if (!trimmed.length) {
    try {
      localStorage.removeItem(UNDO_STACK_KEY);
    } catch (_e) { void _e; }
    return;
  }
  var droppedForQuota = false;
  while (trimmed.length) {
    try {
      localStorage.setItem(UNDO_STACK_KEY, JSON.stringify(trimmed));
      if (droppedForQuota) {
        console.warn(
          '[productivity] undo stack exceeded storage quota, kept only',
          trimmed.length,
          'of',
          (stack || []).length,
          'snapshots'
        );
      }
      return;
    } catch (e) {
      droppedForQuota = true;
      trimmed.pop();
    }
  }
  console.warn('[productivity] undo stack exceeded storage quota even at 1 snapshot, cleared it', stack && stack[0]);
  try {
    localStorage.removeItem(UNDO_STACK_KEY);
  } catch (_e) { void _e; }
}

export function pushUndoSnapshot(label) {
  var snap = buildUndoSnapshotPayload(label);
  var stack = getUndoStack();
  stack.unshift(snap);
  saveUndoStack(stack);
  refreshUndoButtonState();
  rt.addAuditEntry("undo-snapshot", "ok", 0, snap.label);
}

export function refreshUndoButtonState() {
  var btn = document.getElementById("btn-undo-op");
  if (!btn) return;
  var stack = getUndoStack();
  btn.disabled = stack.length === 0;
  if (stack.length > 0) {
    btn.textContent = "Deshacer: " + (stack[0].label || "última operación");
  } else {
    btn.textContent = "Deshacer última operación";
  }
}

export async function undoLastOperation() {
  var stack = getUndoStack();
  if (!stack.length) {
    rt.showToast("No hay operaciones para deshacer.", "error");
    return;
  }
  var snap = stack[0];
  var result = await openConfirm({
    weight: 'consequence',
    title: '¿Revertir "' + (snap.label || "última operación") + '"?',
    consequenceText: 'La aplicación se recargará.',
    confirmLabel: 'Revertir',
  });
  if (result !== 'confirm') return;
  var rest = stack.slice(1);
  saveUndoStack(rest);
  replaceAppStateFromBackupData(snap.data || {});
  try {
    localStorage.setItem(
      "rpc-scheduled-procedures",
      JSON.stringify(snap.data.scheduledProcedures || [])
    );
  } catch (e) {
    console.warn('[productivity] failed to write rpc-scheduled-procedures', e);
  }
  localStorage.setItem("rpc-settings", JSON.stringify(snap.data.settings || {}));
  if (snap.data.medCatalog && typeof snap.data.medCatalog === "object") {
    storage.saveMedCatalog(snap.data.medCatalog);
  }
  if (snap.theme === "dark" || snap.theme === "light") localStorage.setItem("theme", snap.theme);
  await persistClinicalState({ immediate: true });
  rt.addAuditEntry("undo-restore", "ok", 0, snap.label || "");
  location.reload();
}

export function applyFocusModeFromStorage() {
  var on = localStorage.getItem(FOCUS_MODE_KEY) === "1";
  document.body.classList.toggle("focus-mode", on);
  var btn = document.getElementById("btn-toggle-focus-mode");
  if (btn) btn.textContent = on ? "Desactivar modo enfoque" : "Activar modo enfoque";
}

export function toggleFocusMode() {
  var on = document.body.classList.toggle("focus-mode");
  localStorage.setItem(FOCUS_MODE_KEY, on ? "1" : "0");
  var btn = document.getElementById("btn-toggle-focus-mode");
  if (btn) btn.textContent = on ? "Desactivar modo enfoque" : "Activar modo enfoque";
  if (on) rt.closeSettingsDropdown();
  rt.showToast(on ? "Modo enfoque activado · F6 para salir" : "Modo enfoque desactivado", "success");
  rt.addAuditEntry("focus-mode", "ok", 0, on ? "on" : "off");
}

var _unifiedSearchCurrent = [];

export function openUnifiedSearch() {
  var bd = document.getElementById("unified-search-backdrop");
  if (!bd) return;
  bd.classList.add("open");
  var input = document.getElementById("unified-search-input");
  if (input) {
    input.value = "";
    setTimeout(function () {
      input.focus();
    }, 30);
  }
  updateUnifiedSearchResults();
}

export function closeUnifiedSearch() {
  var bd = document.getElementById("unified-search-backdrop");
  if (bd) bd.classList.remove("open");
}

function snippetAround(text, q, maxLen) {
  var src = String(text || "");
  var lc = src.toLowerCase();
  var idx = lc.indexOf(q);
  if (idx < 0) return "";
  var half = Math.max(20, Math.floor((maxLen || 140) / 2));
  var start = Math.max(0, idx - half);
  var end = Math.min(src.length, idx + q.length + half);
  var out = src.slice(start, end);
  if (start > 0) out = "… " + out;
  if (end < src.length) out = out + " …";
  return out;
}

function escapeRegExp(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightSnippet(snippet, q) {
  var safe = esc(snippet);
  if (!q) return safe;
  var qEsc = escapeRegExp(q);
  try {
    return safe.replace(new RegExp(qEsc, "ig"), function (m) {
      return "<mark>" + m + "</mark>";
    });
  } catch {
    return safe;
  }
}

function collectNoteHaystack(note) {
  if (!note) return "";
  var parts = [note.interrogatorio, note.evolucion, note.estudios, note.medico, note.profesor];
  if (Array.isArray(note.diagnosticos)) parts = parts.concat(note.diagnosticos);
  if (Array.isArray(note.tratamiento)) parts = parts.concat(note.tratamiento);
  return parts.filter(Boolean).join("\n");
}

function collectIndicaHaystack(ind) {
  if (!ind) return "";
  var parts = [ind.dieta, ind.cuidados, ind.estudios, ind.medicamentos, ind.interconsultas, ind.medicos];
  if (Array.isArray(ind.otros)) {
    ind.otros.forEach(function (o) {
      if (o && (o.titulo || o.contenido)) parts.push((o.titulo || "") + "\n" + (o.contenido || ""));
    });
  }
  return parts.filter(Boolean).join("\n");
}

function collectPatientSearchHits(p, q, metaStr, out, max) {
  var meta = [p.nombre, p.registro, p.cuarto, p.cama, p.servicio, p.area].filter(Boolean).join(' · ');
  if (meta.toLowerCase().indexOf(q) !== -1) {
    out.push({
      id: p.id,
      tab: 'nota',
      inner: 'notas',
      tag: 'paciente',
      title: p.nombre || 'Sin nombre',
      meta: metaStr,
      snippet: '',
    });
    return out.length >= max;
  }
  var nh = collectNoteHaystack(getNotes()[p.id]);
  if (nh && nh.toLowerCase().indexOf(q) !== -1) {
    out.push({
      id: p.id,
      tab: 'nota',
      inner: 'notas',
      tag: 'nota',
      title: p.nombre || 'Sin nombre',
      meta: metaStr,
      snippet: snippetAround(nh, q, 140),
    });
    return out.length >= max;
  }
  var ih = collectIndicaHaystack(getIndicaciones()[p.id]);
  if (ih && ih.toLowerCase().indexOf(q) !== -1) {
    out.push({
      id: p.id,
      tab: 'nota',
      inner: 'indica',
      tag: 'indicaciones',
      title: p.nombre || 'Sin nombre',
      meta: metaStr,
      snippet: snippetAround(ih, q, 140),
    });
    return out.length >= max;
  }
  return false;
}

function renderUnifiedSearchHtml(out, q) {
  return out
    .map(function (r, idx) {
      return (
        '<div class="unified-search-result" onclick="selectUnifiedSearchResult(' +
        idx +
        ')">' +
        '<div class="usr-title"><span>' +
        esc(r.title) +
        '</span><span class="usr-tag">' +
        esc(r.tag) +
        '</span></div>' +
        '<div class="usr-meta">' +
        esc(r.meta) +
        '</div>' +
        (r.snippet ? '<div class="usr-snippet">' + highlightSnippet(r.snippet, q) + '</div>' : '') +
        '</div>'
      );
    })
    .join('');
}

export function updateUnifiedSearchResults() {
  var box = document.getElementById("unified-search-results");
  var inp = document.getElementById("unified-search-input");
  if (!box || !inp) return;
  var q = String(inp.value || "").trim().toLowerCase();
  if (!q) {
    box.innerHTML =
      '<div class="unified-search-empty empty-state empty-state--compact" role="status">' +
      '<span class="empty-state-title">Buscar en el censo</span>' +
      '<span class="empty-state-lead">Escribe nombre, registro, cuarto o texto de notas.</span>' +
      '</div>';
    _unifiedSearchCurrent = [];
    return;
  }
  var out = [];
  var MAX = 40;
  var searchPatients = getPatientsForDisplay(() => getPatients());
  for (var i = 0; i < searchPatients.length && out.length < MAX; i += 1) {
    var p = searchPatients[i];
    if (p.isDemo && !isPitchPatientIsolationActive()) continue;
    var metaStr =
      'Cto. ' + (p.cuarto || '-') + ' · Cama ' + (p.cama || '-') + (p.registro ? ' · ' + p.registro : '');
    if (collectPatientSearchHits(p, q, metaStr, out, MAX)) break;
  }
  _unifiedSearchCurrent = out;
  if (!out.length) {
    box.innerHTML =
      '<div class="unified-search-empty empty-state empty-state--compact" role="status">' +
      '<span class="empty-state-title">Sin coincidencias</span>' +
      '<span class="empty-state-lead">Prueba otro término o abre una pestaña desde el encabezado.</span>' +
      '</div>';
    return;
  }
  box.innerHTML = renderUnifiedSearchHtml(out, q);
}

export function selectUnifiedSearchResult(idx) {
  var r = _unifiedSearchCurrent[idx];
  if (!r) return;
  rt.selectPatient(r.id);
  rt.switchAppTab(r.tab);
  if (r.inner) rt.switchInnerTab(r.inner);
  closeUnifiedSearch();
}

var _extraTemplateEditing = null;

function ensureExtraTemplatesArray() {
  var settings = rt.getSettings();
  if (!Array.isArray(settings.extraTemplates)) settings.extraTemplates = [];
  return settings.extraTemplates;
}

function persistSettings() {
  localStorage.setItem("rpc-settings", JSON.stringify(rt.getSettings()));
}

export function openExtraTemplatesManager() {
  var m = document.getElementById("extra-templates-modal");
  if (!m) return;
  ensureExtraTemplatesArray();
  m.style.display = "flex";
  renderExtraTemplatesList();
  cancelExtraTemplateEdit();
}

export function closeExtraTemplatesManager() {
  var m = document.getElementById("extra-templates-modal");
  if (m) m.style.display = "none";
  cancelExtraTemplateEdit();
}

function renderExtraTemplatesList() {
  var list = document.getElementById("extra-templates-list");
  if (!list) return;
  var arr = ensureExtraTemplatesArray();
  if (!arr.length) {
    list.innerHTML =
      '<div class="unified-search-empty empty-state empty-state--compact" role="status">' +
      '<span class="empty-state-title">Sin plantillas guardadas</span>' +
      '<span class="empty-state-lead">Las plantillas que guardes aparecerán aquí.</span>' +
      '</div>';
    return;
  }
  list.innerHTML = arr
    .map(function (tmpl) {
      var id = esc(tmpl.id || "");
      return (
        '<div class="extra-tmpl-row">' +
        '<span class="etr-label" title="' +
        esc(tmpl.label || "") +
        '">' +
        esc(tmpl.label || "(sin nombre)") +
        "</span>" +
        '<div class="etr-actions">' +
        '<button type="button" onclick="editExtraTemplate(\'' +
        id +
        '\')">Editar</button>' +
        '<button type="button" class="etr-del" onclick="deleteExtraTemplate(\'' +
        id +
        '\')">Eliminar</button>' +
        "</div></div>"
      );
    })
    .join("");
}

export function startNewExtraTemplate() {
  _extraTemplateEditing = "";
  var ed = document.getElementById("extra-template-editor");
  if (ed) ed.style.display = "flex";
  var elLabel = document.getElementById("extra-tmpl-label");
  var elDieta = document.getElementById("extra-tmpl-dieta");
  var elCui = document.getElementById("extra-tmpl-cuidados");
  var elMed = document.getElementById("extra-tmpl-meds");
  if (elLabel) elLabel.value = "";
  if (elDieta) elDieta.value = "";
  if (elCui) elCui.value = "";
  if (elMed) elMed.value = "";
  setTimeout(function () {
    if (elLabel) elLabel.focus();
  }, 30);
}

export function editExtraTemplate(id) {
  var arr = ensureExtraTemplatesArray();
  var tmpl = arr.find(function (t) {
    return t.id === id;
  });
  if (!tmpl) return;
  _extraTemplateEditing = id;
  var ed = document.getElementById("extra-template-editor");
  if (ed) ed.style.display = "flex";
  document.getElementById("extra-tmpl-label").value = tmpl.label || "";
  document.getElementById("extra-tmpl-dieta").value = tmpl.dieta || "";
  document.getElementById("extra-tmpl-cuidados").value = tmpl.cuidados || "";
  document.getElementById("extra-tmpl-meds").value = tmpl.medicamentos || "";
}

export function cancelExtraTemplateEdit() {
  _extraTemplateEditing = null;
  var ed = document.getElementById("extra-template-editor");
  if (ed) ed.style.display = "none";
}

export function saveExtraTemplateFromEditor() {
  var label = (document.getElementById("extra-tmpl-label").value || "").trim();
  if (!label) {
    rt.showToast("Ingresa un nombre para la plantilla", "error");
    return;
  }
  var dieta = (document.getElementById("extra-tmpl-dieta").value || "").trim();
  var cuidados = (document.getElementById("extra-tmpl-cuidados").value || "").trim();
  var meds = (document.getElementById("extra-tmpl-meds").value || "").trim();
  var arr = ensureExtraTemplatesArray();
  if (_extraTemplateEditing) {
    var tmpl = arr.find(function (t) {
      return t.id === _extraTemplateEditing;
    });
    if (tmpl) {
      tmpl.label = label;
      tmpl.dieta = dieta;
      tmpl.cuidados = cuidados;
      tmpl.medicamentos = meds;
    }
  } else {
    arr.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label: label,
      dieta: dieta,
      cuidados: cuidados,
      medicamentos: meds,
    });
  }
  persistSettings();
  rt.addAuditEntry("extra-template-save", "ok", arr.length, label);
  rt.showToast("Plantilla guardada", "success");
  renderExtraTemplatesList();
  cancelExtraTemplateEdit();
  if (rt.getActiveId()) rt.renderIndicaForm();
}

export async function deleteExtraTemplate(id) {
  var arr = ensureExtraTemplatesArray();
  var tmpl = arr.find(function (t) {
    return t.id === id;
  });
  if (!tmpl) return;
  var result = await openConfirm({
    weight: 'destructive',
    title: '¿Eliminar la plantilla "' + (tmpl.label || "") + '"?',
    confirmLabel: 'Eliminar',
  });
  if (result !== 'confirm') return;
  var settings = rt.getSettings();
  settings.extraTemplates = arr.filter(function (t) {
    return t.id !== id;
  });
  persistSettings();
  rt.addAuditEntry(
    "extra-template-delete",
    "ok",
    settings.extraTemplates.length,
    tmpl.label || ""
  );
  renderExtraTemplatesList();
  cancelExtraTemplateEdit();
  if (rt.getActiveId()) rt.renderIndicaForm();
}

function handleProductivityModShortcut(e, k) {
  if (k === 'n') {
    e.preventDefault();
    rt.openAddModal();
    return true;
  }
  if (k === 's' && e.shiftKey) {
    e.preventDefault();
    if (!rt.getActiveId()) {
      rt.showToast('Selecciona un paciente primero', 'error');
      return true;
    }
    rt.persistClinicalState();
    rt.addAuditEntry('quick-save', 'ok', 1, String(rt.getActiveId()));
    rt.showToast('Estado guardado ✓', 'success');
    return true;
  }
  return false;
}

function censusWalkFocusMode() {
  return !!(document.body && document.body.classList.contains('focus-mode'));
}

function onProductivityKeydown(e) {
  if (e.key === 'F6') {
    e.preventDefault();
    toggleFocusMode();
    return;
  }
  if (
    handleCensusWalkKeydown(e, rt.advanceRondaPatient, {
      focusMode: censusWalkFocusMode(),
    })
  ) {
    return;
  }
  var mod = e.metaKey || e.ctrlKey;
  if (!mod || e.altKey) return;
  var k = (e.key || '').toLowerCase();
  // G/I/P/S → modos de trabajo (app-shell-keyboard, capture)
  if (!e.shiftKey && (k === 'g' || k === 'i' || k === 'p' || k === 's')) return;
  if (e.shiftKey && k !== 's') return;
  handleProductivityModShortcut(e, k);
}

export function healUndoStackQuota() {
  var stack = getUndoStack();
  if (stack.length) saveUndoStack(stack);
}

export function initProductivityKeyboardShortcuts() {
  document.addEventListener('keydown', onProductivityKeydown);
  applyFocusModeFromStorage();
  refreshUndoButtonState();
  healUndoStackQuota();
}

export const productivityWindowHandlers = {
  toggleFocusMode,
  openUnifiedSearch,
  closeUnifiedSearch,
  updateUnifiedSearchResults,
  selectUnifiedSearchResult,
  undoLastOperation,
  openExtraTemplatesManager,
  closeExtraTemplatesManager,
  startNewExtraTemplate,
  editExtraTemplate,
  deleteExtraTemplate,
  saveExtraTemplateFromEditor,
  cancelExtraTemplateEdit,
};

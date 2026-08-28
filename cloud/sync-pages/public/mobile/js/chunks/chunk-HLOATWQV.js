import {
  rescheduleAllTodos
} from "/mobile/js/chunks/chunk-A35AFCZK.js";
import {
  mountRpcDatetimeInput
} from "/mobile/js/chunks/chunk-QLSLJE42.js";
import {
  openConfirm
} from "/mobile/js/chunks/chunk-EASTAY6S.js";
import {
  enqueueCloudTodoDelete,
  enqueueCloudTodoUpsert
} from "/mobile/js/chunks/chunk-VH7DMNPL.js";
import {
  addTodoDuePreset,
  deleteTodoDuePreset,
  formatTodoDueLabel,
  formatTodoDuePresetAutoLabel,
  getTodoDuePresets,
  groupTodosByStatus,
  isoToDatetimeLocalValue,
  nextTodoPriority,
  normalizeTodoPriority,
  parseDatetimeLocalToIso,
  parseDuePreset,
  resetTodoDuePresetOverrides,
  resolveTodoDuePresetDef,
  saveTodoDuePresetOverrides,
  syncTodoDuePresetsFromEditRows,
  todoCompareForDueSort,
  todoPriorityLabel
} from "/mobile/js/chunks/chunk-2SJQGKPU.js";
import {
  storage
} from "/mobile/js/chunks/chunk-YUYECAQZ.js";
import {
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  appendExitingRows,
  settlePasteSurface
} from "/mobile/js/chunks/chunk-X2R3ZGWP.js";

// public/js/todos-handoff.mjs
var TODO_FILTER_ALL = "all";
var TODO_FILTER_HANDOFF = "handoff";
function normalizeTodoUsername(username) {
  var s = String(username == null ? "" : username).trim();
  return s || null;
}
function usernamesMatch(a, b) {
  var left = normalizeTodoUsername(a);
  var right = normalizeTodoUsername(b);
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}
function isHandoffTodo(todo, currentUsername) {
  if (!todo || todo.completed) return false;
  if (todo.handoffAcknowledgedAt) return false;
  var creator = normalizeTodoUsername(todo.createdBy);
  if (!creator) return false;
  return !usernamesMatch(creator, currentUsername);
}
function filterTodosByView(todos, filter, currentUsername) {
  var list = Array.isArray(todos) ? todos.slice() : [];
  if (filter !== TODO_FILTER_HANDOFF) return list;
  return list.filter(function(t) {
    return isHandoffTodo(t, currentUsername);
  });
}
function countHandoffTodos(todos, currentUsername) {
  return filterTodosByView(todos, TODO_FILTER_HANDOFF, currentUsername).length;
}
function formatTodoCreatorLabel(createdBy) {
  var u = normalizeTodoUsername(createdBy);
  if (!u) return "";
  return u.charAt(0) === "@" ? u : "@" + u.replace(/^@+/, "");
}
function buildHandoffAckPatch(username) {
  var nowIso = (/* @__PURE__ */ new Date()).toISOString();
  var patch = {
    handoffAcknowledgedAt: nowIso,
    updatedAt: nowIso
  };
  var u = normalizeTodoUsername(username);
  if (u) patch.handoffAcknowledgedBy = u;
  return patch;
}

// public/js/features/todos-runtime.mjs
var listFilter = TODO_FILTER_ALL;
var rt = {
  getActiveId() {
    return null;
  },
  getActiveAppTab() {
    return "lab";
  },
  getSettings() {
    return {};
  }
};
function registerTodosRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}
function aid() {
  return rt.getActiveId();
}
function getClinicalUsername() {
  var st = rt.getSettings() || {};
  var u = st.clinicalUsername;
  return u ? String(u) : null;
}
function getListFilter() {
  return listFilter;
}
function setListFilter(value) {
  listFilter = value;
}

// public/js/features/todos-priority-ui.mjs
function pulseTodoPrioChip(chip) {
  if (!chip) return;
  chip.classList.remove("todo-prio-chip--pulse");
  void chip.offsetWidth;
  chip.classList.add("todo-prio-chip--pulse");
  chip.addEventListener(
    "animationend",
    function onEnd(ev) {
      if (ev.animationName !== "todo-prio-pulse") return;
      chip.removeEventListener("animationend", onEnd);
      chip.classList.remove("todo-prio-chip--pulse");
    }
  );
}
function applyTodoPrioChip(chip, prio, pulse) {
  var valid = normalizeTodoPriority(prio);
  chip.classList.remove("prio-alta", "prio-media", "prio-baja");
  chip.classList.add("prio-" + valid);
  chip.dataset.priority = valid;
  var label = chip.querySelector(".todo-prio-label");
  if (label) label.textContent = todoPriorityLabel(valid);
  chip.setAttribute("aria-label", "Prioridad " + todoPriorityLabel(valid) + ". Clic para cambiar.");
  chip.title = "Clic: cambiar prioridad (" + todoPriorityLabel(valid) + ")";
  if (pulse) pulseTodoPrioChip(chip);
  return valid;
}
function createTodoPrioChip(prio, onCycle) {
  var chip = document.createElement("button");
  chip.type = "button";
  chip.className = "todo-prio-chip";
  var dot = document.createElement("span");
  dot.className = "todo-prio-dot";
  dot.setAttribute("aria-hidden", "true");
  var label = document.createElement("span");
  label.className = "todo-prio-label";
  chip.appendChild(dot);
  chip.appendChild(label);
  applyTodoPrioChip(chip, prio, false);
  chip.addEventListener("click", function() {
    var next = nextTodoPriority(chip.dataset.priority || "media");
    applyTodoPrioChip(chip, next, true);
    if (onCycle) onCycle(next);
  });
  return chip;
}

// public/js/todo-due-modal.mjs
var onSaveCallback = null;
var dismissWired = false;
var presetEditOpen = false;
function getBackdrop() {
  return document.getElementById("todo-due-modal-backdrop");
}
function getDatetimeInput() {
  return (
    /** @type {HTMLInputElement|null} */
    document.getElementById("todo-due-modal-datetime")
  );
}
function getRemindInput() {
  return (
    /** @type {HTMLInputElement|null} */
    document.getElementById("todo-due-modal-remind")
  );
}
function getPresetsMount() {
  return document.getElementById("todo-due-modal-presets");
}
function getPresetEditPanel() {
  return document.getElementById("todo-due-modal-preset-edit");
}
function getPresetEditRows() {
  return document.getElementById("todo-due-modal-preset-edit-rows");
}
function closeTodoDueModal() {
  var backdrop = getBackdrop();
  if (!backdrop) return;
  setPresetEditOpen(false);
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  onSaveCallback = null;
}
function readModalFields() {
  var datetimeInput = getDatetimeInput();
  var remindInput = getRemindInput();
  var dueDate = datetimeInput ? parseDatetimeLocalToIso(datetimeInput.value) : null;
  var remindEnabled = !!(remindInput && remindInput.checked && dueDate);
  return {
    dueDate,
    reminderAt: remindEnabled ? dueDate : null,
    remindEnabled
  };
}
function saveTodoDueModal() {
  var fields = readModalFields();
  if (!fields.dueDate) {
    var datetimeInput = getDatetimeInput();
    if (datetimeInput) datetimeInput.focus();
    return;
  }
  if (onSaveCallback) onSaveCallback(fields);
  closeTodoDueModal();
}
function clearTodoDueModal() {
  if (onSaveCallback) {
    onSaveCallback({ dueDate: null, reminderAt: null, remindEnabled: false });
  }
  closeTodoDueModal();
}
function setPresetEditOpen(open) {
  presetEditOpen = !!open;
  var panel = getPresetEditPanel();
  var presets = getPresetsMount();
  var zone = document.getElementById("todo-due-modal-presets-zone");
  var editBtn = document.getElementById("todo-due-edit-presets-btn");
  var resetBtn = document.getElementById("todo-due-reset-presets-btn");
  if (panel) panel.hidden = !presetEditOpen;
  if (presets) presets.hidden = presetEditOpen;
  if (zone) zone.classList.toggle("is-editing", presetEditOpen);
  if (editBtn) editBtn.textContent = presetEditOpen ? "Listo" : "Editar";
  if (editBtn) editBtn.setAttribute("aria-expanded", presetEditOpen ? "true" : "false");
  if (resetBtn) resetBtn.hidden = !presetEditOpen;
  if (presetEditOpen) renderPresetEditRows();
  else renderModalPresetChips();
}
function applyPresetToModal(presetId) {
  var fields = parseDuePreset(presetId);
  var datetimeInput = getDatetimeInput();
  if (!fields.dueDate || !datetimeInput) return;
  datetimeInput.value = isoToDatetimeLocalValue(fields.dueDate);
  datetimeInput.dispatchEvent(new CustomEvent("rpc-datetime-sync"));
  var remindInput = getRemindInput();
  if (remindInput) remindInput.disabled = false;
  syncModalPresetActiveState(fields.dueDate);
}
function syncModalPresetActiveState(dueDate) {
  var backdrop = getBackdrop();
  if (!backdrop) return;
  backdrop.querySelectorAll(".todo-due-preset-chip[data-preset]").forEach(function(btn) {
    var fields = parseDuePreset(String(btn.dataset.preset || ""));
    var active = !!(dueDate && fields.dueDate && dueDate === fields.dueDate);
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}
function renderModalPresetChips() {
  var mount = getPresetsMount();
  if (!mount) return;
  mount.textContent = "";
  getTodoDuePresets().forEach(function(preset) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "todo-due-preset-chip";
    btn.dataset.preset = preset.id;
    btn.textContent = preset.label;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", function() {
      applyPresetToModal(preset.id);
    });
    mount.appendChild(btn);
  });
}
function isCustomPresetRowId(id) {
  return String(id || "").indexOf("custom-") === 0;
}
function presetModeValue(preset) {
  if (preset.kind === "dayTime") return preset.dayOffset === 1 ? "tomorrow" : "today";
  return "offset";
}
function readRowValueSnapshot(row) {
  var timeInput = row.querySelector(".todo-due-preset-time-input");
  var hoursInput = row.querySelector(".todo-due-preset-hours-input");
  var hour = 18;
  var minute = 0;
  var hours = 6;
  if (timeInput instanceof HTMLInputElement) {
    var parts = String(timeInput.value || "").split(":");
    hour = Number(parts[0]);
    minute = Number(parts[1]);
  }
  if (hoursInput instanceof HTMLInputElement) hours = Number(hoursInput.value);
  return { hour, minute, hours };
}
function appendPresetHoursInput(valueWrap, values) {
  var hoursWrap = document.createElement("label");
  hoursWrap.className = "todo-due-preset-hours-wrap";
  var hoursInput = document.createElement("input");
  hoursInput.type = "number";
  hoursInput.min = "1";
  hoursInput.max = "168";
  hoursInput.step = "1";
  hoursInput.className = "todo-due-preset-hours-input";
  hoursInput.value = String(values.hours != null ? values.hours : 6);
  hoursInput.setAttribute("aria-label", "Horas de desplazamiento");
  var hoursSuffix = document.createElement("span");
  hoursSuffix.className = "todo-due-preset-hours-suffix";
  hoursSuffix.textContent = "h";
  hoursWrap.appendChild(hoursInput);
  hoursWrap.appendChild(hoursSuffix);
  valueWrap.appendChild(hoursWrap);
}
function appendPresetTimeInput(valueWrap, values, dayOffset) {
  var timeInput = document.createElement("input");
  timeInput.type = "time";
  timeInput.className = "todo-due-preset-time-input";
  var hour = values.hour != null ? values.hour : 18;
  var minute = values.minute != null ? values.minute : 0;
  timeInput.value = String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
  timeInput.setAttribute("aria-label", dayOffset === 1 ? "Hora ma\xF1ana" : "Hora hoy");
  valueWrap.appendChild(timeInput);
}
function rebuildRowValueInput(row, mode, values) {
  var valueWrap = row.querySelector(".todo-due-preset-value");
  if (!valueWrap) return;
  valueWrap.querySelectorAll(".todo-due-preset-time-input, .todo-due-preset-hours-wrap").forEach(function(node) {
    node.remove();
  });
  if (mode === "offset") appendPresetHoursInput(valueWrap, values);
  else appendPresetTimeInput(valueWrap, values, mode === "tomorrow" ? 1 : 0);
}
function buildPresetModeSelect(preset, row) {
  var select = document.createElement("select");
  select.className = "todo-due-preset-mode-select";
  select.setAttribute("aria-label", "Tipo de atajo");
  [
    { value: "offset", label: "En" },
    { value: "today", label: "Hoy" },
    { value: "tomorrow", label: "Ma\xF1ana" }
  ].forEach(function(opt) {
    var option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });
  select.value = presetModeValue(preset);
  select.addEventListener("change", function() {
    rebuildRowValueInput(row, select.value, readRowValueSnapshot(row));
  });
  return select;
}
function readVisiblePresetRowIds() {
  var rows = getPresetEditRows();
  if (!rows) return [];
  var ids = [];
  rows.querySelectorAll(".todo-due-preset-edit-row").forEach(function(row) {
    var id = String(row.dataset.presetId || "");
    if (id) ids.push(id);
  });
  return ids;
}
function readPresetRowLabel(row) {
  var labelInput = row.querySelector(".todo-due-preset-label-input");
  return labelInput instanceof HTMLInputElement ? String(labelInput.value || "").trim() : "";
}
function readPresetRowMode(row, def) {
  var modeSelect = row.querySelector(".todo-due-preset-mode-select");
  return modeSelect instanceof HTMLSelectElement ? modeSelect.value : presetModeValue(def);
}
function buildDayTimePatchFromRow(row, def, dayOffset) {
  var timeInput = row.querySelector(".todo-due-preset-time-input");
  var fallback = String(def.hour).padStart(2, "0") + ":" + String(def.minute).padStart(2, "0");
  var parts = String(timeInput instanceof HTMLInputElement ? timeInput.value : fallback).split(":");
  return {
    kind: "dayTime",
    dayOffset,
    hour: Number(parts[0]),
    minute: Number(parts[1])
  };
}
function patchFromPresetEditRow(row, id, def) {
  var patch = { label: readPresetRowLabel(row) };
  if (isCustomPresetRowId(id)) patch.custom = true;
  var mode = readPresetRowMode(row, def);
  var modeSelect = row.querySelector(".todo-due-preset-mode-select");
  if (mode === "today" || def.kind === "dayTime" && def.dayOffset === 0 && !modeSelect) {
    return Object.assign(patch, buildDayTimePatchFromRow(row, def, 0));
  }
  if (mode === "tomorrow" || def.kind === "dayTime" && def.dayOffset === 1 && !modeSelect) {
    return Object.assign(patch, buildDayTimePatchFromRow(row, def, 1));
  }
  var hoursInput = row.querySelector(".todo-due-preset-hours-input");
  patch.kind = "offsetHours";
  patch.hours = hoursInput instanceof HTMLInputElement ? Number(hoursInput.value) : Number(def.hours || 6);
  return patch;
}
function readPresetEditRowsIntoPatch() {
  var patchById = {};
  var rows = getPresetEditRows();
  if (!rows) return patchById;
  rows.querySelectorAll(".todo-due-preset-edit-row").forEach(function(row) {
    var id = String(row.dataset.presetId || "");
    if (!id) return;
    var def = resolveTodoDuePresetDef(id);
    if (!def) return;
    patchById[id] = patchFromPresetEditRow(row, id, def);
  });
  return patchById;
}
function removePresetShortcut(presetId) {
  deleteTodoDuePreset(presetId);
  renderPresetEditRows();
  renderModalPresetChips();
  syncModalPresetActiveState(readModalFields().dueDate);
}
function focusPresetRowLabel(presetId) {
  var container = getPresetEditRows();
  if (!container) return;
  var row = container.querySelector('.todo-due-preset-edit-row[data-preset-id="' + presetId + '"]');
  var labelInput = row && row.querySelector(".todo-due-preset-label-input");
  if (labelInput instanceof HTMLInputElement) {
    labelInput.focus();
    labelInput.select();
  }
}
function addPresetShortcut(options) {
  var patch = readPresetEditRowsIntoPatch();
  if (Object.keys(patch).length) saveTodoDuePresetOverrides(patch);
  var preset = addTodoDuePreset(options || { hours: 6 });
  renderPresetEditRows();
  renderModalPresetChips();
  focusPresetRowLabel(preset.id);
}
function renderPresetEditRows() {
  var container = getPresetEditRows();
  if (!container) return;
  container.textContent = "";
  var presets = getTodoDuePresets();
  if (!presets.length) {
    var empty = document.createElement("p");
    empty.className = "todo-due-preset-edit-empty";
    empty.textContent = "Sin atajos. Agrega uno o usa Restablecer para los predeterminados.";
    container.appendChild(empty);
    return;
  }
  presets.forEach(function(preset) {
    var row = document.createElement("div");
    var isCustom = isCustomPresetRowId(preset.id);
    row.className = "todo-due-preset-edit-row" + (isCustom ? " todo-due-preset-edit-row--custom" : "");
    row.dataset.presetId = preset.id;
    row.dataset.presetKind = preset.kind;
    var labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "todo-due-preset-label-input";
    labelInput.placeholder = formatTodoDuePresetAutoLabel(preset);
    labelInput.value = preset.label || formatTodoDuePresetAutoLabel(preset);
    labelInput.setAttribute("aria-label", "Nombre del atajo");
    row.appendChild(labelInput);
    var valueWrap = document.createElement("div");
    valueWrap.className = "todo-due-preset-value todo-due-preset-value--" + (preset.kind === "offsetHours" ? "hours" : "time") + (isCustom ? " todo-due-preset-value--custom" : "");
    row.appendChild(valueWrap);
    if (isCustom) {
      valueWrap.appendChild(buildPresetModeSelect(preset, row));
      rebuildRowValueInput(row, presetModeValue(preset), {
        hour: preset.hour,
        minute: preset.minute,
        hours: preset.hours
      });
    } else if (preset.kind === "dayTime") {
      appendPresetTimeInput(valueWrap, preset, preset.dayOffset);
    } else {
      appendPresetHoursInput(valueWrap, preset);
    }
    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "todo-due-preset-delete";
    delBtn.setAttribute("aria-label", "Eliminar atajo");
    delBtn.title = "Eliminar atajo";
    delBtn.textContent = "\xD7";
    delBtn.addEventListener("click", function() {
      removePresetShortcut(preset.id);
    });
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}
function savePresetEditRows() {
  syncTodoDuePresetsFromEditRows(readPresetEditRowsIntoPatch(), {
    visibleRowIds: readVisiblePresetRowIds()
  });
  renderModalPresetChips();
  var fields = readModalFields();
  syncModalPresetActiveState(fields.dueDate);
}
function wireTodoDueModal() {
  if (dismissWired) return;
  dismissWired = true;
  var backdrop = getBackdrop();
  if (!backdrop) return;
  backdrop.addEventListener("click", function(ev) {
    if (!backdrop.classList.contains("open")) return;
    if (ev.target !== backdrop) return;
    closeTodoDueModal();
  });
  document.addEventListener("keydown", function(ev) {
    if (ev.key !== "Escape" && ev.key !== "Esc") return;
    var bd = getBackdrop();
    if (!bd || !bd.classList.contains("open")) return;
    if (presetEditOpen) {
      savePresetEditRows();
      setPresetEditOpen(false);
      ev.preventDefault();
      return;
    }
    closeTodoDueModal();
    ev.preventDefault();
  });
  var cancelBtn = document.getElementById("todo-due-modal-cancel");
  var clearBtn = document.getElementById("todo-due-modal-clear");
  var saveBtn = document.getElementById("todo-due-modal-save");
  if (cancelBtn) cancelBtn.addEventListener("click", closeTodoDueModal);
  if (clearBtn) clearBtn.addEventListener("click", clearTodoDueModal);
  if (saveBtn) saveBtn.addEventListener("click", saveTodoDueModal);
  var editBtn = document.getElementById("todo-due-edit-presets-btn");
  if (editBtn) {
    editBtn.addEventListener("click", function() {
      if (presetEditOpen) {
        savePresetEditRows();
        setPresetEditOpen(false);
        return;
      }
      setPresetEditOpen(true);
    });
  }
  var resetBtn = document.getElementById("todo-due-reset-presets-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", function() {
      resetTodoDuePresetOverrides();
      renderPresetEditRows();
      renderModalPresetChips();
      syncModalPresetActiveState(readModalFields().dueDate);
    });
  }
  var addOffsetBtn = document.getElementById("todo-due-add-preset-offset-btn");
  var addTimeBtn = document.getElementById("todo-due-add-preset-time-btn");
  if (addOffsetBtn) {
    addOffsetBtn.addEventListener("click", function() {
      addPresetShortcut({ kind: "offsetHours", hours: 6 });
    });
  }
  if (addTimeBtn) {
    addTimeBtn.addEventListener("click", function() {
      addPresetShortcut({ kind: "dayTime", dayOffset: 0, hour: 18, minute: 0 });
    });
  }
}
function ensureDatetimeMounted() {
  var datetimeInput = getDatetimeInput();
  if (!datetimeInput) return;
  mountRpcDatetimeInput(datetimeInput);
}
function openTodoDueModal(opts) {
  wireTodoDueModal();
  var backdrop = getBackdrop();
  var datetimeInput = getDatetimeInput();
  var remindInput = getRemindInput();
  if (!backdrop || !datetimeInput || !remindInput) return;
  ensureDatetimeMounted();
  onSaveCallback = opts && opts.onSave ? opts.onSave : null;
  setPresetEditOpen(false);
  var dueDate = opts && opts.dueDate ? String(opts.dueDate) : "";
  datetimeInput.value = dueDate ? isoToDatetimeLocalValue(dueDate) : isoToDatetimeLocalValue((/* @__PURE__ */ new Date()).toISOString());
  datetimeInput.dispatchEvent(new CustomEvent("rpc-datetime-sync"));
  remindInput.checked = !!(opts && opts.remindEnabled && dueDate);
  remindInput.disabled = false;
  renderModalPresetChips();
  syncModalPresetActiveState(dueDate);
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  var dateTrigger = backdrop.querySelector(".rpc-date-field__trigger");
  if (dateTrigger instanceof HTMLElement) dateTrigger.focus();
  else datetimeInput.focus();
}

// public/js/features/todos-due-composer.mjs
function syncDueAddSelection(state, toggleEl, selectionEl, presetBtns) {
  state.reminderAt = state.remindEnabled && state.dueDate ? state.dueDate : null;
  if (toggleEl) {
    toggleEl.textContent = "Fecha l\xEDmite";
    toggleEl.setAttribute(
      "aria-label",
      state.dueDate ? "Cambiar fecha l\xEDmite: " + formatTodoDueLabel(state.dueDate) : "Elegir fecha l\xEDmite"
    );
  }
  if (selectionEl) {
    var label = state.dueDate ? formatTodoDueLabel(state.dueDate) : "";
    if (state.dueDate && state.remindEnabled) label += " \u{1F514}";
    selectionEl.textContent = label;
    selectionEl.hidden = !state.dueDate;
  }
  (presetBtns || []).forEach(function(btn) {
    var presetId = String(btn.dataset.preset || "");
    var fields = parseDuePreset(presetId);
    var active = !!(state.dueDate && fields.dueDate && state.dueDate === fields.dueDate);
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}
function applyDuePresetToAddState(state, presetId, toggleEl, selectionEl, presetBtns) {
  var fields = parseDuePreset(presetId);
  state.dueDate = fields.dueDate;
  state.reminderAt = null;
  state.remindEnabled = false;
  syncDueAddSelection(state, toggleEl, selectionEl, presetBtns);
}
function wirePresetButton(btn, preset, ctx) {
  btn.type = "button";
  btn.className = "todo-due-preset-chip";
  btn.dataset.preset = preset.id;
  btn.textContent = preset.label;
  btn.setAttribute("aria-pressed", "false");
  btn.addEventListener("click", function() {
    if (ctx.state.dueDate) {
      var current = parseDuePreset(preset.id);
      if (current.dueDate && ctx.state.dueDate === current.dueDate) {
        ctx.state.dueDate = null;
        ctx.state.reminderAt = null;
        ctx.state.remindEnabled = false;
        syncDueAddSelection(ctx.state, ctx.toggle, ctx.selection, ctx.presetBtns);
        return;
      }
    }
    applyDuePresetToAddState(
      ctx.state,
      preset.id,
      ctx.toggle,
      ctx.selection,
      ctx.presetBtns
    );
  });
}
function rebuildPresetButtons(ctx) {
  ctx.presetsWrap.textContent = "";
  ctx.presetBtns.length = 0;
  getTodoDuePresets().forEach(function(preset) {
    var btn = document.createElement("button");
    wirePresetButton(btn, preset, ctx);
    ctx.presetsWrap.appendChild(btn);
    ctx.presetBtns.push(btn);
  });
  syncDueAddSelection(ctx.state, ctx.toggle, ctx.selection, ctx.presetBtns);
}
function ensureDuePresetsComposerListener(rebuild) {
  if (typeof document === "undefined" || document._todoDuePresetsComposerWired) return;
  document._todoDuePresetsComposerWired = true;
  document.addEventListener("rpc-todo-due-presets-changed", rebuild);
}
function createTodoDueAddSection(_idPrefix) {
  var state = { dueDate: null, reminderAt: null, remindEnabled: false };
  var section = document.createElement("div");
  section.className = "todo-due-section";
  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "todo-due-toggle";
  toggle.textContent = "Fecha l\xEDmite";
  toggle.setAttribute("aria-haspopup", "dialog");
  var selection = document.createElement("span");
  selection.className = "todo-due-selection";
  selection.hidden = true;
  var primary = document.createElement("div");
  primary.className = "todo-due-section-primary";
  var presetsWrap = document.createElement("div");
  presetsWrap.className = "todo-due-presets";
  presetsWrap.setAttribute("role", "group");
  presetsWrap.setAttribute("aria-label", "Fechas r\xE1pidas");
  var presetBtns = [];
  var ctx = { state, toggle, selection, presetBtns, presetsWrap };
  rebuildPresetButtons(ctx);
  ensureDuePresetsComposerListener(function() {
    rebuildPresetButtons(ctx);
  });
  toggle.addEventListener("click", function() {
    openTodoDueModal({
      dueDate: state.dueDate,
      remindEnabled: state.remindEnabled,
      onSave: function(fields) {
        state.dueDate = fields.dueDate;
        state.reminderAt = fields.reminderAt;
        state.remindEnabled = !!fields.remindEnabled;
        syncDueAddSelection(state, toggle, selection, presetBtns);
      }
    });
  });
  primary.appendChild(toggle);
  primary.appendChild(selection);
  section.appendChild(primary);
  section.appendChild(presetsWrap);
  return {
    element: section,
    getFields: function() {
      return { dueDate: state.dueDate, reminderAt: state.reminderAt };
    },
    reset: function() {
      state.dueDate = null;
      state.reminderAt = null;
      state.remindEnabled = false;
      syncDueAddSelection(state, toggle, selection, presetBtns);
    }
  };
}

// public/js/features/todos-mutations.mjs
function addTodoWithFields(fields) {
  if (!aid()) return false;
  var text = String(fields && fields.text || "").trim();
  if (!text) return false;
  var priority = normalizeTodoPriority(fields && fields.priority || "media");
  var nowIso = (/* @__PURE__ */ new Date()).toISOString();
  var todos = storage.getTodos(aid());
  var row = {
    id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 6),
    text,
    completed: false,
    priority,
    createdAt: nowIso,
    updatedAt: nowIso
  };
  var username = getClinicalUsername();
  if (username) row.createdBy = username;
  var dueFields = fields && fields.dueFields;
  if (dueFields && dueFields.dueDate) {
    row.dueDate = dueFields.dueDate;
    if (dueFields.reminderAt) row.reminderAt = dueFields.reminderAt;
  }
  todos.push(row);
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), row);
  rescheduleAllTodos(aid());
  refreshAllTodoUIs();
  return true;
}
function addTodo(idPrefix, priorityOverride, dueFields) {
  if (idPrefix === void 0 || idPrefix === null) idPrefix = "";
  if (typeof idPrefix !== "string") idPrefix = "";
  var input = document.getElementById(idPrefix + "todo-input");
  if (!input) return;
  var chip = document.getElementById(idPrefix + "todo-priority-chip");
  var priority = priorityOverride || chip && chip.dataset.priority || "media";
  var ok = addTodoWithFields({ text: input.value, priority, dueFields });
  if (ok) input.value = "";
}
function toggleTodo(id) {
  if (!aid()) return;
  var todos = storage.getTodos(aid());
  var found = todos.find(function(t) {
    return t.id === id;
  });
  if (!found) return;
  var nowIso = (/* @__PURE__ */ new Date()).toISOString();
  var username = getClinicalUsername();
  found.completed = !found.completed;
  if (found.completed) {
    found.completedAt = nowIso;
    if (username) found.completedBy = username;
    found.inProgress = false;
  } else {
    found.completedAt = null;
    found.completedBy = null;
  }
  found.updatedAt = nowIso;
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), found);
  rescheduleAllTodos(aid());
  refreshAllTodoUIs();
}
function deleteTodo(id) {
  if (!aid()) return;
  var delAt = (/* @__PURE__ */ new Date()).toISOString();
  var todos = storage.getTodos(aid());
  var victim = todos.find(function(t) {
    return t.id === id;
  });
  todos = todos.filter(function(t) {
    return t.id !== id;
  });
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoDelete(aid(), victim || { id }, delAt);
  rescheduleAllTodos(aid());
  refreshAllTodoUIs();
}
function setTodoPriority(id, priority, opts) {
  if (!aid()) return;
  opts = opts || {};
  var valid = normalizeTodoPriority(priority);
  var todos = storage.getTodos(aid());
  var found = todos.find(function(t) {
    return t.id === id;
  });
  if (!found) return;
  found.priority = valid;
  found.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), found);
  rescheduleAllTodos(aid());
  if (opts.deferResortMs) {
    setTimeout(refreshAllTodoUIs, opts.deferResortMs);
    return;
  }
  refreshAllTodoUIs();
}
function setTodoInProgress(id, inProgress) {
  if (!aid()) return;
  var todos = storage.getTodos(aid());
  var found = todos.find(function(t) {
    return t.id === id;
  });
  if (!found) return;
  found.inProgress = !!inProgress;
  found.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), found);
  refreshAllTodoUIs();
}
function acknowledgeHandoffTodo(id) {
  if (!aid()) return;
  var todos = storage.getTodos(aid());
  var found = todos.find(function(t) {
    return t.id === id;
  });
  if (!found || !isHandoffTodo(found, getClinicalUsername())) return;
  Object.assign(found, buildHandoffAckPatch(getClinicalUsername()));
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), found);
  rescheduleAllTodos(aid());
  refreshAllTodoUIs();
}
function updateTodoText(id, text) {
  if (!aid()) return;
  var trimmed = String(text || "").trim();
  if (!trimmed) return;
  var todos = storage.getTodos(aid());
  var found = todos.find(function(t) {
    return t.id === id;
  });
  if (!found || String(found.text || "") === trimmed) return;
  found.text = trimmed;
  found.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), found);
  rescheduleAllTodos(aid());
  refreshAllTodoUIs();
}

// public/js/features/todos-add-modal.mjs
var activeModal = null;
function closeActiveTodoAddModal() {
  if (!activeModal) return;
  const { backdrop, onKeydown } = activeModal;
  document.removeEventListener("keydown", onKeydown);
  if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  activeModal = null;
}
function buildTodoAddModalHtml(opts = {}) {
  const { patientContext = "" } = opts;
  return '<div class="wb-confirm-body wb-todo-add-body"><div class="wb-todo-add-header"><span class="wb-confirm-title">Nuevo pendiente</span>' + (patientContext ? `<span class="wb-todo-add-context">${escHtml(patientContext)}</span>` : "") + '</div><div class="wb-todo-add-field"><span class="wb-todo-add-label">Qu\xE9 hay que hacer</span><textarea class="wb-todo-add-text" rows="2" placeholder="Describe el pendiente"></textarea></div><div class="wb-todo-add-row"><div class="wb-todo-add-field"><span class="wb-todo-add-label">Prioridad</span><div class="wb-todo-add-prio-slot" data-wb-todo-add-prio-slot></div></div><div class="wb-todo-add-field wb-todo-add-field--due"><span class="wb-todo-add-label">Vence</span><div class="wb-todo-add-due-slot" data-wb-todo-add-due-slot></div></div></div></div><div class="wb-confirm-footer"><div class="wb-confirm-footer-actions"><button type="button" class="wb-btn wb-btn-secondary" data-wb-todo-add-cancel>Cancelar</button><button type="button" class="wb-btn wb-btn-primary" data-wb-todo-add-ok>Agregar pendiente</button></div></div>';
}
function openTodoAddModal(opts = {}) {
  if (typeof document === "undefined") return void 0;
  closeActiveTodoAddModal();
  const backdrop = document.createElement("div");
  backdrop.className = "wb-scrim";
  backdrop.setAttribute("data-wb-todo-add-backdrop", "");
  const modal = document.createElement("div");
  modal.className = "wb-confirm-modal wb-todo-add-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = buildTodoAddModalHtml(opts);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
  raf(() => backdrop.classList.add("wb-scrim--open"));
  const textEl = modal.querySelector(".wb-todo-add-text");
  let priority = "media";
  const prioChip = createTodoPrioChip("media", (next) => {
    priority = next;
  });
  modal.querySelector("[data-wb-todo-add-prio-slot]").appendChild(prioChip);
  const dueComposer = createTodoDueAddSection("todo-add-modal-");
  modal.querySelector("[data-wb-todo-add-due-slot]").appendChild(dueComposer.element);
  function close() {
    closeActiveTodoAddModal();
    if (typeof opts.onClose === "function") opts.onClose();
  }
  function submit() {
    const text = String(textEl.value || "").trim();
    if (!text) {
      textEl.focus();
      return;
    }
    const added = addTodoWithFields({ text, priority, dueFields: dueComposer.getFields() });
    closeActiveTodoAddModal();
    if (added && typeof opts.onAdded === "function") opts.onAdded();
  }
  modal.querySelector("[data-wb-todo-add-ok]").addEventListener("click", submit);
  modal.querySelector("[data-wb-todo-add-cancel]").addEventListener("click", close);
  backdrop.addEventListener("click", (ev) => {
    if (ev.target === backdrop) close();
  });
  const onKeydown = (ev) => {
    if (ev.key === "Escape") close();
  };
  document.addEventListener("keydown", onKeydown);
  activeModal = { backdrop, onKeydown };
  if (typeof textEl.focus === "function") textEl.focus();
  return backdrop;
}

// public/js/features/todos-list-render.mjs
var OPEN_ROW_GRID = "62px 1fr 118px 104px 74px";
var CLOSED_ROW_GRID = "1fr 118px 104px";
var OPEN_COLUMNS = ["Prior.", "Pendiente", "Qui\xE9n", "Vence", ""];
var GROUP_META = {
  vencido: { title: "Vencidos", headerClass: "wb-table-card-header--alert", titleClass: "wb-table-card-title--alert" },
  hoy: { title: "Hoy" },
  sin_fecha: { title: "Sin fecha" },
  listo: { title: "Cerrados \xB7 \xFAltimas 24 h", titleClass: "wb-table-card-title--muted" }
};
function getTodoFormDraftState(container) {
  if (!container) return null;
  var active = document.activeElement;
  if (!active || !container.contains(active)) return null;
  if (active.classList && active.classList.contains("todo-text-input")) {
    var row = active.closest(".wb-row");
    var todoId = row && row.dataset ? row.dataset.todoId : "";
    if (todoId) return { kind: "edit", todoId };
  }
  return null;
}
function clearTodoListSection(container) {
  Array.from(container.children).forEach(function(child) {
    container.removeChild(child);
  });
}
function findPreservedTodoRow(container, todoId) {
  if (!todoId) return null;
  var rows = container.querySelectorAll(".wb-row[data-todo-id]");
  for (var i = 0; i < rows.length; i += 1) {
    if (rows[i].dataset.todoId === todoId) return rows[i];
  }
  return null;
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function formatOpenVenceLabel(t, now) {
  if (!t || !t.dueDate) return "\u2014";
  var full = formatTodoDueLabel(t.dueDate, now);
  if (!full) return "\u2014";
  var todayOnly = full.replace(/^Hoy\s+/, "");
  if (todayOnly !== full) return todayOnly;
  return full.replace(/\s\d{2}:\d{2}$/, "");
}
function formatClosedVenceLabel(t, now) {
  var iso = t && (t.completedAt || t.updatedAt);
  if (!iso) return "\u2014";
  var date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "\u2014";
  var ref = now == null ? /* @__PURE__ */ new Date() : new Date(now);
  var time = pad2(date.getHours()) + ":" + pad2(date.getMinutes());
  var sameDay = date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth() && date.getDate() === ref.getDate();
  if (sameDay) return time;
  var yesterday = new Date(ref);
  yesterday.setDate(yesterday.getDate() - 1);
  var isYesterday = date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate();
  if (isYesterday) return "ayer " + time;
  return formatTodoDueLabel(iso, now) || time;
}
function buildTodoPriorCell(t, row) {
  var prio = normalizeTodoPriority(t.priority);
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "wb-todo-prior wb-todo-prior--" + prio;
  btn.textContent = todoPriorityLabel(prio).toUpperCase();
  btn.title = "Clic: cambiar prioridad";
  btn.addEventListener("click", function() {
    var next = nextTodoPriority(prio);
    setTodoPriority(t.id, next, { deferResortMs: 180 });
    row.classList.remove("wb-todo-row--prio-alta", "wb-todo-row--prio-media", "wb-todo-row--prio-baja");
    row.classList.add("wb-todo-row--prio-" + next);
    btn.className = "wb-todo-prior wb-todo-prior--" + next;
    btn.textContent = todoPriorityLabel(next).toUpperCase();
    prio = next;
  });
  return btn;
}
function buildTodoPendienteCell(t, txtInput) {
  var cell = document.createElement("span");
  cell.className = "wb-todo-pendiente";
  cell.appendChild(txtInput);
  var triggerValue = t && t.triggerValue ? String(t.triggerValue).trim() : "";
  if (triggerValue) {
    var trigger = document.createElement("span");
    trigger.className = "wb-todo-trigger";
    trigger.textContent = triggerValue;
    cell.appendChild(document.createTextNode(" "));
    cell.appendChild(trigger);
  }
  return cell;
}
function buildTodoQuienCell(t) {
  var cell = document.createElement("span");
  cell.className = "wb-todo-quien";
  var creatorLabel = formatTodoCreatorLabel(t.createdBy);
  cell.textContent = isHandoffTodo(t, getClinicalUsername()) ? "De " + creatorLabel : creatorLabel;
  return cell;
}
function buildTodoVenceCell(t, status, now) {
  var cell = document.createElement("span");
  cell.className = "wb-todo-vence wb-todo-vence--" + status;
  cell.textContent = formatOpenVenceLabel(t, now);
  if (t.reminderAt) {
    var bell = document.createElement("span");
    bell.className = "todo-remind-bell";
    bell.setAttribute("aria-hidden", "true");
    bell.textContent = String.fromCodePoint(128276);
    cell.appendChild(document.createTextNode(" "));
    cell.appendChild(bell);
  }
  return cell;
}
function buildTodoInCursoBtn(t) {
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "wb-todo-encurso-btn" + (t.inProgress ? " is-active" : "");
  btn.textContent = "En curso";
  btn.title = t.inProgress ? 'Quitar "en curso"' : "Marcar como en curso";
  btn.setAttribute("aria-pressed", String(!!t.inProgress));
  btn.addEventListener("click", function() {
    var next = !t.inProgress;
    setTodoInProgress(t.id, next);
    t.inProgress = next;
    btn.classList.toggle("is-active", next);
    btn.title = next ? 'Quitar "en curso"' : "Marcar como en curso";
    btn.setAttribute("aria-pressed", String(next));
  });
  return btn;
}
function buildTodoAccionCell(t) {
  var cell = document.createElement("span");
  cell.className = "wb-todo-accion";
  cell.appendChild(buildTodoInCursoBtn(t));
  var listo = document.createElement("button");
  listo.type = "button";
  listo.className = "wb-todo-listo-btn";
  listo.textContent = "Listo";
  listo.title = "Marcar como resuelto";
  listo.addEventListener("click", function() {
    var wasOpen = !t.completed;
    toggleTodo(t.id);
    if (wasOpen) {
      void openConfirm({
        weight: "reversible",
        message: "Pendiente marcado como listo",
        undoLabel: "Deshacer",
        onUndo: function() {
          toggleTodo(t.id);
        }
      });
    }
  });
  cell.appendChild(listo);
  if (isHandoffTodo(t, getClinicalUsername())) {
    var ack = document.createElement("button");
    ack.type = "button";
    ack.className = "wb-todo-ack-btn";
    ack.textContent = "Recibido";
    ack.title = "Marcar como recibido del turno anterior";
    ack.addEventListener("click", function() {
      acknowledgeHandoffTodo(t.id);
    });
    cell.appendChild(ack);
  }
  var del = document.createElement("button");
  del.type = "button";
  del.className = "wb-todo-del-btn";
  del.textContent = "\xD7";
  del.title = "Eliminar";
  del.addEventListener("click", function() {
    void openConfirm({
      weight: "destructive",
      title: "\xBFEliminar este pendiente?",
      message: t.text ? '"' + t.text + '" se borra de tu lista. No se puede deshacer.' : "No se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      onConfirm: function() {
        deleteTodo(t.id);
      }
    });
  });
  cell.appendChild(del);
  return cell;
}
function buildTodoTextInput(t) {
  var txtInput = document.createElement("input");
  txtInput.type = "text";
  txtInput.className = "todo-text-input";
  txtInput.value = t.text;
  txtInput.placeholder = "Descripci\xF3n del pendiente";
  txtInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      txtInput.blur();
    }
  });
  txtInput.addEventListener("blur", function() {
    var v = String(txtInput.value || "").trim();
    if (!v) {
      txtInput.value = t.text;
      return;
    }
    if (v !== String(t.text || "")) updateTodoText(t.id, v);
  });
  return txtInput;
}
function buildOpenTodoRow(t, status, now) {
  var row = document.createElement("div");
  row.className = "wb-row wb-todo-row wb-todo-row--prio-" + normalizeTodoPriority(t.priority);
  if (status === "vencido") row.classList.add("wb-row--alert");
  if (isHandoffTodo(t, getClinicalUsername())) row.classList.add("wb-todo-row--handoff");
  row.style.gridTemplateColumns = OPEN_ROW_GRID;
  row.dataset.todoId = t.id;
  var txtInput = buildTodoTextInput(t);
  row.appendChild(buildTodoPriorCell(t, row));
  row.appendChild(buildTodoPendienteCell(t, txtInput));
  row.appendChild(buildTodoQuienCell(t));
  row.appendChild(buildTodoVenceCell(t, status, now));
  row.appendChild(buildTodoAccionCell(t));
  return row;
}
function buildClosedTodoRow(t, now) {
  var row = document.createElement("div");
  row.className = "wb-row wb-todo-row wb-todo-row--closed";
  row.style.gridTemplateColumns = CLOSED_ROW_GRID;
  row.dataset.todoId = t.id;
  var text = document.createElement("span");
  text.className = "wb-todo-pendiente wb-todo-pendiente--closed";
  text.textContent = t.text;
  row.appendChild(text);
  row.appendChild(buildTodoQuienCell(t));
  var vence = document.createElement("span");
  vence.className = "wb-todo-vence wb-todo-vence--listo";
  vence.textContent = formatClosedVenceLabel(t, now);
  row.appendChild(vence);
  return row;
}
function buildTodoRow(t, status, now) {
  return status === "listo" ? buildClosedTodoRow(t, now) : buildOpenTodoRow(t, status, now);
}
function appendTodoFilterBar(container) {
  var existingToolbar = container.querySelector(".todo-toolbar");
  if (existingToolbar) existingToolbar.remove();
  var toolbar = document.createElement("div");
  toolbar.className = "todo-toolbar";
  var bar = document.createElement("div");
  bar.className = "todo-filter-bar todo-segmented";
  bar.setAttribute("role", "tablist");
  bar.setAttribute("aria-label", "Filtrar pendientes");
  var listFilter2 = getListFilter();
  var allTodos = storage.getTodos(aid());
  var handoffCount = countHandoffTodos(allTodos, getClinicalUsername());
  var filters = [
    { id: TODO_FILTER_ALL, label: "Todos", count: allTodos.length },
    {
      id: TODO_FILTER_HANDOFF,
      label: "Entrega",
      count: handoffCount
    }
  ];
  filters.forEach(function(f) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "todo-filter-chip" + (listFilter2 === f.id ? " is-active" : "");
    btn.dataset.filter = f.id;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", listFilter2 === f.id ? "true" : "false");
    btn.appendChild(document.createTextNode(f.label));
    if (f.count != null) {
      var countEl = document.createElement("span");
      countEl.className = "todo-filter-count";
      countEl.textContent = String(f.count);
      btn.appendChild(countEl);
    }
    btn.addEventListener("click", function() {
      setListFilter(f.id);
      renderTodoListSection(container, null);
    });
    bar.appendChild(btn);
  });
  var addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "todo-toolbar-add-btn";
  addBtn.textContent = "+ Pendiente";
  addBtn.setAttribute("aria-haspopup", "dialog");
  addBtn.addEventListener("click", function() {
    openTodoAddModal({
      onAdded: function() {
        renderTodoListSection(container, null);
      }
    });
  });
  toolbar.appendChild(bar);
  toolbar.appendChild(addBtn);
  container.appendChild(toolbar);
}
function updateExpPendientesTabBadge() {
  if (typeof document === "undefined") return;
  var badges = [
    document.getElementById("exp-pendientes-badge"),
    document.getElementById("exp-pendientes-badge-classic")
  ].filter(Boolean);
  if (!badges.length) return;
  var patientId = aid();
  var count = patientId ? storage.getTodos(patientId).filter(function(t) {
    return !t.completed;
  }).length : 0;
  badges.forEach(function(badge) {
    badge.textContent = "";
    badge.hidden = count === 0;
    if (count === 0) {
      badge.removeAttribute("aria-label");
    } else {
      badge.setAttribute("aria-label", "Pendientes abiertos");
    }
  });
}
function collectTodoRowsById(container) {
  var rows = /* @__PURE__ */ Object.create(null);
  container.querySelectorAll(".wb-row[data-todo-id]").forEach(function(row) {
    rows[row.dataset.todoId] = row;
  });
  return rows;
}
function markNewTodoRows(root, prevRows) {
  root.querySelectorAll(".wb-row[data-todo-id]").forEach(function(row) {
    if (!prevRows[row.dataset.todoId]) row.classList.add("row-enter");
  });
}
function renderTodoListSection(container, preserveTodoId) {
  var preservedRow = preserveTodoId ? findPreservedTodoRow(container, preserveTodoId) : null;
  var prevRows = collectTodoRowsById(container);
  clearTodoListSection(container);
  appendTodoFilterBar(container);
  var listFilter2 = getListFilter();
  var todos = filterTodosByView(storage.getTodos(aid()), listFilter2, getClinicalUsername()).slice().sort(todoCompareForDueSort);
  if (preservedRow) {
    var stillExists = todos.some(function(t) {
      return t.id === preserveTodoId;
    });
    if (!stillExists) preservedRow = null;
  }
  if (!todos.length && !preservedRow) {
    var none = document.createElement("div");
    none.className = "todo-empty";
    none.setAttribute("role", "status");
    if (listFilter2 === TODO_FILTER_HANDOFF) {
      none.innerHTML = '<span class="empty-state-title">Sin pendientes del turno anterior</span><span class="empty-state-lead">Los que quedaron abiertos al cerrar el turno previo aparecen aqu\xED.</span>';
    } else {
      none.innerHTML = '<span class="empty-state-title">Sin pendientes</span><span class="empty-state-lead">Escribe uno arriba para agregarlo.</span>';
    }
    container.appendChild(none);
    appendExitingRows(container, prevRows, /* @__PURE__ */ new Set());
    settlePasteSurface(none);
    updateExpPendientesTabBadge();
    return;
  }
  var list = document.createElement("div");
  list.className = "todo-list";
  appendGroupedTodoSections(list, todos, preservedRow, preserveTodoId);
  container.appendChild(list);
  markNewTodoRows(list, prevRows);
  appendExitingRows(container, prevRows, new Set(todos.map(function(t) {
    return t.id;
  })));
  settlePasteSurface(list);
  updateExpPendientesTabBadge();
}
var TODO_OPEN_GROUP_ORDER = ["vencido", "hoy", "sin_fecha"];
function buildTodoGroupPlan(todos, now) {
  var groups = groupTodosByStatus(todos, now);
  var plan = [];
  TODO_OPEN_GROUP_ORDER.forEach(function(status) {
    if (groups[status].length) {
      plan.push({
        status,
        todos: groups[status].slice().sort(todoCompareForDueSort),
        collapsed: false
      });
    }
  });
  if (groups.listo.length) {
    plan.push({
      status: "listo",
      todos: groups.listo.slice().sort(todoCompareForDueSort),
      collapsed: true
    });
  }
  return plan;
}
function rowForTodo(t, status, now, preservedRow, preserveTodoId) {
  return preservedRow && t.id === preserveTodoId ? preservedRow : buildTodoRow(t, status, now);
}
function buildTodoGroupHeaderHtml(status, count) {
  var meta = GROUP_META[status] || GROUP_META.sin_fecha;
  var titleClass = "wb-table-card-title" + (meta.titleClass ? " " + meta.titleClass : "");
  if (status === "listo") {
    return '<span class="' + titleClass + '">' + meta.title + '</span><span class="wb-todo-group-count">' + count + "</span>";
  }
  return '<span class="' + titleClass + '">' + meta.title + " \xB7 " + count + "</span>";
}
function appendTodoGroupRows(parent, status, todos, now, preservedRow, preserveTodoId) {
  var body = document.createElement("div");
  body.className = "wb-table-body";
  todos.forEach(function(t) {
    body.appendChild(rowForTodo(t, status, now, preservedRow, preserveTodoId));
  });
  parent.appendChild(body);
}
function appendTodoGroupSection(list, group, now, preservedRow, preserveTodoId, showColhead) {
  var meta = GROUP_META[group.status] || GROUP_META.sin_fecha;
  var root = document.createElement(group.collapsed ? "details" : "div");
  root.className = "todo-group wb-table-card todo-group--" + group.status.replace(/_/g, "-");
  if (group.collapsed) root.open = false;
  var header = document.createElement(group.collapsed ? "summary" : "div");
  header.className = "todo-group-header wb-table-card-header" + (meta.headerClass ? " " + meta.headerClass : "");
  header.innerHTML = buildTodoGroupHeaderHtml(group.status, group.todos.length);
  root.appendChild(header);
  if (showColhead && group.status !== "listo") {
    var colhead = document.createElement("div");
    colhead.className = "wb-table-colhead";
    colhead.style.gridTemplateColumns = OPEN_ROW_GRID;
    OPEN_COLUMNS.forEach(function(c) {
      var span = document.createElement("span");
      span.textContent = c;
      colhead.appendChild(span);
    });
    root.appendChild(colhead);
  }
  appendTodoGroupRows(root, group.status, group.todos, now, preservedRow, preserveTodoId);
  list.appendChild(root);
}
function appendGroupedTodoSections(list, todos, preservedRow, preserveTodoId, now) {
  var plan = buildTodoGroupPlan(todos, now);
  var colheadShown = false;
  plan.forEach(function(group) {
    var showColhead = !colheadShown && group.status !== "listo";
    if (showColhead) colheadShown = true;
    appendTodoGroupSection(list, group, now, preservedRow, preserveTodoId, showColhead);
  });
}
function renderTodoFormIn(container, idPrefix) {
  if (!container) return;
  idPrefix = idPrefix == null ? "" : String(idPrefix);
  if (!aid()) {
    while (container.firstChild) container.removeChild(container.firstChild);
    var empty = document.createElement("div");
    empty.className = "todo-empty";
    empty.setAttribute("role", "status");
    empty.innerHTML = '<span class="empty-state-title">Elige un paciente para ver pendientes</span><span class="empty-state-lead">Selecciona uno en la lista de la izquierda.</span>';
    container.appendChild(empty);
    return;
  }
  container.classList.add("todo-shell");
  var draft = getTodoFormDraftState(container);
  var hasContent = !!container.querySelector(".todo-toolbar");
  if (draft && hasContent) {
    renderTodoListSection(container, draft.todoId);
    return;
  }
  renderTodoListSection(container, null);
}

// public/js/features/todos-refresh.mjs
function refreshTodoUIsForPatient(patientId) {
  var pid = String(patientId || "").trim();
  if (!pid) return;
  if (aid() === pid) {
    var todoForm = document.getElementById("todo-form");
    if (todoForm) renderTodoFormIn(todoForm, "");
  }
}
function refreshTodoUIsForPatients(patientIds) {
  var seen = /* @__PURE__ */ Object.create(null);
  var unique = [];
  (patientIds || []).forEach(function(pid) {
    var id = String(pid || "").trim();
    if (!id || seen[id]) return;
    seen[id] = true;
    unique.push(id);
  });
  unique.forEach(function(pid) {
    refreshTodoUIsForPatient(pid);
  });
}
function refreshAllTodoUIs() {
  var todoForm = document.getElementById("todo-form");
  if (todoForm) renderTodoFormIn(todoForm, "");
}
function renderTodoForm() {
  refreshAllTodoUIs();
}

export {
  registerTodosRuntime,
  addTodo,
  toggleTodo,
  deleteTodo,
  setTodoPriority,
  updateExpPendientesTabBadge,
  refreshTodoUIsForPatient,
  refreshTodoUIsForPatients,
  refreshAllTodoUIs,
  renderTodoForm
};
//# sourceMappingURL=/js/chunks/chunk-HLOATWQV.js.map

import {
  addTodoDuePreset,
  deleteTodoDuePreset,
  formatTodoDueLabel,
  formatTodoDuePresetAutoLabel,
  getTodoDuePresets,
  isTodoOverdue,
  isoToDatetimeLocalValue,
  parseDatetimeLocalToIso,
  parseDuePreset,
  rescheduleAllTodos,
  resetTodoDuePresetOverrides,
  resolveTodoDuePresetDef,
  saveTodoDuePresetOverrides,
  syncTodoDuePresetsFromEditRows,
  todoCompareForDueSort
} from "/mobile/js/chunks/chunk-CULVJM5A.js";
import {
  mountRpcDatetimeInput
} from "/mobile/js/chunks/chunk-56R66ES7.js";
import {
  enqueueCloudTodoDelete,
  enqueueCloudTodoUpsert
} from "/mobile/js/chunks/chunk-3NNHG3MC.js";
import {
  isPaseMode
} from "/mobile/js/chunks/chunk-PD77VH7Y.js";
import {
  nextTodoPriority,
  normalizeTodoPriority,
  todoPriorityLabel
} from "/mobile/js/chunks/chunk-ZQE77EGT.js";
import {
  storage
} from "/mobile/js/chunks/chunk-WXZVVY5M.js";

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
  getRoundOverviewMode() {
    return false;
  },
  getSettings() {
    return {};
  },
  renderPaseBoard() {
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
function getTodosRuntime() {
  return rt;
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
function syncTodoRowPriorityVisual(row, prio) {
  if (!row) return;
  var valid = normalizeTodoPriority(prio);
  row.classList.remove("prio-alta", "prio-media", "prio-baja");
  row.classList.add("prio-" + valid);
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
function addTodo(idPrefix, priorityOverride, dueFields) {
  if (idPrefix === void 0 || idPrefix === null) idPrefix = "";
  if (typeof idPrefix !== "string") idPrefix = "";
  if (!aid()) return;
  var input = document.getElementById(idPrefix + "todo-input");
  if (!input) return;
  var text = String(input.value || "").trim();
  if (!text) return;
  var chip = document.getElementById(idPrefix + "todo-priority-chip");
  var priority = normalizeTodoPriority(
    priorityOverride || chip && chip.dataset.priority || "media"
  );
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
  if (dueFields && dueFields.dueDate) {
    row.dueDate = dueFields.dueDate;
    if (dueFields.reminderAt) row.reminderAt = dueFields.reminderAt;
  }
  todos.push(row);
  storage.saveTodos(aid(), todos);
  enqueueCloudTodoUpsert(aid(), row);
  rescheduleAllTodos(aid());
  input.value = "";
  refreshAllTodoUIs();
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

// public/js/features/todos-list-render.mjs
function getTodoFormDraftState(container, idPrefix) {
  if (!container) return null;
  var active = document.activeElement;
  if (!active || !container.contains(active)) return null;
  if (active.id === idPrefix + "todo-input") {
    return { kind: "new" };
  }
  if (active.classList && active.classList.contains("todo-text-input")) {
    var row = active.closest(".todo-row");
    var todoId = row && row.dataset ? row.dataset.todoId : "";
    if (todoId) return { kind: "edit", todoId };
  }
  return null;
}
function clearTodoListSection(container) {
  Array.from(container.children).forEach(function(child) {
    if (child.classList.contains("todo-composer")) return;
    container.removeChild(child);
  });
}
function findPreservedTodoRow(container, todoId) {
  if (!todoId) return null;
  var rows = container.querySelectorAll(".todo-row[data-todo-id]");
  for (var i = 0; i < rows.length; i += 1) {
    if (rows[i].dataset.todoId === todoId) return rows[i];
  }
  return null;
}
function appendTodoHandoffMeta(cell, todo) {
  if (!isHandoffTodo(todo, getClinicalUsername())) return;
  var meta = document.createElement("div");
  meta.className = "todo-handoff-meta";
  var creator = document.createElement("span");
  creator.className = "todo-handoff-creator";
  creator.textContent = "De " + formatTodoCreatorLabel(todo.createdBy);
  meta.appendChild(creator);
  cell.appendChild(meta);
}
function appendTodoMainCell(row, todo, txtInput) {
  var cell = document.createElement("div");
  cell.className = "todo-cell-main";
  cell.appendChild(txtInput);
  appendTodoHandoffMeta(cell, todo);
  if (todo.dueDate) {
    var dueLabel = document.createElement("span");
    dueLabel.className = "todo-due-label";
    dueLabel.textContent = formatTodoDueLabel(todo.dueDate);
    if (todo.reminderAt) {
      dueLabel.appendChild(document.createTextNode(" "));
      var bell = document.createElement("span");
      bell.className = "todo-remind-bell";
      bell.setAttribute("aria-hidden", "true");
      bell.textContent = "\u{1F514}";
      dueLabel.appendChild(bell);
    }
    cell.appendChild(dueLabel);
  }
  row.appendChild(cell);
}
function buildTodoRow(t) {
  var prio = t.priority === "alta" || t.priority === "baja" ? t.priority : "media";
  var row = document.createElement("div");
  row.className = "todo-row prio-" + prio + (t.completed ? " completed" : "");
  if (isTodoOverdue(t)) row.classList.add("todo-row--overdue");
  if (isHandoffTodo(t, getClinicalUsername())) row.classList.add("todo-row--handoff");
  row.dataset.todoId = t.id;
  var prioChip = createTodoPrioChip(prio, function(next) {
    syncTodoRowPriorityVisual(row, next);
    setTodoPriority(t.id, next, { deferResortMs: 180 });
  });
  row.appendChild(prioChip);
  var chk = document.createElement("input");
  chk.type = "checkbox";
  chk.className = "todo-check";
  chk.setAttribute("aria-label", "Completado");
  chk.checked = !!t.completed;
  chk.addEventListener("change", function() {
    toggleTodo(t.id);
  });
  row.appendChild(chk);
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
  appendTodoMainCell(row, t, txtInput);
  var actions = document.createElement("div");
  actions.className = "todo-row-actions";
  if (isHandoffTodo(t, getClinicalUsername())) {
    var ack = document.createElement("button");
    ack.type = "button";
    ack.className = "todo-handoff-ack";
    ack.textContent = "Recibido";
    ack.title = "Marcar como recibido del turno anterior";
    ack.addEventListener("click", function() {
      acknowledgeHandoffTodo(t.id);
    });
    actions.appendChild(ack);
  }
  var del = document.createElement("button");
  del.type = "button";
  del.className = "todo-del";
  del.textContent = "\xD7";
  del.title = "Eliminar";
  del.addEventListener("click", function() {
    deleteTodo(t.id);
  });
  actions.appendChild(del);
  row.appendChild(actions);
  return row;
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
    { id: TODO_FILTER_ALL, label: "Todos" },
    {
      id: TODO_FILTER_HANDOFF,
      label: handoffCount ? "Entrega (" + handoffCount + ")" : "Entrega"
    }
  ];
  filters.forEach(function(f) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "todo-filter-chip" + (listFilter2 === f.id ? " is-active" : "");
    btn.dataset.filter = f.id;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", listFilter2 === f.id ? "true" : "false");
    btn.textContent = f.label;
    btn.addEventListener("click", function() {
      setListFilter(f.id);
      renderTodoListSection(container, null);
    });
    bar.appendChild(btn);
  });
  toolbar.appendChild(bar);
  container.appendChild(toolbar);
}
function appendTodoAddRow(container, idPrefix) {
  var composer = document.createElement("div");
  composer.className = "todo-composer";
  var addRow = document.createElement("div");
  addRow.className = "todo-add-row";
  var input = document.createElement("input");
  input.type = "text";
  input.id = idPrefix + "todo-input";
  input.placeholder = "Nuevo pendiente...";
  var addPrio = "media";
  var prioChip = createTodoPrioChip(addPrio, function(next) {
    addPrio = next;
  });
  prioChip.id = idPrefix + "todo-priority-chip";
  var dueControls = createTodoDueAddSection(idPrefix);
  var addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "todo-add-btn";
  addBtn.textContent = "Agregar";
  function submitAdd() {
    addTodo(idPrefix, addPrio, dueControls.getFields());
    dueControls.reset();
  }
  addBtn.addEventListener("click", submitAdd);
  input.addEventListener("keypress", function(e) {
    if (e.key === "Enter") submitAdd();
  });
  var chkSpacer = document.createElement("span");
  chkSpacer.className = "todo-check-spacer";
  chkSpacer.setAttribute("aria-hidden", "true");
  addRow.appendChild(prioChip);
  addRow.appendChild(chkSpacer);
  addRow.appendChild(input);
  addRow.appendChild(addBtn);
  composer.appendChild(addRow);
  composer.appendChild(dueControls.element);
  container.appendChild(composer);
}
function renderTodoListSection(container, preserveTodoId) {
  var preservedRow = preserveTodoId ? findPreservedTodoRow(container, preserveTodoId) : null;
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
      none.innerHTML = '<span class="empty-state-title">Sin pendientes del turno anterior para este paciente</span><span class="empty-state-lead">Los que quedaron abiertos al cerrar el turno previo aparecer\xE1n aqu\xED.</span>';
    } else {
      none.innerHTML = '<span class="empty-state-title">Sin pendientes</span><span class="empty-state-lead">Usa el campo de arriba para agregar uno.</span>';
    }
    container.appendChild(none);
    return;
  }
  var list = document.createElement("div");
  list.className = "todo-list";
  todos.forEach(function(t) {
    if (preservedRow && t.id === preserveTodoId) {
      list.appendChild(preservedRow);
      return;
    }
    list.appendChild(buildTodoRow(t));
  });
  container.appendChild(list);
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
  var draft = getTodoFormDraftState(container, idPrefix);
  var hasAddRow = !!container.querySelector(".todo-composer, .todo-add-row");
  if (draft && hasAddRow) {
    if (draft.kind === "new") {
      renderTodoListSection(container, null);
      return;
    }
    if (draft.kind === "edit") {
      renderTodoListSection(container, draft.todoId);
      return;
    }
  }
  while (container.firstChild) container.removeChild(container.firstChild);
  appendTodoAddRow(container, idPrefix);
  renderTodoListSection(container, null);
}

// public/js/features/todos-refresh.mjs
function refreshRondaTodoMount() {
  var overview = document.getElementById("patient-ronda-overview");
  var ronda = document.getElementById("patient-ronda-todos-mount");
  if (!ronda) return;
  var rt2 = getTodosRuntime();
  var showRonda = isPaseMode() && overview && overview.style.display !== "none" && aid() && rt2.getActiveAppTab() === "nota" && rt2.getRoundOverviewMode();
  if (showRonda) {
    renderTodoFormIn(ronda, "ronda-");
  } else {
    while (ronda.firstChild) ronda.removeChild(ronda.firstChild);
  }
}
function refreshTodoUIsForPatient(patientId, opts) {
  opts = opts || {};
  var pid = String(patientId || "").trim();
  if (!pid) return;
  if (aid() === pid) {
    var todoForm = document.getElementById("todo-form");
    if (todoForm) renderTodoFormIn(todoForm, "");
    refreshRondaTodoMount();
  }
  if (isPaseMode() && !opts.skipPaseBoard) {
    getTodosRuntime().renderPaseBoard();
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
    refreshTodoUIsForPatient(pid, { skipPaseBoard: true });
  });
  if (unique.length && isPaseMode()) {
    getTodosRuntime().renderPaseBoard();
  }
}
function refreshAllTodoUIs() {
  var todoForm = document.getElementById("todo-form");
  if (todoForm) renderTodoFormIn(todoForm, "");
  refreshRondaTodoMount();
  if (isPaseMode()) getTodosRuntime().renderPaseBoard();
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
  refreshTodoUIsForPatient,
  refreshTodoUIsForPatients,
  refreshAllTodoUIs,
  renderTodoForm
};
//# sourceMappingURL=/js/chunks/chunk-H22VI5GA.js.map

import { mountRpcDatetimeInput } from './rpc-date-picker.mjs';
import {
  isoToDatetimeLocalValue,
  parseDatetimeLocalToIso,
} from './todos-due.mjs';

/** @type {((fields: { dueDate: string|null, reminderAt: string|null, remindEnabled: boolean }) => void)|null} */
var onSaveCallback = null;

var dismissWired = false;

function getBackdrop() {
  return document.getElementById('todo-due-modal-backdrop');
}

function getDatetimeInput() {
  return /** @type {HTMLInputElement|null} */ (document.getElementById('todo-due-modal-datetime'));
}

function getRemindInput() {
  return /** @type {HTMLInputElement|null} */ (document.getElementById('todo-due-modal-remind'));
}

function closeTodoDueModal() {
  var backdrop = getBackdrop();
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  onSaveCallback = null;
}

function readModalFields() {
  var datetimeInput = getDatetimeInput();
  var remindInput = getRemindInput();
  var dueDate = datetimeInput ? parseDatetimeLocalToIso(datetimeInput.value) : null;
  var remindEnabled = !!(remindInput && remindInput.checked && dueDate);
  return {
    dueDate: dueDate,
    reminderAt: remindEnabled ? dueDate : null,
    remindEnabled: remindEnabled,
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

function wireTodoDueModal() {
  if (dismissWired) return;
  dismissWired = true;

  var backdrop = getBackdrop();
  if (!backdrop) return;

  backdrop.addEventListener('click', function (ev) {
    if (!backdrop.classList.contains('open')) return;
    if (ev.target !== backdrop) return;
    closeTodoDueModal();
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    var bd = getBackdrop();
    if (!bd || !bd.classList.contains('open')) return;
    closeTodoDueModal();
    ev.preventDefault();
  });

  var cancelBtn = document.getElementById('todo-due-modal-cancel');
  var clearBtn = document.getElementById('todo-due-modal-clear');
  var saveBtn = document.getElementById('todo-due-modal-save');
  if (cancelBtn) cancelBtn.addEventListener('click', closeTodoDueModal);
  if (clearBtn) clearBtn.addEventListener('click', clearTodoDueModal);
  if (saveBtn) saveBtn.addEventListener('click', saveTodoDueModal);
}

function ensureDatetimeMounted() {
  var datetimeInput = getDatetimeInput();
  if (!datetimeInput) return;
  mountRpcDatetimeInput(datetimeInput);
}

/**
 * @param {{
 *   dueDate?: string|null,
 *   remindEnabled?: boolean,
 *   onSave: (fields: { dueDate: string|null, reminderAt: string|null, remindEnabled: boolean }) => void,
 * }} opts
 */
export function openTodoDueModal(opts) {
  wireTodoDueModal();
  var backdrop = getBackdrop();
  var datetimeInput = getDatetimeInput();
  var remindInput = getRemindInput();
  if (!backdrop || !datetimeInput || !remindInput) return;

  ensureDatetimeMounted();
  onSaveCallback = opts && opts.onSave ? opts.onSave : null;

  var dueDate = opts && opts.dueDate ? String(opts.dueDate) : '';
  datetimeInput.value = dueDate ? isoToDatetimeLocalValue(dueDate) : isoToDatetimeLocalValue(new Date().toISOString());
  datetimeInput.dispatchEvent(new CustomEvent('rpc-datetime-sync'));
  remindInput.checked = !!(opts && opts.remindEnabled && dueDate);
  remindInput.disabled = false;

  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');

  var dateTrigger = backdrop.querySelector('.rpc-date-field__trigger');
  if (dateTrigger instanceof HTMLElement) dateTrigger.focus();
  else datetimeInput.focus();
}

export function closeTodoDueModalPublic() {
  closeTodoDueModal();
}

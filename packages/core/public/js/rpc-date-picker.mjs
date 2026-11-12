import { formatAccesoFechaDisplay } from './patient-date-fields.mjs';

/** The Preact view loads lazily so Preact stays off the boot path; init preloads it. */
let view = null;
let viewLoad = null;
function loadView() {
  if (view) return Promise.resolve(view);
  if (!viewLoad) viewLoad = import('./rpc-date-picker-view.jsx').then(function (m) { view = m; return m; });
  return viewLoad;
}

/** @type {HTMLElement|null} */
let popoverEl = null;
/** @type {(() => void)|null} */
let activeClose = null;

export function formatIsoDateDisplay(iso) {
  return formatAccesoFechaDisplay(iso);
}

function parseIso(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
  if (!m) return null;
  var y = Number(m[1]);
  var mo = Number(m[2]) - 1;
  var d = Number(m[3]);
  var dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

function isoFromDate(dt) {
  return (
    dt.getFullYear() +
    '-' +
    String(dt.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(dt.getDate()).padStart(2, '0')
  );
}

function todayIso() {
  return isoFromDate(new Date());
}

function ensurePopover() {
  if (popoverEl) return popoverEl;
  popoverEl = document.createElement('div');
  popoverEl.id = 'rpc-date-popover';
  popoverEl.className = 'rpc-date-popover';
  popoverEl.setAttribute('role', 'dialog');
  popoverEl.setAttribute('aria-modal', 'false');
  popoverEl.hidden = true;
  document.body.appendChild(popoverEl);
  return popoverEl;
}

function closePopover() {
  if (!popoverEl || popoverEl.hidden) return;
  popoverEl.hidden = true;
  if (view) view.clearDatePopover(popoverEl);
  else popoverEl.replaceChildren();
  popoverEl.removeAttribute('data-open');
  if (activeClose) {
    activeClose();
    activeClose = null;
  }
}

export function isRpcDatePopoverOpen() {
  return !!(popoverEl && !popoverEl.hidden);
}

export function closeRpcDatePopover() {
  closePopover();
}

function positionPopover(anchor) {
  if (!popoverEl || !anchor) return;
  var rect = anchor.getBoundingClientRect();
  var gap = 6;
  var top = rect.bottom + gap;
  var left = rect.left;
  popoverEl.style.top = top + 'px';
  popoverEl.style.left = left + 'px';
  requestAnimationFrame(function () {
    if (!popoverEl || popoverEl.hidden) return;
    var pr = popoverEl.getBoundingClientRect();
    var maxLeft = window.innerWidth - pr.width - 8;
    var maxTop = window.innerHeight - pr.height - 8;
    left = Math.min(Math.max(8, left), Math.max(8, maxLeft));
    if (top > maxTop) top = Math.max(8, rect.top - pr.height - gap);
    top = Math.min(Math.max(8, top), Math.max(8, maxTop));
    popoverEl.style.top = top + 'px';
    popoverEl.style.left = left + 'px';
  });
}

/**
 * @param {HTMLElement} anchor
 * @param {{ value?: string, onSelect?: (iso: string) => void }} opts
 */
export function openRpcDatePicker(anchor, opts) {
  if (!view) {
    loadView().then(function () {
      openRpcDatePicker(anchor, opts);
    });
    return;
  }
  var options = opts || {};
  var selected = parseIso(options.value) || new Date();
  var viewYear = selected.getFullYear();
  var viewMonth = selected.getMonth();
  var selectedIso = options.value ? String(options.value).trim() : '';

  var pop = ensurePopover();
  closePopover();

  function done(iso) {
    if (options.onSelect) options.onSelect(iso);
    closePopover();
  }

  function paint() {
    view.drawDatePopover(pop, {
      year: viewYear,
      month: viewMonth,
      selectedIso: selectedIso,
      today: todayIso(),
      onNav: function (delta) {
        viewMonth += delta;
        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear -= 1;
        } else if (viewMonth > 11) {
          viewMonth = 0;
          viewYear += 1;
        }
        paint();
      },
      onPick: done,
      onClear: function () {
        done('');
      },
      onToday: function () {
        done(todayIso());
      },
    });
  }

  paint();
  pop.hidden = false;
  pop.setAttribute('data-open', '1');
  positionPopover(anchor);
  activeClose = function () {
    if (anchor && anchor.setAttribute) anchor.setAttribute('aria-expanded', 'false');
  };
  if (anchor && anchor.setAttribute) anchor.setAttribute('aria-expanded', 'true');
}

function parseTimeParts(hhmm) {
  var t = String(hhmm || '').trim();
  if (!t || !/^\d{1,2}:\d{1,2}$/.test(t)) return { hour: '', minute: '' };
  var parts = t.split(':');
  return {
    hour: String(parts[0]).padStart(2, '0'),
    minute: String(parts[1]).padStart(2, '0'),
  };
}

function fillHourSelect(select, selected) {
  select.replaceChildren();
  for (var h = 0; h < 24; h += 1) {
    var v = String(h).padStart(2, '0');
    var opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    if (v === selected) opt.selected = true;
    select.appendChild(opt);
  }
}

function fillMinuteSelect(select, selected) {
  select.replaceChildren();
  var stepSet = Object.create(null);
  for (var m = 0; m < 60; m += 5) {
    var v = String(m).padStart(2, '0');
    stepSet[v] = true;
    var opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    if (v === selected) opt.selected = true;
    select.appendChild(opt);
  }
  if (selected && !stepSet[selected]) {
    var exact = document.createElement('option');
    exact.value = selected;
    exact.textContent = selected;
    exact.selected = true;
    select.appendChild(exact);
  }
}

/**
 * @param {string} [selectedHhmm]
 * @returns {{ wrap: HTMLDivElement, hourSelect: HTMLSelectElement, minuteSelect: HTMLSelectElement, getValue: () => string, setValue: (hhmm: string) => void }}
 */
function createRpcTimePicker(selectedHhmm) {
  var parts = parseTimeParts(selectedHhmm || '09:00');
  var wrap = document.createElement('div');
  wrap.className = 'rpc-time-picker';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Hora');

  var hourSelect = document.createElement('select');
  hourSelect.className = 'rpc-time-picker__select';
  hourSelect.setAttribute('aria-label', 'Hora');
  fillHourSelect(hourSelect, parts.hour || '09');

  var sep = document.createElement('span');
  sep.className = 'rpc-time-picker__sep';
  sep.setAttribute('aria-hidden', 'true');
  sep.textContent = ':';

  var minuteSelect = document.createElement('select');
  minuteSelect.className = 'rpc-time-picker__select';
  minuteSelect.setAttribute('aria-label', 'Minutos');
  fillMinuteSelect(minuteSelect, parts.minute || '00');

  wrap.appendChild(hourSelect);
  wrap.appendChild(sep);
  wrap.appendChild(minuteSelect);

  return {
    wrap: wrap,
    hourSelect: hourSelect,
    minuteSelect: minuteSelect,
    getValue: function () {
      return hourSelect.value + ':' + minuteSelect.value;
    },
    setValue: function (hhmm) {
      var p = parseTimeParts(hhmm);
      fillHourSelect(hourSelect, p.hour || '09');
      fillMinuteSelect(minuteSelect, p.minute || '00');
    },
  };
}

/** @param {HTMLInputElement} input */
export function mountRpcDateInput(input) {
  if (!input || input.dataset.rpcDateMounted === '1') return;
  input.dataset.rpcDateMounted = '1';

  var wrap = document.createElement('div');
  wrap.className = 'rpc-date-field';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);

  input.type = 'hidden';
  input.classList.add('rpc-date-field__value');

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'rpc-date-field__trigger profile-input';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  var label = document.createElement('span');
  label.className = 'rpc-date-field__label';
  var icon = document.createElement('span');
  icon.className = 'rpc-date-field__icon';
  loadView().then(function (v) {
    v.drawCalendarIcon(icon);
  });
  btn.appendChild(label);
  btn.appendChild(icon);
  wrap.insertBefore(btn, input);

  function syncLabel() {
    var iso = String(input.value || '').trim();
    label.textContent = iso ? formatIsoDateDisplay(iso) : 'Elegir fecha';
    btn.classList.toggle('is-placeholder', !iso);
  }
  syncLabel();

  input.addEventListener('rpc-date-refresh', syncLabel);

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    openRpcDatePicker(btn, {
      value: input.value,
      onSelect: function (iso) {
        input.value = iso;
        syncLabel();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      },
    });
  });
}

/** @param {HTMLInputElement} input datetime-local */
export function mountRpcDatetimeInput(input) {
  if (!input || input.dataset.rpcDatetimeMounted === '1') return;
  input.dataset.rpcDatetimeMounted = '1';

  var wrap = document.createElement('div');
  wrap.className = 'rpc-datetime-field';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  input.classList.add('rpc-datetime-field__native');
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');

  var dateWrap = document.createElement('div');
  dateWrap.className = 'rpc-datetime-field__date';
  wrap.insertBefore(dateWrap, input);

  var dateHidden = document.createElement('input');
  dateHidden.type = 'hidden';
  dateHidden.className = 'rpc-date-field__value';
  dateWrap.appendChild(dateHidden);

  var timePicker = createRpcTimePicker('09:00');
  wrap.appendChild(timePicker.wrap);

  function syncLabelFromHidden() {
    dateHidden.dispatchEvent(new Event('rpc-date-refresh'));
  }

  function syncFromNative() {
    var raw = String(input.value || '');
    var parts = raw.split('T');
    dateHidden.value = parts[0] || '';
    timePicker.setValue((parts[1] || '').slice(0, 5) || '09:00');
    syncLabelFromHidden();
  }

  function syncToNative() {
    var d = String(dateHidden.value || '').trim();
    var t = String(timePicker.getValue() || '').trim() || '09:00';
    if (!d) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    input.value = d + 'T' + t;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  syncFromNative();
  mountRpcDateInput(dateHidden);
  dateHidden.addEventListener('input', syncToNative);
  timePicker.hourSelect.addEventListener('change', syncToNative);
  timePicker.minuteSelect.addEventListener('change', syncToNative);

  input.addEventListener('rpc-datetime-sync', syncFromNative);
}

/** @param {ParentNode|null|undefined} root */
export function refreshRpcDateFields(root) {
  var scope = root && root.querySelectorAll ? root : document;
  scope.querySelectorAll('input.rpc-date-input[type="date"]').forEach(function (el) {
    mountRpcDateInput(el);
  });
  scope.querySelectorAll('input.rpc-datetime-input[type="datetime-local"]').forEach(function (el) {
    mountRpcDatetimeInput(el);
  });
}

let refreshTimer = 0;
function scheduleRefresh() {
  if (refreshTimer) return;
  refreshTimer = window.setTimeout(function () {
    refreshTimer = 0;
    refreshRpcDateFields(document);
  }, 0);
}

export function initRpcDatePicker() {
  loadView();
  ensurePopover();
  refreshRpcDateFields(document);

  document.addEventListener(
    'click',
    function (e) {
      if (!popoverEl || popoverEl.hidden) return;
      var t = e.target;
      if (!(t instanceof Element)) return;
      if (popoverEl.contains(t) || t.closest('.rpc-date-field__trigger')) return;
      closePopover();
    },
    true
  );

  window.addEventListener('resize', function () {
    if (popoverEl && !popoverEl.hidden) closePopover();
  });

  var obs = new MutationObserver(scheduleRefresh);
  obs.observe(document.body, { childList: true, subtree: true });
}

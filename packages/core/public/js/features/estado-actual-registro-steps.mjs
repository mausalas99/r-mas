/** Registro manual: pasos (Signos, Glucosa, Balance, Revisar), avance automático y números que ruedan. */
import { VITAL_LABELS } from './estado-actual-panel-constants.mjs';

var STEP_NAMES = ['Signos', 'Glucosa', 'Balance', 'Revisar'];
var ADVANCE_MS = 700;
var AUTO_KEY = 'ea-registro-auto-advance';
/** iOS Motion.moderate (m 1, k 456.4, c 35.04) as a CSS curve. */
var SPRING_MODERATE =
  'linear(0,0.041,0.134,0.243,0.359,0.481,0.584,0.675,0.757,0.821,0.872,0.914,0.944,0.967,0.984,0.995,1.002,1.006,1.009,1.01,1.01,1.009,1.008,1.007,1.006,1.005,1.004,1.003,1)';

function reducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/**
 * Sets the text of a number cell. Each character is its own span, so a changed digit
 * can roll up (value grew) or down (value shrank) like iOS `numericText`.
 * `textContent` stays exactly the text.
 * @param {HTMLElement} el
 * @param {string} text
 */
export function rollText(el, text) {
  var next = String(text);
  var prev = el.textContent || '';
  if (prev === next) return;
  var spans = el.querySelectorAll(':scope > .ea-dg');
  if (spans.length === next.length && spans.length > 0) {
    next.split('').forEach(function (c, i) {
      if (spans[i].textContent !== c) spans[i].textContent = c;
    });
  } else {
    el.textContent = '';
    next.split('').forEach(function (c) {
      var s = document.createElement('span');
      s.className = 'ea-dg';
      s.textContent = c;
      el.appendChild(s);
    });
    spans = el.querySelectorAll(':scope > .ea-dg');
  }
  if (reducedMotion()) return;
  var offset = next.length - prev.length;
  spans.forEach(function (s, i) {
    var c = s.textContent || '';
    var old = prev.charAt(i - offset);
    if (!/\d/.test(c) || c === old || typeof s.animate !== 'function') return;
    var grew = !/\d/.test(old) || Number(c) > Number(old);
    s.animate(
      [
        { transform: 'translateY(' + (grew ? '60%' : '-60%') + ')', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 374, easing: SPRING_MODERATE }
    );
  });
}

function filled(el) {
  return !!el && String(el.value || '').trim() !== '';
}

/** @param {HTMLElement} form */
function countVitals(form) {
  return Array.prototype.filter.call(form.querySelectorAll('[data-ea-vital]'), filled).length;
}

/** @param {HTMLElement} form */
function glucoseValues(form) {
  var bomba = form.querySelector('#ea-bomba-enabled');
  var sel = bomba && bomba.checked ? '[data-ea-bomba-value]' : '#ea-glu-list [data-ea-glu-value]';
  return Array.prototype.slice.call(form.querySelectorAll(sel));
}

/** @param {HTMLElement} form */
function turnoFilled(form, prefix) {
  return ['t1', 't2', 't3'].some(function (t) {
    return filled(form.querySelector('#ea-io-' + prefix + '-' + t));
  });
}

/**
 * Step is full when nothing the nurse is expected to write is left empty.
 * @param {HTMLElement} form
 * @param {number} step
 */
export function isStepComplete(form, step) {
  if (step === 0) {
    return ['tas', 'tad', 'fc', 'fr', 'temp', 'sat'].every(function (k) {
      return filled(form.querySelector('[data-ea-vital="' + k + '"]'));
    });
  }
  if (step === 1) {
    var rows = glucoseValues(form);
    if (!rows.length) return false;
    if (form.querySelector('#ea-bomba-enabled') && form.querySelector('#ea-bomba-enabled').checked) return rows.every(filled);
    return Array.prototype.every.call(form.querySelectorAll('#ea-glu-list .ea-glu-row--standard [data-ea-glu-value]'), filled);
  }
  if (step === 2) return ['t1', 't2', 't3'].some(function (t) {
    return filled(form.querySelector('#ea-io-ing-' + t)) && filled(form.querySelector('#ea-io-egr-' + t));
  });
  return false;
}

/** @param {HTMLElement} form @param {number} step */
function hasData(form, step) {
  if (step === 0) return countVitals(form) > 0;
  if (step === 1) return glucoseValues(form).some(filled);
  if (step === 2) return turnoFilled(form, 'ing') || turnoFilled(form, 'egr');
  return false;
}

/** @param {HTMLElement} form @param {number} step */
function stepSummary(form, step) {
  if (step === 0) {
    var n = countVitals(form);
    return n ? n + (n === 1 ? ' valor' : ' valores') : 'Sin datos';
  }
  if (step === 1) {
    var g = glucoseValues(form).filter(filled).length;
    return g ? g + (g === 1 ? ' lectura' : ' lecturas') : 'Sin datos';
  }
  if (step === 2) {
    var live = form.querySelector('#ea-balance-turno-live');
    var t = live ? (live.textContent || '').trim() : '';
    return hasData(form, 2) && t && t !== '—' ? t + ' cc' : 'Sin datos';
  }
  return 'Un solo envío';
}

function getShell(form) {
  return form.closest('.ea-registro-shell');
}

function currentStep(shell) {
  return Number(shell.dataset.eaStep || 0);
}

function readAuto() {
  try {
    return localStorage.getItem(AUTO_KEY) !== '0';
  } catch (_e) {
    return true;
  }
}

function el(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/** Review pane: one row per step with what will be sent. */
function renderReview(form, shell) {
  var box = shell.querySelector('#ea-step-review');
  if (!box) return;
  box.textContent = '';
  var list = el('div', 'ea-step-review-list');
  var vitals = Array.prototype.filter
    .call(form.querySelectorAll('[data-ea-vital]'), filled)
    .map(function (i) {
      var key = i.getAttribute('data-ea-vital') || '';
      return (VITAL_LABELS[key] || key) + ' ' + i.value;
    });
  var items = [
    ['Signos vitales', vitals.length ? vitals.join(' · ') : 'Sin datos', 0],
    ['Glucosa', stepSummary(form, 1) === 'Sin datos' ? 'Sin datos' : glucoseValues(form).filter(filled).map(function (i) { return i.value; }).join(' · ') + ' mg/dL', 1],
    ['Balance hídrico', stepSummary(form, 2), 2],
  ];
  items.forEach(function (it) {
    var row = el('div', 'ea-step-review-row');
    var txt = el('div', 'ea-step-review-text');
    txt.appendChild(el('strong', '', it[0]));
    txt.appendChild(el('span', 'ea-muted', it[1]));
    var edit = el('button', 'ea-btn ea-btn--ghost', 'Editar');
    edit.type = 'button';
    edit.setAttribute('data-ea-step-go', String(it[2]));
    row.appendChild(txt);
    row.appendChild(edit);
    list.appendChild(row);
  });
  box.appendChild(list);
  box.appendChild(el('p', 'ea-muted ea-step-review-note', 'Llega a la nota por Nube. Sin red, queda en cola.'));
}

/** Refreshes rail text, progress bars and buttons for the current step. */
function paint(shell, form) {
  var step = currentStep(shell);
  shell.querySelectorAll('.ea-steps-bar').forEach(function (bar, i) {
    bar.style.setProperty('--fill', i <= step ? '1' : '0');
  });
  shell.querySelectorAll('.ea-steps-rail [data-ea-step-go]').forEach(function (btn) {
    var i = Number(btn.getAttribute('data-ea-step-go'));
    var done = i < 3 && hasData(form, i);
    btn.classList.toggle('is-active', i === step);
    btn.classList.toggle('is-done', done);
    if (i === step) btn.setAttribute('aria-current', 'step');
    else btn.removeAttribute('aria-current');
    var dot = btn.querySelector('.ea-steps-dot');
    if (dot) dot.textContent = done ? '✓' : String(i + 1);
    var sub = btn.querySelector('.ea-steps-sub');
    if (sub) sub.textContent = stepSummary(form, i);
  });
  var back = shell.querySelector('[data-ea-step-back]');
  if (back) back.disabled = step === 0;
  var next = shell.querySelector('[data-ea-step-next]');
  if (next) {
    next.hidden = step === 3;
    next.textContent = 'Siguiente: ' + STEP_NAMES[Math.min(step + 1, 3)];
  }
  var submit = shell.querySelector('.ea-registro-submit');
  if (submit) submit.hidden = step !== 3;
  if (step === 3) renderReview(form, shell);
}

function clearAdvance(shell) {
  if (shell._eaAdvanceTimer) clearTimeout(shell._eaAdvanceTimer);
  shell._eaAdvanceTimer = null;
  var bar = shell.querySelector('.ea-steps-advance');
  if (bar) bar.classList.remove('is-running');
  var msg = shell.querySelector('[data-ea-step-msg]');
  if (msg) msg.textContent = '';
}

/**
 * @param {HTMLElement} form
 * @param {number} step
 * @param {{ focus?: boolean }} [opts]
 */
export function setEaRegistroStep(form, step, opts) {
  var shell = getShell(form);
  if (!shell) return;
  var from = currentStep(shell);
  var to = Math.max(0, Math.min(3, step));
  clearAdvance(shell);
  shell.dataset.eaStep = String(to);
  shell._eaWasComplete = isStepComplete(form, to);
  shell.querySelectorAll('.ea-steps-panes [data-ea-step]').forEach(function (pane) {
    var on = Number(pane.getAttribute('data-ea-step')) === to;
    pane.hidden = !on;
    pane.classList.remove('ea-step-in-r', 'ea-step-in-l');
    if (on && from !== to && !reducedMotion()) {
      void pane.offsetWidth;
      pane.classList.add(to > from ? 'ea-step-in-r' : 'ea-step-in-l');
    }
  });
  paint(shell, form);
  if (!opts || opts.focus !== false) {
    var pane = shell.querySelector('.ea-steps-panes [data-ea-step="' + to + '"]');
    var first = pane && pane.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled])');
    if (first && 'focus' in first) first.focus({ preventScroll: true });
  }
}

/** Called after any field change: updates the rail and, when the step just filled up, advances. */
function onFormEdited(form) {
  var shell = getShell(form);
  if (!shell) return;
  var step = currentStep(shell);
  var now = isStepComplete(form, step);
  var was = !!shell._eaWasComplete;
  shell._eaWasComplete = now;
  paint(shell, form);
  var auto = shell.querySelector('[data-ea-auto]');
  if (!(auto && auto.checked) || !now || was || step >= 3) {
    if (!now) clearAdvance(shell);
    return;
  }
  clearAdvance(shell);
  var bar = shell.querySelector('.ea-steps-advance');
  if (bar) {
    void bar.offsetWidth;
    bar.classList.add('is-running');
  }
  var msg = shell.querySelector('[data-ea-step-msg]');
  if (msg) msg.textContent = 'Paso completo. Siguiente…';
  shell._eaAdvanceTimer = setTimeout(function () {
    shell._eaAdvanceTimer = null;
    if (currentStep(shell) === step) setEaRegistroStep(form, step + 1);
  }, ADVANCE_MS);
}

/** @param {HTMLElement | null} form */
export function wireEaRegistroSteps(form) {
  if (!form) return;
  var shell = getShell(form);
  if (!shell) return;
  if (!shell.dataset.eaStepsWired) {
    shell.dataset.eaStepsWired = '1';
    var auto = shell.querySelector('[data-ea-auto]');
    if (auto) {
      auto.checked = readAuto();
      auto.addEventListener('change', function () {
        try {
          localStorage.setItem(AUTO_KEY, auto.checked ? '1' : '0');
        } catch (_e) {
          /* storage blocked: the switch still works for this session */
        }
        if (!auto.checked) clearAdvance(shell);
      });
    }
    shell.addEventListener('click', function (ev) {
      var t = /** @type {HTMLElement} */ (ev.target);
      var go = t.closest && t.closest('[data-ea-step-go]');
      if (go) return setEaRegistroStep(form, Number(go.getAttribute('data-ea-step-go')));
      if (t.closest && t.closest('[data-ea-step-back]')) return setEaRegistroStep(form, currentStep(shell) - 1);
      if (t.closest && t.closest('[data-ea-step-next]')) return setEaRegistroStep(form, currentStep(shell) + 1);
    });
    form.addEventListener('input', function () {
      onFormEdited(form);
    });
    form.addEventListener('change', function () {
      onFormEdited(form);
    });
  }
  if (!shell.dataset.eaStep) setEaRegistroStep(form, 0, { focus: false });
  else paint(shell, form);
}

/** Back to step 1 with nothing pending (form reset or new open). */
export function resetEaRegistroSteps(form) {
  if (!form) return;
  var shell = getShell(form);
  if (!shell) return;
  setEaRegistroStep(form, 0, { focus: false });
}

/** After paste or edit-mode fill: refresh the rail without advancing. */
export function syncEaRegistroSteps(form) {
  if (!form) return;
  var shell = getShell(form);
  if (!shell) return;
  shell._eaWasComplete = isStepComplete(form, currentStep(shell));
  paint(shell, form);
}

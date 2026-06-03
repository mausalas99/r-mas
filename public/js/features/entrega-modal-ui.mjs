/**
 * Entrega modal — procedimientos list, add form, plantillas.
 */
import {
  canDeletePendienteItem,
  createProcedimientoItem,
  normalizePendientesJson,
  pendingRequirementBadges,
} from '../../../lib/entrega/entrega-pendientes.mjs';
import {
  CLINICAL_STATUS_OPTIONS,
  VASOPRESSOR_AGENTS,
  VASOPRESSOR_INFUSION_DEFAULTS,
  VASOPRESSOR_UNIT_LABELS,
  VENTILATION_MODES,
  coerceVasopressorUnit,
  defaultHandoffContext,
  defaultVasopressorInfusion,
  handoffContextSummary,
  normalizeHandoffContext,
  normalizeVasopressorAgent,
} from '../../../lib/entrega/entrega-handoff-context.mjs';
import {
  VITALS_FREQ_HOUR_PRESETS,
  VITALS_FREQ_SHIFT_OPTIONS,
  VITALS_METRIC_KEYS,
  VITALS_METRIC_LABELS,
  defaultVitalsPlan,
  normalizeFrequencySpec,
  normalizeUntilTime,
  normalizeVitalsPlan,
  vitalsPlanSummary,
} from '../../../lib/entrega/entrega-vitals-plan.mjs';
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';

const BADGE_LABELS = {
  consentimiento: 'Consent',
  anestesia: 'Anest',
  familiar: 'Familiar',
};

/** @type {object[]} */
let draftItems = [];
/** @type {{ role: 'diurno'|'guardia', userId?: string, rank?: string }|null} */
let draftActor = null;
/** @type {{ user: object[], team: object[] }} */
let templateCatalog = { user: [], team: [] };
/** @type {string} */
let draftSourceTeamId = '';
/** @type {ReturnType<typeof defaultVitalsPlan>} */
let draftVitalsPlan = defaultVitalsPlan();
/** @type {ReturnType<typeof defaultHandoffContext>} */
let draftHandoffContext = defaultHandoffContext();

let uiWired = false;
let handoffUiWired = false;

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

function toast(msg, type = 'info') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
  }
}

/** @param {string|null|undefined} scheduledAt */
function formatHHmm(scheduledAt) {
  if (!scheduledAt) return '';
  const d = new Date(scheduledAt);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const m = String(scheduledAt).match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '';
}

/** @param {string} hhmm */
function scheduledAtFromTimeInput(hhmm) {
  const t = String(hhmm || '').trim();
  if (!t) return null;
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/** @returns {string} HH:mm */
function defaultProcedureTimeHHmm() {
  const d = new Date();
  let mins = Math.ceil(d.getMinutes() / 5) * 5;
  if (mins >= 60) {
    d.setHours(d.getHours() + 1);
    mins = 0;
  }
  d.setMinutes(mins, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** @param {string} hhmm */
function parseTimeParts(hhmm) {
  const t = formatHHmm(hhmm) || String(hhmm || '').trim();
  if (!t || !/^\d{1,2}:\d{1,2}$/.test(t)) return { hour: '', minute: '' };
  const [hour, minute] = t.split(':');
  return {
    hour: String(hour).padStart(2, '0'),
    minute: String(minute).padStart(2, '0'),
  };
}

/**
 * @param {string} selected
 * @param {{ allowBlank?: boolean }} [opts]
 */
function buildHourSelectOptions(selected, opts = {}) {
  const allowBlank = opts.allowBlank !== false;
  let html = allowBlank ? '<option value="">—</option>' : '';
  for (let h = 0; h < 24; h += 1) {
    const v = String(h).padStart(2, '0');
    html += `<option value="${v}"${v === selected ? ' selected' : ''}>${v}</option>`;
  }
  return html;
}

/**
 * @param {string} selected
 * @param {{ allowBlank?: boolean }} [opts]
 */
function buildMinuteSelectOptions(selected, opts = {}) {
  const allowBlank = opts.allowBlank !== false;
  let html = allowBlank ? '<option value="">—</option>' : '';
  const stepSet = new Set();
  for (let m = 0; m < 60; m += 5) {
    const v = String(m).padStart(2, '0');
    stepSet.add(v);
    html += `<option value="${v}"${v === selected ? ' selected' : ''}>${v}</option>`;
  }
  if (selected && !stepSet.has(selected)) {
    html += `<option value="${selected}" selected>${selected}</option>`;
  }
  return html;
}

/**
 * @param {string|null|undefined} hhmm
 * @param {{
 *   hourName?: string,
 *   minuteName?: string,
 *   ariaLabel?: string,
 *   allowBlank?: boolean,
 *   picker?: boolean,
 *   wrapperId?: string,
 *   wrapperClass?: string,
 *   disabled?: boolean,
 * }} [opts]
 */
function buildTimeSelectMarkup(hhmm, opts = {}) {
  const resolved = hhmm || (opts.allowBlank === false ? defaultProcedureTimeHHmm() : '');
  const { hour, minute } = parseTimeParts(resolved);
  const hourName = opts.hourName || 'entrega-proc-hour';
  const minuteName = opts.minuteName || 'entrega-proc-minute';
  const ariaLabel = opts.ariaLabel || 'Hora programada';
  const selectOpts = { allowBlank: opts.allowBlank !== false };
  const disabled = opts.disabled ? ' disabled' : '';
  const wrapClass = [opts.picker ? 'entrega-time-picker' : 'entrega-time-combo', opts.wrapperClass]
    .filter(Boolean)
    .join(' ');
  const wrapId = opts.wrapperId ? ` id="${opts.wrapperId}"` : '';

  return `<div class="${wrapClass}"${wrapId} role="group" aria-label="${escapeHtml(ariaLabel)}">
    <div class="entrega-time-picker__part">
      <span class="entrega-time-picker__hint">H</span>
      <select name="${hourName}" class="profile-input entrega-time-select" aria-label="Hora"${disabled}>${buildHourSelectOptions(hour, selectOpts)}</select>
    </div>
    <span class="entrega-time-sep" aria-hidden="true">:</span>
    <div class="entrega-time-picker__part">
      <span class="entrega-time-picker__hint">M</span>
      <select name="${minuteName}" class="profile-input entrega-time-select" aria-label="Minutos"${disabled}>${buildMinuteSelectOptions(minute, selectOpts)}</select>
    </div>
  </div>`;
}

/** @param {ParentNode} formEl */
function readTimeFromForm(formEl) {
  const hour = String(formEl.querySelector('[name="entrega-proc-hour"]')?.value || '').trim();
  const minute = String(formEl.querySelector('[name="entrega-proc-minute"]')?.value || '').trim();
  if (!hour && !minute) return '';
  if (hour && minute) return `${hour}:${minute}`;
  if (hour) return `${hour}:00`;
  return `00:${minute}`;
}

/**
 * @param {object|null|undefined} currentUser
 * @param {object|null|undefined} existingGuardia
 */
export function resolveEntregaActorRole(currentUser, existingGuardia) {
  const userId = String(currentUser?.user_id || currentUser?.userId || '');
  const coveringUserId = String(existingGuardia?.covering_user_id || '');
  const hasGuardia = !!(existingGuardia?.guardia_id || existingGuardia?.guardiaId);
  const isCoveringReceiver = hasGuardia && coveringUserId !== '' && coveringUserId === userId;
  return {
    role: isCoveringReceiver ? 'guardia' : 'diurno',
    userId,
    rank: String(currentUser?.rank || ''),
  };
}

/** @returns {object[]} */
export function getEntregaDraftItems() {
  return draftItems.slice();
}

export function resetEntregaModalUi() {
  draftItems = [];
  draftActor = null;
  templateCatalog = { user: [], team: [] };
  draftSourceTeamId = '';
  draftVitalsPlan = defaultVitalsPlan();
  draftHandoffContext = defaultHandoffContext();
  const handoffPanel = document.getElementById('entrega-handoff-panel');
  if (handoffPanel) handoffPanel.innerHTML = '';
  const handoffSummary = document.getElementById('entrega-handoff-summary');
  if (handoffSummary) handoffSummary.textContent = '';
  const list = document.getElementById('entrega-proc-list');
  const formWrap = document.getElementById('entrega-proc-form');
  if (list) list.innerHTML = '';
  if (formWrap) {
    formWrap.innerHTML = '';
    formWrap.classList.add('hidden');
    formWrap.setAttribute('aria-hidden', 'true');
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBadgeChips(item) {
  const badges = pendingRequirementBadges(item);
  if (!badges.length) return '';
  return badges
    .map(
      (b) =>
        `<span class="entrega-proc-chip entrega-proc-chip--req">${escapeHtml(BADGE_LABELS[b] || b)}</span>`
    )
    .join('');
}

function renderStatusChips(item) {
  const chips = [];
  if (item.comentado) chips.push('<span class="entrega-proc-chip">Comentado</span>');
  if (item.autorizado) chips.push('<span class="entrega-proc-chip">Autorizado</span>');
  if (item.agendado) chips.push('<span class="entrega-proc-chip">Agendado</span>');
  if (item.lockedBase) chips.push('<span class="entrega-proc-chip entrega-proc-chip--lock">Base</span>');
  return chips.join('');
}

function renderProcList() {
  const list = document.getElementById('entrega-proc-list');
  if (!list || !draftActor) return;

  if (!draftItems.length) {
    list.innerHTML = '<li class="entrega-proc-empty">Sin procedimientos. Usa + Agregar.</li>';
    return;
  }

  list.innerHTML = draftItems
    .map((item) => {
      if (item.type === 'legacy_text') {
        const canDel = canDeletePendienteItem(item, draftActor);
        return `<li class="entrega-proc-card entrega-proc-card--legacy" data-item-id="${escapeHtml(item.id)}">
          <div class="entrega-proc-card-main">
            <span class="entrega-proc-label">${escapeHtml(item.text || '')}</span>
            <span class="entrega-proc-meta">Texto legado</span>
          </div>
          ${
            canDel
              ? `<button type="button" class="btn-med-secondary entrega-proc-delete" data-action="delete">Eliminar</button>`
              : ''
          }
        </li>`;
      }

      if (item.type !== 'procedimiento') return '';

      const time = formatHHmm(item.scheduledAt);
      const canDel = canDeletePendienteItem(item, draftActor);
      const kindLabel = item.kind === 'imagen' ? 'Imagen' : 'Otro';

      const flagRow = `
        <div class="entrega-proc-flags">
          <label><input type="checkbox" data-flag="comentado" ${item.comentado ? 'checked' : ''}> Comentado</label>
          <label><input type="checkbox" data-flag="autorizado" ${item.autorizado ? 'checked' : ''}> Autorizado</label>
          <label><input type="checkbox" data-flag="agendado" ${item.agendado ? 'checked' : ''}> Agendado</label>
        </div>`;

      return `<li class="entrega-proc-card" data-item-id="${escapeHtml(item.id)}">
        <div class="entrega-proc-card-main">
          <div class="entrega-proc-title-row">
            <span class="entrega-proc-label">${escapeHtml(item.label)}</span>
            ${time ? `<span class="entrega-proc-time">${escapeHtml(time)}</span>` : ''}
            <span class="entrega-proc-kind">${escapeHtml(kindLabel)}</span>
          </div>
          <div class="entrega-proc-chips">${renderStatusChips(item)}${renderBadgeChips(item)}</div>
          ${flagRow}
        </div>
        ${
          canDel
              ? `<button type="button" class="btn-med-secondary entrega-proc-delete" data-action="delete">Eliminar</button>`
            : ''
        }
      </li>`;
    })
    .join('');
}

function updateItemFlags(itemId, flag, checked) {
  draftItems = draftItems.map((it) => {
    if (it.id !== itemId || it.type !== 'procedimiento') return it;
    return {
      ...it,
      [flag]: !!checked,
      updatedAt: new Date().toISOString(),
    };
  });
  renderProcList();
}

function deleteItem(itemId) {
  const item = draftItems.find((it) => it.id === itemId);
  if (!item || !draftActor || !canDeletePendienteItem(item, draftActor)) {
    toast('No puedes eliminar este procedimiento.', 'error');
    return;
  }
  draftItems = draftItems.filter((it) => it.id !== itemId);
  renderProcList();
}

function readFormFields(formEl) {
  const kindRaw = formEl.querySelector('[name="entrega-proc-kind"]')?.value;
  const kind = kindRaw === 'otro' ? 'otro' : 'imagen';
  const label = String(formEl.querySelector('[name="entrega-proc-label"]')?.value || '').trim();
  const time = readTimeFromForm(formEl);
  return {
    kind,
    label,
    scheduledAt: scheduledAtFromTimeInput(time),
    comentado: !!formEl.querySelector('[name="entrega-proc-comentado"]')?.checked,
    autorizado: !!formEl.querySelector('[name="entrega-proc-autorizado"]')?.checked,
    agendado: !!formEl.querySelector('[name="entrega-proc-agendado"]')?.checked,
    requires: {
      familiar: !!formEl.querySelector('[name="entrega-req-familiar"]')?.checked,
      consentimiento: !!formEl.querySelector('[name="entrega-req-consentimiento"]')?.checked,
      anestesia: !!formEl.querySelector('[name="entrega-req-anestesia"]')?.checked,
    },
  };
}

function checkPill(name, label, checked, extraClass = '', inputId = '') {
  const cls = ['entrega-check-pill', extraClass].filter(Boolean).join(' ');
  const idAttr = inputId ? ` id="${escapeHtml(inputId)}"` : '';
  return `<label class="${cls}">
    <input type="checkbox" name="${name}"${idAttr} ${checked ? 'checked' : ''}>
    <span>${escapeHtml(label)}</span>
  </label>`;
}

function updateHandoffSummaryLine() {
  const text = handoffContextSummary(draftHandoffContext);
  const summary = document.getElementById('entrega-handoff-summary');
  const collapsed = document.getElementById('entrega-handoff-summary-collapsed');
  const display = text === 'Sin resumen clínico' ? '' : text;
  if (summary) summary.textContent = display;
  if (collapsed) collapsed.textContent = display;
}

function syncHandoffSupportCards(host) {
  const vasoOn = !!host.querySelector('[name="entrega-vaso-active"]')?.checked;
  const ventOn = !!host.querySelector('[name="entrega-vent-active"]')?.checked;
  host.querySelector('[data-handoff-card="vasopressor"]')?.classList.toggle('is-active', vasoOn);
  host.querySelector('[data-handoff-card="ventilation"]')?.classList.toggle('is-active', ventOn);
  host.querySelector('[data-handoff-detail="vasopressor"]')?.classList.toggle('is-hidden', !vasoOn);
  host.querySelector('[data-handoff-detail="ventilation"]')?.classList.toggle('is-hidden', !ventOn);
}

/** @param {HTMLElement} host */
function readVasoUnitFromDom(host) {
  const agent = normalizeVasopressorAgent(
    host.querySelector('#entrega-vaso-agent')?.value || ''
  );
  if (agent === 'vasopresina') return 'ui_min';
  const selected = host.querySelector('[data-vaso-unit].is-selected');
  const unit = selected?.getAttribute('data-vaso-unit');
  if (unit === 'mcg_min' || unit === 'mcg_kg_min') return unit;
  return 'mcg_kg_min';
}

/** @param {HTMLElement} host @param {string} unit */
function syncVasoUnitUi(host, unit) {
  const agent = normalizeVasopressorAgent(
    host.querySelector('#entrega-vaso-agent')?.value || ''
  );
  const coerced = coerceVasopressorUnit(agent, unit);
  const chipsRow = host.querySelector('[data-vaso-unit-chips]');
  const fixedRow = host.querySelector('[data-vaso-unit-fixed]');
  const isVaso = agent === 'vasopresina';

  chipsRow?.classList.toggle('is-hidden', isVaso);
  fixedRow?.classList.toggle('is-hidden', !isVaso);

  host.querySelectorAll('[data-vaso-unit]').forEach((btn) => {
    const u = btn.getAttribute('data-vaso-unit');
    btn.classList.toggle('is-selected', !isVaso && u === coerced);
  });
}

/** @param {HTMLElement} host @param {{ applyDefaults?: boolean }} [opts] */
function applyVasoAgentDefaults(host, opts = {}) {
  const agent = normalizeVasopressorAgent(
    host.querySelector('#entrega-vaso-agent')?.value || 'norepinefrina'
  );
  const doseInp = host.querySelector('#entrega-vaso-dose');
  const defaults = defaultVasopressorInfusion(agent);
  if (opts.applyDefaults || !String(doseInp?.value || '').trim()) {
    if (doseInp) doseInp.value = defaults.dose;
  }
  syncVasoUnitUi(host, defaults.unit);
}

function buildVasoDoseMarkup(vas) {
  const agent = normalizeVasopressorAgent(vas.agent) || 'norepinefrina';
  const unit = coerceVasopressorUnit(agent, vas.unit);
  const dose = String(vas.dose || defaultVasopressorInfusion(agent).dose);
  const agentOpts = VASOPRESSOR_AGENTS.map(
    (a) =>
      `<option value="${escapeHtml(a.value)}"${
        a.value === agent ? ' selected' : ''
      }>${escapeHtml(a.label)}</option>`
  ).join('');
  const unitChips = ['mcg_kg_min', 'mcg_min']
    .map((u) => {
      const label = VASOPRESSOR_UNIT_LABELS[u];
      return `<button type="button" class="entrega-freq-chip entrega-vaso-unit-pill${
        unit === u && agent !== 'vasopresina' ? ' is-selected' : ''
      }" data-vaso-unit="${u}">${escapeHtml(label)}</button>`;
    })
    .join('');
  const isVaso = agent === 'vasopresina';

  return `
    <div class="entrega-vaso-dose">
      <div class="field-group">
        <label for="entrega-vaso-agent">Agente</label>
        <select id="entrega-vaso-agent" class="profile-input">${agentOpts}</select>
      </div>
      <div class="field-group entrega-vaso-dose-row">
        <label for="entrega-vaso-dose">Infusión</label>
        <div class="entrega-vaso-dose-input-wrap">
          <input id="entrega-vaso-dose" class="profile-input entrega-vaso-dose-input" type="number"
            inputmode="decimal" step="0.01" min="0" placeholder="${escapeHtml(
              VASOPRESSOR_INFUSION_DEFAULTS[agent]?.dose || '0.05'
            )}" value="${escapeHtml(dose)}">
          <div class="entrega-vaso-unit-inline" role="group" aria-label="Unidad de infusión">
            <div class="entrega-vaso-unit-chips${
              isVaso ? ' is-hidden' : ''
            }" data-vaso-unit-chips>${unitChips}</div>
            <span class="entrega-vaso-unit-pill-fixed${
              isVaso ? '' : ' is-hidden'
            }" data-vaso-unit-fixed>${escapeHtml(VASOPRESSOR_UNIT_LABELS.ui_min)}</span>
          </div>
        </div>
      </div>
    </div>`;
}

/** @param {HTMLElement} host */
function syncHandoffDraftFromDom(host) {
  const status = String(host.querySelector('#entrega-clinical-status')?.value || '');
  draftHandoffContext = normalizeHandoffContext({
    clinicalStatus: status,
    signedRefusal: !!host.querySelector('#entrega-signed-refusal')?.checked,
    show: !!host.querySelector('#entrega-show')?.checked,
    vasopressor: {
      active: !!host.querySelector('[name="entrega-vaso-active"]')?.checked,
      agent: normalizeVasopressorAgent(host.querySelector('#entrega-vaso-agent')?.value || ''),
      dose: String(host.querySelector('#entrega-vaso-dose')?.value || '').trim(),
      unit: readVasoUnitFromDom(host),
    },
    ventilation: {
      active: !!host.querySelector('[name="entrega-vent-active"]')?.checked,
      mode: String(host.querySelector('#entrega-vent-mode')?.value || '').trim(),
      fio2: String(host.querySelector('#entrega-vent-fio2')?.value || '').trim(),
      settings: String(host.querySelector('#entrega-vent-settings')?.value || '').trim(),
    },
    notes: String(host.querySelector('#entrega-handoff-notes')?.value || '').trim(),
  });
  syncHandoffSupportCards(host);
  updateHandoffSummaryLine();
}

function buildHandoffPanelMarkup(ctx, isCritical) {
  const norm = normalizeHandoffContext(ctx);
  const statusOpts = CLINICAL_STATUS_OPTIONS.map(
    (o) =>
      `<option value="${escapeHtml(o.value)}"${
        o.value === norm.clinicalStatus ? ' selected' : ''
      }>${escapeHtml(o.label)}</option>`
  ).join('');
  const ventModes = VENTILATION_MODES.map(
    (m) =>
      `<option value="${escapeHtml(m.value)}"${
        m.value === norm.ventilation.mode ? ' selected' : ''
      }>${escapeHtml(m.label)}</option>`
  ).join('');

  return `
    <div class="entrega-handoff-context-grid">
      <div class="field-group">
        <label for="entrega-clinical-status">Estado general</label>
        <select id="entrega-clinical-status" class="profile-input">${statusOpts}</select>
      </div>
      <div class="entrega-handoff-flags">
        <div class="entrega-check-section">
          <span class="entrega-check-section__label">Marcadores</span>
          <div class="entrega-check-pills">
            ${checkPill('entrega-critical', 'Paciente crítico', isCritical, 'entrega-check-pill--alert', 'entrega-critical')}
            ${checkPill('entrega-signed-refusal', 'Negativas firmadas', norm.signedRefusal, 'entrega-check-pill--alert', 'entrega-signed-refusal')}
            ${checkPill('entrega-show', 'Show', norm.show, 'entrega-check-pill--alert', 'entrega-show')}
          </div>
        </div>
      </div>
    </div>
    <div class="entrega-handoff-support">
      <div class="entrega-handoff-support-card${
        norm.vasopressor.active ? ' is-active' : ''
      }" data-handoff-card="vasopressor">
        <div class="entrega-handoff-support-card__head">
          ${checkPill('entrega-vaso-active', 'Vasopresor', norm.vasopressor.active)}
        </div>
        <div class="entrega-handoff-support-detail${
          norm.vasopressor.active ? '' : ' is-hidden'
        }" data-handoff-detail="vasopressor">
          ${buildVasoDoseMarkup(norm.vasopressor)}
        </div>
      </div>
      <div class="entrega-handoff-support-card${
        norm.ventilation.active ? ' is-active' : ''
      }" data-handoff-card="ventilation">
        <div class="entrega-handoff-support-card__head">
          ${checkPill('entrega-vent-active', 'Ventilación / soporte resp.', norm.ventilation.active)}
        </div>
        <div class="entrega-handoff-support-detail${
          norm.ventilation.active ? '' : ' is-hidden'
        }" data-handoff-detail="ventilation">
          <div class="field-group">
            <label for="entrega-vent-mode">Modalidad</label>
            <select id="entrega-vent-mode" class="profile-input">${ventModes}</select>
          </div>
          <div class="field-group">
            <label for="entrega-vent-fio2">FiO₂ / flujo</label>
            <input id="entrega-vent-fio2" class="profile-input" type="text" placeholder="ej. 40% · 50 L/min" value="${escapeHtml(norm.ventilation.fio2)}">
          </div>
          <div class="field-group">
            <label for="entrega-vent-settings">Parámetros</label>
            <input id="entrega-vent-settings" class="profile-input" type="text" placeholder="PEEP, VT, presiones…" value="${escapeHtml(norm.ventilation.settings)}">
          </div>
        </div>
      </div>
    </div>
    <div class="field-group entrega-handoff-notes">
      <label for="entrega-handoff-notes">Notas breves de entrega</label>
      <input id="entrega-handoff-notes" class="profile-input" type="text" maxlength="240" placeholder="Antecedentes relevantes para la guardia…" value="${escapeHtml(norm.notes)}">
    </div>`;
}

function wireHandoffPanelOnce() {
  if (handoffUiWired) return;
  handoffUiWired = true;
  const host = document.getElementById('entrega-handoff-panel');
  if (!host) return;

  host.addEventListener('change', (ev) => {
    if (ev.target?.id === 'entrega-vaso-agent') {
      applyVasoAgentDefaults(host, { applyDefaults: true });
    }
    if (ev.target?.name === 'entrega-vaso-active' && ev.target.checked) {
      applyVasoAgentDefaults(host, { applyDefaults: true });
    }
    syncHandoffDraftFromDom(host);
  });

  host.addEventListener('input', () => syncHandoffDraftFromDom(host));

  host.addEventListener('click', (ev) => {
    const unitBtn = ev.target.closest('[data-vaso-unit]');
    if (!unitBtn || unitBtn.classList.contains('is-hidden')) return;
    host.querySelectorAll('[data-vaso-unit]').forEach((btn) => {
      btn.classList.toggle('is-selected', btn === unitBtn);
    });
    syncVasoUnitUi(host, unitBtn.getAttribute('data-vaso-unit') || 'mcg_kg_min');
    syncHandoffDraftFromDom(host);
  });
}

/**
 * @param {object|null|undefined} handoffContext
 * @param {{ isCritical?: boolean, signedRefusal?: boolean }} [opts]
 */
export function mountEntregaHandoffPanel(handoffContext, opts = {}) {
  wireHandoffPanelOnce();
  const host = document.getElementById('entrega-handoff-panel');
  if (!host) return;
  draftHandoffContext = normalizeHandoffContext(handoffContext, {
    signedRefusal: !!opts.signedRefusal,
  });
  host.innerHTML = buildHandoffPanelMarkup(draftHandoffContext, !!opts.isCritical);
  syncHandoffSupportCards(host);
  applyVasoAgentDefaults(host);
  updateHandoffSummaryLine();
}

/** @returns {ReturnType<typeof defaultHandoffContext>} */
export function readEntregaHandoffContext() {
  const host = document.getElementById('entrega-handoff-panel');
  if (host?.innerHTML) syncHandoffDraftFromDom(host);
  return normalizeHandoffContext(draftHandoffContext);
}

/** @returns {boolean} */
export function readEntregaCriticalFromHandoff() {
  const host = document.getElementById('entrega-handoff-panel');
  if (!host) return false;
  const input = host.querySelector('#entrega-critical');
  return input instanceof HTMLInputElement ? input.checked : false;
}

export function getEntregaHandoffContext() {
  return readEntregaHandoffContext();
}

function buildAddFormMarkup(prefill = null) {
  const p = prefill || {};
  const timeVal = p.scheduledAt ? formatHHmm(p.scheduledAt) : '';
  const kindIsOtro = p.kind === 'otro';
  return `
    <div class="entrega-inline-form" role="group" aria-label="Agregar procedimiento">
      <div class="entrega-inline-form__head">
        <h4 class="entrega-inline-form__title">Nuevo procedimiento</h4>
        <button type="button" class="entrega-inline-form__close" data-action="cancel-form" aria-label="Cerrar">×</button>
      </div>
      <div class="entrega-inline-form__grid">
        <div class="field-group">
          <label for="entrega-proc-kind">Tipo</label>
          <select id="entrega-proc-kind" name="entrega-proc-kind" class="profile-input">
            <option value="imagen" ${kindIsOtro ? '' : 'selected'}>Imagen</option>
            <option value="otro" ${kindIsOtro ? 'selected' : ''}>Otro</option>
          </select>
        </div>
        <div class="field-group entrega-inline-form__label-wide">
          <label for="entrega-proc-label">Descripción</label>
          <input id="entrega-proc-label" name="entrega-proc-label" class="profile-input" type="text" required placeholder="Ej. TAC tórax, endoscopia…" value="${escapeHtml(p.label || '')}">
        </div>
        <div class="field-group entrega-inline-form__time">
          <span class="entrega-field-label-block">Hora</span>
          ${buildTimeSelectMarkup(timeVal, { allowBlank: false, picker: true })}
        </div>
      </div>
      <div class="entrega-check-section">
        <span class="entrega-check-section__label">Estado</span>
        <div class="entrega-check-pills">
          ${checkPill('entrega-proc-comentado', 'Comentado', p.comentado)}
          ${checkPill('entrega-proc-autorizado', 'Autorizado', p.autorizado)}
          ${checkPill('entrega-proc-agendado', 'Agendado', p.agendado)}
        </div>
      </div>
      <div class="entrega-check-section">
        <span class="entrega-check-section__label">Requiere</span>
        <div class="entrega-check-pills">
          ${checkPill('entrega-req-familiar', 'Familiar', p.requires?.familiar)}
          ${checkPill('entrega-req-consentimiento', 'Consentimiento', p.requires?.consentimiento)}
          ${checkPill('entrega-req-anestesia', 'Anestesia', p.requires?.anestesia)}
        </div>
      </div>
      <div class="entrega-inline-form__foot">
        <button type="button" class="entrega-foot-muted" data-action="save-template">Guardar plantilla</button>
        <div class="entrega-inline-form__foot-actions">
          <button type="button" class="btn-cancel" data-action="cancel-form">Cancelar</button>
          <button type="button" class="btn-save" data-action="add-item">Añadir</button>
        </div>
      </div>
    </div>`;
}

function showAddForm(prefill = null) {
  const wrap = document.getElementById('entrega-proc-form');
  if (!wrap) return;
  wrap.innerHTML = buildAddFormMarkup(prefill);
  wrap.classList.remove('hidden');
  wrap.setAttribute('aria-hidden', 'false');
  wrap.querySelector('[name="entrega-proc-label"]')?.focus();
}

function hideAddForm() {
  const wrap = document.getElementById('entrega-proc-form');
  if (!wrap) return;
  wrap.innerHTML = '';
  wrap.classList.add('hidden');
  wrap.setAttribute('aria-hidden', 'true');
}

function payloadFromFormFields(fields) {
  return {
    kind: fields.kind,
    label: fields.label,
    requires: fields.requires,
    comentado: fields.comentado,
    autorizado: fields.autorizado,
    agendado: fields.agendado,
  };
}

async function saveTemplateFromForm(formEl) {
  const fields = readFormFields(formEl);
  if (!fields.label) {
    toast('Indica la etiqueta del procedimiento.', 'error');
    return;
  }
  const name = typeof window.prompt === 'function' ? window.prompt('Nombre de la plantilla:') : '';
  if (!name || !String(name).trim()) return;

  const scope =
    typeof window.confirm === 'function' &&
    window.confirm('¿Guardar como plantilla del equipo? (Cancelar = solo para ti)')
      ? 'team'
      : 'user';

  const api = dbApi();
  const userId = String(clinicalSessionContext.user?.user_id || '');
  const payload = payloadFromFormFields(fields);

  try {
    if (scope === 'team') {
      const teamId = draftSourceTeamId;
      if (!teamId) {
        toast('Selecciona equipo de origen para plantilla de equipo.', 'error');
        return;
      }
      if (!api?.dbEntregaTemplateSaveTeam) throw new Error('Plantillas no disponibles');
      await api.dbEntregaTemplateSaveTeam({
        teamId,
        createdBy: userId,
        name: String(name).trim(),
        payload,
      });
    } else {
      if (!api?.dbEntregaTemplateSaveUser) throw new Error('Plantillas no disponibles');
      await api.dbEntregaTemplateSaveUser({
        userId,
        name: String(name).trim(),
        payload,
      });
    }
    toast('Plantilla guardada.', 'success');
    await refreshTemplateCatalog(userId);
  } catch (err) {
    toast(err?.message || 'No se guardó la plantilla', 'error');
  }
}

async function refreshTemplateCatalog(userId) {
  const api = dbApi();
  if (!api?.dbEntregaTemplateList) {
    templateCatalog = { user: [], team: [] };
    return;
  }
  const teamIds = draftSourceTeamId ? [draftSourceTeamId] : [];
  const res = await api.dbEntregaTemplateList({ userId, teamIds });
  templateCatalog = {
    user: Array.isArray(res?.user) ? res.user : [],
    team: Array.isArray(res?.team) ? res.team : [],
  };
}

function showTemplatePicker() {
  const all = [
    ...templateCatalog.user.map((t) => ({ ...t, scopeLabel: 'Mis plantillas' })),
    ...templateCatalog.team.map((t) => ({ ...t, scopeLabel: 'Del equipo' })),
  ];
  if (!all.length) {
    toast('No hay plantillas guardadas.', 'info');
    return;
  }

  const wrap = document.getElementById('entrega-proc-form');
  if (!wrap) return;

  const options = all
    .map(
      (t, i) =>
        `<option value="${i}">[${escapeHtml(t.scopeLabel)}] ${escapeHtml(t.name)}</option>`
    )
    .join('');

  wrap.innerHTML = `
    <div class="entrega-inline-form entrega-inline-form--picker" role="group" aria-label="Aplicar plantilla">
      <div class="entrega-inline-form__head">
        <h4 class="entrega-inline-form__title">Plantillas</h4>
        <button type="button" class="entrega-inline-form__close" data-action="cancel-form" aria-label="Cerrar">×</button>
      </div>
      <div class="field-group">
        <label for="entrega-template-pick">Elegir plantilla</label>
        <select id="entrega-template-pick" class="profile-input">${options}</select>
      </div>
      <div class="entrega-inline-form__foot">
        <div class="entrega-inline-form__foot-actions entrega-inline-form__foot-actions--end">
          <button type="button" class="btn-cancel" data-action="cancel-form">Cancelar</button>
          <button type="button" class="btn-save" data-action="apply-template">Continuar</button>
        </div>
      </div>
    </div>`;
  wrap.classList.remove('hidden');
  wrap.setAttribute('aria-hidden', 'false');

  wrap.querySelector('[data-action="apply-template"]')?.addEventListener('click', () => {
    const idx = parseInt(wrap.querySelector('#entrega-template-pick')?.value || '0', 10);
    const picked = all[idx];
    if (!picked?.payload) return;
    const prefill = {
      ...picked.payload,
      scheduledAt: null,
    };
    showAddForm(prefill);
  });
}

function addItemFromForm(formEl) {
  if (!draftActor) return;
  const fields = readFormFields(formEl);
  if (!fields.label) {
    toast('Indica la etiqueta del procedimiento.', 'error');
    return;
  }
  const item = createProcedimientoItem({
    ...fields,
    lockedBase: draftActor.role === 'diurno',
    createdBy: draftActor.userId
      ? { userId: draftActor.userId, rank: draftActor.rank || '' }
      : null,
  });
  draftItems.push(item);
  hideAddForm();
  renderProcList();
}

function wireProcUiOnce() {
  if (uiWired) return;
  uiWired = true;

  document.getElementById('btn-entrega-add-proc')?.addEventListener('click', () => {
    showAddForm();
  });

  document.getElementById('btn-entrega-apply-template')?.addEventListener('click', () => {
    showTemplatePicker();
  });

  const list = document.getElementById('entrega-proc-list');
  if (list) {
    list.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-action="delete"]');
      if (!btn) return;
      const card = btn.closest('[data-item-id]');
      const id = card?.getAttribute('data-item-id');
      if (id) deleteItem(id);
    });

    list.addEventListener('change', (ev) => {
      const input = ev.target;
      if (!(input instanceof HTMLInputElement) || !input.dataset.flag) return;
      const card = input.closest('[data-item-id]');
      const id = card?.getAttribute('data-item-id');
      if (id) updateItemFlags(id, input.dataset.flag, input.checked);
    });
  }

  const formWrap = document.getElementById('entrega-proc-form');
  if (formWrap) {
    formWrap.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const inner = formWrap.querySelector('.entrega-inline-form');
      if (action === 'cancel-form') {
        hideAddForm();
        return;
      }
      if (!inner) return;
      if (action === 'add-item') addItemFromForm(inner);
      if (action === 'save-template') saveTemplateFromForm(inner);
    });
  }

  document.getElementById('entrega-source-team')?.addEventListener('change', (ev) => {
    draftSourceTeamId = String(ev.target?.value || '');
    const userId = String(clinicalSessionContext.user?.user_id || '');
    refreshTemplateCatalog(userId).catch(() => {});
  });
}

/**
 * @param {{
 *   actor: { role: 'diurno'|'guardia', userId?: string, rank?: string },
 *   pendientesJson?: string|null,
 *   sourceTeamId?: string,
 * }} opts
 */
function updateVitalsSummary() {
  const summary = document.getElementById('entrega-vitals-summary');
  if (summary) summary.textContent = vitalsPlanSummary(draftVitalsPlan);
}

/** @param {Record<string, unknown>} patch */
function mergeIntervalFrequency(patch) {
  const cur = normalizeFrequencySpec(draftVitalsPlan.frequency);
  const base = cur.mode === 'interval' ? cur : { mode: 'interval', hours: 2 };
  return normalizeFrequencySpec({ ...base, mode: 'interval', ...patch });
}

/** @param {string|null|undefined} hhmm @param {'interval'|'shift'} scope */
function buildVitalsUntilTimeMarkup(hhmm, scope) {
  const enabled = !!hhmm;
  return `
    <div class="entrega-freq-until">
      <label class="entrega-check-pill entrega-freq-until-toggle">
        <input type="checkbox" data-vitals-until-enable${enabled ? ' checked' : ''}>
        <span>Detener a las</span>
      </label>
      ${buildTimeSelectMarkup(hhmm || '07:00', {
        hourName: `entrega-vitals-until-hour-${scope}`,
        minuteName: `entrega-vitals-until-minute-${scope}`,
        ariaLabel: 'Hora de fin',
        allowBlank: false,
        picker: true,
        wrapperClass: `entrega-freq-until-time entrega-time-picker--compact${
          enabled ? '' : ' is-disabled'
        }`,
        disabled: !enabled,
      })}
    </div>`;
}

/** @param {ParentNode} host */
function activeVitalsFreqPanel(host) {
  return (
    host.querySelector('#entrega-freq-interval-panel:not(.is-hidden)') ||
    host.querySelector('#entrega-freq-shift-panel:not(.is-hidden)')
  );
}

/** @param {ParentNode} host */
function readVitalsUntilTimeFromHost(host) {
  const panel = activeVitalsFreqPanel(host);
  if (!panel) return null;
  if (!panel.querySelector('[data-vitals-until-enable]')?.checked) return null;
  const hour = String(
    panel.querySelector('[name^="entrega-vitals-until-hour"]')?.value || ''
  ).trim();
  const minute = String(
    panel.querySelector('[name^="entrega-vitals-until-minute"]')?.value || ''
  ).trim();
  if (!hour || !minute) return null;
  return normalizeUntilTime(`${hour}:${minute}`);
}

/** @param {HTMLElement} host @param {HTMLElement|null} panel */
function wireVitalsUntilPanel(host, panel) {
  if (!panel) return;
  const untilEnable = panel.querySelector('[data-vitals-until-enable]');
  const untilTimeWrap = panel.querySelector('.entrega-freq-until-time');
  const setUntilEnabled = (on) => {
    untilTimeWrap?.classList.toggle('is-disabled', !on);
    untilTimeWrap?.querySelectorAll('select').forEach((sel) => {
      sel.disabled = !on;
    });
    if (on) {
      const hSel = panel.querySelector('[name^="entrega-vitals-until-hour"]');
      const mSel = panel.querySelector('[name^="entrega-vitals-until-minute"]');
      if (hSel && !hSel.value) hSel.value = '07';
      if (mSel && !mSel.value) mSel.value = '00';
    }
    syncFrequencyDraftFromDom(host);
  };
  untilEnable?.addEventListener('change', () => setUntilEnabled(!!untilEnable.checked));
  untilTimeWrap?.querySelectorAll('select').forEach((sel) => {
    sel.addEventListener('change', () => syncFrequencyDraftFromDom(host));
  });
}

/** @param {HTMLElement} host */
function readFrequencyFromDom(host) {
  const mode = String(
    host.querySelector('input[name="entrega-freq-mode"]:checked')?.value || 'routine'
  );
  const untilTime = readVitalsUntilTimeFromHost(host);
  if (mode === 'interval') {
    const hours = Number(host.querySelector('#entrega-vitals-hours')?.value || 2);
    return normalizeFrequencySpec({
      mode: 'interval',
      hours,
      untilTime,
    });
  }
  if (mode === 'shift') {
    const chip = host.querySelector('[data-freq-shift].is-selected');
    const times = Number(chip?.getAttribute('data-freq-shift') || 1);
    return normalizeFrequencySpec({
      mode: 'shift',
      timesPerShift: times,
      untilTime,
    });
  }
  return { mode: 'routine' };
}

/** @param {HTMLElement} host */
function syncFrequencyDraftFromDom(host) {
  draftVitalsPlan = normalizeVitalsPlan({
    ...draftVitalsPlan,
    frequency: readFrequencyFromDom(host),
  });
  updateVitalsSummary();
}

/** @param {HTMLElement} host */
function syncVitalsFreqUi(host) {
  const freq = normalizeFrequencySpec(draftVitalsPlan.frequency);
  const mode = freq.mode;

  host.querySelectorAll('input[name="entrega-freq-mode"]').forEach((input) => {
    if (input instanceof HTMLInputElement) input.checked = input.value === mode;
  });

  host.querySelector('#entrega-freq-interval-panel')?.classList.toggle('is-hidden', mode !== 'interval');
  host.querySelector('#entrega-freq-shift-panel')?.classList.toggle('is-hidden', mode !== 'shift');

  const slot = host.querySelector('.entrega-vitals-freq-detail-slot');
  slot?.setAttribute('aria-hidden', mode === 'routine' ? 'true' : 'false');

  if (mode === 'interval') {
    const hours = freq.mode === 'interval' ? freq.hours ?? 2 : 2;
    const hoursInp = host.querySelector('#entrega-vitals-hours');
    if (hoursInp instanceof HTMLInputElement) hoursInp.value = String(hours);
    host.querySelectorAll('[data-freq-hours]').forEach((chip) => {
      chip.classList.toggle(
        'is-selected',
        Number(chip.getAttribute('data-freq-hours')) === hours
      );
    });
  }

  if (mode === 'shift') {
    const times = freq.mode === 'shift' ? freq.timesPerShift ?? 1 : 1;
    host.querySelectorAll('[data-freq-shift]').forEach((chip) => {
      chip.classList.toggle(
        'is-selected',
        Number(chip.getAttribute('data-freq-shift')) === times
      );
    });
  }

  updateVitalsSummary();
}

function renderVitalsPanel() {
  const host = document.getElementById('entrega-vitals-panel');
  if (!host) return;
  const plan = normalizeVitalsPlan(draftVitalsPlan);
  draftVitalsPlan = plan;
  const freq = plan.frequency;

  const metricChecks = VITALS_METRIC_KEYS.map(
    (key) =>
      `<label class="entrega-check-pill"><input type="checkbox" data-vital-metric="${key}" ${
        plan.metrics[key] ? 'checked' : ''
      }><span>${escapeHtml(VITALS_METRIC_LABELS[key])}</span></label>`
  ).join('');

  const modeLabels = { routine: 'Rutina', interval: 'Intervalo', shift: 'Por turno' };
  const modePills = (['routine', 'interval', 'shift'])
    .map(
      (mode) =>
        `<label class="entrega-check-pill entrega-freq-mode-pill">
          <input type="radio" name="entrega-freq-mode" value="${mode}" ${
            freq.mode === mode ? 'checked' : ''
          }>
          <span>${modeLabels[mode]}</span>
        </label>`
    )
    .join('');

  const hourChips = VITALS_FREQ_HOUR_PRESETS.map(
    (h) =>
      `<button type="button" class="entrega-freq-chip${
        freq.mode === 'interval' && freq.hours === h ? ' is-selected' : ''
      }" data-freq-hours="${h}">${h} h</button>`
  ).join('');

  const shiftChips = VITALS_FREQ_SHIFT_OPTIONS.map(
    (t) =>
      `<button type="button" class="entrega-freq-chip${
        freq.mode === 'shift' && freq.timesPerShift === t ? ' is-selected' : ''
      }" data-freq-shift="${t}">${t}×</button>`
  ).join('');

  const hoursVal = freq.mode === 'interval' ? freq.hours ?? 2 : 2;
  const untilInterval = buildVitalsUntilTimeMarkup(
    freq.mode === 'interval' ? freq.untilTime : null,
    'interval'
  );
  const untilShift = buildVitalsUntilTimeMarkup(
    freq.mode === 'shift' ? freq.untilTime : null,
    'shift'
  );

  host.innerHTML = `
    <div class="entrega-vitals-form">
      <div class="entrega-vitals-form__scroll">
        <section class="entrega-vitals-section" aria-labelledby="entrega-vitals-metrics-label">
          <h5 class="entrega-vitals-section__title" id="entrega-vitals-metrics-label">Parámetros</h5>
          <div
            class="entrega-check-pills entrega-vitals-metrics"
            role="group"
            aria-labelledby="entrega-vitals-metrics-label"
          >${metricChecks}</div>
        </section>
        <section class="entrega-vitals-section" aria-labelledby="entrega-vitals-freq-label">
          <h5 class="entrega-vitals-section__title" id="entrega-vitals-freq-label">Frecuencia</h5>
          <div class="entrega-vitals-freq" role="group" aria-labelledby="entrega-vitals-freq-label">
            <div class="entrega-freq-segment entrega-check-pills entrega-freq-modes" role="radiogroup" aria-label="Modo de frecuencia">
              ${modePills}
            </div>
            <div class="entrega-vitals-freq-detail-slot" aria-hidden="${freq.mode === 'routine'}">
              <div class="entrega-freq-panel${
                freq.mode === 'interval' ? '' : ' is-hidden'
              }" id="entrega-freq-interval-panel">
                <div class="entrega-freq-detail-card">
                  <div class="entrega-freq-detail__row">
                    <span class="entrega-freq-detail__row-label">Atajos</span>
                    <div class="entrega-freq-chips" role="group" aria-label="Atajos cada N horas">${hourChips}</div>
                  </div>
                  <div class="entrega-freq-detail__row-split">
                    <div class="entrega-freq-detail__cell">
                      <span class="entrega-freq-detail__cell-label">Cada</span>
                      <div class="entrega-freq-stepper" role="group" aria-label="Intervalo en horas">
                        <button type="button" class="entrega-freq-step" data-hours-dec aria-label="Menos horas">−</button>
                        <input
                          type="number"
                          id="entrega-vitals-hours"
                          class="entrega-freq-hours-input"
                          min="1"
                          max="24"
                          step="1"
                          inputmode="numeric"
                          value="${hoursVal}"
                          aria-label="Cada cuántas horas"
                        >
                        <button type="button" class="entrega-freq-step" data-hours-inc aria-label="Más horas">+</button>
                      </div>
                      <span class="entrega-freq-interval-suffix">horas</span>
                    </div>
                    <div class="entrega-freq-detail__cell entrega-freq-detail__cell--until">
                      ${untilInterval}
                    </div>
                  </div>
                </div>
              </div>
              <div class="entrega-freq-panel${
                freq.mode === 'shift' ? '' : ' is-hidden'
              }" id="entrega-freq-shift-panel">
                <div class="entrega-freq-detail-card">
                  <div class="entrega-freq-detail__row">
                    <span class="entrega-freq-detail__row-label">Veces</span>
                    <div class="entrega-freq-chips" role="group" aria-label="Veces por turno">${shiftChips}</div>
                  </div>
                  <div class="entrega-freq-detail__row">
                    <span class="entrega-freq-detail__row-label">Fin</span>
                    <div class="entrega-freq-detail__cell entrega-freq-detail__cell--until">
                      ${untilShift}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <p class="entrega-vitals-summary" id="entrega-vitals-summary" role="status">${escapeHtml(vitalsPlanSummary(plan))}</p>
    </div>`;

  host.querySelectorAll('[data-vital-metric]').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.getAttribute('data-vital-metric');
      if (!key) return;
      draftVitalsPlan = normalizeVitalsPlan({
        ...draftVitalsPlan,
        metrics: {
          ...draftVitalsPlan.metrics,
          [key]: input.checked,
        },
      });
      updateVitalsSummary();
    });
  });

  host.querySelectorAll('input[name="entrega-freq-mode"]').forEach((input) => {
    input.addEventListener('change', () => {
      const mode = String(input.value || 'routine');
      if (mode === 'interval') {
        draftVitalsPlan = normalizeVitalsPlan({
          ...draftVitalsPlan,
          frequency: mergeIntervalFrequency({ hours: 2 }),
        });
      } else if (mode === 'shift') {
        const cur = normalizeFrequencySpec(draftVitalsPlan.frequency);
        draftVitalsPlan = normalizeVitalsPlan({
          ...draftVitalsPlan,
          frequency: normalizeFrequencySpec({
            mode: 'shift',
            timesPerShift: 1,
            untilTime: cur.untilTime,
          }),
        });
      } else {
        draftVitalsPlan = normalizeVitalsPlan({
          ...draftVitalsPlan,
          frequency: { mode: 'routine' },
        });
      }
      syncVitalsFreqUi(host);
    });
  });

  host.querySelectorAll('[data-freq-hours]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const hours = Number(btn.getAttribute('data-freq-hours') || 2);
      draftVitalsPlan = normalizeVitalsPlan({
        ...draftVitalsPlan,
        frequency: mergeIntervalFrequency({ hours }),
      });
      syncVitalsFreqUi(host);
    });
  });

  host.querySelectorAll('[data-freq-shift]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const timesPerShift = Number(btn.getAttribute('data-freq-shift') || 1);
      const cur = normalizeFrequencySpec(draftVitalsPlan.frequency);
      draftVitalsPlan = normalizeVitalsPlan({
        ...draftVitalsPlan,
        frequency: normalizeFrequencySpec({
          mode: 'shift',
          timesPerShift,
          untilTime: cur.untilTime,
        }),
      });
      syncVitalsFreqUi(host);
    });
  });

  wireVitalsUntilPanel(host, host.querySelector('#entrega-freq-interval-panel'));
  wireVitalsUntilPanel(host, host.querySelector('#entrega-freq-shift-panel'));

  const hoursInp = host.querySelector('#entrega-vitals-hours');
  const bumpHours = (delta) => {
    const cur = Number(hoursInp?.value || 2);
    const next = Math.min(24, Math.max(1, cur + delta));
    if (hoursInp) hoursInp.value = String(next);
    draftVitalsPlan = normalizeVitalsPlan({
      ...draftVitalsPlan,
      frequency: mergeIntervalFrequency({ hours: next }),
    });
    host.querySelectorAll('[data-freq-hours]').forEach((chip) => {
      chip.classList.toggle(
        'is-selected',
        Number(chip.getAttribute('data-freq-hours')) === next
      );
    });
    updateVitalsSummary();
  };

  host.querySelector('[data-hours-dec]')?.addEventListener('click', () => bumpHours(-1));
  host.querySelector('[data-hours-inc]')?.addEventListener('click', () => bumpHours(1));
  hoursInp?.addEventListener('change', () => syncFrequencyDraftFromDom(host));
  hoursInp?.addEventListener('input', () => syncFrequencyDraftFromDom(host));
}

/** @returns {ReturnType<typeof defaultVitalsPlan>} */
export function readEntregaVitalsPlan() {
  const host = document.getElementById('entrega-vitals-panel');
  if (!host) return normalizeVitalsPlan(draftVitalsPlan);
  const metrics = { ...draftVitalsPlan.metrics };
  host.querySelectorAll('[data-vital-metric]').forEach((input) => {
    const key = input.getAttribute('data-vital-metric');
    if (key) metrics[key] = !!input.checked;
  });
  return normalizeVitalsPlan({ frequency: readFrequencyFromDom(host), metrics });
}

/**
 * @param {{ vitalsPlan?: object|null, vitalsFrequency?: string|null }} [opts]
 */
export function mountEntregaVitalsPanel(opts = {}) {
  if (opts.vitalsPlan) {
    draftVitalsPlan = normalizeVitalsPlan(opts.vitalsPlan);
  } else if (opts.vitalsFrequency) {
    draftVitalsPlan = normalizeVitalsPlan({
      ...defaultVitalsPlan(),
      frequency: normalizeFrequencySpec(opts.vitalsFrequency),
    });
  } else {
    draftVitalsPlan = defaultVitalsPlan();
  }
  renderVitalsPanel();
}

export async function mountEntregaPendientesUi(opts) {
  wireProcUiOnce();
  draftActor = opts.actor;
  draftSourceTeamId = String(opts.sourceTeamId || '');
  const doc = normalizePendientesJson(opts.pendientesJson || '');
  draftItems = doc.items.slice();
  mountEntregaHandoffPanel(doc.handoffContext, {
    isCritical: !!opts.isCritical,
    signedRefusal: !!opts.signedRefusal,
  });
  mountEntregaVitalsPanel({
    vitalsPlan: doc.vitalsPlan,
    vitalsFrequency: opts.vitalsFrequency,
  });
  hideAddForm();
  renderProcList();

  const userId = String(clinicalSessionContext.user?.user_id || '');
  await refreshTemplateCatalog(userId);
}

import { getPatients } from '../app-state.mjs';
import { refreshRpcDateFields } from '../rpc-date-picker.mjs';
import { cancelOverlayClose, closeOverlayAnimated } from '../ui-motion.mjs';
import {
  normalizeEventualidadKind,
  buildEventualidadComposeText,
  toEventualidadDateValue,
  eventualidadDateToIso,
} from './eventualidades-store.mjs';
import { savePatientEventualidad, updatePatientEventualidad } from './eventualidades-render.mjs';
import * as eventualidadesStore from './eventualidades-store.mjs';
import { rt } from './tendencias-runtime-state.mjs';
import { tendenciasBridge } from './tendencias-bridge.mjs';

function findActivePatient() {
  const pid = rt.getActiveId();
  if (!pid) return null;
  return (
    getPatients().find(function (row) {
      return String(row.id) === String(pid);
    }) || null
  );
}

function composePayloadRequirementReason(kind, dateValue, transfusionProduct, detail) {
  if (!kind) return 'kind';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return 'date';
  if (kind === 'transfusion' && !transfusionProduct) return 'transfusionProduct';
  if (kind === 'biopsia' && !detail) return 'biopsiaSite';
  if (kind === 'procedimiento' && !detail) return 'procedimientoText';
  return '';
}

/** @param {{ kind?: string, dateValue?: string, transfusionProduct?: string, detail?: string }} payload */
export function validateTendEventComposePayload(payload) {
  const kind = normalizeEventualidadKind(payload && payload.kind);
  const dateValue = String((payload && payload.dateValue) || '').trim();
  const detail = String((payload && payload.detail) || '').trim();
  const transfusionProduct = String((payload && payload.transfusionProduct) || '').trim();
  const reason = composePayloadRequirementReason(kind, dateValue, transfusionProduct, detail);
  if (reason) return { ok: false, reason: reason };
  const text = buildEventualidadComposeText({
    kind: kind,
    transfusionProduct: transfusionProduct,
    detail: detail,
  });
  if (!text) return { ok: false, reason: 'text' };
  return {
    ok: true,
    kind: kind,
    dateValue: dateValue,
    text: text,
    transfusionProduct: kind === 'transfusion' ? transfusionProduct : undefined,
  };
}

/** @param {HTMLElement} backdrop */
export function syncTendEventComposeKindFields(backdrop) {
  const activePill = backdrop.querySelector('.tend-event-kind-pill.is-active[data-kind]');
  const kind = activePill ? activePill.getAttribute('data-kind') : 'transfusion';
  backdrop.querySelectorAll('.tend-event-compose-kind-fields').forEach(function (panel) {
    const panelKind = panel.getAttribute('data-kind-fields');
    const show = panelKind === kind;
    panel.classList.toggle('is-hidden', !show);
    panel.hidden = !show;
  });
}

/** @param {HTMLElement} backdrop */
function readComposeDetailForKind(backdrop, kind) {
  if (kind === 'transfusion') {
    return String(
      /** @type {HTMLInputElement|null} */ (
        backdrop.querySelector('#tend-event-compose-transfusion-detail')
      )?.value || ''
    ).trim();
  }
  if (kind === 'biopsia') {
    return String(
      /** @type {HTMLInputElement|null} */ (backdrop.querySelector('#tend-event-compose-biopsia-site'))
        ?.value || ''
    ).trim();
  }
  if (kind === 'procedimiento') {
    return String(
      /** @type {HTMLTextAreaElement|null} */ (
        backdrop.querySelector('#tend-event-compose-procedimiento-text')
      )?.value || ''
    ).trim();
  }
  return String(
    /** @type {HTMLTextAreaElement|null} */ (backdrop.querySelector('#tend-event-compose-otro-text'))
      ?.value || ''
  ).trim();
}

/** @param {HTMLElement} backdrop */
function readComposeForm(backdrop) {
  const activePill = backdrop.querySelector('.tend-event-kind-pill.is-active[data-kind]');
  const kind = activePill ? activePill.getAttribute('data-kind') : '';
  const activeProduct = backdrop.querySelector('.tend-event-product-pill.is-active');
  return validateTendEventComposePayload({
    kind: kind,
    dateValue: /** @type {HTMLInputElement|null} */ (backdrop.querySelector('#tend-event-compose-date'))
      ?.value,
    transfusionProduct: activeProduct ? activeProduct.getAttribute('data-product') : '',
    detail: readComposeDetailForKind(backdrop, kind || ''),
  });
}

function composeValidationToast(reason) {
  if (reason === 'transfusionProduct') return 'Selecciona el producto transfundido.';
  if (reason === 'biopsiaSite') return 'Indica de dónde fue la biopsia.';
  if (reason === 'procedimientoText') return 'Describe el procedimiento.';
  return 'Completa categoría y fecha.';
}

function closeComposeModal() {
  const backdrop = document.getElementById('tend-event-compose-backdrop');
  if (!backdrop) return;
  closeOverlayAnimated(backdrop, function () {
    backdrop.remove();
  });
}

/** @param {HTMLElement} backdrop */
async function submitComposeForm(backdrop) {
  const payload = readComposeForm(backdrop);
  if (!payload.ok) {
    rt.showToast(composeValidationToast(payload.reason), 'warning');
    return;
  }
  const patient = findActivePatient();
  if (!patient) {
    rt.showToast('Selecciona un paciente.', 'warning');
    return;
  }
  const atIso = eventualidadDateToIso(payload.dateValue);
  const editId = backdrop.dataset.editId || '';
  const result = editId
    ? await updatePatientEventualidad(patient, editId, {
        text: payload.text,
        at: atIso,
        kind: payload.kind,
        transfusionProduct: payload.transfusionProduct,
      })
    : await savePatientEventualidad(patient, payload.text, atIso, payload.kind, payload.transfusionProduct);
  if (!result.ok) {
    rt.showToast(
      editId ? 'No se pudo actualizar la eventualidad.' : 'No se pudo guardar la eventualidad.',
      'error'
    );
    return;
  }
  closeComposeModal();
  rt.showToast(editId ? 'Eventualidad actualizada.' : 'Eventualidad guardada.', 'success');
  if (typeof tendenciasBridge.renderTendencias === 'function') {
    tendenciasBridge.renderTendencias();
  }
  if (typeof tendenciasBridge.refreshOpenTendDetail === 'function') {
    tendenciasBridge.refreshOpenTendDetail();
  }
}

/** @param {HTMLElement} backdrop */
function focusComposeFieldForKind(backdrop, kind) {
  const selector =
    kind === 'transfusion'
      ? '.tend-event-product-pill.is-active, #tend-event-compose-transfusion-detail'
      : kind === 'biopsia'
        ? '#tend-event-compose-biopsia-site'
        : kind === 'procedimiento'
          ? '#tend-event-compose-procedimiento-text'
          : '#tend-event-compose-otro-text';
  const el = backdrop.querySelector(selector);
  if (el && typeof el.focus === 'function') {
    try {
      el.focus();
    } catch {
      /* ignore */
    }
  }
}

/** @param {HTMLElement} backdrop */
function wireComposeBackdrop(backdrop) {
  if (!backdrop || backdrop.dataset.wired === '1') return;
  backdrop.dataset.wired = '1';
  backdrop.addEventListener('click', function (ev) {
    if (ev.target === backdrop) closeComposeModal();
  });
  backdrop.querySelector('#tend-event-compose-cancel')?.addEventListener('click', closeComposeModal);
  backdrop.querySelector('#tend-event-compose-save')?.addEventListener('click', function () {
    void submitComposeForm(backdrop);
  });
  backdrop.querySelectorAll('.tend-event-kind-pill[data-kind]').forEach(function (pill) {
    pill.addEventListener('click', function () {
      backdrop.querySelectorAll('.tend-event-kind-pill[data-kind]').forEach(function (other) {
        other.classList.remove('is-active');
        other.setAttribute('aria-pressed', 'false');
      });
      pill.classList.add('is-active');
      pill.setAttribute('aria-pressed', 'true');
      syncTendEventComposeKindFields(backdrop);
      focusComposeFieldForKind(backdrop, pill.getAttribute('data-kind') || 'transfusion');
    });
  });
  backdrop.querySelectorAll('.tend-event-product-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      backdrop.querySelectorAll('.tend-event-product-pill').forEach(function (other) {
        other.classList.remove('is-active');
        other.setAttribute('aria-pressed', 'false');
      });
      pill.classList.add('is-active');
      pill.setAttribute('aria-pressed', 'true');
    });
  });
  syncTendEventComposeKindFields(backdrop);
}

/** @param {{ defaultDate?: string, entry?: object|null }} [opts] */
export function openTendEventComposeModal(opts) {
  if (typeof document === 'undefined') return;
  const entry = opts && opts.entry ? opts.entry : null;
  const defaultDate =
    !entry && opts && opts.defaultDate && /^\d{4}-\d{2}-\d{2}$/.test(opts.defaultDate)
      ? opts.defaultDate
      : toEventualidadDateValue(new Date());
  // The Preact view loads on first use (a static import would join the boot graph).
  import('./tendencias-event-compose-view.jsx').then(function (m) {
    const existing = document.getElementById('tend-event-compose-backdrop');
    if (existing) existing.remove();
    const wrap = document.createElement('div');
    m.drawTendEventCompose(wrap, {
      store: eventualidadesStore,
      defaultDate: entry ? toEventualidadDateValue(new Date(entry.at)) : defaultDate,
      entry: entry,
    });
    const backdrop = /** @type {HTMLElement|null} */ (wrap.firstElementChild);
    if (!backdrop) return;
    if (entry && entry.id) backdrop.dataset.editId = String(entry.id);
    document.body.appendChild(backdrop);
    wireComposeBackdrop(backdrop);
    cancelOverlayClose(backdrop);
    refreshRpcDateFields(backdrop);
    focusComposeFieldForKind(backdrop, entry ? normalizeEventualidadKind(entry.kind) || 'otro' : 'transfusion');
  });
}

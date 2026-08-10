import { esc } from '../dom-escape.mjs';
import { patients } from '../app-state.mjs';
import { refreshRpcDateFields } from '../rpc-date-picker.mjs';
import { cancelOverlayClose, closeOverlayAnimated } from '../ui-motion.mjs';
import {
  EVENTUALIDAD_KINDS,
  EVENTUALIDAD_KIND_LABELS,
  TRANSFUSION_PRODUCTS,
  TRANSFUSION_PRODUCT_LABELS,
  normalizeEventualidadKind,
  buildEventualidadComposeText,
  toEventualidadDateValue,
  eventualidadDateToIso,
} from './eventualidades-store.mjs';
import { savePatientEventualidad } from './eventualidades-render.mjs';
import { rt } from './tendencias-runtime-state.mjs';
import { tendenciasBridge } from './tendencias-bridge.mjs';

function findActivePatient() {
  const pid = rt.getActiveId();
  if (!pid) return null;
  return (
    patients.find(function (row) {
      return String(row.id) === String(pid);
    }) || null
  );
}

function buildTransfusionProductPillsHtml() {
  return TRANSFUSION_PRODUCTS.map(function (product, idx) {
    const active = idx === 0 ? ' is-active' : '';
    return (
      '<button type="button" class="tend-event-kind-pill tend-event-product-pill' +
      active +
      '" data-product="' +
      esc(product) +
      '" aria-pressed="' +
      (idx === 0 ? 'true' : 'false') +
      '">' +
      esc(TRANSFUSION_PRODUCT_LABELS[product]) +
      '</button>'
    );
  }).join('');
}

function buildKindFieldsHtml() {
  return (
    '<div class="tend-event-compose-kind-fields" data-kind-fields="transfusion">' +
    '<span class="tend-event-compose-label">Producto</span>' +
    '<div class="tend-event-kind-pills tend-event-transfusion-pills" role="group" aria-label="Producto transfundido">' +
    buildTransfusionProductPillsHtml() +
    '</div>' +
    '<label class="tend-event-compose-label" for="tend-event-compose-transfusion-detail">Detalle (opcional)</label>' +
    '<input type="text" id="tend-event-compose-transfusion-detail" class="tend-event-compose-input" placeholder="Ej. 2 U, pool…" />' +
    '</div>' +
    '<div class="tend-event-compose-kind-fields is-hidden" data-kind-fields="biopsia" hidden>' +
    '<label class="tend-event-compose-label" for="tend-event-compose-biopsia-site">De dónde</label>' +
    '<input type="text" id="tend-event-compose-biopsia-site" class="tend-event-compose-input" placeholder="Ej. Riñón, médula ósea, piel…" />' +
    '</div>' +
    '<div class="tend-event-compose-kind-fields is-hidden" data-kind-fields="procedimiento" hidden>' +
    '<label class="tend-event-compose-label" for="tend-event-compose-procedimiento-text">Procedimiento</label>' +
    '<textarea id="tend-event-compose-procedimiento-text" class="tend-event-compose-text" rows="3" placeholder="Describe el procedimiento…"></textarea>' +
    '</div>' +
    '<div class="tend-event-compose-kind-fields is-hidden" data-kind-fields="otro" hidden>' +
    '<label class="tend-event-compose-label" for="tend-event-compose-otro-text">Detalle (opcional)</label>' +
    '<textarea id="tend-event-compose-otro-text" class="tend-event-compose-text" rows="3" placeholder="Describe lo ocurrido…"></textarea>' +
    '</div>'
  );
}

/** @param {{ kind?: string, dateValue?: string, transfusionProduct?: string, detail?: string }} payload */
export function validateTendEventComposePayload(payload) {
  const kind = normalizeEventualidadKind(payload && payload.kind);
  const dateValue = String((payload && payload.dateValue) || '').trim();
  const detail = String((payload && payload.detail) || '').trim();
  const transfusionProduct = String((payload && payload.transfusionProduct) || '').trim();
  if (!kind) return { ok: false, reason: 'kind' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return { ok: false, reason: 'date' };
  if (kind === 'transfusion' && !transfusionProduct) return { ok: false, reason: 'transfusionProduct' };
  if (kind === 'biopsia' && !detail) return { ok: false, reason: 'biopsiaSite' };
  if (kind === 'procedimiento' && !detail) return { ok: false, reason: 'procedimientoText' };
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

/** @param {{ defaultDate?: string }} [opts] */
export function buildTendEventComposeHtml(opts) {
  const defaultDate =
    opts && opts.defaultDate && /^\d{4}-\d{2}-\d{2}$/.test(opts.defaultDate)
      ? opts.defaultDate
      : toEventualidadDateValue(new Date());
  const pills = EVENTUALIDAD_KINDS.map(function (kind, idx) {
    const active = idx === 0 ? ' is-active' : '';
    return (
      '<button type="button" class="tend-event-kind-pill' +
      active +
      '" data-kind="' +
      esc(kind) +
      '" aria-pressed="' +
      (idx === 0 ? 'true' : 'false') +
      '">' +
      esc(EVENTUALIDAD_KIND_LABELS[kind]) +
      '</button>'
    );
  }).join('');
  return (
    '<div id="tend-event-compose-backdrop" class="tend-event-compose-backdrop" aria-hidden="false">' +
    '<div id="tend-event-compose-modal" class="tend-event-compose-modal" role="dialog" aria-modal="true" aria-labelledby="tend-event-compose-title">' +
    '<h3 id="tend-event-compose-title" class="tend-event-compose-title">Nueva eventualidad</h3>' +
    '<p class="tend-event-compose-hint">Se mostrará como contexto en las gráficas de tendencia del mismo día.</p>' +
    '<div class="tend-event-compose-field">' +
    '<span class="tend-event-compose-label">Categoría</span>' +
    '<div class="tend-event-kind-pills" role="group" aria-label="Categoría">' +
    pills +
    '</div></div>' +
    '<div class="tend-event-compose-field">' +
    '<label class="tend-event-compose-label" for="tend-event-compose-date">Fecha</label>' +
    '<input type="date" id="tend-event-compose-date" class="rpc-date-input tend-event-compose-date" value="' +
    esc(defaultDate) +
    '" aria-label="Fecha de la eventualidad" />' +
    '</div>' +
    '<div id="tend-event-compose-kind-fields-wrap">' +
    buildKindFieldsHtml() +
    '</div>' +
    '<div class="tend-event-compose-actions">' +
    '<button type="button" class="ea-btn ea-btn--ghost" id="tend-event-compose-cancel">Cancelar</button>' +
    '<button type="button" class="ea-btn ea-btn--primary" id="tend-event-compose-save">Guardar</button>' +
    '</div></div></div>'
  );
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
  const result = await savePatientEventualidad(
    patient,
    payload.text,
    atIso,
    payload.kind,
    payload.transfusionProduct
  );
  if (!result.ok) {
    rt.showToast('No se pudo guardar la eventualidad.', 'error');
    return;
  }
  closeComposeModal();
  rt.showToast('Eventualidad guardada.', 'success');
  if (typeof tendenciasBridge.renderTendencias === 'function') {
    tendenciasBridge.renderTendencias();
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

/** @param {{ defaultDate?: string }} [opts] */
export function openTendEventComposeModal(opts) {
  if (typeof document === 'undefined') return;
  const defaultDate =
    opts && opts.defaultDate && /^\d{4}-\d{2}-\d{2}$/.test(opts.defaultDate)
      ? opts.defaultDate
      : toEventualidadDateValue(new Date());
  const existing = document.getElementById('tend-event-compose-backdrop');
  if (existing) existing.remove();
  const wrap = document.createElement('div');
  wrap.innerHTML = buildTendEventComposeHtml({ defaultDate: defaultDate });
  const backdrop = /** @type {HTMLElement|null} */ (wrap.firstElementChild);
  if (!backdrop) return;
  document.body.appendChild(backdrop);
  wireComposeBackdrop(backdrop);
  cancelOverlayClose(backdrop);
  refreshRpcDateFields(backdrop);
  focusComposeFieldForKind(backdrop, 'transfusion');
}

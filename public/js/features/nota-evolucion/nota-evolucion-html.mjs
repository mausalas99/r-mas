/**
 * Nota de evolución (SOAP) — screen 9a. Pure HTML builders, no DOM access.
 * S: texto libre. O: derivado por zona (el residente revisa, no teclea).
 * A: texto libre, el campo más grande de la pantalla. P: por zona, con
 * marcas mono cortas (novo / sin cambio / suspende).
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';

/** Marks a Plan line can carry, in cycle order. Labels, not icons. */
export const PLAN_MARKS = ['novo', 'sin cambio', 'suspende'];

/** @param {string} mark */
export function nextPlanMark(mark) {
  const i = PLAN_MARKS.indexOf(mark);
  return PLAN_MARKS[(i + 1 + PLAN_MARKS.length) % PLAN_MARKS.length] || PLAN_MARKS[0];
}

/**
 * @param {string} mark
 * @returns {string}
 */
export function buildPlanMarkHtml(mark) {
  const safe = PLAN_MARKS.includes(mark) ? mark : PLAN_MARKS[1];
  const cls = safe.replace(/\s+/g, '-');
  return `<span class="ne-plan-mark ne-plan-mark--${escAttr(cls)}">${escHtml(safe)}</span>`;
}

/**
 * @param {{ id: string, label: string, items: Array<{ text: string, altered: boolean }> }} zone
 * @returns {string}
 */
export function buildObjetivoZoneHtml(zone) {
  const rows = zone.items
    .map(
      (item) =>
        `<div class="ne-objetivo-item${item.altered ? ' ne-objetivo-item--alert' : ''}">${escHtml(item.text)}</div>`
    )
    .join('');
  return (
    `<div class="ne-objetivo-zone" data-ne-objetivo-zone="${escAttr(zone.id)}">` +
    `<div class="ne-zone-label">${escHtml(zone.id)} <span class="ne-zone-label-full">${escHtml(zone.label)}</span></div>` +
    `<div class="ne-objetivo-zone-body">${rows}</div>` +
    `</div>`
  );
}

/**
 * @param {{
 *   zones: Array<{ id: string, label: string, items: Array<{ text: string, altered: boolean }> }>,
 *   confirmedAt?: string|null,
 * }} objetivo
 * @returns {string}
 */
export function buildObjetivoSectionHtml(objetivo) {
  const zones = (objetivo && objetivo.zones) || [];
  const confirmedAt = objetivo && objetivo.confirmedAt;
  const body = zones.length
    ? zones.map(buildObjetivoZoneHtml).join('')
    : '<div class="ne-empty-hint">Sin signos vitales ni laboratorio de hoy para derivar.</div>';
  const stamp = confirmedAt
    ? `<span class="ne-objetivo-confirmed">Confirmado ${escHtml(formatConfirmedAt(confirmedAt))}</span>`
    : '<span class="ne-objetivo-pending">Sin confirmar</span>';
  return (
    '<div class="soap-section ne-section-o">' +
    '<div class="soap-section-header">O · Objetivo <span class="ne-section-hint">(derivado, no se teclea)</span></div>' +
    '<div class="soap-section-body">' +
    `<div class="ne-objetivo-zones">${body}</div>` +
    '<div class="ne-objetivo-footer">' +
    stamp +
    '<button type="button" class="ne-btn ne-btn-confirm" data-ne-confirm-objetivo>Confirmar</button>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

/** @param {string} iso */
function formatConfirmedAt(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * @param {{ id: string, label: string, items: Array<{ id: string, text: string, mark: string }> }} zone
 * @returns {string}
 */
export function buildPlanZoneHtml(zone) {
  const rows = zone.items
    .map(
      (item) =>
        `<div class="ne-plan-row" data-ne-plan-item="${escAttr(item.id)}">` +
        `<span class="ne-plan-row-text">${escHtml(item.text)}</span>` +
        `<button type="button" class="ne-plan-row-mark-btn" data-ne-plan-cycle="${escAttr(item.id)}" title="Cambiar marca">` +
        buildPlanMarkHtml(item.mark) +
        '</button>' +
        `<button type="button" class="ne-plan-row-remove" data-ne-plan-remove="${escAttr(item.id)}" aria-label="Quitar">×</button>` +
        '</div>'
    )
    .join('');
  return (
    `<div class="ne-plan-zone" data-ne-plan-zone="${escAttr(zone.id)}">` +
    `<div class="ne-zone-label">${escHtml(zone.id)} <span class="ne-zone-label-full">${escHtml(zone.label)}</span></div>` +
    `<div class="ne-plan-zone-body">${rows}</div>` +
    '<div class="ne-plan-add-row">' +
    `<input type="text" class="ne-plan-add-input" data-ne-plan-add="${escAttr(zone.id)}" placeholder="Agregar indicación…">` +
    '</div>' +
    '</div>'
  );
}

/**
 * @param {Array<{ id: string, label: string, items: Array<{ id: string, text: string, mark: string }> }>} planZones
 * @returns {string}
 */
export function buildPlanSectionHtml(planZones) {
  const zones = Array.isArray(planZones) ? planZones : [];
  return (
    '<div class="soap-section ne-section-p">' +
    '<div class="soap-section-header">P · Plan</div>' +
    '<div class="soap-section-body">' +
    `<div class="ne-plan-zones">${zones.map(buildPlanZoneHtml).join('')}</div>` +
    '</div>' +
    '</div>'
  );
}

/**
 * Right column, "Sin insertar" panel — screen 9a. Each item is something the
 * note has not absorbed yet (a culture result, a gasometry, an
 * eventualidad…); the resident inserts it one at a time or all at once.
 * Mirrors `Paciente Rediseño.dc.html` L920-951 exactly: header label
 * "Sin insertar · N", header action "Insertar todo", per-item action
 * "Insertar". Items are never fabricated — this renders only what the real
 * `insertables` list (from patient state) actually contains; an empty list
 * renders the honest empty state instead of invented content.
 * @param {Array<{ id: string, title: string, subtitle?: string }>} insertables
 * @returns {string}
 */
export function buildInsertarPanelHtml(insertables) {
  const items = Array.isArray(insertables) ? insertables : [];
  const body = items.length
    ? items
        .map(
          (item) =>
            '<div class="ne-insertar-item" data-ne-insertar-row="' + escAttr(item.id) + '">' +
            '<div class="ne-insertar-item-text">' +
            `<span class="ne-insertar-item-title">${escHtml(item.title)}</span>` +
            (item.subtitle ? `<span class="ne-insertar-item-subtitle">${escHtml(item.subtitle)}</span>` : '') +
            '</div>' +
            `<button type="button" class="ne-insertar-action" data-ne-insertar-item="${escAttr(item.id)}">Insertar</button>` +
            '</div>'
        )
        .join('')
    : '<div class="ne-empty-hint">Nada pendiente de insertar.</div>';
  return (
    '<div class="soap-section ne-aside-panel ne-aside-panel--insertar">' +
    '<div class="soap-section-header ne-aside-panel-header">' +
    `<span class="ne-aside-panel-title">Sin insertar · ${items.length}</span>` +
    (items.length ? '<button type="button" class="ne-aside-panel-action" data-ne-insertar-all>Insertar todo</button>' : '') +
    '</div>' +
    `<div class="ne-aside-panel-body">${body}</div>` +
    '</div>'
  );
}

/**
 * Right column, "Cambió desde ayer" panel — screen 9a (L955-…). Plain list of
 * what changed since the previous note; empty list renders the honest empty
 * state rather than invented content.
 * @param {Array<{ id: string, text: string }>} cambios
 * @returns {string}
 */
export function buildCambiosPanelHtml(cambios) {
  const items = Array.isArray(cambios) ? cambios : [];
  const body = items.length
    ? items.map((item) => `<div class="ne-cambios-item">${escHtml(item.text)}</div>`).join('')
    : '<div class="ne-empty-hint">Sin cambios registrados desde ayer.</div>';
  return (
    '<div class="soap-section ne-aside-panel ne-aside-panel--cambios">' +
    '<div class="soap-section-header ne-aside-panel-header">' +
    '<span class="ne-aside-panel-title">Cambió desde ayer</span>' +
    '</div>' +
    `<div class="ne-aside-panel-body">${body}</div>` +
    '</div>'
  );
}

/**
 * @param {{
 *   subjetivo?: string,
 *   objetivo?: { zones: Array<{ id: string, label: string, items: Array<{ text: string, altered: boolean }> }>, confirmedAt?: string|null },
 *   analisis?: string,
 *   plan?: Array<{ id: string, label: string, items: Array<{ id: string, text: string, mark: string }> }>,
 *   insertables?: Array<{ id: string, title: string, subtitle?: string }>,
 *   cambios?: Array<{ id: string, text: string }>,
 * }} note
 * @returns {string}
 */
export function buildNotaEvolucionHtml(note) {
  const n = note || {};
  const main =
    '<div class="soap-section ne-section-s" style="flex-shrink:0;">' +
    '<div class="soap-section-header">S · Subjetivo</div>' +
    '<div class="soap-section-body">' +
    `<textarea id="ne-subjetivo" rows="2" placeholder="Refiere / niega…" data-ne-subjetivo>${escHtml(n.subjetivo || '')}</textarea>` +
    '</div>' +
    '</div>' +
    buildObjetivoSectionHtml(n.objetivo || { zones: [] }) +
    '<div class="soap-section ne-section-a">' +
    '<div class="soap-section-header">A · Análisis</div>' +
    '<div class="soap-section-body">' +
    `<textarea id="ne-analisis" class="ne-analisis-textarea" rows="10" placeholder="Juicio clínico, integración diagnóstica, riesgo…" data-ne-analisis>${escHtml(n.analisis || '')}</textarea>` +
    '</div>' +
    '</div>' +
    buildPlanSectionHtml(n.plan || []);
  const aside = buildInsertarPanelHtml(n.insertables || []) + buildCambiosPanelHtml(n.cambios || []);
  return (
    '<div class="ne-modal-body">' +
    '<div class="ne-layout">' +
    `<div class="ne-layout-main">${main}</div>` +
    `<div class="ne-layout-aside">${aside}</div>` +
    '</div>' +
    '</div>'
  );
}

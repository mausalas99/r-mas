/**
 * Nota de evolución (SOAP) — screen 9a. Pure HTML builders, no DOM access.
 * S: texto libre. O: derivado por zona (el residente revisa, no teclea).
 * A: texto libre, el campo más grande de la pantalla. P: por zona, con
 * marcas mono cortas (novo / sin cambio / suspende).
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';
import { buildModeFrameHtml } from '../workbench/mode-frame.mjs';

/**
 * Marks a Plan line can carry, in cycle order. Labels, not icons. Verbatim
 * against `Paciente Rediseño.dc.html` #9a P·Plan rows (L888-946): "pendiente"
 * (an order not yet actioned, e.g. an imaging study), "sin cambio", "nuevo"
 * (spelled with the correct Spanish word — README's data-model enum spells
 * it "novo", which is not Spanish and does not match the rendered mockup
 * copy; per senior-dev ruling 2026-08-19 the pixel mockup + Spanish
 * user-facing-copy rule wins), "suspende".
 */
export const PLAN_MARKS = ['nuevo', 'sin cambio', 'pendiente', 'suspende'];

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
 * @param {{ id: string, label: string, items: Array<{ text: string, altered: boolean }>, narrative?: string }} zone
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
    '<div class="ne-objetivo-zone-content">' +
    `<div class="ne-objetivo-zone-body">${rows}</div>` +
    `<textarea class="ne-objetivo-narrative" rows="2" placeholder="Narrativa de ${escAttr(zone.label)}…" data-ne-objetivo-narrative="${escAttr(zone.id)}">${escHtml(zone.narrative || '')}</textarea>` +
    '</div>' +
    `</div>`
  );
}

/**
 * O · Objetivo — always shows the *live* derivation from today's real
 * vitals/labs (mockup #9a L831-921 has no per-section confirm control at
 * all: the subtitle "armado con los signos de 08:00 y labs 11:44 · por
 * zona" is the only status text). The resident reviews it in place; signing
 * happens once for the whole note via the top "Firmar y cerrar" action
 * (see `buildNotaHeaderHtml`), which snapshots this same derivation — it is
 * never a separate per-section step.
 * @param {{
 *   zones: Array<{ id: string, label: string, items: Array<{ text: string, altered: boolean }> }>,
 * }} objetivo
 * @returns {string}
 */
export function buildObjetivoSectionHtml(objetivo) {
  const zones = (objetivo && objetivo.zones) || [];
  const body = zones.length
    ? zones.map(buildObjetivoZoneHtml).join('')
    : '<div class="ne-empty-hint">Sin signos vitales ni laboratorio de hoy para derivar.</div>';
  return (
    '<div class="soap-section ne-section-o">' +
    '<div class="soap-section-header">O · Objetivo <span class="ne-section-hint">(signos/labs derivados · narrativa editable)</span></div>' +
    '<div class="soap-section-body">' +
    `<div class="ne-objetivo-zones">${body}</div>` +
    '</div>' +
    '</div>'
  );
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
        `<input type="text" class="ne-plan-row-text" data-ne-plan-edit="${escAttr(item.id)}" value="${escAttr(item.text)}" aria-label="Editar indicación">` +
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
 * Top identity/action bar — mockup #9a L803-812. Reuses the shared workbench
 * "band 1" component (`wb-mode-frame`) so this screen gets the exact same
 * chrome rules (one teal primary, max two secondary actions) as Guardia/
 * Inicio de turno instead of a bespoke header.
 * @param {{ context?: string, metadata?: string, signed?: boolean }} header
 * @returns {string}
 */
export function buildNotaHeaderHtml(header) {
  const h = header || {};
  return buildModeFrameHtml({
    modeName: 'Nota de evolución',
    context: h.context || '',
    metadata: h.metadata || '',
    secondaryActions: [
      { label: 'Copiar nota de ayer', title: 'Copiar nota de ayer' },
      { label: 'Vista de impresión', title: 'Vista de impresión' },
    ],
    // Mockup #9a (L795-812) has 3 plain buttons and no ⌘/ badge; this screen
    // has nothing today for that shortcut to open, so it is suppressed
    // rather than shipped as dead chrome (see mode-frame.mjs's `showShortcut`).
    showShortcut: false,
    primaryAction: { label: 'Firmar y cerrar' },
  });
}

/**
 * @param {{
 *   subjetivo?: string,
 *   objetivo?: { zones: Array<{ id: string, label: string, items: Array<{ text: string, altered: boolean }> }>, confirmedAt?: string|null },
 *   analisis?: string,
 *   plan?: Array<{ id: string, label: string, items: Array<{ id: string, text: string, mark: string }> }>,
 *   insertables?: Array<{ id: string, title: string, subtitle?: string }>,
 *   cambios?: Array<{ id: string, text: string }>,
 *   header?: { context?: string, metadata?: string, signed?: boolean },
 * }} note
 * @returns {string}
 */
export function buildNotaEvolucionHtml(note) {
  const n = note || {};
  const headerHtml = buildNotaHeaderHtml(n.header || {});
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
    headerHtml +
    '<div class="ne-layout">' +
    `<div class="ne-layout-main">${main}</div>` +
    `<div class="ne-layout-aside">${aside}</div>` +
    '</div>' +
    '</div>'
  );
}

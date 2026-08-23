/**
 * Markup builders for the Manejo actual cardio cards: 4 Fantásticos GDMT,
 * Otros medicamentos, Diuréticos. Reuses the tab's own `.card` /
 * `.card-header` / `.card-body` / `.med-active-*` shell classes and the
 * inline-style row convention already used by buildMedDietHtml() in
 * medications-panel-rows.mjs, rather than adding new CSS files.
 */
import { esc } from "../medications-utils.mjs";
import { FANTASTICO_DRUGS_BY_CLASS } from "../../../../lib/cardio/med-segments.mjs";
import {
  normalizeFantasticosRows,
  fantasticoEstadoMeta,
  FANTASTICO_ESTADOS,
  buildSegmentRows,
  diureticTotals,
} from "./medications-cardio-rows.mjs";

// ASSUMPTION: med-segments.mjs doesn't export its diuretic drug-name list
// (DIURETIC_DRUG_NAMES is a private const), so this is a local suggestion
// list for the Diuréticos "tipo" field only — not authoritative catalog data.
var DIURETIC_TIPO_SUGGESTIONS = ["Furosemida", "Bumetanida", "Torasemida", "Metolazona"];

function toneVar(tone) {
  if (tone === "success") return "var(--success)";
  if (tone === "warn") return "var(--warn)";
  if (tone === "danger") return "var(--danger)";
  if (tone === "info") return "var(--action)";
  return "var(--text-muted)";
}

function pillHtml(label, tone) {
  var color = toneVar(tone);
  return (
    '<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;' +
    "letter-spacing:.02em;padding:3px 9px;border-radius:999px;white-space:nowrap;" +
    "color:" +
    color +
    ";background:color-mix(in oklab, " +
    color +
    ' 16%, var(--surface));border:1px solid color-mix(in oklab, ' +
    color +
    ' 45%, var(--border));">' +
    esc(label) +
    "</span>"
  );
}

function cardShell(titleIconSvg, title, bodyHtml, opts) {
  var extra = opts && opts.headerRight ? opts.headerRight : "";
  return (
    '<div class="card med-active-card">' +
    '<div class="card-header card-header-row med-active-card-header">' +
    '<span class="med-active-card-title">' +
    titleIconSvg +
    "<span>" +
    esc(title) +
    "</span>" +
    "</span>" +
    (extra ? '<span class="med-active-header-actions">' + extra + "</span>" : "") +
    "</div>" +
    '<div class="card-body med-active-card-body">' +
    bodyHtml +
    "</div>" +
    "</div>"
  );
}

var ROW_STYLE =
  'style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--border);"';
var LAST_ROW_STYLE =
  'style="display:flex;align-items:center;gap:10px;padding:10px 4px;"';

function optionsWithExtra(list, current) {
  var opts = list.slice();
  if (current && opts.indexOf(current) === -1) opts.push(current);
  return opts;
}

function selectFieldHtml(options, current, attrs, style) {
  return (
    '<select ' +
    attrs +
    ' style="' +
    style +
    '"><option value="">— Seleccionar —</option>' +
    options.map(function (o) {
      return '<option value="' + esc(o) + '"' + (o === current ? " selected" : "") + ">" + esc(o) + "</option>";
    }).join("") +
    "</select>"
  );
}

function fantasticoRowHtml(row, idx, isLast) {
  var meta = fantasticoEstadoMeta(row.estado);
  var suggestions = FANTASTICO_DRUGS_BY_CLASS[row.className] || [];
  var estadoOpts = FANTASTICO_ESTADOS.map(function (e) {
    return (
      '<option value="' +
      esc(e.value) +
      '"' +
      (e.value === meta.value ? " selected" : "") +
      ">" +
      esc(e.label) +
      "</option>"
    );
  }).join("");
  return (
    '<div ' +
    (isLast ? LAST_ROW_STYLE : ROW_STYLE) +
    ' data-cardio-fant-row="' +
    esc(row.className) +
    '">' +
    '<div style="flex:0 0 132px;font-size:12px;font-weight:600;color:var(--text);">' +
    esc(row.className) +
    "</div>" +
    '<div style="flex:1 1 190px;min-width:0;">' +
    selectFieldHtml(
      optionsWithExtra(suggestions, row.drug),
      row.drug,
      'data-cardio-fant-field="drug" data-cardio-fant-class="' + esc(row.className) + '"',
      "width:100%;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"
    ) +
    "</div>" +
    '<div style="flex:0 0 108px;">' +
    '<input type="text" value="' +
    esc(row.dosis) +
    '" placeholder="Dosis" data-cardio-fant-field="dosis" ' +
    'data-cardio-fant-class="' + esc(row.className) + '" ' +
    'style="width:100%;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>' +
    "</div>" +
    '<div style="flex:0 0 128px;">' +
    '<input type="date" value="' +
    esc(row.inicio) +
    '" data-cardio-fant-field="inicio" ' +
    'data-cardio-fant-class="' + esc(row.className) + '" ' +
    'style="width:100%;box-sizing:border-box;font-size:12px;padding:4px 6px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>' +
    "</div>" +
    '<div style="flex:1 1 150px;min-width:0;">' +
    '<input type="text" value="' +
    esc(row.tolerancia) +
    '" placeholder="Tolerancia / nota" data-cardio-fant-field="tolerancia" ' +
    'data-cardio-fant-class="' + esc(row.className) + '" ' +
    'style="width:100%;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>' +
    "</div>" +
    '<div style="flex:0 0 148px;display:flex;flex-direction:column;gap:4px;align-items:flex-start;">' +
    pillHtml(meta.label, meta.tone) +
    '<select data-cardio-fant-field="estado" data-cardio-fant-class="' +
    esc(row.className) +
    '" style="font-size:11px;padding:3px 6px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);">' +
    estadoOpts +
    "</select>" +
    "</div>" +
    "</div>"
  );
}

/**
 * @param {{ fantasticos?: unknown }} cardio
 */
export function buildFantasticosCardHtml(cardio) {
  var rows = normalizeFantasticosRows(cardio && cardio.fantasticos);
  var head =
    '<div style="display:flex;gap:10px;padding:0 4px 6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);">' +
    '<span style="flex:0 0 132px;">Pilar</span>' +
    '<span style="flex:1 1 190px;">Fármaco</span>' +
    '<span style="flex:0 0 108px;">Dosis</span>' +
    '<span style="flex:0 0 128px;">Inicio</span>' +
    '<span style="flex:1 1 150px;">Tolerancia</span>' +
    '<span style="flex:0 0 148px;">Estado</span>' +
    "</div>";
  var body =
    '<p class="med-section-lead">Los 4 pilares de terapia médica dirigida por guías (GDMT). Marca el estado de titulación de cada uno.</p>' +
    '<div style="border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg);padding:6px 10px;">' +
    head +
    rows
      .map(function (row, idx) {
        return fantasticoRowHtml(row, idx, idx === rows.length - 1);
      })
      .join("") +
    "</div>";
  var icon =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6z"/></svg>';
  return cardShell(icon, "4 Fantásticos (GDMT)", body);
}

function segmentRowHtml(row, opts) {
  var muted = row.active ? "" : "opacity:.55;";
  var actionLabel = row.active ? "Finalizar" : "Finalizada";
  return (
    '<div style="display:flex;align-items:center;gap:8px;padding:9px 4px;border-bottom:1px solid var(--border);' +
    muted +
    '" data-' +
    opts.group +
    '-row="' +
    esc(row.id) +
    '">' +
    '<div style="flex:1 1 150px;min-width:0;">' +
    (opts.tipoOptions
      ? selectFieldHtml(
          optionsWithExtra(opts.tipoOptions, row.tipo),
          row.tipo,
          'data-' + opts.group + '-field="tipo" data-' + opts.group + '-id="' + esc(row.id) + '"',
          "width:100%;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"
        )
      : '<input type="text" value="' +
        esc(row.tipo) +
        '" placeholder="Medicamento" data-' +
        opts.group +
        '-field="tipo" data-' +
        opts.group +
        '-id="' +
        esc(row.id) +
        '" style="width:100%;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>') +
    "</div>" +
    '<div style="flex:0 0 130px;">' +
    '<input type="text" value="' +
    esc(row.dosis) +
    '" placeholder="Dosis (p.ej. 40 mg IV cada 12h)" data-' +
    opts.group +
    '-field="dosis" data-' +
    opts.group +
    '-id="' +
    esc(row.id) +
    '" style="width:100%;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>' +
    "</div>" +
    '<div style="flex:0 0 118px;">' +
    '<input type="date" value="' +
    esc(row.inicio) +
    '" data-' +
    opts.group +
    '-field="inicio" data-' +
    opts.group +
    '-id="' +
    esc(row.id) +
    '" style="width:100%;box-sizing:border-box;font-size:12px;padding:4px 6px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>' +
    "</div>" +
    (opts.showIndicacion
      ? '<div style="flex:1 1 130px;min-width:0;">' +
        '<input type="text" value="' +
        esc(row.indicacion) +
        '" placeholder="Indicación" data-' +
        opts.group +
        '-field="indicacion" data-' +
        opts.group +
        '-id="' +
        esc(row.id) +
        '" style="width:100%;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>' +
        "</div>"
      : "") +
    (opts.showMgTotal
      ? '<div style="flex:0 0 92px;">' +
        '<input type="number" step="1" min="0" value="' +
        (row.mgTotal != null ? esc(String(row.mgTotal)) : "") +
        '" placeholder="mg total" data-' +
        opts.group +
        '-field="mgTotal" data-' +
        opts.group +
        '-id="' +
        esc(row.id) +
        '" style="width:100%;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>' +
        "</div>"
      : "") +
    '<div style="flex:0 0 84px;text-align:right;">' +
    '<button type="button" data-' +
    opts.group +
    '-action="toggle-end" data-' +
    opts.group +
    '-id="' +
    esc(row.id) +
    '" ' +
    (row.active ? "" : "disabled") +
    ' class="card-header-soft-btn" style="font-size:11px;padding:4px 8px;">' +
    esc(actionLabel) +
    "</button>" +
    "</div>" +
    "</div>"
  );
}

function addSegmentFormHtml(group, opts) {
  var tipoNewField = opts.tipoOptions
    ? selectFieldHtml(
        opts.tipoOptions,
        "",
        'data-' + group + '-new="tipo"',
        "flex:1 1 150px;min-width:0;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"
      )
    : '<input type="text" placeholder="Medicamento" data-' + group + '-new="tipo" style="flex:1 1 150px;min-width:0;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>';
  var fields = [
    tipoNewField,
    '<input type="text" placeholder="Dosis" data-' + group + '-new="dosis" style="flex:0 0 130px;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>',
    '<input type="date" data-' + group + '-new="inicio" style="flex:0 0 118px;box-sizing:border-box;font-size:12px;padding:4px 6px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>',
  ];
  if (opts.showIndicacion) {
    fields.push(
      '<input type="text" placeholder="Indicación" data-' + group + '-new="indicacion" style="flex:1 1 130px;min-width:0;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>'
    );
  }
  if (opts.showMgTotal) {
    fields.push(
      '<input type="number" step="1" min="0" placeholder="mg total" data-' + group + '-new="mgTotal" style="flex:0 0 92px;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);"/>'
    );
  }
  return (
    '<div style="display:flex;align-items:center;gap:8px;padding:9px 4px 2px;">' +
    fields.join("") +
    '<div style="flex:0 0 84px;text-align:right;">' +
    '<button type="button" class="btn-add-row" data-' +
    group +
    '-action="add" style="font-size:11px;padding:4px 8px;white-space:nowrap;">+ Agregar</button>' +
    "</div>" +
    "</div>"
  );
}

/**
 * @param {{ medSegments?: unknown }} cardio
 */
export function buildOtrosMedsCardHtml(cardio) {
  var rows = buildSegmentRows(cardio && cardio.medSegments);
  var head =
    '<div style="display:flex;gap:8px;padding:0 4px 6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);">' +
    '<span style="flex:1 1 150px;">Medicamento</span>' +
    '<span style="flex:0 0 130px;">Dosis</span>' +
    '<span style="flex:0 0 118px;">Inicio</span>' +
    '<span style="flex:1 1 130px;">Indicación</span>' +
    '<span style="flex:0 0 84px;"></span>' +
    "</div>";
  var opts = { group: "cardio-med", showIndicacion: true, showMgTotal: false };
  var body =
    '<p class="med-section-lead">Otros medicamentos cardiovasculares fuera de los 4 Fantásticos y de los diuréticos.</p>' +
    '<div style="border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg);padding:6px 10px;">' +
    head +
    (rows.length
      ? rows.map(function (row) { return segmentRowHtml(row, opts); }).join("")
      : '<p class="med-empty-hint" style="margin:6px 0;">Sin otros medicamentos registrados.</p>') +
    addSegmentFormHtml("cardio-med", opts) +
    "</div>";
  var icon =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>';
  return cardShell(icon, "Otros medicamentos", body);
}

/**
 * @param {{ diureticSegments?: unknown }} cardio
 */
export function buildDiureticosCardHtml(cardio) {
  var rows = buildSegmentRows(cardio && cardio.diureticSegments);
  var totals = diureticTotals(cardio && cardio.diureticSegments);
  var head =
    '<div style="display:flex;gap:8px;padding:0 4px 6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);">' +
    '<span style="flex:1 1 150px;">Diurético</span>' +
    '<span style="flex:0 0 130px;">Dosis</span>' +
    '<span style="flex:0 0 118px;">Inicio</span>' +
    '<span style="flex:0 0 92px;">mg total</span>' +
    '<span style="flex:0 0 84px;"></span>' +
    "</div>";
  var opts = { group: "cardio-diur", showIndicacion: false, showMgTotal: true, tipoOptions: DIURETIC_TIPO_SUGGESTIONS };
  var summary =
    '<div style="display:flex;gap:18px;flex-wrap:wrap;padding:8px 4px 4px;font-size:12px;color:var(--text);">' +
    '<span><strong>' +
    esc(String(Math.round(totals.explicitMgTotal))) +
    ' mg</strong> total registrado (todos los diuréticos)</span>' +
    '<span><strong>' +
    esc(String(Math.round(totals.furosemidaMg))) +
    ' mg</strong> furosemida acumulada</span>' +
    "</div>";
  var body =
    '<p class="med-section-lead">Diuréticos con dosis y fecha de inicio; la furosemida acumulada usa dosis × días cuando no hay mg total explícito.</p>' +
    '<div style="border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg);padding:6px 10px;">' +
    head +
    (rows.length
      ? rows.map(function (row) { return segmentRowHtml(row, opts); }).join("")
      : '<p class="med-empty-hint" style="margin:6px 0;">Sin diuréticos registrados.</p>') +
    addSegmentFormHtml("cardio-diur", opts) +
    summary +
    "</div>";
  var icon =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 2s7 7.5 7 12.5A7 7 0 0 1 5 14.5C5 9.5 12 2 12 2z"/></svg>';
  return cardShell(icon, "Diuréticos", body);
}

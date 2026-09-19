/**
 * Markup builders for the Manejo actual cardio cards: 4 Fantásticos GDMT,
 * Otros medicamentos, Diuréticos. Reuses the tab's own `.card` /
 * `.card-header` / `.card-body` / `.med-active-*` shell classes and the
 * inline-style row convention already used by buildMedDietHtml() in
 * medications-panel-rows.mjs, rather than adding new CSS files.
 */
import { esc } from "../medications-utils.mjs";
import { FANTASTICO_DRUGS_BY_CLASS, STANDARD_DOSES_BY_DRUG } from "../../../../lib/cardio/med-segments.mjs";
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

// Segment rows (Otros medicamentos / Diuréticos) share one 5-column grid —
// tipo | dosis | inicio | indicación-or-mgTotal | acción — so the header,
// each saved row, and the "add new" row all line up and none of the fields
// gets squeezed narrow by a flex row with no room to grow.
var SEGMENT_ROW_GRID =
  "display:grid;grid-template-columns:minmax(150px,1.6fr) minmax(110px,1fr) minmax(120px,1fr) minmax(110px,1.4fr) 84px;gap:8px;align-items:center;";
var SEGMENT_FIELD_STYLE =
  "width:100%;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);";

// 2026 ESC guidelines: consider a GLP-1 RA for T2DM + additional CV risk
// factor (prevention), and semaglutide/tirzepatide for symptomatic HF with
// LVEF >=45% and BMI >=30 regardless of diabetes status. Not one of the 4
// GDMT pillars, so it's a datalist suggestion on the free-text "Otros
// medicamentos" field rather than a new Fantásticos class.
var GLP1_TIPO_SUGGESTIONS = ["Semaglutida", "Tirzepatida"];

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

// Compact pillar "card" used two-per-row in a CSS grid, instead of one
// full-width row per pillar — halves the vertical stack height (2 grid
// rows instead of 4) at the same field set and font size.
function fantasticoDosisFieldHtml(row, fieldStyle) {
  var doses = STANDARD_DOSES_BY_DRUG[row.drug];
  if (!doses || !doses.length) {
    return (
      '<input type="text" value="' +
      esc(row.dosis) +
      '" placeholder="Dosis" data-cardio-fant-field="dosis" ' +
      'data-cardio-fant-class="' + esc(row.className) + '" ' +
      'style="' + fieldStyle + '"/>'
    );
  }
  return selectFieldHtml(
    optionsWithExtra(doses, row.dosis),
    row.dosis,
    'data-cardio-fant-field="dosis" data-cardio-fant-class="' + esc(row.className) + '"',
    fieldStyle
  );
}

function fantasticoRowHtml(row) {
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
  var fieldStyle =
    "width:100%;box-sizing:border-box;font-size:12px;padding:5px 8px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--text);";
  return (
    '<div style="border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg);padding:7px 9px;" ' +
    'data-cardio-fant-row="' +
    esc(row.className) +
    '">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">' +
    '<span style="font-size:12px;font-weight:700;color:var(--text);">' +
    esc(row.className) +
    "</span>" +
    pillHtml(meta.label, meta.tone) +
    "</div>" +
    '<div style="display:flex;gap:6px;margin-bottom:6px;">' +
    '<div style="flex:1 1 auto;min-width:0;">' +
    selectFieldHtml(
      optionsWithExtra(suggestions, row.drug),
      row.drug,
      'data-cardio-fant-field="drug" data-cardio-fant-class="' + esc(row.className) + '"',
      fieldStyle
    ) +
    "</div>" +
    '<div style="flex:0 0 96px;">' +
    fantasticoDosisFieldHtml(row, fieldStyle) +
    "</div>" +
    '<div style="flex:0 0 118px;">' +
    '<input type="date" class="rpc-date-input" value="' +
    esc(row.inicio) +
    '" data-cardio-fant-field="inicio" ' +
    'data-cardio-fant-class="' + esc(row.className) + '" ' +
    'style="' + fieldStyle.replace("padding:5px 8px", "padding:4px 6px") + '"/>' +
    "</div>" +
    "</div>" +
    '<div style="display:flex;gap:6px;">' +
    '<div style="flex:1 1 auto;min-width:0;">' +
    '<input type="text" value="' +
    esc(row.tolerancia) +
    '" placeholder="Tolerancia / nota" data-cardio-fant-field="tolerancia" ' +
    'data-cardio-fant-class="' + esc(row.className) + '" ' +
    'style="' + fieldStyle + '"/>' +
    "</div>" +
    '<div style="flex:0 0 118px;">' +
    '<select data-cardio-fant-field="estado" data-cardio-fant-class="' +
    esc(row.className) +
    '" style="' + fieldStyle.replace("padding:5px 8px", "padding:4px 6px") + '">' +
    estadoOpts +
    "</select>" +
    "</div>" +
    "</div>" +
    "</div>"
  );
}

function fantasticosBodyHtml(cardio) {
  var rows = normalizeFantasticosRows(cardio && cardio.fantasticos);
  return (
    '<p class="med-section-lead">Los 4 pilares de terapia médica dirigida por guías (GDMT). Marca el estado de titulación de cada uno.</p>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
    rows.map(fantasticoRowHtml).join("") +
    "</div>"
  );
}

/**
 * @param {{ fantasticos?: unknown }} cardio
 */
export function buildFantasticosSummaryHtml(cardio) {
  var rows = normalizeFantasticosRows(cardio && cardio.fantasticos);
  var started = rows.filter(function (r) { return !!r.drug; }).length;
  var target = rows.filter(function (r) { return r.estado === "objetivo"; }).length;
  var glance = started + "/4 iniciados · " + target + "/4 en dosis objetivo";
  return glanceCardHtml("4 Fantásticos (GDMT)", glance, "fantasticos");
}

function segmentRowHtml(row, opts) {
  var muted = row.active ? "" : "opacity:.55;";
  var actionLabel = row.active ? "Finalizar" : "Finalizada";
  return (
    '<div style="' +
    SEGMENT_ROW_GRID +
    "padding:9px 4px;border-bottom:1px solid var(--border);" +
    muted +
    '" data-' +
    opts.group +
    '-row="' +
    esc(row.id) +
    '">' +
    (opts.tipoOptions
      ? selectFieldHtml(
          optionsWithExtra(opts.tipoOptions, row.tipo),
          row.tipo,
          'data-' + opts.group + '-field="tipo" data-' + opts.group + '-id="' + esc(row.id) + '"',
          SEGMENT_FIELD_STYLE
        )
      : '<input type="text" value="' +
        esc(row.tipo) +
        '" placeholder="Medicamento" data-' +
        opts.group +
        '-field="tipo" data-' +
        opts.group +
        '-id="' +
        esc(row.id) +
        '"' +
        (opts.tipoDatalistId ? ' list="' + esc(opts.tipoDatalistId) + '"' : "") +
        ' style="' +
        SEGMENT_FIELD_STYLE +
        '"/>') +
    '<input type="text" value="' +
    esc(row.dosis) +
    '" placeholder="Dosis (p.ej. 40 mg IV cada 12h)" data-' +
    opts.group +
    '-field="dosis" data-' +
    opts.group +
    '-id="' +
    esc(row.id) +
    '" style="' +
    SEGMENT_FIELD_STYLE +
    '"/>' +
    '<input type="date" class="rpc-date-input" value="' +
    esc(row.inicio) +
    '" data-' +
    opts.group +
    '-field="inicio" data-' +
    opts.group +
    '-id="' +
    esc(row.id) +
    '" style="' +
    SEGMENT_FIELD_STYLE +
    '"/>' +
    (opts.showIndicacion
      ? '<input type="text" value="' +
        esc(row.indicacion) +
        '" placeholder="Indicación" data-' +
        opts.group +
        '-field="indicacion" data-' +
        opts.group +
        '-id="' +
        esc(row.id) +
        '" style="' +
        SEGMENT_FIELD_STYLE +
        '"/>'
      : "") +
    (opts.showMgTotal
      ? '<input type="number" step="1" min="0" value="' +
        (row.mgTotal != null ? esc(String(row.mgTotal)) : "") +
        '" placeholder="mg total" data-' +
        opts.group +
        '-field="mgTotal" data-' +
        opts.group +
        '-id="' +
        esc(row.id) +
        '" style="' +
        SEGMENT_FIELD_STYLE +
        '"/>'
      : "") +
    '<div style="text-align:right;">' +
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
    ? selectFieldHtml(opts.tipoOptions, "", 'data-' + group + '-new="tipo"', SEGMENT_FIELD_STYLE)
    : '<input type="text" placeholder="Medicamento" data-' +
      group +
      '-new="tipo"' +
      (opts.tipoDatalistId ? ' list="' + esc(opts.tipoDatalistId) + '"' : "") +
      ' style="' +
      SEGMENT_FIELD_STYLE +
      '"/>';
  var fields = [
    tipoNewField,
    '<input type="text" placeholder="Dosis" data-' + group + '-new="dosis" style="' + SEGMENT_FIELD_STYLE + '"/>',
    '<input type="date" class="rpc-date-input" data-' + group + '-new="inicio" style="' + SEGMENT_FIELD_STYLE + '"/>',
  ];
  if (opts.showIndicacion) {
    fields.push(
      '<input type="text" placeholder="Indicación" data-' + group + '-new="indicacion" style="' + SEGMENT_FIELD_STYLE + '"/>'
    );
  }
  if (opts.showMgTotal) {
    fields.push(
      '<input type="number" step="1" min="0" placeholder="mg total" data-' + group + '-new="mgTotal" style="' + SEGMENT_FIELD_STYLE + '"/>'
    );
  }
  return (
    '<div style="' +
    SEGMENT_ROW_GRID +
    'padding:9px 4px 2px;">' +
    fields.join("") +
    '<div style="text-align:right;">' +
    '<button type="button" class="btn-add-row" data-' +
    group +
    '-action="add" style="font-size:11px;padding:4px 8px;white-space:nowrap;">+ Agregar</button>' +
    "</div>" +
    "</div>"
  );
}

function otrosMedsBodyHtml(cardio) {
  var rows = buildSegmentRows(cardio && cardio.medSegments);
  var head =
    '<div style="' +
    SEGMENT_ROW_GRID +
    'padding:0 4px 6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);">' +
    "<span>Medicamento</span>" +
    "<span>Dosis</span>" +
    "<span>Inicio</span>" +
    "<span>Indicación</span>" +
    "<span></span>" +
    "</div>";
  var opts = {
    group: "cardio-med",
    showIndicacion: true,
    showMgTotal: false,
    tipoDatalistId: "cardio-med-tipo-suggestions",
  };
  return (
    '<p class="med-section-lead">Otros medicamentos cardiovasculares fuera de los 4 Fantásticos y de los diuréticos. ' +
    'Considerar un agonista GLP-1 (semaglutida/tirzepatida) en IC sintomática con FEVI ≥45% y obesidad, o en DM2 con ' +
    'otro factor de riesgo CV (guía ESC 2026).</p>' +
    '<datalist id="' +
    opts.tipoDatalistId +
    '">' +
    GLP1_TIPO_SUGGESTIONS.map(function (name) { return '<option value="' + esc(name) + '"></option>'; }).join("") +
    "</datalist>" +
    '<div style="border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg);padding:6px 10px;">' +
    head +
    (rows.length
      ? rows.map(function (row) { return segmentRowHtml(row, opts); }).join("")
      : '<p class="med-empty-hint" style="margin:6px 0;">Sin otros medicamentos registrados.</p>') +
    addSegmentFormHtml("cardio-med", opts) +
    "</div>"
  );
}

/**
 * @param {{ medSegments?: unknown }} cardio
 */
export function buildOtrosMedsSummaryHtml(cardio) {
  var rows = buildSegmentRows(cardio && cardio.medSegments);
  var active = rows.filter(function (r) { return r.active; }).length;
  var glance = active ? active + " medicamento" + (active === 1 ? "" : "s") + " activo" + (active === 1 ? "" : "s") : "Sin otros medicamentos registrados";
  return glanceCardHtml("Otros medicamentos", glance, "otros");
}

function diureticosBodyHtml(cardio) {
  var rows = buildSegmentRows(cardio && cardio.diureticSegments);
  var totals = diureticTotals(cardio && cardio.diureticSegments);
  var head =
    '<div style="' +
    SEGMENT_ROW_GRID +
    'padding:0 4px 6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);">' +
    "<span>Diurético</span>" +
    "<span>Dosis</span>" +
    "<span>Inicio</span>" +
    "<span>mg total</span>" +
    "<span></span>" +
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
  return (
    '<p class="med-section-lead">Diuréticos con dosis y fecha de inicio; la furosemida acumulada usa dosis × días cuando no hay mg total explícito.</p>' +
    '<div style="border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg);padding:6px 10px;">' +
    head +
    (rows.length
      ? rows.map(function (row) { return segmentRowHtml(row, opts); }).join("")
      : '<p class="med-empty-hint" style="margin:6px 0;">Sin diuréticos registrados.</p>') +
    addSegmentFormHtml("cardio-diur", opts) +
    summary +
    "</div>"
  );
}

/**
 * @param {{ diureticSegments?: unknown }} cardio
 */
export function buildDiureticosSummaryHtml(cardio) {
  var totals = diureticTotals(cardio && cardio.diureticSegments);
  var mg = Math.round(totals.furosemidaMg);
  var glance = mg > 0 ? mg + " mg furosemida acumulada" : "Sin diuréticos registrados";
  return glanceCardHtml("Diuréticos", glance, "diureticos");
}

// ---------------------------------------------------------------------
// Compact glance-card + modal shell — same visual pattern as the
// Consulta IC wizard's `.hf-glance-card` / `.modal-backdrop` /
// `.modal.ea-registro-modal.hf-consulta-modal` (see estado-actual.css and
// consulta-ic-html.mjs's glanceCard()/renderModalHtml()), copied locally
// rather than imported — those are private to that file and specific to
// its own wizard.
// ---------------------------------------------------------------------

function glanceCardHtml(title, glanceText, modalKey) {
  return (
    '<button type="button" class="hf-glance-card" data-cardio-modal-open="' +
    esc(modalKey) +
    '">' +
    '<span class="hf-glance-card-title">' +
    esc(title) +
    "</span>" +
    '<span class="hf-glance-card-glance">' +
    esc(glanceText) +
    "</span>" +
    "</button>"
  );
}

var CARDIO_MODAL_DEFS = {
  fantasticos: { title: "4 Fantásticos (GDMT)", body: fantasticosBodyHtml },
  otros: { title: "Otros medicamentos", body: otrosMedsBodyHtml },
  diureticos: { title: "Diuréticos", body: diureticosBodyHtml },
};

/**
 * @param {string} key one of "fantasticos" | "otros" | "diureticos"
 * @param {{ fantasticos?: unknown, medSegments?: unknown, diureticSegments?: unknown }} cardio
 */
export function buildCardioModalHtml(key, cardio) {
  var def = CARDIO_MODAL_DEFS[key];
  if (!def) return "";
  return (
    '<div class="modal-backdrop open" data-cardio-modal-backdrop aria-hidden="false">' +
    '<div class="modal ea-registro-modal hf-consulta-modal" role="dialog" aria-modal="true">' +
    '<header class="ea-registro-modal-head"><div class="ea-registro-modal-head-text"><h3>' +
    esc(def.title) +
    "</h3></div></header>" +
    '<div class="ea-registro-modal-body"><div class="hf-consulta-modal-body-pad">' +
    def.body(cardio) +
    "</div></div>" +
    '<footer class="ea-registro-modal-foot"><div class="modal-actions ea-registro-modal-actions">' +
    '<button type="button" class="ea-btn" data-cardio-modal-close>Cerrar</button>' +
    "</div></footer>" +
    "</div></div>"
  );
}

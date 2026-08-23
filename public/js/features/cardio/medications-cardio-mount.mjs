/**
 * DOM mount + wiring for the Manejo actual cardio cards (4 Fantásticos,
 * Otros medicamentos, Diuréticos). Inserted alongside — not replacing — the
 * existing "Medicamentos del turno" card. index.html has no container for
 * these cards, so this creates one once (after #med-output-section) and
 * reuses it on every render.
 */
import { ensureCardio } from "../../../../lib/cardio/patient-cardio.mjs";
import { appendDoseSegment, endDoseSegment } from "../../../../lib/cardio/med-segments.mjs";
import { persistClinicalState } from "../../app-state.mjs";
import { findPatientById } from "../estado-actual-panel-core.mjs";
import { rt } from "../medications-runtime-state.mjs";
import {
  buildFantasticosCardHtml,
  buildOtrosMedsCardHtml,
  buildDiureticosCardHtml,
} from "./medications-cardio-html.mjs";
import { updateFantasticoField } from "./medications-cardio-rows.mjs";

var CONTAINER_ID = "med-cardio-cards";

function ensureContainer() {
  var existing = document.getElementById(CONTAINER_ID);
  if (existing) return existing;
  var anchor = document.getElementById("med-output-section");
  if (!anchor || !anchor.parentNode) return null;
  var container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "calc(28px * var(--density-space, 1))";
  anchor.insertAdjacentElement("afterend", container);
  return container;
}

function todayYmd() {
  var dt = new Date();
  var y = dt.getFullYear();
  var m = String(dt.getMonth() + 1).padStart(2, "0");
  var d = String(dt.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function currentPatient() {
  var activeId = rt.getActiveId();
  if (!activeId) return null;
  var patient = findPatientById(activeId);
  if (!patient) return null;
  ensureCardio(patient);
  return patient;
}

function persistAndRerender() {
  persistClinicalState();
  renderCardioManejoCards();
}

function handleFantasticoChange(patient, target) {
  var className = target.getAttribute("data-cardio-fant-class");
  var field = target.getAttribute("data-cardio-fant-field");
  if (!className || !field) return;
  patient.cardio.fantasticos = updateFantasticoField(
    patient.cardio.fantasticos,
    className,
    field,
    target.value
  );
  persistAndRerender();
}

function segmentsKeyForGroup(group) {
  if (group === "cardio-med") return "medSegments";
  if (group === "cardio-diur") return "diureticSegments";
  return null;
}

function handleSegmentFieldChange(patient, target, group) {
  var key = segmentsKeyForGroup(group);
  if (!key) return;
  var id = target.getAttribute("data-" + group + "-id");
  var field = target.getAttribute("data-" + group + "-field");
  if (!id || !field) return;
  var list = Array.isArray(patient.cardio[key]) ? patient.cardio[key] : [];
  var idx = list.findIndex(function (s) {
    return s && String(s.id) === String(id);
  });
  if (idx < 0) return;
  var next = list.slice();
  var row = Object.assign({}, next[idx]);
  if (field === "mgTotal") {
    var raw = String(target.value == null ? "" : target.value).trim();
    row.mgTotal = raw === "" ? null : Number.isFinite(Number(raw)) ? Number(raw) : row.mgTotal;
  } else {
    row[field] = String(target.value || "").trim();
  }
  next[idx] = row;
  patient.cardio[key] = next;
  persistAndRerender();
}

function handleSegmentToggleEnd(patient, btn, group) {
  var key = segmentsKeyForGroup(group);
  if (!key) return;
  var id = btn.getAttribute("data-" + group + "-id");
  if (!id) return;
  patient.cardio[key] = endDoseSegment(patient.cardio[key], id, todayYmd());
  persistAndRerender();
}

function handleSegmentAdd(patient, container, group) {
  var key = segmentsKeyForGroup(group);
  if (!key) return;
  var getVal = function (field) {
    var el = container.querySelector('[data-' + group + '-new="' + field + '"]');
    return el ? String(el.value || "").trim() : "";
  };
  var tipo = getVal("tipo");
  if (!tipo) return;
  var mgRaw = getVal("mgTotal");
  patient.cardio[key] = appendDoseSegment(patient.cardio[key], {
    tipo: tipo,
    dosis: getVal("dosis"),
    inicio: getVal("inicio") || todayYmd(),
    indicacion: getVal("indicacion"),
    mgTotal: mgRaw === "" ? null : mgRaw,
  });
  persistAndRerender();
}

function wireContainerOnce(container) {
  if (container.dataset.cardioWired === "1") return;
  container.dataset.cardioWired = "1";

  container.addEventListener("change", function (ev) {
    var target = ev.target;
    if (!target || !target.getAttribute) return;
    var patient = currentPatient();
    if (!patient) return;
    if (target.hasAttribute("data-cardio-fant-field")) {
      handleFantasticoChange(patient, target);
      return;
    }
    if (target.hasAttribute("data-cardio-med-field")) {
      handleSegmentFieldChange(patient, target, "cardio-med");
      return;
    }
    if (target.hasAttribute("data-cardio-diur-field")) {
      handleSegmentFieldChange(patient, target, "cardio-diur");
    }
  });

  container.addEventListener("click", function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest("button[data-cardio-med-action], button[data-cardio-diur-action]") : null;
    if (!btn) return;
    var patient = currentPatient();
    if (!patient) return;
    var group = btn.hasAttribute("data-cardio-med-action") ? "cardio-med" : "cardio-diur";
    var action = btn.getAttribute("data-" + group + "-action");
    if (action === "toggle-end") {
      handleSegmentToggleEnd(patient, btn, group);
    } else if (action === "add") {
      handleSegmentAdd(patient, container, group);
    }
  });
}

/**
 * Renders (or clears) the 3 cardio cards for the active patient. Safe to
 * call on every renderMedRecetaPanel() pass — cheap DOM diff via innerHTML,
 * matching this panel's existing render-on-every-pass convention.
 */
export function renderCardioManejoCards() {
  var container = ensureContainer();
  if (!container) return;
  var patient = currentPatient();
  if (!patient) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML =
    buildFantasticosCardHtml(patient.cardio) +
    buildOtrosMedsCardHtml(patient.cardio) +
    buildDiureticosCardHtml(patient.cardio);
  wireContainerOnce(container);
}

export function clearCardioManejoCards() {
  var container = document.getElementById(CONTAINER_ID);
  if (container) container.innerHTML = "";
}

/**
 * Panel Receta MED (procesamiento, SOAP, copia).
 */
import {
  parseMedicationPaste,
  looksLikeSomeMedicationPaste,
  resolveFechaActualizacion,
  buildMedRecetaCopyText,
  buildMedRecetaNameOnlyText,
  formatMedicationEgresoLine,
  classifyMedicationSoapCategory,
  incrementMedItemsDiaTratamiento,
} from "../med-receta-core.mjs";
import { medRecetaByPatient, medNotaSelectionByPatient, notes, patients, saveState } from "../app-state.mjs";
import { isModeSala } from "../mode-features.mjs";
import { isPaseMode } from "./chrome.mjs";
import { mergeSoapMedField, openSOAPModalDirect } from "./soap-estado.mjs";
import { ensureMonitoreo } from "./estado-actual-data.mjs";
import { applyRecetaProposal, bucketsFromRecetaItems } from "./estado-actual-meds.mjs";
import { renderNoteForm } from "./notes-indicaciones.mjs";
import { safeAttrJsString } from "./lab-panel.mjs";
import { openPaseSectionInNormal, renderPaseBoard } from "./pase-board.mjs";

/** @type {{
 *   getActiveId(): string|null,
 *   showToast(msg: string, type?: string): void,
 *   getSettings(): Record<string, unknown>,
 *   navigateToEstadoActualPanel?(): void,
 * }} */
let rt = {
  getActiveId() {
    return null;
  },
  showToast() {},
  getSettings() {
    return {};
  },
};

export function registerMedicationsRuntime(partial) {
  if (partial && typeof partial === "object") Object.assign(rt, partial);
}

var medOutputTab = "full";

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getMedNotaSelMap(patientId) {
  if (!medNotaSelectionByPatient[patientId]) medNotaSelectionByPatient[patientId] = {};
  return medNotaSelectionByPatient[patientId];
}

export function renderMedRecetaPanel() {
  var hintEl = document.getElementById("med-hint");
  var fechaEl = document.getElementById("med-fecha-actualizacion");
  var listEl = document.getElementById("med-items-list");
  var outPre = document.getElementById("med-output");
  var outCard = document.getElementById("med-output-section");
  if (!hintEl || !listEl || !outPre) return;
  var activeId = rt.getActiveId();
  if (!activeId) {
    hintEl.style.display = "block";
    hintEl.textContent = "Selecciona un paciente en la columna izquierda para procesar su receta.";
    if (fechaEl) fechaEl.style.display = "none";
    listEl.innerHTML = "";
    outPre.textContent = "";
    if (outCard) outCard.style.display = "none";
    hideMedNotaFooter();
    if (isPaseMode()) renderPaseBoard();
    return;
  }
  var block = medRecetaByPatient[activeId];
  if (!block || !block.items || !block.items.length) {
    hintEl.style.display = "block";
    hintEl.textContent =
      "Pega el listado del hospital arriba y pulsa Receta. Cada día puedes volver a pegar; se guarda la fecha del recorte.";
    if (fechaEl) fechaEl.style.display = "none";
    listEl.innerHTML = "";
    outPre.textContent = "";
    if (outCard) outCard.style.display = "none";
    hideMedNotaFooter();
    if (isPaseMode()) renderPaseBoard();
    return;
  }
  hintEl.style.display = "none";
  if (fechaEl) {
    fechaEl.style.display = "block";
    fechaEl.textContent = "Actualizado: " + (block.fechaActualizacion || "—");
  }
  var rows = block.items.map(function (it) {
    var sid = String(it.id || "");
    var label = esc((it.nombreRaw || "").slice(0, 120));
    var chk = it.suspendido ? " checked" : "";
    var paraNota = isMedNotaSelected(activeId, sid) ? " checked" : "";
    var diaCell =
      it.diaTratamiento != null
        ? '<span class="med-receta-dia">Día ' + esc(String(it.diaTratamiento)) + "</span>"
        : "";
    return (
      '<div class="med-receta-row">' +
      '<div class="med-receta-checkcell">' +
      '<input type="checkbox"' +
      chk +
      ' title="Excluir del texto de egreso"' +
      " onchange=\"toggleMedRecetaSuspendido('" +
      safeAttrJsString(sid) +
      "', this.checked)\"" +
      "/>" +
      "</div>" +
      '<div class="med-receta-checkcell">' +
      '<input type="checkbox"' +
      paraNota +
      ' title="Incluir en Tratamiento y campos SOAP (Analgesia / ABX / AntiHTA)"' +
      " onchange=\"toggleMedRecetaParaNota('" +
      safeAttrJsString(sid) +
      "', this.checked)\"" +
      "/>" +
      "</div>" +
      '<div class="med-receta-name">' +
      label +
      "</div>" +
      diaCell +
      "</div>"
    );
  });
  listEl.innerHTML =
    '<div class="med-receta-wrap">' +
    '<div class="med-receta-head">' +
    "<span>Excl.</span>" +
    "<span>SOAP</span>" +
    "<span>Medicamento</span>" +
    "<span>Día</span>" +
    "</div>" +
    rows.join("") +
    "</div>";
  renderMedNotaFooter();
  var tabFull = document.getElementById("med-tab-full");
  var tabSimple = document.getElementById("med-tab-simple");
  var tabTrack = document.getElementById("med-output-tabs-track");
  if (tabTrack) tabTrack.setAttribute("data-active", medOutputTab === "simple" ? "simple" : "full");
  if (tabFull) {
    tabFull.classList.toggle("active", medOutputTab === "full");
    tabFull.setAttribute("aria-selected", medOutputTab === "full" ? "true" : "false");
  }
  if (tabSimple) {
    tabSimple.classList.toggle("active", medOutputTab === "simple");
    tabSimple.setAttribute("aria-selected", medOutputTab === "simple" ? "true" : "false");
  }
  var txtFull = buildMedRecetaCopyText(block.items);
  var txtSimple = buildMedRecetaNameOnlyText(block.items);
  var txt = medOutputTab === "simple" ? txtSimple : txtFull;
  outPre.textContent = txt;
  if (outCard) outCard.style.display = txt.trim() ? "block" : "none";
  if (isPaseMode()) renderPaseBoard();
}

function isMedNotaSelected(patientId, itemId) {
  return !!getMedNotaSelMap(patientId)[itemId];
}

export function toggleMedRecetaSuspendido(itemId, suspended) {
  var activeId = rt.getActiveId();
  if (!activeId || !medRecetaByPatient[activeId] || !medRecetaByPatient[activeId].items) return;
  var it = medRecetaByPatient[activeId].items.find(function (x) {
    return String(x.id) === String(itemId);
  });
  if (!it) return;
  it.suspendido = !!suspended;
  saveState();
  renderMedRecetaPanel();
}

export function toggleMedRecetaParaNota(itemId, selected) {
  var activeId = rt.getActiveId();
  if (!activeId) return;
  var m = getMedNotaSelMap(activeId);
  if (selected) m[itemId] = true;
  else delete m[itemId];
  renderMedRecetaPanel();
}

export function limpiarSeleccionMedNota() {
  var activeId = rt.getActiveId();
  if (activeId) medNotaSelectionByPatient[activeId] = {};
  renderMedRecetaPanel();
  rt.showToast("Selección limpiada", "success");
}

export function mediAnadirATratamiento() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    rt.showToast("Selecciona un paciente", "error");
    return;
  }
  var block = medRecetaByPatient[activeId];
  if (!block || !block.items || !block.items.length) {
    rt.showToast("No hay medicamentos en la receta", "error");
    return;
  }
  var sel = getMedNotaSelMap(activeId);
  var lines = block.items
    .filter(function (it) {
      return sel[it.id] && !it.suspendido;
    })
    .map(function (it) {
      return formatMedicationEgresoLine(it);
    });
  if (!lines.length) {
    rt.showToast('Marca «SOAP» en al menos un medicamento activo', "error");
    return;
  }
  if (!notes[activeId]) notes[activeId] = {};
  var tx = notes[activeId].tratamiento;
  if (!Array.isArray(tx) || !tx.length) tx = [""];
  var firstEmpty = tx.length === 1 && !(tx[0] || "").trim();
  if (firstEmpty) {
    notes[activeId].tratamiento = lines.slice();
  } else {
    lines.forEach(function (L) {
      tx.push(L);
    });
    notes[activeId].tratamiento = tx;
  }
  saveState();
  openPaseSectionInNormal("expediente");
  renderNoteForm();
  rt.showToast(lines.length + " línea(s) añadidas a Tratamiento", "success");
}

export function mediLlevarASOAP() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    rt.showToast("Selecciona un paciente", "error");
    return;
  }
  var block = medRecetaByPatient[activeId];
  var sel = getMedNotaSelMap(activeId);
  var hasReceta =
    block &&
    block.items &&
    block.items.some(function (it) {
      return sel[it.id] && !it.suspendido;
    });
  if (!hasReceta) {
    rt.showToast("Marca «SOAP» en al menos un medicamento de la receta", "error");
    return;
  }
  var buckets = bucketsFromRecetaItems(block ? block.items : [], sel, classifyMedicationSoapCategory);
  var hasBuckets = ["analgesia", "abx", "antihta", "vasop"].some(function (k) {
    return buckets[k] && String(buckets[k]).trim();
  });
  if (!hasBuckets) {
    rt.showToast("No quedó nada que volcar", "error");
    return;
  }
  if (isModeSala(rt.getSettings())) {
    var patient = patients.find(function (p) {
      return p.id === activeId;
    });
    if (!patient) {
      rt.showToast("Paciente no encontrado", "error");
      return;
    }
    ensureMonitoreo(patient);
    applyRecetaProposal(patient.monitoreo, buckets);
    saveState();
    if (typeof rt.navigateToEstadoActualPanel === "function") {
      rt.navigateToEstadoActualPanel();
    }
    rt.showToast("Propuesta en Estado Actual — confirma en Estado clínico general", "success");
    renderMedRecetaPanel();
    return;
  }
  ["analgesia", "abx", "antihta", "vasop"].forEach(function (cat) {
    var parts = String(buckets[cat] || "")
      .split(" | ")
      .filter(Boolean);
    var fieldId =
      cat === "analgesia"
        ? "soap-analgesia"
        : cat === "abx"
          ? "soap-abx"
          : cat === "antihta"
            ? "soap-antihta"
            : "soap-vasop";
    parts.forEach(function (t) {
      mergeSoapMedField(fieldId, t);
    });
  });
  openPaseSectionInNormal("expediente");
  renderNoteForm();
  openSOAPModalDirect();
  var toastMsg = "Campos SOAP actualizados · completa e Insertar en evolución";
  rt.showToast(toastMsg, "success");
  renderMedRecetaPanel();
}

export function procesarRecetaMed() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var ta = document.getElementById("med-input");
  var raw = ta ? ta.value : "";
  var parsed = parseMedicationPaste(raw || "");
  if (!parsed.items.length) {
    if (!looksLikeSomeMedicationPaste(raw || "")) {
      rt.showToast(
        "No parece el bloque de SOME. En expediente, copia desde la columna Fecha y hora hasta el final de medicamentos (con tabuladores) y pégalo aquí.",
        "error"
      );
    } else {
      rt.showToast("No se encontraron filas MEDICAMENTOS válidas en el pegado", "error");
    }
    return;
  }
  var today = new Date();
  var fallback =
    String(today.getDate()).padStart(2, "0") +
    "/" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "/" +
    today.getFullYear();
  var fecha = resolveFechaActualizacion(parsed.fechas, fallback);
  medRecetaByPatient[activeId] = {
    fechaActualizacion: fecha,
    items: parsed.items,
  };
  medNotaSelectionByPatient[activeId] = {};
  saveState();
  renderMedRecetaPanel();
  var msg = "Receta actualizada (" + parsed.items.length + " medicamentos)";
  if (parsed.skipped > 0) msg += ". Omitidas " + parsed.skipped + " líneas.";
  rt.showToast(msg, "success");
}

export function limpiarRecetaInput() {
  var ta = document.getElementById("med-input");
  if (ta) ta.value = "";
}

export function incrementMedDiaTratamiento() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var block = medRecetaByPatient[activeId];
  if (!block || !block.items || !block.items.length) {
    rt.showToast("No hay medicamentos procesados", "error");
    return;
  }
  var res = incrementMedItemsDiaTratamiento(block.items);
  if (!res.count) {
    rt.showToast("Ningún medicamento con DIA# activo", "error");
    return;
  }
  block.items = res.items;
  saveState();
  renderMedRecetaPanel();
  rt.showToast(
    res.count === 1
      ? "Día de tratamiento +1 (1 medicamento)"
      : "Día de tratamiento +1 (" + res.count + " medicamentos)",
    "success"
  );
}

export function copiarMedicamentosAlPortapapeles() {
  var activeId = rt.getActiveId();
  if (!activeId || !medRecetaByPatient[activeId]) {
    rt.showToast("No hay medicamentos procesados", "error");
    return;
  }
  var items = medRecetaByPatient[activeId].items || [];
  var text = buildMedRecetaCopyText(items);
  var simple = buildMedRecetaNameOnlyText(items);
  if (medOutputTab === "simple") {
    text = simple;
  }
  if (!text.trim()) {
    rt.showToast("No hay medicamentos activos para copiar", "error");
    return;
  }
  navigator.clipboard.writeText(text).then(
    function () {
      rt.showToast("Medicamentos copiados al portapapeles ✓", "success");
    },
    function () {
      rt.showToast("Error al copiar al portapapeles", "error");
    }
  );
}

export function setMedOutputTab(tab) {
  if (tab !== "full" && tab !== "simple") return;
  medOutputTab = tab;
  renderMedRecetaPanel();
}

function medInstructionFragmentForSoap(it) {
  var full = formatMedicationEgresoLine(it);
  var parts = full.split("||");
  if (parts.length < 2) return full.replace(/\.\s*$/, "").trim();
  return parts[1].replace(/^\s+/, "").replace(/\.\s*$/, "").trim();
}

function renderMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (!foot) return;
  foot.style.display = "block";

  var activeId = rt.getActiveId();
  var block = activeId ? medRecetaByPatient[activeId] : null;
  var sel = activeId ? getMedNotaSelMap(activeId) : {};
  var soapItems =
    block && block.items
      ? block.items.filter(function (it) {
          return sel[it.id] && !it.suspendido;
        })
      : [];

  var groups = { analgesia: [], antihta: [], abx: [], vasop: [], otros: [] };
  soapItems.forEach(function (it) {
    var cat = classifyMedicationSoapCategory(it.nombreRaw);
    if (groups[cat]) groups[cat].push(it);
    else groups.otros.push(it);
  });

  function chipsFor(arr) {
    return arr
      .map(function (it) {
        var frag = medInstructionFragmentForSoap(it);
        return (
          '<span class="med-soap-preview-chip" title="' +
          esc((it.nombreRaw || "").slice(0, 220)) +
          '">' +
          esc(frag) +
          "</span>"
        );
      })
      .join("");
  }

  function section(cat, title) {
    if (!groups[cat].length) return "";
    return (
      '<div class="med-soap-preview-sec med-soap-preview-sec--' +
      cat +
      '">' +
      '<div class="med-soap-preview-sec-title">' +
      esc(title) +
      "</div>" +
      '<div class="med-soap-preview-chips">' +
      chipsFor(groups[cat]) +
      "</div></div>"
    );
  }

  var previewHtml = soapItems.length
    ? '<div class="med-soap-preview">' +
      section("analgesia", "Analgésicos / antieméticos") +
      section("antihta", "AntiHTA / diuréticos") +
      section("abx", "Antibióticos / antifúngicos") +
      section("vasop", "Vasopresores / inotrópicos") +
      section("otros", "Otros (se copian en Antibióticos — revisar)") +
      "</div>"
    : '<p class="med-soap-preview-empty">Marcá <strong>SOAP</strong> en el listado para ver aquí cómo se repartirán en la plantilla.</p>';

  var soapBtnLabel = isModeSala(rt.getSettings())
    ? "Enviar a Estado Actual"
    : "Abrir plantilla SOAP";

  foot.innerHTML =
    '<div class="med-nota-toolbar">' +
    '<p class="med-nota-hint">Solo los medicamentos con <strong>SOAP</strong> activo aparecen abajo, clasificados según el nombre del fármaco en la receta.</p>' +
    previewHtml +
    '<div class="med-nota-actions">' +
    '<button type="button" class="btn-generate" onclick="mediAnadirATratamiento()">Añadir a Tratamiento</button>' +
    '<button type="button" class="btn-med-secondary" onclick="mediLlevarASOAP()">' +
    soapBtnLabel +
    '</button>' +
    '<button type="button" class="btn-med-secondary" onclick="limpiarSeleccionMedNota()">Limpiar</button>' +
    "</div>" +
    "</div>";
}

function hideMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (foot) {
    foot.style.display = "none";
    foot.innerHTML = "";
  }
}

export const medicationsWindowHandlers = {
  procesarRecetaMed,
  limpiarRecetaInput,
  copiarMedicamentosAlPortapapeles,
  setMedOutputTab,
  toggleMedRecetaSuspendido,
  toggleMedRecetaParaNota,
  limpiarSeleccionMedNota,
  mediAnadirATratamiento,
  mediLlevarASOAP,
  incrementMedDiaTratamiento,
};

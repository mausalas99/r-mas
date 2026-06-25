import {
  parseIndicacionesPaste,
  looksLikeSomeIndicacionesPaste,
  shouldAutoSelectSoap,
  resolveFechaActualizacion,
  buildMedRecetaCopyText,
  buildMedRecetaNameOnlyText,
  formatMedicationEgresoLine,
  classifyMedicationSoapCategory,
  SOAP_DESTINATION_KEYS,
  unassignedOtrosSoapItems,
  incrementMedItemsDiaTratamiento,
} from "../med-receta-core.mjs";
import { medRecetaByPatient, medNotaSelectionByPatient, notes, patients, saveState } from "../app-state.mjs";
import { isModeSala } from "../mode-features.mjs";
import { isPaseMode } from "./chrome.mjs";
import { mergeSoapMedField, openSOAPModalDirect } from "./soap-estado.mjs";
import { ensureMonitoreo, MED_FIELD_KEYS } from "./estado-actual-data.mjs";
import {
  applyDietProposalFromRecetaBlock,
  applyRecetaProposal,
  bucketsFromRecetaItems,
  discardDietProposal,
  discardMedProposal,
  pruneEstadoClinicoMedsFromReceta,
  syncRecetaProposalsFromSoapSelection,
} from "./estado-actual-meds.mjs";
import { renderNoteForm } from "./notes-indicaciones.mjs";
import {
  openPaseSectionInNormal,
  renderPaseBoard,
  invalidateInnerTabRenderCache,
  invalidatePaseBoardCache,
} from "./pase-board.mjs";
import { invalidateEaPanelCache, renderEstadoActualPanel } from "./estado-actual-panel.mjs";
import { onRecetaMergedToProfile } from "./med-pharm-profile-panel.mjs";
import { rt, medOutputTab, bustMedPanelCache, setMedOutputTabState } from "./medications-runtime-state.mjs";
import { getMedNotaSelMap, manejoDiaOpts } from "./medications-utils.mjs";
import { closeMedRecetaPasteModal } from "./medications-paste-modal.mjs";
import { patchMedRecetaRowSoapUi } from "./medications-panel-cache.mjs";
import { renderMedRecetaPanel } from "./medications-panel-render.mjs";
import { renderMedNotaFooter } from "./medications-soap-footer.mjs";

export function toggleMedRecetaSuspendido(itemId, suspended) {
  var activeId = rt.getActiveId();
  if (!activeId || !medRecetaByPatient[activeId] || !medRecetaByPatient[activeId].items) return;
  var it = medRecetaByPatient[activeId].items.find(function (x) {
    return String(x.id) === String(itemId);
  });
  if (!it) return;
  it.suspendido = !!suspended;
  saveState();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
}

export function toggleMedRecetaParaNota(itemId, selected) {
  var activeId = rt.getActiveId();
  if (!activeId) return;
  var sid = String(itemId || "");
  var m = getMedNotaSelMap(activeId);
  if (selected) m[sid] = true;
  else delete m[sid];
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(sid)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}

export function setMedRecetaSoapCategory(itemId, category) {
  var activeId = rt.getActiveId();
  if (!activeId || !medRecetaByPatient[activeId] || !medRecetaByPatient[activeId].items) return;
  var it = medRecetaByPatient[activeId].items.find(function (x) {
    return String(x.id) === String(itemId);
  });
  if (!it) return;
  var cat = String(category || "").trim();
  if (!cat || SOAP_DESTINATION_KEYS.indexOf(cat) < 0) delete it.soapCatOverride;
  else it.soapCatOverride = cat;
  saveState();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(itemId)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}

function hasMedRecetaContent(block) {
  return (
    block &&
    ((block.items && block.items.length) ||
      (block.dietas && block.dietas.length) ||
      String(block.pasteRaw || "").trim())
  );
}

function discardMedMonitoreoProposals(patient) {
  if (!patient) return;
  ensureMonitoreo(patient);
  discardDietProposal(patient.monitoreo);
  MED_FIELD_KEYS.forEach(function (k) {
    discardMedProposal(patient.monitoreo, k);
  });
}

function refreshEaAfterMedClear() {
  if (typeof rt.getActiveAppTab !== "function" || rt.getActiveAppTab() !== "nota") return;
  var inner = typeof rt.getActiveInner === "function" ? rt.getActiveInner() : "";
  if (inner === "estadoActual") {
    renderEstadoActualPanel({ force: true, refreshClinico: true });
  }
}

export function limpiarManejoActual() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    rt.showToast("Selecciona un paciente", "error");
    return;
  }
  var block = medRecetaByPatient[activeId];
  if (!hasMedRecetaContent(block)) {
    rt.showToast("No hay manejo importado", "error");
    return;
  }
  delete medRecetaByPatient[activeId];
  medNotaSelectionByPatient[activeId] = {};
  var ta = document.getElementById("med-input");
  if (ta) ta.value = "";
  discardMedMonitoreoProposals(
    patients.find(function (p) {
      return String(p.id) === String(activeId);
    })
  );
  saveState();
  bustMedPanelCache();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  invalidatePaseBoardCache();
  renderMedRecetaPanel();
  refreshEaAfterMedClear();
  if (isPaseMode()) renderPaseBoard();
  rt.showToast("Manejo actual limpiado", "success");
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
      var recBlock = medRecetaByPatient[activeId];
      return formatMedicationEgresoLine(it, manejoDiaOpts(recBlock && recBlock.fechaActualizacion));
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

function soapFieldIdForCategory(cat) {
  if (cat === "analgesia") return "soap-analgesia";
  if (cat === "abx") return "soap-abx";
  if (cat === "antihta" || cat === "diureticos") return "soap-antihta";
  if (cat === "antitromboticos") return "soap-antitromboticos";
  if (cat === "nm") return "soap-dieta";
  return "soap-vasop";
}

function mediLlevarASOAPToEstadoActual(activeId, buckets) {
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
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  if (typeof rt.navigateToEstadoActualPanel === "function") {
    rt.navigateToEstadoActualPanel();
  }
  renderEstadoActualPanel({ force: true, refreshClinico: true, syncHeavy: true });
  rt.showToast("Propuesta en Estado Actual — confirma en Estado clínico general", "success");
  renderMedRecetaPanel();
}

function mediLlevarASOAPToTemplate(buckets) {
  ["analgesia", "abx", "antihta", "diureticos", "antitromboticos", "vasop", "nm"].forEach(function (cat) {
    var parts = String(buckets[cat] || "")
      .split(" | ")
      .filter(Boolean);
    var fieldId = soapFieldIdForCategory(cat);
    parts.forEach(function (t) {
      mergeSoapMedField(fieldId, t);
    });
  });
  openPaseSectionInNormal("expediente");
  renderNoteForm();
  openSOAPModalDirect();
  rt.showToast("Campos SOAP actualizados · completa e Insertar en evolución", "success");
  renderMedRecetaPanel();
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
  var pendingOtros = unassignedOtrosSoapItems(block ? block.items : [], sel, classifyMedicationSoapCategory);
  if (pendingOtros.length) {
    rt.showToast(
      "Elegí destino para " +
        pendingOtros.length +
        " medicamento(s) «Otros» antes de enviar a Estado Actual",
      "error"
    );
    return;
  }
  var buckets = bucketsFromRecetaItems(block ? block.items : [], sel, classifyMedicationSoapCategory);
  var hasBuckets = ["analgesia", "abx", "antihta", "diureticos", "antitromboticos", "vasop", "nm"].some(function (k) {
    return buckets[k] && String(buckets[k]).trim();
  });
  if (!hasBuckets) {
    rt.showToast("No quedó nada que volcar", "error");
    return;
  }
  if (isModeSala(rt.getSettings())) {
    mediLlevarASOAPToEstadoActual(activeId, buckets);
    return;
  }
  mediLlevarASOAPToTemplate(buckets);
}

function toastParseRecetaFailure(raw, parsed) {
  if (parsed.items.length || parsed.dietas.length) return false;
  if (!looksLikeSomeIndicacionesPaste(raw || "")) {
    rt.showToast(
      "No parece el bloque de SOME. Copia desde Fecha/hora con tabuladores (medicamentos, dietas…) y pégalo aquí.",
      "error"
    );
  } else {
    rt.showToast("No se encontraron filas MEDICAMENTOS ni DIETAS válidas", "error");
  }
  return true;
}

function buildRecetaProcessToast(parsed) {
  var parts = [];
  if (parsed.items.length) parts.push(parsed.items.length + " medicamento(s)");
  if (parsed.dietas.length) parts.push(parsed.dietas.length + " dieta(s)");
  var msg = "Manejo actualizado (" + parts.join(" · ") + ")";
  if (parsed.skipped <= 0) return msg;
  var sum = parsed.skippedSummary || {};
  var omit = [];
  if (sum.cuidados) omit.push(sum.cuidados + " cuidados");
  if (sum.estudios) omit.push(sum.estudios + " estudios");
  if (sum.other) omit.push(sum.other + " otras");
  return msg + ". Omitidas " + parsed.skipped + " líneas" + (omit.length ? " (" + omit.join(", ") + ")" : "");
}

function applyDietFromParsedReceta(activeId) {
  var block = medRecetaByPatient[activeId];
  if (!block || !block.dietas || !block.dietas.length) return;
  var patient = patients.find(function (p) {
    return String(p.id) === String(activeId);
  });
  if (!patient) return;
  ensureMonitoreo(patient);
  applyDietProposalFromRecetaBlock(patient.monitoreo, block, { force: true });
}

function syncEaMedsFromProcessedReceta(activeId) {
  var patient = patients.find(function (p) {
    return String(p.id) === String(activeId);
  });
  if (!patient) return;
  ensureMonitoreo(patient);
  var block = medRecetaByPatient[activeId];
  var items = block && Array.isArray(block.items) ? block.items : [];
  var fecha = block && block.fechaActualizacion ? String(block.fechaActualizacion).trim() : '';
  var monitoreo = patient.monitoreo;
  pruneEstadoClinicoMedsFromReceta(monitoreo, items, classifyMedicationSoapCategory, fecha);
  var sel = medNotaSelectionByPatient[activeId] || {};
  applyRecetaProposal(monitoreo, bucketsFromRecetaItems(items, sel, classifyMedicationSoapCategory));
}

function commitProcessedReceta(activeId, raw, parsed) {
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
    dietas: parsed.dietas,
    pasteRaw: raw,
  };
  var sel = {};
  parsed.items.forEach(function (it) {
    if (shouldAutoSelectSoap(it)) sel[it.id] = true;
  });
  medNotaSelectionByPatient[activeId] = sel;
  applyDietFromParsedReceta(activeId);
  syncEaMedsFromProcessedReceta(activeId);
  saveState();
  onRecetaMergedToProfile(activeId, medRecetaByPatient[activeId]);
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
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
  var parsed = parseIndicacionesPaste(raw || "");
  if (toastParseRecetaFailure(raw, parsed)) return;
  commitProcessedReceta(activeId, raw, parsed);
  rt.showToast(buildRecetaProcessToast(parsed), "success");
  closeMedRecetaPasteModal();
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
  var block = medRecetaByPatient[activeId];
  var items = block.items || [];
  var diaOpts = manejoDiaOpts(block.fechaActualizacion);
  var text = buildMedRecetaCopyText(items, diaOpts);
  var simple = buildMedRecetaNameOnlyText(items, diaOpts);
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
  setMedOutputTabState(tab);
  renderMedRecetaPanel();
}

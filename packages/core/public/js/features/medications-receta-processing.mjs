import {
  parseIndicacionesPaste,
  looksLikeSomeIndicacionesPaste,
  shouldAutoSelectSoap,
  resolveFechaActualizacion,
  buildMedRecetaCopyText,
  buildMedRecetaNameOnlyText,
  formatMedicationEgresoLine,
  classifyMedicationSoapCategory,
  unassignedOtrosSoapItems,
  incrementMedItemsDiaTratamiento,
} from "../med-receta-core.mjs";
import { getPatients, getMedRecetaByPatient, getMedNotaSelectionByPatient, getNotes, persistClinicalState } from "../app-state.mjs";
import { scheduleCloudSyncPush } from "./cloud-sync/mutate-bridge.mjs";
import { storage } from "../storage.js";
import { addTodoWithFields } from "./todos-mutations.mjs";
import { isModeSala } from "../mode-features.mjs";
import { mergeSoapMedField, openSOAPModalDirect } from "./soap-estado.mjs";
import { soapLegacyFieldIdForCategory } from "./soap-legacy-field-map.mjs";
import { ensureMonitoreo, MED_FIELD_KEYS } from "./estado-actual-data.mjs";
import {
  applyDietProposalFromRecetaBlock,
  applyRecetaProposal,
  applyRecetaProposalForce,
  bucketsFromRecetaItems,
  discardDietProposal,
  discardMedProposal,
  pruneEstadoClinicoMedsFromReceta,
  syncConfirmedAbxFromReceta,
} from "./estado-actual-meds.mjs";
import { clearRecetaProposalDismissed, clearRecetaProposalDismissedKey } from "./estado-actual-meds-core.mjs";
import { syncMonitoreoInsulinPumpFromReceta } from "./estado-actual-insulin-pump.mjs";
import { showNotaEvolucionClassicView } from "./nota-evolucion/nota-evolucion-primary-tab.mjs";
import { invalidateEaPanelCache, renderEstadoActualPanel } from "./estado-actual-panel.mjs";
import { onRecetaMergedToProfile } from "./med-pharm-profile-panel.mjs";
import { skipRecetaItemForInsulinPumpCarrier } from "../insulin-pump-receta-display.mjs";
import { rt, medToast, medOutputTab, bustMedPanelCache, setMedOutputTabState } from "./medications-runtime-state.mjs";
import { getMedNotaSelMap, manejoDiaOpts } from "./medications-utils.mjs";
import { closeMedRecetaPasteModal } from "./medications-paste-modal.mjs";
import { renderMedRecetaPanel } from "./medications-panel-render.mjs";
import { switchInnerTab, invalidateInnerTabRenderCache } from "./medications-actions.mjs";

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
    medToast("Selecciona un paciente", "error");
    return;
  }
  var block = getMedRecetaByPatient()[activeId];
  if (!hasMedRecetaContent(block)) {
    medToast("No hay manejo importado", "error");
    return;
  }
  delete getMedRecetaByPatient()[activeId];
  getMedNotaSelectionByPatient()[activeId] = {};
  var ta = document.getElementById("med-input");
  if (ta) ta.value = "";
  discardMedMonitoreoProposals(
    getPatients().find(function (p) {
      return String(p.id) === String(activeId);
    })
  );
  persistClinicalState();
  scheduleCloudSyncPush();
  bustMedPanelCache();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
  refreshEaAfterMedClear();
  medToast("Manejo actual limpiado", "success");
}

export function mediAnadirATratamiento() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    medToast("Selecciona un paciente", "error");
    return;
  }
  var block = getMedRecetaByPatient()[activeId];
  if (!block || !block.items || !block.items.length) {
    medToast("No hay medicamentos en la receta", "error");
    return;
  }
  var sel = getMedNotaSelMap(activeId);
  var lines = block.items
    .filter(function (it) {
      return (
        sel[it.id] &&
        !it.suspendido &&
        !skipRecetaItemForInsulinPumpCarrier(it, block.items)
      );
    })
    .map(function (it) {
      var recBlock = getMedRecetaByPatient()[activeId];
      return formatMedicationEgresoLine(it, manejoDiaOpts(recBlock && recBlock.fechaActualizacion));
    });
  if (!lines.length) {
    medToast('Marca «SOAP» en al menos un medicamento activo', "error");
    return;
  }
  if (!getNotes()[activeId]) getNotes()[activeId] = {};
  var tx = getNotes()[activeId].tratamiento;
  if (!Array.isArray(tx) || !tx.length) tx = [""];
  var firstEmpty = tx.length === 1 && !(tx[0] || "").trim();
  if (firstEmpty) {
    getNotes()[activeId].tratamiento = lines.slice();
  } else {
    lines.forEach(function (L) {
      tx.push(L);
    });
    getNotes()[activeId].tratamiento = tx;
  }
  persistClinicalState();
  switchInnerTab("notas");
  showNotaEvolucionClassicView();
  medToast(lines.length + " línea(s) añadidas a Tratamiento", "success");
}


function mediLlevarASOAPToEstadoActual(activeId, buckets) {
  var patient = getPatients().find(function (p) {
    return p.id === activeId;
  });
  if (!patient) {
    medToast("Paciente no encontrado", "error");
    return;
  }
  ensureMonitoreo(patient);
  MED_FIELD_KEYS.forEach(function (k) {
    if (buckets[k] && String(buckets[k]).trim()) {
      clearRecetaProposalDismissedKey(patient.monitoreo, k);
    }
  });
  applyRecetaProposalForce(patient.monitoreo, buckets);
  persistClinicalState();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  if (typeof rt.navigateToEstadoActualPanel === "function") {
    rt.navigateToEstadoActualPanel();
  }
  renderEstadoActualPanel({ force: true, refreshClinico: true, syncHeavy: true });
  medToast("Propuesta en Estado Actual — confirma en Estado clínico general", "success");
  renderMedRecetaPanel();
}

function mediLlevarASOAPToTemplate(buckets) {
  MED_FIELD_KEYS.forEach(function (cat) {
    var parts = String(buckets[cat] || "")
      .split(" | ")
      .filter(Boolean);
    var fieldId = soapLegacyFieldIdForCategory(cat === "diureticos" ? "diuretico" : cat);
    if (!fieldId) return;
    parts.forEach(function (t) {
      mergeSoapMedField(fieldId, t);
    });
  });
  switchInnerTab("notas");
  showNotaEvolucionClassicView();
  openSOAPModalDirect();
  medToast("Campos SOAP actualizados · completa e Insertar en evolución", "success");
  renderMedRecetaPanel();
}

export function mediLlevarASOAP() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    medToast("Selecciona un paciente", "error");
    return;
  }
  var block = getMedRecetaByPatient()[activeId];
  var sel = getMedNotaSelMap(activeId);
  var hasReceta =
    block &&
    block.items &&
    block.items.some(function (it) {
      return sel[it.id] && !it.suspendido;
    });
  if (!hasReceta) {
    medToast("Marca «SOAP» en al menos un medicamento de la receta", "error");
    return;
  }
  var pendingOtros = unassignedOtrosSoapItems(block ? block.items : [], sel, classifyMedicationSoapCategory);
  if (pendingOtros.length) {
    medToast(
      "Elige destino para " +
        pendingOtros.length +
        " medicamento(s) «Otros» antes de enviar a Estado Actual",
      "error"
    );
    return;
  }
  var buckets = bucketsFromRecetaItems(block ? block.items : [], sel, classifyMedicationSoapCategory, activeId);
  var hasBuckets = MED_FIELD_KEYS.some(function (k) {
    return buckets[k] && String(buckets[k]).trim();
  });
  if (!hasBuckets) {
    medToast("No quedó nada que volcar", "error");
    return;
  }
  if (isModeSala(rt.getSettings())) {
    mediLlevarASOAPToEstadoActual(activeId, buckets);
    return;
  }
  mediLlevarASOAPToTemplate(buckets);
}

function toastParseRecetaFailure(raw, parsed) {
  if (parsed.items.length || parsed.dietas.length || (parsed.pendientes && parsed.pendientes.length)) return false;
  if (!looksLikeSomeIndicacionesPaste(raw || "")) {
    medToast(
      "No parece el bloque de SOME. Copia desde Fecha/hora con tabuladores (medicamentos, dietas…) y pégalo aquí.",
      "error"
    );
  } else {
    medToast("No se encontraron filas MEDICAMENTOS, DIETAS, ESTUDIOS ni PROCEDIMIENTO válidas", "error");
  }
  return true;
}

function buildRecetaProcessToast(parsed) {
  var parts = [];
  if (parsed.items.length) parts.push(parsed.items.length + " medicamento(s)");
  if (parsed.dietas.length) parts.push(parsed.dietas.length + " dieta(s)");
  if (parsed.pendientes && parsed.pendientes.length) parts.push(parsed.pendientes.length + " pendiente(s)");
  var msg = "Manejo actualizado (" + parts.join(" · ") + ")";
  if (parsed.skipped <= 0) return msg;
  var sum = parsed.skippedSummary || {};
  var omit = [];
  if (sum.cuidados) omit.push(sum.cuidados + " cuidados");
  if (sum.estudios) omit.push(sum.estudios + " estudios de laboratorio");
  if (sum.other) omit.push(sum.other + " otras");
  return msg + ". Omitidas " + parsed.skipped + " líneas" + (omit.length ? " (" + omit.join(", ") + ")" : "");
}

/** El detalle es sólo el insumo/kit usado, no aporta nada al pendiente. */
var KIT_DETAIL_RE = /^KIT\s+PARA\b/i;

/** "TORAX" → "Torax": primera letra mayúscula, resto tal cual llegó. */
function capitalizeFirstOnly_(s) {
  var t = String(s || "").trim();
  if (!t) return t;
  var lower = t.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Palabras de califican simple/contraste, no forman parte de la región anatómica. */
function stripImagingQualifiers_(s) {
  return String(s || "")
    .replace(/\b(SIMPLE|SIM|SIN|CON|Y|CONTRASTAD[AO]|CONTRASTE|CONT)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Identifica un estudio de imagen (TAC/RM) en cualquiera de sus dos formas —
 * "TOMOGRAFIA AXIAL COMPUTERIZADA DE TORAX" (nombre completo, típico de
 * PROCEDIMIENTO) o "TAC TORAX SIMPLE Y CONT" (abreviado, típico de ESTUDIOS)
 * — y devuelve una llave (modalidad + región) para emparejar ambas formas
 * del mismo estudio. null si no es de imagen.
 */
function imagingStudyKey_(nombreRaw) {
  var n = String(nombreRaw || "").toUpperCase();
  var tac = n.match(/^TOMOGRAF[IÍ]A\b[\s\S]*?\bDE\s+(.+)/) || n.match(/^TAC\s+(.+)/);
  if (tac) {
    var bodyTac = stripImagingQualifiers_(tac[1]);
    if (bodyTac) return { key: "TAC|" + bodyTac, shortName: "TAC de " + capitalizeFirstOnly_(bodyTac) };
  }
  var rm = n.match(/^(?:IMAGENES\s+DE\s+)?RESONANCIA\s+MAGN[EÉ]TICA\b[\s\S]*?\bDE\s+(.+)/) || n.match(/^RM\s+(.+)/);
  if (rm) {
    var bodyRm = stripImagingQualifiers_(rm[1]);
    if (bodyRm) return { key: "RM|" + bodyRm, shortName: "RM de " + capitalizeFirstOnly_(bodyRm) };
  }
  return null;
}

/** "SIN CONTRASTE" no cuenta como contrastada; "CONT"/"CONTRASTE" sueltos sí. */
function isContrastedDetail_(detalleRaw, nombreRaw) {
  var text = (String(detalleRaw || "") + " " + String(nombreRaw || "")).toUpperCase();
  if (/SIN\s+CONTRAST/.test(text)) return false;
  return /CONTRAST|\bCONT\b/.test(text);
}

/** Texto de pendiente para un renglón de ESTUDIOS/PROCEDIMIENTO parseado. */
function pendienteTextFromRow_(row) {
  var label = row.kind === "estudio" ? "Estudio" : "Procedimiento";
  var imaging = row.kind === "procedimiento" ? imagingStudyKey_(row.nombreRaw) : null;
  if (imaging) {
    var contrasted = isContrastedDetail_(row.detalleRaw, row.nombreRaw);
    return label + ": " + imaging.shortName + (contrasted ? " contrastada" : "");
  }
  var detalle = row.detalleRaw && !KIT_DETAIL_RE.test(row.detalleRaw) ? row.detalleRaw : "";
  var extra = detalle ? " — " + detalle : "";
  return label + ": " + row.nombreRaw + extra;
}

/**
 * Une en un solo renglón las filas de un mismo estudio de imagen (misma
 * modalidad + región) que aparecen dos veces en el mismo paste — la orden
 * en ESTUDIOS y su insumo/contraste en PROCEDIMIENTO. Evita que el mismo
 * TAC/RM entre dos veces a Pendientes. Filas sin pareja de imagen quedan
 * igual.
 */
function mergeImagingRowPairs_(pendientes) {
  var groups = [];
  var byKey = {};
  pendientes.forEach(function (row) {
    var imaging = imagingStudyKey_(row.nombreRaw);
    if (!imaging) {
      groups.push({ rows: [row], imaging: null });
      return;
    }
    var g = byKey[imaging.key];
    if (!g) {
      g = { rows: [], imaging: imaging };
      byKey[imaging.key] = g;
      groups.push(g);
    }
    g.rows.push(row);
  });
  return groups.map(function (g) {
    if (!g.imaging || g.rows.length < 2) return pendienteTextFromRow_(g.rows[0]);
    var label = g.rows.some(function (r) { return r.kind === "estudio"; }) ? "Estudio" : "Procedimiento";
    var contrasted = g.rows.some(function (r) { return isContrastedDetail_(r.detalleRaw, r.nombreRaw); });
    return label + ": " + g.imaging.shortName + (contrasted ? " contrastada" : "");
  });
}

/**
 * Da de alta en Pendientes cada ESTUDIOS/PROCEDIMIENTO nuevo del bloque
 * pegado. Si un pendiente idéntico ya está abierto no se duplica, sólo se
 * avisa — una solicitud modificada (otro contraste, otro estudio) sí entra
 * como pendiente nuevo.
 */
export function addPendientesFromParsedReceta(activeId, pendientes) {
  if (!pendientes || !pendientes.length) return;
  var existing = storage.getTodos(activeId) || [];
  var openTexts = existing
    .filter(function (t) { return t && !t.completed; })
    .map(function (t) { return String(t.text || ""); });
  var repetidos = 0;
  mergeImagingRowPairs_(pendientes).forEach(function (text) {
    if (openTexts.indexOf(text) >= 0) {
      repetidos += 1;
      return;
    }
    addTodoWithFields({ text: text, priority: "media" });
    openTexts.push(text);
  });
  if (repetidos) {
    medToast(repetidos + " pendiente(s) ya estaban en la lista, no se repitieron", "info");
  }
}

function applyDietFromParsedReceta(activeId) {
  var block = getMedRecetaByPatient()[activeId];
  if (!block || !block.dietas || !block.dietas.length) return;
  var patient = getPatients().find(function (p) {
    return String(p.id) === String(activeId);
  });
  if (!patient) return;
  ensureMonitoreo(patient);
  applyDietProposalFromRecetaBlock(patient.monitoreo, block, { force: true });
}

function syncEaMedsFromProcessedReceta(activeId) {
  var patient = getPatients().find(function (p) {
    return String(p.id) === String(activeId);
  });
  if (!patient) return;
  ensureMonitoreo(patient);
  clearRecetaProposalDismissed(patient.monitoreo);
  var block = getMedRecetaByPatient()[activeId];
  var items = block && Array.isArray(block.items) ? block.items : [];
  var fecha = block && block.fechaActualizacion ? String(block.fechaActualizacion).trim() : '';
  var monitoreo = patient.monitoreo;
  pruneEstadoClinicoMedsFromReceta(monitoreo, items, classifyMedicationSoapCategory, fecha);
  var sel = getMedNotaSelectionByPatient()[activeId] || {};
  var buckets = bucketsFromRecetaItems(items, sel, classifyMedicationSoapCategory, activeId);
  applyRecetaProposal(monitoreo, buckets);
  syncConfirmedAbxFromReceta(monitoreo, buckets);
  syncMonitoreoInsulinPumpFromReceta(monitoreo, block);
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
  getMedRecetaByPatient()[activeId] = {
    fechaActualizacion: fecha,
    items: parsed.items,
    dietas: parsed.dietas,
    pasteRaw: raw,
  };
  var sel = {};
  parsed.items.forEach(function (it) {
    if (shouldAutoSelectSoap(it)) sel[it.id] = true;
  });
  getMedNotaSelectionByPatient()[activeId] = sel;
  applyDietFromParsedReceta(activeId);
  addPendientesFromParsedReceta(activeId, parsed.pendientes);
  syncEaMedsFromProcessedReceta(activeId);
  persistClinicalState();
  scheduleCloudSyncPush();
  onRecetaMergedToProfile(activeId, getMedRecetaByPatient()[activeId]);
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
}

function getMedRecetaPasteRaw() {
  var ta =
    document.querySelector("#med-receta-paste-modal #med-input") || document.getElementById("med-input");
  return ta ? String(ta.value || "") : "";
}

export function procesarRecetaMed() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    medToast("Selecciona un paciente primero", "error");
    return;
  }
  var raw = getMedRecetaPasteRaw();
  try {
    var parsed = parseIndicacionesPaste(raw || "");
    if (toastParseRecetaFailure(raw, parsed)) return;
    commitProcessedReceta(activeId, raw, parsed);
    medToast(buildRecetaProcessToast(parsed), "success");
    closeMedRecetaPasteModal();
  } catch (err) {
    console.error("[R+] procesarRecetaMed:", err);
    medToast(
      "No se pudo procesar la receta. Si persiste, reinicia la app (⌘R) y vuelve a pegar desde SOME.",
      "error"
    );
  }
}

export function procesarRecetaFromText(raw) {
  var activeId = rt.getActiveId();
  if (!activeId) {
    medToast("Selecciona un paciente primero", "error");
    return false;
  }
  try {
    var parsed = parseIndicacionesPaste(raw || "");
    if (toastParseRecetaFailure(raw, parsed)) return false;
    commitProcessedReceta(activeId, raw, parsed);
    medToast(buildRecetaProcessToast(parsed), "success");
    return true;
  } catch (err) {
    console.error("[R+] procesarRecetaFromText:", err);
    medToast(
      "No se pudo procesar la receta. Si persiste, reinicia la app (⌘R) y vuelve a pegar desde SOME.",
      "error"
    );
    return false;
  }
}

export function limpiarRecetaInput() {
  var ta = document.getElementById("med-input");
  if (ta) ta.value = "";
}

export function incrementMedDiaTratamiento() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    medToast("Selecciona un paciente primero", "error");
    return;
  }
  var block = getMedRecetaByPatient()[activeId];
  if (!block || !block.items || !block.items.length) {
    medToast("No hay medicamentos procesados", "error");
    return;
  }
  var res = incrementMedItemsDiaTratamiento(block.items);
  if (!res.count) {
    medToast("Ningún medicamento con DIA# activo", "error");
    return;
  }
  block.items = res.items;
  persistClinicalState();
  scheduleCloudSyncPush();
  renderMedRecetaPanel();
  medToast(
    res.count === 1
      ? "Día de tratamiento +1 (1 medicamento)"
      : "Día de tratamiento +1 (" + res.count + " medicamentos)",
    "success"
  );
}

export function copiarMedicamentosAlPortapapeles() {
  var activeId = rt.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId]) {
    medToast("No hay medicamentos procesados", "error");
    return;
  }
  var block = getMedRecetaByPatient()[activeId];
  var items = block.items || [];
  var diaOpts = manejoDiaOpts(block.fechaActualizacion);
  var text = buildMedRecetaCopyText(items, diaOpts);
  var simple = buildMedRecetaNameOnlyText(items, diaOpts);
  if (medOutputTab === "simple") {
    text = simple;
  }
  if (!text.trim()) {
    medToast("No hay medicamentos activos para copiar", "error");
    return;
  }
  navigator.clipboard.writeText(text).then(
    function () {
      medToast("Medicamentos copiados al portapapeles ✓", "success");
    },
    function () {
      medToast("Error al copiar al portapapeles", "error");
    }
  );
}

export function setMedOutputTab(tab) {
  if (tab !== "full" && tab !== "simple") return;
  setMedOutputTabState(tab);
  renderMedRecetaPanel();
}

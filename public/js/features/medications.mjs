/**
 * Panel Receta MED (procesamiento, SOAP, copia).
 */
import {
  parseIndicacionesPaste,
  looksLikeSomeIndicacionesPaste,
  shouldAutoSelectSoap,
  mergeDietaItems,
  buildDietProposalText,
  resolveFechaActualizacion,
  buildMedRecetaCopyText,
  buildMedRecetaNameOnlyText,
  formatMedicationEgresoLine,
  formatMedicationSoapShort,
  classifyMedicationSoapCategory,
  effectiveSoapCategory,
  SOAP_DESTINATION_KEYS,
  SOAP_DESTINATION_LABELS,
  unassignedOtrosSoapItems,
  incrementMedItemsDiaTratamiento,
} from "../med-receta-core.mjs";
import { medRecetaByPatient, medNotaSelectionByPatient, notes, patients, saveState } from "../app-state.mjs";
import { isModeSala } from "../mode-features.mjs";
import { isPaseMode } from "./chrome.mjs";
import { mergeSoapMedField, openSOAPModalDirect } from "./soap-estado.mjs";
import { ensureMonitoreo } from "./estado-actual-data.mjs";
import {
  applyRecetaProposal,
  bucketsFromRecetaItems,
  medInstructionFragmentForSoap,
} from "./estado-actual-meds.mjs";
import { renderNoteForm } from "./notes-indicaciones.mjs";
import { safeAttrJsString } from "./lab-panel.mjs";
import { openPaseSectionInNormal, renderPaseBoard, invalidateInnerTabRenderCache } from "./pase-board.mjs";
import { invalidateEaPanelCache, renderEstadoActualPanel } from "./estado-actual-panel.mjs";
import {
  getMedSubview,
  registerMedPharmProfileRuntime,
  initMedPharmSubviewUi,
  renderMedPharmProfilePanel,
  closeMedPharmModals,
  onRecetaMergedToProfile,
  medPharmProfileWindowHandlers,
} from "./med-pharm-profile-panel.mjs";

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

export function registerMedicationsRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}

var medOutputTab = "full";
var _medRecetaPasteModalWired = false;

function isDemoPatientId(patientId) {
  return String(patientId || "").indexOf("demo-") === 0;
}

/** Guarda el pegado del textarea antes de cambiar de paciente. */
export function stashMedInputForPatient(patientId) {
  if (!patientId || isDemoPatientId(patientId)) return;
  var ta = document.getElementById("med-input");
  if (!ta) return;
  var raw = ta.value || "";
  var block = medRecetaByPatient[patientId];
  if (!raw) {
    if (block) {
      delete block.pasteRaw;
      if (!block.items || !block.items.length) delete medRecetaByPatient[patientId];
      else saveState();
    }
    return;
  }
  if (!block) medRecetaByPatient[patientId] = { pasteRaw: raw };
  else block.pasteRaw = raw;
  saveState();
}

function restoreMedInputForPatient(patientId) {
  var ta = document.getElementById("med-input");
  if (!ta) return;
  var block = patientId ? medRecetaByPatient[patientId] : null;
  ta.value = block && block.pasteRaw ? block.pasteRaw : "";
}

function isMedRecetaPasteModalOpen() {
  var el = document.getElementById("med-receta-paste-modal");
  return !!(el && el.classList.contains("open"));
}

function wireMedRecetaPasteModalOnce() {
  if (_medRecetaPasteModalWired) return;
  var bd = document.getElementById("med-receta-paste-modal");
  if (!bd) return;
  _medRecetaPasteModalWired = true;
  bd.addEventListener("click", function (ev) {
    if (!bd.classList.contains("open")) return;
    if (ev.target === bd) closeMedRecetaPasteModal();
  });
  document.addEventListener(
    "keydown",
    function (ev) {
      if (ev.key !== "Escape" || !isMedRecetaPasteModalOpen()) return;
      ev.preventDefault();
      ev.stopPropagation();
      closeMedRecetaPasteModal();
    },
    true
  );
}

export function openMedRecetaPasteModal() {
  var activeId = rt.getActiveId();
  if (!activeId) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  wireMedRecetaPasteModalOnce();
  closeMedPharmModals();
  restoreMedInputForPatient(activeId);
  var bd = document.getElementById("med-receta-paste-modal");
  if (!bd) return;
  bd.removeAttribute("hidden");
  bd.setAttribute("aria-hidden", "false");
  bd.classList.add("open");
  document.body.classList.add("rpc-med-receta-paste-open");
  var ta = document.getElementById("med-input");
  if (ta) {
    requestAnimationFrame(function () {
      ta.focus();
    });
  }
}

export function closeMedRecetaPasteModal() {
  var activeId = rt.getActiveId();
  if (activeId) stashMedInputForPatient(activeId);
  var bd = document.getElementById("med-receta-paste-modal");
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("hidden", "");
  bd.setAttribute("aria-hidden", "true");
  document.body.classList.remove("rpc-med-receta-paste-open");
}

function setMedActiveLeadVisible(visible) {
  var lead = document.getElementById("med-active-lead");
  if (lead) lead.hidden = !visible;
}

function setMedDiaBtnVisible(visible) {
  var btn = document.getElementById("med-dia-btn");
  if (btn) btn.hidden = !visible;
}

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

var lastMedPanelPatientId = null;
var _medPanelCacheKey = "";

function medPanelCacheKey(activeId) {
  if (!activeId) return "";
  var block = medRecetaByPatient[activeId];
  if (!block || ((!block.items || !block.items.length) && (!block.dietas || !block.dietas.length))) {
    return String(activeId) + "|empty|" + medOutputTab;
  }
  var selMap = getMedNotaSelMap(activeId);
  var suspendHash = 0;
  var selHash = 0;
  var medItems = block.items || [];
  medItems.forEach(function (it, idx) {
    if (it.suspendido) suspendHash += 1 << (idx % 24);
    if (selMap[it.id]) selHash += 1 << (idx % 24);
  });
  return (
    String(activeId) +
    "|N" +
    medItems.length +
    "|F" +
    (block.fechaActualizacion || "") +
    "|S" +
    suspendHash +
    "|P" +
    selHash +
    "|T" +
    medOutputTab +
    "|D" +
    (block.dietas ? block.dietas.length : 0) +
    "|V" +
    getMedSubview()
  );
}

export function renderMedRecetaPanel() {
  initMedPharmSubviewUi();
  wireMedRecetaPasteModalOnce();
  var activeId = rt.getActiveId();
  if (activeId !== lastMedPanelPatientId) {
    lastMedPanelPatientId = activeId;
    _medPanelCacheKey = "";
    closeMedPharmModals();
    closeMedRecetaPasteModal();
  }
  if (getMedSubview() === "perfil") {
    _medPanelCacheKey = "";
    renderMedPharmProfilePanel();
    return;
  }
  var hintEl = document.getElementById("med-hint");
  var fechaEl = document.getElementById("med-fecha-actualizacion");
  var listEl = document.getElementById("med-items-list");
  var outPre = document.getElementById("med-output");
  var outCard = document.getElementById("med-output-section");
  if (!hintEl || !listEl || !outPre) return;
  var cacheKey = medPanelCacheKey(activeId);
  if (activeId && _medPanelCacheKey === cacheKey) {
    if (listEl.querySelector(".med-receta-wrap")) return;
    var cachedBlock = medRecetaByPatient[activeId];
    if ((!cachedBlock || !cachedBlock.items || !cachedBlock.items.length) && !hintEl.hidden) {
      return;
    }
  }
  if (!activeId) {
    _medPanelCacheKey = "";
    hintEl.hidden = false;
    hintEl.textContent = "Selecciona un paciente en la columna izquierda para ver su manejo.";
    setMedActiveLeadVisible(false);
    setMedDiaBtnVisible(false);
    if (fechaEl) fechaEl.hidden = true;
    listEl.innerHTML = "";
    outPre.textContent = "";
    if (outCard) outCard.style.display = "none";
    hideMedNotaFooter();
    if (isPaseMode()) renderPaseBoard();
    return;
  }
  restoreMedInputForPatient(activeId);
  var block = medRecetaByPatient[activeId];
  var hasRecetaContent =
    block &&
    ((block.items && block.items.length) || (block.dietas && block.dietas.length));
  if (!hasRecetaContent) {
    _medPanelCacheKey = cacheKey;
    hintEl.hidden = false;
    hintEl.textContent =
      "Aún no hay medicamentos. Pulsa Importar SOME, pega el bloque del hospital y procesa la receta.";
    setMedActiveLeadVisible(false);
    setMedDiaBtnVisible(false);
    if (fechaEl) fechaEl.hidden = true;
    listEl.innerHTML = "";
    outPre.textContent = "";
    if (outCard) outCard.style.display = "none";
    hideMedNotaFooter();
    if (isPaseMode()) renderPaseBoard();
    return;
  }
  if (_medPanelCacheKey === cacheKey && listEl.querySelector(".med-receta-wrap")) {
    return;
  }
  _medPanelCacheKey = cacheKey;
  hintEl.hidden = true;
  setMedActiveLeadVisible(true);
  setMedDiaBtnVisible(true);
  if (fechaEl) {
    fechaEl.hidden = false;
    fechaEl.textContent = "Actualizado " + (block.fechaActualizacion || "—");
  }
  var dietHtml = "";
  if (block.dietas && block.dietas.length) {
    var mergedDiet = mergeDietaItems(block.dietas);
    dietHtml =
      '<div class="med-receta-diet-card" style="margin-bottom:12px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2, rgba(0,0,0,.02));">' +
      '<div style="font-weight:600;font-size:12px;margin-bottom:6px;">Dieta detectada</div>' +
      '<div>' +
      esc(mergedDiet.descripcion || "—") +
      "</div>" +
      (mergedDiet.kcal != null
        ? '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">' +
          esc(String(mergedDiet.kcal)) +
          " kcal</div>"
        : "") +
      (mergedDiet.proteinG != null
        ? '<div style="font-size:12px;color:var(--text-muted);">' +
          esc(String(mergedDiet.proteinG)) +
          " g proteína</div>"
        : "") +
      "</div>";
  }
  var items = block.items || [];
  var rows = items.map(function (it) {
    var sid = String(it.id || "");
    var listLabel = formatMedicationSoapShort(it);
    if (it.diaTratamiento != null) listLabel = listLabel.replace(/\s+DIA\s+\d+\s*$/i, "");
    var label = esc(listLabel.slice(0, 160));
    var chk = it.suspendido ? " checked" : "";
    var paraNota = isMedNotaSelected(activeId, sid) ? " checked" : "";
    var autoCat = classifyMedicationSoapCategory(it.nombreRaw, it.dosisRaw);
    var destCell = "";
    if (autoCat === "otros") {
      var opts =
        '<option value="">Elegir destino…</option>' +
        SOAP_DESTINATION_KEYS.map(function (k) {
          var sel = it.soapCatOverride === k ? " selected" : "";
          return (
            '<option value="' +
            esc(k) +
            '"' +
            sel +
            ">" +
            esc(SOAP_DESTINATION_LABELS[k] || k) +
            "</option>"
          );
        }).join("");
      destCell =
        '<select class="med-receta-dest" title="Destino en Estado Actual / SOAP"' +
        " onchange=\"setMedRecetaSoapCategory('" +
        safeAttrJsString(sid) +
        "', this.value)\"" +
        ">" +
        opts +
        "</select>";
    }
    var diaCell =
      it.diaTratamiento != null
        ? '<span class="med-receta-dia">Día ' + esc(String(it.diaTratamiento)) + "</span>"
        : "";
    return (
      '<div class="med-receta-row' +
      (autoCat === "otros" && paraNota && !it.soapCatOverride ? " med-receta-row--needs-dest" : "") +
      '">' +
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
      '<div class="med-receta-destcell">' +
      destCell +
      "</div>" +
      diaCell +
      "</div>"
    );
  });
  listEl.innerHTML =
    dietHtml +
    (rows.length
      ? '<div class="med-receta-wrap">' +
        '<div class="med-receta-head">' +
        '<span title="Excluir del texto de egreso">Excl.</span>' +
        '<span title="Incluir en Estado Actual / SOAP">SOAP</span>' +
        "<span>Medicamento</span>" +
        '<span title="Destino manual para «Otros»">Destino</span>' +
        '<span title="Día de tratamiento (DIA#)">Día</span>' +
        "</div>" +
        rows.join("") +
        "</div>"
      : "");
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
  var txtFull = buildMedRecetaCopyText(items);
  var txtSimple = buildMedRecetaNameOnlyText(items);
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
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
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
    return;
  }
  ["analgesia", "abx", "antihta", "diureticos", "antitromboticos", "vasop", "nm"].forEach(function (cat) {
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
            : cat === "diureticos"
              ? "soap-antihta"
              : cat === "antitromboticos"
                ? "soap-antitromboticos"
                : cat === "nm"
                  ? "soap-dieta"
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
  var parsed = parseIndicacionesPaste(raw || "");
  if (!parsed.items.length && !parsed.dietas.length) {
    if (!looksLikeSomeIndicacionesPaste(raw || "")) {
      rt.showToast(
        "No parece el bloque de SOME. Copia desde Fecha/hora con tabuladores (medicamentos, dietas…) y pégalo aquí.",
        "error"
      );
    } else {
      rt.showToast("No se encontraron filas MEDICAMENTOS ni DIETAS válidas", "error");
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
    dietas: parsed.dietas,
    pasteRaw: raw,
  };
  var sel = {};
  parsed.items.forEach(function (it) {
    if (shouldAutoSelectSoap(it)) sel[it.id] = true;
  });
  medNotaSelectionByPatient[activeId] = sel;

  if (isModeSala(rt.getSettings()) && parsed.dietas.length) {
    var patient = patients.find(function (p) {
      return p.id === activeId;
    });
    if (patient) {
      ensureMonitoreo(patient);
      var merged = mergeDietaItems(parsed.dietas);
      var mon = patient.monitoreo;
      if (!mon.pendienteReceta || typeof mon.pendienteReceta !== "object") {
        mon.pendienteReceta = {};
      }
      mon.pendienteReceta.dieta =
        String(merged.descripcion || "").trim() || buildDietProposalText(merged);
      if (merged.kcal != null) mon.pendienteReceta.kcal = String(merged.kcal);
      if (merged.proteinG != null) mon.pendienteReceta.proteinG = String(merged.proteinG);
    }
  }

  saveState();
  onRecetaMergedToProfile(activeId, medRecetaByPatient[activeId]);
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
  var parts = [];
  if (parsed.items.length) parts.push(parsed.items.length + " medicamento(s)");
  if (parsed.dietas.length) parts.push(parsed.dietas.length + " dieta(s)");
  var msg = "Manejo actualizado (" + parts.join(" · ") + ")";
  if (parsed.skipped > 0) {
    var sum = parsed.skippedSummary || {};
    var omit = [];
    if (sum.cuidados) omit.push(sum.cuidados + " cuidados");
    if (sum.estudios) omit.push(sum.estudios + " estudios");
    if (sum.other) omit.push(sum.other + " otras");
    msg += ". Omitidas " + parsed.skipped + " líneas" + (omit.length ? " (" + omit.join(", ") + ")" : "");
  }
  rt.showToast(msg, "success");
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

function renderMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (!foot) return;
  foot.hidden = false;

  var activeId = rt.getActiveId();
  var block = activeId ? medRecetaByPatient[activeId] : null;
  var sel = activeId ? getMedNotaSelMap(activeId) : {};
  var soapItems =
    block && block.items
      ? block.items.filter(function (it) {
          return sel[it.id] && !it.suspendido;
        })
      : [];

  var groups = {
    analgesia: [],
    antihta: [],
    diuretico: [],
    antitromboticos: [],
    abx: [],
    vasop: [],
    nm: [],
    otros: [],
  };
  soapItems.forEach(function (it) {
    var cat = effectiveSoapCategory(it, classifyMedicationSoapCategory);
    if (cat === "otros") groups.otros.push(it);
    else if (groups[cat]) groups[cat].push(it);
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
      section("antihta", "Antihipertensivos") +
      section("diuretico", "Diuréticos") +
      section("antitromboticos", "Antitrombóticos") +
      section("abx", "Antibióticos / antifúngicos") +
      section("vasop", "Vasopresores / inotrópicos") +
      section("nm", "NM (insulina, tiroides, etc.)") +
      section("otros", "Otros — elegí destino en el listado") +
      "</div>"
    : '<p class="med-soap-preview-empty">Marcá <strong>SOAP</strong> en el listado para ver aquí cómo se repartirán en la plantilla.</p>';

  var soapBtnLabel = isModeSala(rt.getSettings())
    ? "Enviar a Estado Actual"
    : "Abrir plantilla SOAP";

  foot.innerHTML =
    '<div class="med-nota-toolbar">' +
    '<p class="med-nota-hint">Los medicamentos con <strong>SOAP</strong> activo se clasifican por nombre; los marcados como <strong>Otros</strong> requieren elegir destino en la columna <strong>Destino</strong>.</p>' +
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
    foot.hidden = true;
    foot.innerHTML = "";
  }
}

export const medicationsWindowHandlers = {
  procesarRecetaMed,
  openMedRecetaPasteModal,
  closeMedRecetaPasteModal,
  limpiarRecetaInput,
  copiarMedicamentosAlPortapapeles,
  setMedOutputTab,
  toggleMedRecetaSuspendido,
  toggleMedRecetaParaNota,
  setMedRecetaSoapCategory,
  limpiarSeleccionMedNota,
  mediAnadirATratamiento,
  mediLlevarASOAP,
  incrementMedDiaTratamiento,
  ...medPharmProfileWindowHandlers,
};

export { registerMedPharmProfileRuntime };

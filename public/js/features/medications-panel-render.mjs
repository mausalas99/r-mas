import { getMedRecetaByPatient } from "../app-state.mjs";
import {
  buildMedRecetaCopyText,
  buildMedRecetaNameOnlyText,
  collectDietasFromRecetaBlock,
} from "../med-receta-core.mjs";
import { isPaseMode } from "./chrome.mjs";
import {
  getMedSubview,
  initMedPharmSubviewUi,
  renderMedPharmProfilePanel,
  closeMedPharmModals,
} from "./med-pharm-profile-panel.mjs";
import { renderPaseBoard } from "./pase-board.mjs";
import { wireMedRecetaPasteModalOnce, closeMedRecetaPasteModal } from "./medications-paste-modal.mjs";
import { restoreMedInputForPatient } from "./medications-input.mjs";
import { buildMedPanelCacheKey } from "./medications-panel-cache.mjs";
import { buildMedDietHtml, buildMedRecetaListHtml } from "./medications-panel-rows.mjs";
import { classifyMedicationSoapCategory, shouldIncludeMedicationInSoap } from "../med-receta-core.mjs";
import { renderMedNotaFooter, hideMedNotaFooter } from "./medications-soap-footer.mjs";
import {
  rt,
  medOutputTab,
  getLastMedPanelPatientId,
  setLastMedPanelPatientId,
  getMedPanelCacheKey,
  setMedPanelCacheKey,
  bustMedPanelCache,
} from "./medications-runtime-state.mjs";
import { manejoDiaOpts, setMedActiveLeadVisible, setMedDiaBtnVisible } from "./medications-utils.mjs";

function getMedPanelDom() {
  return {
    hintEl: document.getElementById("med-hint"),
    fechaEl: document.getElementById("med-fecha-actualizacion"),
    listEl: document.getElementById("med-items-list"),
    outPre: document.getElementById("med-output"),
    outCard: document.getElementById("med-output-section"),
  };
}

function renderMedPanelEmptyNoPatient(els) {
  bustMedPanelCache();
  els.hintEl.hidden = false;
  els.hintEl.textContent = "Selecciona un paciente en la columna izquierda para ver su manejo.";
  setMedActiveLeadVisible(false);
  setMedDiaBtnVisible(false);
  if (els.fechaEl) els.fechaEl.hidden = true;
  els.listEl.innerHTML = "";
  els.outPre.textContent = "";
  if (els.outCard) els.outCard.style.display = "none";
  hideMedNotaFooter();
  if (isPaseMode()) renderPaseBoard();
}

function renderMedPanelEmptyNoContent(activeId, cacheKey, els) {
  setMedPanelCacheKey(cacheKey);
  els.hintEl.hidden = false;
  els.hintEl.textContent =
    "Aún no hay medicamentos. Pulsa Importar SOME, pega el bloque del hospital y procesa la receta.";
  setMedActiveLeadVisible(false);
  setMedDiaBtnVisible(false);
  if (els.fechaEl) els.fechaEl.hidden = true;
  els.listEl.innerHTML = "";
  els.outPre.textContent = "";
  if (els.outCard) els.outCard.style.display = "none";
  hideMedNotaFooter();
  if (isPaseMode()) renderPaseBoard();
}

function syncMedOutputTabChrome(outPre, outCard, block) {
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
  var items = block.items || [];
  var diaOpts = manejoDiaOpts(block.fechaActualizacion);
  var txtFull = buildMedRecetaCopyText(items, diaOpts);
  var txtSimple = buildMedRecetaNameOnlyText(items, diaOpts);
  var txt = medOutputTab === "simple" ? txtSimple : txtFull;
  outPre.textContent = txt;
  if (outCard) outCard.style.display = txt.trim() ? "block" : "none";
}

function renderMedPanelRecetaContent(activeId, block, cacheKey, els) {
  setMedPanelCacheKey(cacheKey);
  els.hintEl.hidden = true;
  setMedActiveLeadVisible(true);
  setMedDiaBtnVisible(true);
  if (els.fechaEl) {
    els.fechaEl.hidden = false;
    var fechaTxt = block.fechaActualizacion || "—";
    els.fechaEl.textContent = fechaTxt;
    els.fechaEl.title = "Última importación SOME: " + fechaTxt;
  }
  els.listEl.innerHTML =
    buildMedDietHtml(collectDietasFromRecetaBlock(block)) + buildMedRecetaListHtml(activeId, block);
  renderMedNotaFooter();
  syncMedOutputTabChrome(els.outPre, els.outCard, block);
  if (isPaseMode()) renderPaseBoard();
}

function handleMedPanelPatientChange(activeId) {
  if (activeId === getLastMedPanelPatientId()) return;
  setLastMedPanelPatientId(activeId);
  bustMedPanelCache();
  closeMedPharmModals();
  closeMedRecetaPasteModal();
}

function medListNeedsDestDropdownRefresh(listEl, block) {
  if (!listEl || !listEl.querySelector(".med-receta-wrap")) return false;
  var items = block && Array.isArray(block.items) ? block.items : [];
  var rows = listEl.querySelectorAll(".med-receta-row[data-med-item-id]");
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (
      row.classList.contains("med-receta-row--insulin-rescate") ||
      row.classList.contains("med-receta-row--insulin-prandial")
    ) {
      continue;
    }
    var id = row.getAttribute("data-med-item-id");
    var it = items.find(function (x) {
      return String(x.id) === String(id);
    });
    if (!it || !shouldIncludeMedicationInSoap(it, classifyMedicationSoapCategory)) continue;
    if (!row.querySelector(".med-receta-dest-picker")) return true;
  }
  return false;
}

function shouldSkipMedPanelCacheHit(activeId, cacheKey, els) {
  if (!activeId || getMedPanelCacheKey() !== cacheKey) return false;
  var cachedBlock = getMedRecetaByPatient()[activeId];
  if (medListNeedsDestDropdownRefresh(els.listEl, cachedBlock)) return false;
  if (els.listEl.querySelector(".med-receta-wrap")) return true;
  return (!cachedBlock || !cachedBlock.items || !cachedBlock.items.length) && !els.hintEl.hidden;
}

function renderMedPanelForActivePatient(activeId, cacheKey, els) {
  restoreMedInputForPatient(activeId);
  var block = getMedRecetaByPatient()[activeId];
  var hasRecetaContent =
    block && ((block.items && block.items.length) || (block.dietas && block.dietas.length));
  if (!hasRecetaContent) {
    renderMedPanelEmptyNoContent(activeId, cacheKey, els);
    return;
  }
  if (
    getMedPanelCacheKey() === cacheKey &&
    els.listEl.querySelector(".med-receta-wrap") &&
    !medListNeedsDestDropdownRefresh(els.listEl, block)
  ) {
    return;
  }
  renderMedPanelRecetaContent(activeId, block, cacheKey, els);
}

function bustMedPanelCacheIfLegacyDestUi(listEl) {
  if (!listEl || !listEl.querySelector(".med-receta-wrap")) return;
  if (listEl.querySelector(".med-receta-dest-picker")) return;
  if (listEl.querySelector(".med-receta-destcell")) bustMedPanelCache();
}

export function renderMedRecetaPanel() {
  initMedPharmSubviewUi();
  wireMedRecetaPasteModalOnce();
  var activeId = rt.getActiveId();
  handleMedPanelPatientChange(activeId);
  if (getMedSubview() === "perfil") {
    bustMedPanelCache();
    renderMedPharmProfilePanel();
    return;
  }
  var els = getMedPanelDom();
  if (!els.hintEl || !els.listEl || !els.outPre) return;
  bustMedPanelCacheIfLegacyDestUi(els.listEl);
  var cacheKey = buildMedPanelCacheKey(activeId);
  if (shouldSkipMedPanelCacheHit(activeId, cacheKey, els)) return;
  if (!activeId) {
    renderMedPanelEmptyNoPatient(els);
    return;
  }
  renderMedPanelForActivePatient(activeId, cacheKey, els);
}

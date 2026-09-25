import { getMedRecetaByPatient } from "../app-state.mjs";
import { collectDietasFromRecetaBlock } from "../med-receta-core.mjs";
import {
  getMedSubview,
  initMedPharmSubviewUi,
  renderMedPharmProfilePanel,
  closeMedPharmModals,
} from "./med-pharm-profile-panel.mjs";
import { wireMedRecetaPasteModalOnce, closeMedRecetaPasteModal } from "./medications-paste-modal.mjs";
import { restoreMedInputForPatient } from "./medications-input.mjs";
import { buildMedPanelCacheKey } from "./medications-panel-cache.mjs";
import {
  buildMedDietHtml,
  buildMedRecetaListHtml,
  countMedTurnoItems,
  buildMedTurnoHeaderText,
} from "./medications-panel-rows.mjs";
import { classifyMedicationSoapCategory, shouldIncludeMedicationInSoap } from "../med-receta-core.mjs";
import { renderMedNotaFooter, hideMedNotaFooter } from "./medications-soap-footer.mjs";
import { buildMedEgresoPreviewLine } from "./medications-egreso-text.mjs";
import {
  rt,
  getLastMedPanelPatientId,
  setLastMedPanelPatientId,
  getMedPanelCacheKey,
  setMedPanelCacheKey,
  bustMedPanelCache,
} from "./medications-runtime-state.mjs";
import { setMedActiveLeadVisible } from "./medications-utils.mjs";

function getMedPanelDom() {
  return {
    hintEl: document.getElementById("med-hint"),
    fechaEl: document.getElementById("med-fecha-actualizacion"),
    listEl: document.getElementById("med-items-list"),
    previewEl: document.getElementById("med-egreso-preview"),
    outCard: document.getElementById("med-output-section"),
    turnoTitleEl: document.getElementById("med-turno-title-text"),
    turnoApoyoEl: document.getElementById("med-turno-apoyo"),
  };
}

var MED_TURNO_TITLE_DEFAULT = "Medicamentos del turno";

function resetMedTurnoHeader(els) {
  if (els.turnoTitleEl) els.turnoTitleEl.textContent = MED_TURNO_TITLE_DEFAULT;
  if (els.turnoApoyoEl) {
    els.turnoApoyoEl.hidden = true;
    els.turnoApoyoEl.textContent = "";
  }
}

function syncMedTurnoHeader(els, items) {
  if (!els.turnoTitleEl) return;
  var header = buildMedTurnoHeaderText(countMedTurnoItems(items));
  els.turnoTitleEl.textContent = header.title;
  if (els.turnoApoyoEl) {
    if (header.secondary) {
      els.turnoApoyoEl.textContent = header.secondary;
      els.turnoApoyoEl.hidden = false;
    } else {
      els.turnoApoyoEl.textContent = "";
      els.turnoApoyoEl.hidden = true;
    }
  }
}

function renderMedPanelEmptyNoPatient(els) {
  bustMedPanelCache();
  resetMedTurnoHeader(els);
  els.hintEl.hidden = false;
  els.hintEl.textContent = "Selecciona un paciente en la columna izquierda para ver su manejo.";
  setMedActiveLeadVisible(false);
  if (els.fechaEl) els.fechaEl.hidden = true;
  els.listEl.innerHTML = "";
  if (els.previewEl) els.previewEl.textContent = "";
  if (els.outCard) els.outCard.style.display = "none";
  hideMedNotaFooter();
}

function renderMedPanelEmptyNoContent(activeId, cacheKey, els) {
  setMedPanelCacheKey(cacheKey);
  resetMedTurnoHeader(els);
  els.hintEl.hidden = false;
  els.hintEl.textContent =
    "Aún no hay medicamentos. Pulsa Importar SOME, pega el bloque del hospital y procesa la receta.";
  setMedActiveLeadVisible(false);
  if (els.fechaEl) els.fechaEl.hidden = true;
  els.listEl.innerHTML = "";
  if (els.previewEl) els.previewEl.textContent = "";
  if (els.outCard) els.outCard.style.display = "none";
  hideMedNotaFooter();
}

function syncMedEgresoTeaser(previewEl, outCard, block) {
  var preview = buildMedEgresoPreviewLine(block);
  if (previewEl) previewEl.textContent = preview;
  if (outCard) outCard.style.display = preview.trim() ? "flex" : "none";
}

function renderMedPanelRecetaContent(activeId, block, cacheKey, els) {
  setMedPanelCacheKey(cacheKey);
  syncMedTurnoHeader(els, block.items);
  els.hintEl.hidden = true;
  setMedActiveLeadVisible(true);
  if (els.fechaEl) {
    els.fechaEl.hidden = false;
    var fechaTxt = block.fechaActualizacion || "—";
    els.fechaEl.textContent = fechaTxt;
    els.fechaEl.title = "Última importación SOME: " + fechaTxt;
  }
  els.listEl.innerHTML =
    buildMedDietHtml(collectDietasFromRecetaBlock(block)) + buildMedRecetaListHtml(activeId, block);
  renderMedNotaFooter();
  syncMedEgresoTeaser(els.previewEl, els.outCard, block);
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
  if (!els.hintEl || !els.listEl) return;
  bustMedPanelCacheIfLegacyDestUi(els.listEl);
  var cacheKey = buildMedPanelCacheKey(activeId);
  if (shouldSkipMedPanelCacheHit(activeId, cacheKey, els)) return;
  if (!activeId) {
    renderMedPanelEmptyNoPatient(els);
    return;
  }
  renderMedPanelForActivePatient(activeId, cacheKey, els);
}

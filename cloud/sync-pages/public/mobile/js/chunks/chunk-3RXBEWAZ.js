import {
  openDialog
} from "/mobile/js/chunks/chunk-XS64SPAO.js";
import {
  dedupeConsolidatedLabRows
} from "/mobile/js/chunks/chunk-JIKZNXZR.js";
import {
  openPatientDatosModal
} from "/mobile/js/chunks/chunk-4QI24DFU.js";
import {
  partitionNmMedLines
} from "/mobile/js/chunks/chunk-3PL7T3ZN.js";
import {
  isGlucometriaMarkedAltered,
  isVitalAltered
} from "/mobile/js/chunks/chunk-AKP3FGXS.js";
import {
  dayKeyFromLabSet,
  splitResLabsByTipo
} from "/mobile/js/chunks/chunk-7FIP2ETS.js";
import {
  getLabHistory,
  getMedRecetaByPatient,
  getPatients,
  persistClinicalState,
  resolveEventualidadEntryText,
  scheduleAfterPaintThenIdle,
  sortEntriesDesc
} from "/mobile/js/chunks/chunk-NC6VRD7M.js";
import {
  storage
} from "/mobile/js/chunks/chunk-5RUR3UQW.js";
import {
  MED_FIELD_KEYS,
  TREND_REFRESH_DEBOUNCE_MS,
  bucketsFromRecetaItems,
  buildMedDropdownOptions,
  classifyMedicationSoapCategory,
  deriveSnapshot,
  ensureAbxDiaAnchorDate,
  ensureMonitoreo,
  mapSoapDestKeyToEaField,
  normalizeHoraLabHistory,
  onLabHistoryRevision,
  resolveEaAbxFechaActualizacion,
  rewriteAbxDisplayText,
  soapDestinationSelectOptionsHtml
} from "/mobile/js/chunks/chunk-HDD2EUC6.js";
import {
  escAttr,
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/features/estado-actual-med-grid-click.mjs
function handleMedRemoveClick(ev, target, grid, mount, ctx, monitoreo, refreshBlock) {
  const removeBtn = target.closest("[data-ea-med-remove]");
  if (!removeBtn) return false;
  ev.preventDefault();
  ev.stopPropagation();
  const rKey = removeBtn.getAttribute("data-ea-med-remove");
  const idx = Number(removeBtn.getAttribute("data-ea-med-idx"));
  if (rKey && Number.isFinite(idx)) {
    removeMedFieldItem(monitoreo, rKey, idx);
    ctx.persistClinicalState();
    ctx.syncTextarea();
    refreshBlock(mount, rKey, monitoreo);
  }
  return true;
}
function handleMedToggleClick(target, grid) {
  const toggleBtn = target.closest("[data-ea-med-manual-toggle]");
  if (!toggleBtn) return false;
  const tKey = toggleBtn.getAttribute("data-ea-med-manual-toggle");
  if (!tKey) return true;
  const panel = grid.querySelector('[data-ea-med-manual-panel="' + tKey + '"]');
  if (!panel) return true;
  panel.hidden = !panel.hidden;
  if (!panel.hidden) {
    const input = panel.querySelector('[data-ea-med-manual-input="' + tKey + '"]');
    if (input && "focus" in input) input.focus();
  }
  return true;
}
function handleMedSaveClick(target, grid, mount, ctx, monitoreo, refreshBlock) {
  const saveBtn = target.closest("[data-ea-med-manual-save]");
  if (!saveBtn) return false;
  const sKey = saveBtn.getAttribute("data-ea-med-manual-save");
  if (!sKey) return true;
  const sPanel = grid.querySelector('[data-ea-med-manual-panel="' + sKey + '"]');
  const sInput = sPanel && sPanel.querySelector('[data-ea-med-manual-input="' + sKey + '"]');
  const text = sInput && "value" in sInput ? String(sInput.value).trim() : "";
  if (text) {
    addMedFieldItem(monitoreo, sKey, text, {
      activeId: ctx.getActiveId(),
      medRecetaByPatient: ctx.medRecetaByPatient
    });
    if (sInput && "value" in sInput) sInput.value = "";
    if (sPanel) sPanel.hidden = true;
    ctx.persistClinicalState();
    ctx.syncTextarea();
    refreshBlock(mount, sKey, monitoreo);
  }
  return true;
}
function handleMedCancelClick(target, grid) {
  const cancelBtn = target.closest("[data-ea-med-manual-cancel]");
  if (!cancelBtn) return false;
  const cKey = cancelBtn.getAttribute("data-ea-med-manual-cancel");
  if (!cKey) return true;
  const cPanel = grid.querySelector('[data-ea-med-manual-panel="' + cKey + '"]');
  const cInput = cPanel && cPanel.querySelector('[data-ea-med-manual-input="' + cKey + '"]');
  if (cInput && "value" in cInput) cInput.value = "";
  if (cPanel) cPanel.hidden = true;
  return true;
}
function handleMedGridClick(ev, grid, mount, ctx, liveMonitoreoFromCtx2, refreshBlock) {
  const target = (
    /** @type {HTMLElement | null} */
    ev.target
  );
  if (!target || !grid.contains(target)) return false;
  const monitoreo = liveMonitoreoFromCtx2(ctx);
  if (handleMedRemoveClick(ev, target, grid, mount, ctx, monitoreo, refreshBlock)) return true;
  if (handleMedToggleClick(target, grid)) return true;
  if (handleMedSaveClick(target, grid, mount, ctx, monitoreo, refreshBlock)) return true;
  if (handleMedCancelClick(target, grid)) return true;
  return false;
}

// public/js/features/estado-actual-med-ui.mjs
var EA_MED_FIELD_LABELS = {
  analgesia: "Analg\xE9sicos / antipir\xE9ticos",
  antiemeticos: "Antiem\xE9ticos",
  sedacion: "Sedaci\xF3n / delirium",
  antiepilepticos: "Antiepil\xE9pticos",
  antiparkinsonianos: "Antiparkinsonianos",
  antidotos: "Ant\xEDdotos",
  viaAerea: "V\xEDa a\xE9rea",
  abx: "Antibi\xF3ticos",
  transfusiones: "Transfusiones",
  antihta: "Antihipertensivos",
  diureticos: "Diur\xE9ticos",
  antitromboticos: "Tromboprofilaxis",
  anticoagulacion: "Anticoagulaci\xF3n",
  antiarritmicos: "Antiarr\xEDtmicos",
  estatinas: "Estatinas",
  vasop: "Vasopresores",
  nm: "NM (soporte, cr\xF3nicos, etc.)"
};
function parseMedFieldItems(raw) {
  if (raw == null || !String(raw).trim()) return [];
  return String(raw).split(" | ").map(function(s) {
    return s.trim();
  }).filter(Boolean);
}
function serializeMedFieldItems(items) {
  return (items || []).map(function(s) {
    return String(s).trim();
  }).filter(Boolean).join(" | ");
}
function addMedFieldItem(monitoreo, key, text, ctx) {
  if (!monitoreo || !key || !text || !String(text).trim()) return;
  if (!monitoreo.estadoClinico || typeof monitoreo.estadoClinico !== "object") {
    monitoreo.estadoClinico = {};
  }
  var items = parseMedFieldItems(
    /** @type {Record<string, unknown>} */
    monitoreo.estadoClinico[key]
  );
  var next = String(text).trim();
  if (items.indexOf(next) === -1) items.push(next);
  monitoreo.estadoClinico[key] = serializeMedFieldItems(items);
  if (!monitoreo.confirmado || typeof monitoreo.confirmado !== "object") monitoreo.confirmado = {};
  monitoreo.confirmado[key] = true;
  if (key === "abx") {
    ensureAbxDiaAnchorDate(monitoreo, ctx && ctx.activeId, ctx && ctx.medRecetaByPatient);
  }
  if (monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === "object") {
    monitoreo.pendienteReceta[key] = "";
  }
}
function removeMedFieldItem(monitoreo, key, index) {
  if (!monitoreo || !monitoreo.estadoClinico) return;
  var items = parseMedFieldItems(monitoreo.estadoClinico[key]);
  if (index < 0 || index >= items.length) return;
  items.splice(index, 1);
  monitoreo.estadoClinico[key] = serializeMedFieldItems(items);
  if (!monitoreo.confirmado) monitoreo.confirmado = {};
  monitoreo.confirmado[key] = items.length > 0;
}
function medCatPreviewText(items) {
  if (!items.length) return "";
  var first = items[0];
  var short = first.length > 52 ? first.slice(0, 49) + "\u2026" : first;
  if (items.length === 1) return short;
  return short + " (+" + (items.length - 1) + ")";
}
function displayAbxLine(text, activeId, medRecetaByPatient, monitoreo, refDate) {
  var fecha = resolveEaAbxFechaActualizacion(activeId, medRecetaByPatient, monitoreo);
  var block = activeId && medRecetaByPatient ? medRecetaByPatient[activeId] : null;
  return rewriteAbxDisplayText(text, fecha, block && block.items, refDate);
}
function prepareMedBlockData(key, monitoreo, activeId, medRecetaByPatient, refDate) {
  var ec = monitoreo.estadoClinico || {};
  var pend = monitoreo.pendienteReceta || {};
  var items = parseMedFieldItems(ec[key]);
  var pendingVal = pend[key] != null ? String(pend[key]).trim() : "";
  if (key === "abx") {
    items = items.map(function(line) {
      return displayAbxLine(line, activeId, medRecetaByPatient, monitoreo, refDate);
    });
    if (pendingVal) {
      pendingVal = displayAbxLine(pendingVal, activeId, medRecetaByPatient, monitoreo, refDate);
    }
  }
  return { items, pendingVal };
}
function medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient, refDate) {
  var block = prepareMedBlockData(key, monitoreo, activeId, medRecetaByPatient, refDate);
  return block.items.length > 0 || block.pendingVal.length > 0;
}
function medCategoryBadgeHtml(pendingVal, monitoreo, key, items) {
  if (pendingVal) return '<span class="ea-pendiente-badge">Propuesta</span>';
  if (monitoreo.confirmado && monitoreo.confirmado[key] && items.length) {
    return '<span class="ea-confirmed-badge">Confirmado</span>';
  }
  return "";
}
function medSelectOptionsHtml(key, options) {
  return '<option value="">+ Desde receta\u2026</option>' + options.map(function(opt) {
    return '<option value="' + escAttr(opt.value) + '">' + escHtml(opt.label) + "</option>";
  }).join("");
}
function medItemRowHtml(item, key, idx) {
  return '<div class="ea-med-item"><div class="ea-med-item-row"><span class="ea-med-item-text">' + escHtml(item) + '</span><button type="button" class="ea-btn ea-btn--icon ea-med-item-remove" data-ea-med-remove="' + escAttr(key) + '" data-ea-med-idx="' + idx + '" aria-label="Quitar medicamento">\xD7</button></div></div>';
}
function medItemsListHtml(items, key) {
  return items.map(function(item, idx) {
    return medItemRowHtml(item, key, idx);
  }).join("");
}
function medItemsListHtmlWithIndices(items, key, indices) {
  return items.map(function(item, displayIdx) {
    return medItemRowHtml(item, key, indices[displayIdx]);
  }).join("");
}
function renderNmAntidiabeticSubsectionHtml(key, items) {
  var part = partitionNmMedLines(items);
  if (!part.antidiabeticos.length) return "";
  var itemsHtml = medItemsListHtmlWithIndices(part.antidiabeticos, key, part.antidiabeticIndices);
  return '<details class="ea-med-subcat ea-med-subcat--antidiabeticos" open><summary class="ea-med-subcat-summary"><span class="ea-med-subcat-title">Antidiab\xE9ticos</span><span class="ea-med-subcat-preview ea-muted">' + escHtml(medCatPreviewText(part.antidiabeticos)) + '</span></summary><div class="ea-med-subcat-body"><div class="ea-med-item-list">' + itemsHtml + "</div></div></details>";
}
function renderNmMedItemsBodyHtml(key, items) {
  var part = partitionNmMedLines(items);
  var antidiabeticHtml = renderNmAntidiabeticSubsectionHtml(key, items);
  var otherHtml = part.other.length ? '<div class="ea-med-item-list">' + medItemsListHtmlWithIndices(part.other, key, part.otherIndices) + "</div>" : "";
  return antidiabeticHtml + otherHtml;
}
function medMoveTargetOptionsHtml(fromKey) {
  return soapDestinationSelectOptionsHtml(escHtml, {
    omitEmpty: true,
    excludeKey: fromKey,
    mapKey: mapSoapDestKeyToEaField,
    labels: EA_MED_FIELD_LABELS
  });
}
function medPendingBlockHtml(key, pendingVal) {
  if (!pendingVal) return "";
  return '<div class="ea-med-pending"><div class="ea-pendiente-preview" title="Propuesta pendiente">' + escHtml(pendingVal) + `</div><div class="ea-clinico-med-actions"><button type="button" class="ea-btn ea-btn--success" onclick="confirmEaMedField('` + key + `')">Confirmar</button><button type="button" class="ea-btn ea-btn--ghost" onclick="discardEaMedProposal('` + key + `')">Descartar</button><button type="button" class="ea-btn ea-btn--ghost" onclick="toggleEaMedReclassifyPanel('` + key + `')" title="Corregir clasificaci\xF3n SOAP del medicamento">Reclasificar categor\xEDa</button></div><div class="ea-med-reclassify-panel" hidden data-ea-med-reclassify-panel="` + escAttr(key) + '"><span class="ea-med-reclassify-label">Categor\xEDa destino (SOAP)</span><div class="ea-med-reclassify-controls"><select class="ea-input ea-med-reclassify-select" data-ea-med-reclassify-select="' + escAttr(key) + '"><option value="">Seleccionar categor\xEDa\u2026</option>' + medMoveTargetOptionsHtml(key) + `</select><button type="button" class="ea-btn ea-btn--ghost" onclick="applyEaMedReclassification('` + key + `')">Aplicar reclasificaci\xF3n</button></div></div></div>`;
}
function medManualPanelHtml(key) {
  return '<div class="ea-med-manual-panel" hidden data-ea-med-manual-panel="' + escAttr(key) + '"><input type="text" class="ea-input" data-ea-med-manual-input="' + escAttr(key) + '" placeholder="Indicaci\xF3n manual"><div class="ea-med-manual-actions"><button type="button" class="ea-btn ea-btn--success" data-ea-med-manual-save="' + escAttr(key) + '">A\xF1adir</button><button type="button" class="ea-btn ea-btn--ghost" data-ea-med-manual-cancel="' + escAttr(key) + '">Cancelar</button></div></div>';
}
function renderMedCategoryPickOptions(keys) {
  if (!keys.length) {
    return '<option value="">Todas las categor\xEDas visibles</option>';
  }
  return '<option value="">Tipo de medicamento\u2026</option>' + soapDestinationSelectOptionsHtml(escHtml, {
    omitEmpty: true,
    includeKeys: keys,
    mapKey: mapSoapDestKeyToEaField,
    labels: EA_MED_FIELD_LABELS
  });
}
function renderMedCategoryAddBar(hiddenKeys) {
  var disabled = hiddenKeys.length === 0;
  return '<div class="ea-med-add-category-row"><span class="ea-med-add-category-label">A\xF1adir medicamento</span><div class="ea-med-add-category-controls"><select class="ea-input ea-med-pick-category" data-ea-med-pick-category"' + (disabled ? " disabled" : "") + ">" + renderMedCategoryPickOptions(hiddenKeys) + '</select><button type="button" class="ea-btn ea-btn--ghost ea-med-reveal-category" data-ea-med-reveal-category' + (disabled ? " disabled" : "") + ">+ A\xF1adir categor\xEDa</button></div></div>";
}
function parseRevealedMedKeys(grid) {
  if (!grid) return [];
  var raw = grid.getAttribute("data-ea-med-revealed");
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}
function getShownMedCategoryKeys(grid) {
  if (!grid) return [];
  return Array.prototype.map.call(grid.querySelectorAll("[data-ea-med-cat]"), function(el) {
    return el.getAttribute("data-ea-med-cat");
  }).filter(Boolean);
}
function syncMedCategoryAddBar(grid) {
  if (!grid) return;
  var addBar = grid.querySelector(".ea-med-add-category-row");
  if (!addBar) return;
  var shown = getShownMedCategoryKeys(grid);
  var hidden = MED_FIELD_KEYS.filter(function(key) {
    return shown.indexOf(key) < 0;
  });
  var select = addBar.querySelector("[data-ea-med-pick-category]");
  var btn = addBar.querySelector("[data-ea-med-reveal-category]");
  if (select) {
    select.innerHTML = renderMedCategoryPickOptions(hidden);
    select.disabled = hidden.length === 0;
    select.value = "";
  }
  if (btn) btn.disabled = hidden.length === 0;
}
function revealMedCategoryKey(mount, grid, key, ctx) {
  if (!grid || !key) return;
  var revealed = parseRevealedMedKeys(grid);
  if (revealed.indexOf(key) < 0) revealed.push(key);
  grid.setAttribute("data-ea-med-revealed", JSON.stringify(revealed));
  var monitoreo = liveMonitoreoFromCtx(ctx);
  if (!grid.querySelector('[data-ea-med-cat="' + key + '"]')) {
    var addBar = grid.querySelector(".ea-med-add-category-row");
    var html = renderMedCategoryBlock(key, monitoreo, ctx.getActiveId(), ctx.medRecetaByPatient, { forceOpen: true });
    if (addBar) addBar.insertAdjacentHTML("beforebegin", html);
    else grid.insertAdjacentHTML("beforeend", html);
  }
  var det = grid.querySelector('[data-ea-med-cat="' + key + '"]');
  if (det && "open" in det) det.open = true;
  syncMedCategoryAddBar(grid);
}
function renderMedCategoryBlock(key, monitoreo, activeId, medRecetaByPatient, opts) {
  opts = opts || {};
  var refDate = opts.refDate;
  var block = prepareMedBlockData(key, monitoreo, activeId, medRecetaByPatient, refDate);
  var items = block.items;
  var pendingVal = block.pendingVal;
  var label = EA_MED_FIELD_LABELS[key] || key;
  var options = buildMedDropdownOptions(
    activeId,
    key,
    medRecetaByPatient,
    classifyMedicationSoapCategory,
    refDate
  );
  var itemsHtml = key === "nm" ? renderNmMedItemsBodyHtml(key, items) : medItemsListHtml(items, key);
  var openAttr = items.length || pendingVal || opts.forceOpen ? " open" : "";
  var previewText = medCatPreviewText(items);
  return '<details class="ea-med-cat" data-ea-med-cat="' + escAttr(key) + '"' + openAttr + '><summary class="ea-med-cat-summary"><span class="ea-med-cat-title">' + escHtml(label) + "</span>" + (previewText ? '<span class="ea-med-cat-preview ea-muted">' + escHtml(previewText) + "</span>" : "") + medCategoryBadgeHtml(pendingVal, monitoreo, key, items) + '</summary><div class="ea-med-cat-body">' + medPendingBlockHtml(key, pendingVal) + (itemsHtml ? key === "nm" ? itemsHtml : '<div class="ea-med-item-list">' + itemsHtml + "</div>" : "") + '<div class="ea-med-add-row"><select class="ea-input ea-med-add-select" data-ea-med-add-select="' + escAttr(key) + '">' + medSelectOptionsHtml(key, options) + '</select><button type="button" class="ea-btn ea-btn--ghost ea-med-manual-toggle" data-ea-med-manual-toggle="' + escAttr(key) + '">+ Manual</button></div>' + medManualPanelHtml(key) + "</div></details>";
}
function renderMedCategoryGrid(monitoreo, activeId, medRecetaByPatient, revealedKeys, refDate) {
  revealedKeys = Array.isArray(revealedKeys) ? revealedKeys : [];
  var shownKeys = MED_FIELD_KEYS.filter(function(key) {
    return medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient, refDate) || revealedKeys.indexOf(key) >= 0;
  });
  var blocks = shownKeys.map(function(key) {
    var forceOpen = revealedKeys.indexOf(key) >= 0 && !medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient, refDate);
    return renderMedCategoryBlock(key, monitoreo, activeId, medRecetaByPatient, {
      forceOpen,
      refDate
    });
  }).join("");
  var hiddenKeys = MED_FIELD_KEYS.filter(function(key) {
    return shownKeys.indexOf(key) < 0;
  });
  return '<div class="ea-clinico-med-grid" data-ea-med-revealed="' + escAttr(JSON.stringify(revealedKeys)) + '">' + blocks + renderMedCategoryAddBar(hiddenKeys) + "</div>";
}
function refreshMedCategoryBlock(mount, key, monitoreo, activeId, medRecetaByPatient) {
  if (!mount || !key) return;
  var grid = mount.querySelector(".ea-clinico-med-grid");
  if (!grid) return;
  var existing = grid.querySelector('[data-ea-med-cat="' + key + '"]');
  var hasContent = medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient);
  var revealed = parseRevealedMedKeys(grid);
  var isRevealed = revealed.indexOf(key) >= 0;
  if (!hasContent && !isRevealed) {
    if (existing) existing.remove();
    syncMedCategoryAddBar(grid);
    return;
  }
  var html = renderMedCategoryBlock(key, monitoreo, activeId, medRecetaByPatient, {
    forceOpen: isRevealed && !hasContent
  });
  if (existing) {
    var wasOpen = existing.open;
    existing.outerHTML = html;
    var next = grid.querySelector('[data-ea-med-cat="' + key + '"]');
    if (next && (wasOpen || hasContent || isRevealed)) next.open = true;
  }
  syncMedCategoryAddBar(grid);
}
function liveMonitoreoFromCtx(ctx) {
  if (ctx.patient) {
    ensureMonitoreo(ctx.patient);
    return (
      /** @type {Record<string, unknown>} */
      ctx.patient.monitoreo
    );
  }
  return ctx.monitoreo || {};
}
function wireMedCategoryGrid(mount, ctx) {
  if (!mount) return;
  var grid = mount.querySelector(".ea-clinico-med-grid");
  if (!grid || grid.dataset.eaMedGridWired === "1") return;
  grid.dataset.eaMedGridWired = "1";
  grid.addEventListener("change", function(ev) {
    var target = (
      /** @type {HTMLElement | null} */
      ev.target
    );
    if (!target) return;
    var addKey = target.getAttribute("data-ea-med-add-select");
    if (!addKey || !("value" in target) || !/** @type {HTMLSelectElement} */
    target.value) return;
    var val = String(
      /** @type {HTMLSelectElement} */
      target.value
    );
    var monitoreo = liveMonitoreoFromCtx(ctx);
    addMedFieldItem(monitoreo, addKey, val, {
      activeId: ctx.getActiveId(),
      medRecetaByPatient: ctx.medRecetaByPatient
    });
    target.value = "";
    ctx.persistClinicalState();
    ctx.syncTextarea();
    refreshMedCategoryBlock(mount, addKey, monitoreo, ctx.getActiveId(), ctx.medRecetaByPatient);
  });
  grid.addEventListener("click", function(ev) {
    var target = (
      /** @type {HTMLElement | null} */
      ev.target
    );
    if (!target || !grid.contains(target)) return;
    if (target.closest("[data-ea-med-reveal-category]")) {
      ev.preventDefault();
      var pick = grid.querySelector("[data-ea-med-pick-category]");
      if (!pick || !("value" in pick) || !/** @type {HTMLSelectElement} */
      pick.value) return;
      var category = String(
        /** @type {HTMLSelectElement} */
        pick.value
      );
      revealMedCategoryKey(mount, grid, category, ctx);
      pick.value = "";
      return;
    }
    handleMedGridClick(ev, grid, mount, ctx, liveMonitoreoFromCtx, function(blockMount, key, monitoreo) {
      refreshMedCategoryBlock(blockMount, key, monitoreo, ctx.getActiveId(), ctx.medRecetaByPatient);
    });
  });
}

// public/js/features/patient-dashboard/ea-glance-model.mjs
var SOAP_ZONES = [
  {
    letter: "N",
    subtitle: "Neuro",
    keys: ["analgesia", "antiemeticos", "sedacion", "antiepilepticos", "antiparkinsonianos", "antidotos"]
  },
  { letter: "V", subtitle: "V\xEDa a\xE9rea", keys: ["viaAerea"] },
  {
    letter: "HD",
    subtitle: "Hemo",
    keys: [
      "vasop",
      "antihta",
      "antitromboticos",
      "anticoagulacion",
      "antiarritmicos",
      "diureticos",
      "diuretico",
      "estatinas"
    ]
  },
  { letter: "HI", subtitle: "Infeccioso", keys: ["abx", "transfusiones"] },
  { letter: "NM", subtitle: "Soporte", keys: ["nm"] }
];
var SOAP_COL_LETTERS = [
  ["N", "V"],
  ["HD"],
  ["HI", "NM"]
];
var KEEP_CAPS_RE = /^(ASA|AAS|NPH|NPT|NM|UTI|ORL|VO|IV|IM|SC|BH|QS|LCR|KCL)$/i;
function hasText(value) {
  return value != null && String(value).trim() !== "";
}
function buildSoporteValue(soporte, soporteLitros) {
  const base = String(soporte).trim();
  if (hasText(soporteLitros)) {
    return `${base} ${String(soporteLitros).trim()} L`;
  }
  return base;
}
var DOSE_CUT_RE = /\s+\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:MCG|MG|G|ML|UI|U|MEQ)(?:\/H)?\b/i;
var VIA_CUT_RE = /\s+\b(?:VO|IV|IM|SC|SL|NEB|INH|EV|C\/\d|CADA|DIA|DÍA|EN CASO|PRN|SOS)\b/i;
var FORM_WORD = "(?:SOLUCI[O\xD3]N(?:ES)?|SUSPENSI[O\xD3]N(?:ES)?|TABLETAS?|COMPRIMIDOS?|C[A\xC1]PSULAS?|AMPOLLETAS?|INYECTABLE|SOBRES?)";
var GLUED_COUNT_FORM_RE = new RegExp("\\s+\\d+(?:[.,]\\d+)?" + FORM_WORD + "\\b.*$", "i");
var COUNT_FORM_RE = new RegExp("\\s+\\d+(?:[.,]\\d+)?\\s+" + FORM_WORD + "\\b.*$", "i");
var FORM_CUT_RE = new RegExp("\\s+" + FORM_WORD + "\\b.*$", "i");
var PARTICLE_RE = /^(de|del|la|el|los|las|en|y|o|u|a)$/i;
function prettyMedWord(word) {
  if (!word) return "";
  if (PARTICLE_RE.test(word)) return word.toLowerCase();
  if (KEEP_CAPS_RE.test(word)) return word.toUpperCase();
  if (/[a-z]/.test(word) && /[A-Z]/.test(word) && word.length > 3) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
function prettyPhrase(raw) {
  return String(raw || "").split(/([-\s/]+)/).map((tok) => /^[-\s/]+$/.test(tok) ? tok : prettyMedWord(tok)).join("").replace(/\s+/g, " ").trim();
}
function aliasHypertonicNacl(raw) {
  const s = String(raw || "");
  if (!/cloruro\s+de\s+sodio|\bnacl\b/i.test(s)) return "";
  if (!/hipert|17\s*[.,]?\s*7\s*%/i.test(s)) return "";
  return "Hiperton";
}
function glanceMedName(raw) {
  let s = String(raw || "").replace(/\s+\/\/.*$/, "").trim();
  if (!s) return "";
  const nacl = aliasHypertonicNacl(s);
  if (nacl) return nacl;
  if (s.includes(":")) s = s.slice(0, s.indexOf(":")).trim() || s;
  const doseAt = s.search(DOSE_CUT_RE);
  if (doseAt > 0) s = s.slice(0, doseAt);
  const viaAt = s.search(VIA_CUT_RE);
  if (viaAt > 0) s = s.slice(0, viaAt);
  s = s.replace(GLUED_COUNT_FORM_RE, "").trim() || s;
  s = s.replace(COUNT_FORM_RE, "").trim() || s;
  s = s.replace(FORM_CUT_RE, "").trim() || s;
  return prettyPhrase(s);
}
function glanceMedItem(raw) {
  const name = glanceMedName(raw);
  if (!name) return null;
  return { name, token: "", emphasis: false };
}
function dedupeItems(items) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  (items || []).forEach((item) => {
    if (!item || !item.name) return;
    const key = item.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}
var BASAL_INSULIN_RE = /\b(glargina|lantus|toujeo|degludec|tresiba|detemir|levemir|nph|basal)\b/i;
var RAPIDA_INSULIN_RE = /\b(r[aá]pida|lispro|aspart|glulisina|regular|preprandial|novorapid|humalog|apidra|fiasp)\b/i;
function summarizeNmItems(rawLines) {
  const basal = [];
  const rapida = [];
  const rest = [];
  (rawLines || []).forEach((raw) => {
    const item = glanceMedItem(raw);
    if (!item) return;
    if (BASAL_INSULIN_RE.test(raw) || BASAL_INSULIN_RE.test(item.name)) basal.push({ raw, item });
    else if (RAPIDA_INSULIN_RE.test(raw) || RAPIDA_INSULIN_RE.test(item.name)) rapida.push({ raw, item });
    else rest.push(item);
  });
  if (!basal.length || !rapida.length) {
    return dedupeItems([...basal.map((b) => b.item), ...rapida.map((r) => r.item), ...rest]);
  }
  return [{ name: "Plan Basal Bolo", token: "", emphasis: false }, ...dedupeItems(rest)];
}
function itemsFromRawList(rawList, isNm) {
  const raw = (Array.isArray(rawList) ? rawList : []).map((line) => String(line)).filter(hasText);
  if (isNm) return summarizeNmItems(raw);
  return dedupeItems(raw.map(glanceMedItem));
}
function buildSoapZones(soap) {
  if (!soap || typeof soap !== "object") return [];
  const zones = [];
  SOAP_ZONES.forEach((def) => {
    const raw = [];
    def.keys.forEach((key) => {
      const list = soap[key];
      if (Array.isArray(list)) raw.push(...list);
    });
    const items = itemsFromRawList(raw, def.letter === "NM");
    if (!items.length) return;
    zones.push({ letter: def.letter, subtitle: def.subtitle, items });
  });
  return zones;
}
function packSoapCols(zones) {
  const byLetter = /* @__PURE__ */ Object.create(null);
  (zones || []).forEach((zone) => {
    if (zone && zone.letter) byLetter[zone.letter] = zone;
  });
  return SOAP_COL_LETTERS.map((letters) => letters.map((letter) => byLetter[letter]).filter(Boolean)).filter(
    (col) => col.length
  );
}
function buildEaGlance(input) {
  const kpis = [];
  const {
    soporte,
    soporteLitros,
    dieta,
    bombaOn,
    bombaRate,
    pafi,
    soap
  } = input ?? {};
  if (hasText(soporte)) {
    kpis.push({ label: "Soporte", value: buildSoporteValue(soporte, soporteLitros) });
  }
  if (typeof pafi === "number" && Number.isFinite(pafi)) {
    kpis.push({ label: "PaFi", value: String(pafi) });
  }
  if (hasText(dieta)) {
    kpis.push({ label: "Dieta", value: prettyPhrase(String(dieta).trim()) });
  }
  if (bombaOn === true) {
    kpis.push({
      label: "Bomba",
      value: hasText(bombaRate) ? String(bombaRate).trim() : ""
    });
  }
  return { kpis, soap: buildSoapZones(soap) };
}

// public/js/features/patient-dashboard/ea-glance-meds.mjs
function allActiveSelMap(items) {
  const map = {};
  (Array.isArray(items) ? items : []).forEach((it) => {
    if (it && it.id && !it.suspendido) map[it.id] = true;
  });
  return map;
}
function recetaBucketLines(recetaItems) {
  const items = Array.isArray(recetaItems) ? recetaItems : [];
  if (!items.length) return {};
  const joined = bucketsFromRecetaItems(
    items,
    allActiveSelMap(items),
    classifyMedicationSoapCategory
  );
  const out = {};
  for (const key of MED_FIELD_KEYS) {
    const list = parseMedFieldItems(joined[key]);
    if (list.length) out[key] = list;
  }
  return out;
}
function dedupeMedLines(lines) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  (lines || []).forEach((line) => {
    const name = glanceMedName(line);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return;
    seen.add(key);
    out.push(line);
  });
  return out;
}
function advanceAbxLines(lines, fechaActualizacion, recetaItems, refDate) {
  const fecha = fechaActualizacion != null ? String(fechaActualizacion).trim() : "";
  if (!lines || !lines.length) return lines;
  return lines.map((line) => rewriteAbxDisplayText(line, fecha, recetaItems, refDate));
}
function collectEaGlanceSoap(input) {
  const ec = input && input.estadoClinico || {};
  const pend = input && input.pendienteReceta || {};
  const fromReceta = recetaBucketLines(input && input.recetaItems);
  const soap = {};
  MED_FIELD_KEYS.forEach((key) => {
    const lines = dedupeMedLines([
      ...parseMedFieldItems(ec[key]),
      ...parseMedFieldItems(pend[key]),
      ...fromReceta[key] || []
    ]);
    if (lines.length) soap[key] = lines;
  });
  if (soap.abx) {
    soap.abx = advanceAbxLines(
      soap.abx,
      input && input.fechaActualizacion,
      input && input.recetaItems,
      input && input.refDate
    );
  }
  return soap;
}

// public/js/features/patient-dashboard/interconsult-catalog.mjs
var INTERCONSULT_CAT_HUE = { med: 245, qx: 168, sop: 52 };
var INTERCONSULT_SERVICES = [
  { id: "card", name: "Cardiolog\xEDa", cat: "med" },
  { id: "nef", name: "Nefrolog\xEDa", cat: "med" },
  { id: "endo", name: "Endocrinolog\xEDa", cat: "med" },
  { id: "inf", name: "Infectolog\xEDa", cat: "med" },
  { id: "neumo", name: "Neumolog\xEDa", cat: "med" },
  { id: "gastro", name: "Gastroenterolog\xEDa", cat: "med" },
  { id: "hema", name: "Hematolog\xEDa", cat: "med" },
  { id: "onco", name: "Oncolog\xEDa", cat: "med" },
  { id: "reuma", name: "Reumatolog\xEDa", cat: "med" },
  { id: "neuro", name: "Neurolog\xEDa", cat: "med" },
  { id: "derma", name: "Dermatolog\xEDa", cat: "med" },
  { id: "geri", name: "Geriatr\xEDa", cat: "med" },
  { id: "psiq", name: "Psiquiatr\xEDa", cat: "med" },
  { id: "cxgen", name: "Cirug\xEDa general", cat: "qx" },
  { id: "cxct", name: "Cirug\xEDa cardiotor\xE1cica", cat: "qx" },
  { id: "ncx", name: "Neurocirug\xEDa", cat: "qx" },
  { id: "uro", name: "Urolog\xEDa", cat: "qx" },
  { id: "tyo", name: "Traumatolog\xEDa", cat: "qx" },
  { id: "cxvas", name: "Cirug\xEDa vascular", cat: "qx" },
  { id: "orl", name: "ORL", cat: "qx" },
  { id: "oft", name: "Oftalmolog\xEDa", cat: "qx" },
  { id: "gine", name: "Ginecolog\xEDa", cat: "qx" },
  { id: "uti", name: "UTI", cat: "sop" },
  { id: "nutri", name: "Nutrici\xF3n cl\xEDnica", cat: "sop" },
  { id: "rehab", name: "Rehabilitaci\xF3n", cat: "sop" },
  { id: "algo", name: "Algolog\xEDa", cat: "sop" },
  { id: "pali", name: "Cuidados paliativos", cat: "sop" }
];
var SERVICE_BY_ID = new Map(INTERCONSULT_SERVICES.map((svc) => [svc.id, svc]));
function serviceById(id) {
  return SERVICE_BY_ID.get(id);
}
function hueForService(svc) {
  return INTERCONSULT_CAT_HUE[svc.cat];
}
function toggleInterconsultId(ids, id) {
  if (!SERVICE_BY_ID.has(id)) {
    return [...ids];
  }
  if (ids.includes(id)) {
    return ids.filter((existing) => existing !== id);
  }
  return [...ids, id];
}

// public/js/features/patient-dashboard/labs-glance-model.mjs
function dayKeysMatch(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  const norm = (key) => String(key).split("-").map((part) => String(parseInt(part, 10))).join("-");
  return norm(left) === norm(right);
}
function setsForDayKey(orderedSets, todayKey) {
  const out = [];
  (orderedSets || []).forEach((set) => {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    if (dayKeysMatch(dayKeyFromLabSet(set), todayKey)) out.push(set);
  });
  return out;
}
function sectionLabelFromRow(row) {
  const line = String(row == null ? "" : row).split("\n")[0].trim();
  const tabIdx = line.indexOf("	");
  if (tabIdx >= 0) return line.slice(0, tabIdx).trim().replace(/:$/, "");
  return line.split(/\s+/)[0].replace(/:$/, "");
}
function bodyTokensFromRow(row) {
  const line = String(row == null ? "" : row).split("\n")[0].trim().replace("	", " ");
  const tokens = line.split(/\s+/).filter(Boolean);
  return tokens.slice(1);
}
function isNumericChipLabel(label) {
  return /^[\d.,]+$/.test(String(label || "").replace(/\*$/, ""));
}
function formatAlteredChip(chip) {
  const value = String(chip && (chip.value || chip.raw) || "").trim();
  const label = String(chip && chip.label || "").trim();
  if (!label || isNumericChipLabel(label)) return value;
  if (!value) return label;
  if (value === label || value.startsWith(label)) return value;
  return label + " " + value;
}
function alteredChipsFromTokens(tokens) {
  const chips = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (!tok || tok === "-") {
      i += 1;
      continue;
    }
    const next = tokens[i + 1];
    if (next !== void 0 && next.endsWith("*")) {
      chips.push({ raw: next, label: tok, value: next });
      i += 2;
      continue;
    }
    if (tok.endsWith("*")) {
      const label = tok.replace(/\*$/, "");
      chips.push({ raw: tok, label, value: tok });
      i += 1;
      continue;
    }
    if (next !== void 0 && !Number.isNaN(parseFloat(String(next).replace("*", "")))) {
      i += 2;
    } else {
      i += 1;
    }
  }
  return chips;
}
function countLabSections(labRows) {
  const seen = /* @__PURE__ */ new Set();
  labRows.forEach((row) => {
    const label = sectionLabelFromRow(row);
    if (label) seen.add(label.toUpperCase());
  });
  return seen.size;
}
function buildGroupsFromLabRows(labRows) {
  const groups = [];
  labRows.forEach((row) => {
    const tipo = sectionLabelFromRow(row);
    const chips = alteredChipsFromTokens(bodyTokensFromRow(row));
    if (!chips.length) return;
    groups.push({ tipo, chips });
  });
  return groups;
}
function labRowsFromResLabs(resLabs) {
  const split = splitResLabsByTipo(resLabs || []);
  return split.labs.filter((row) => String(row == null ? "" : row).trim());
}
function horaKey(set) {
  const h = normalizeHoraLabHistory(set && set.hora);
  return h ? String(h).trim().slice(0, 5) : "";
}
function mergeClusterResLabs(sets) {
  let merged = [];
  (sets || []).forEach((set) => {
    const rows = set && set.resLabs || [];
    if (!rows.length) return;
    if (merged.length) merged.push("");
    merged = merged.concat(rows);
  });
  return dedupeConsolidatedLabRows(merged, "labs");
}
function clusterSetsByHora(sets) {
  const byHora = /* @__PURE__ */ Object.create(null);
  const order = [];
  (sets || []).forEach((set) => {
    const key = horaKey(set) || "\0" + String(set && set.id != null ? set.id : order.length);
    if (!byHora[key]) {
      byHora[key] = [];
      order.push(key);
    }
    byHora[key].push(set);
  });
  return order.map((key) => {
    const cluster = byHora[key];
    return {
      hora: key.charAt(0) === "\0" ? "" : key,
      sets: cluster,
      resLabs: mergeClusterResLabs(cluster)
    };
  });
}
function buildEnvioFromCluster(cluster) {
  const keeper = cluster.sets && cluster.sets[0] || {};
  const labRows = labRowsFromResLabs(cluster.resLabs);
  if (!labRows.length) return null;
  const groups = buildGroupsFromLabRows(labRows);
  if (!groups.length) return null;
  return {
    id: keeper.id,
    hora: cluster.hora || horaKey(keeper),
    wide: countLabSections(labRows) >= 3,
    groups
  };
}
function buildLabsGlanceForDay({ todayKey, orderedSets } = {}) {
  const daySets = setsForDayKey(orderedSets, todayKey);
  if (!daySets.length) return { envios: [] };
  return {
    envios: clusterSetsByHora(daySets).map(buildEnvioFromCluster).filter(Boolean)
  };
}

// public/js/features/patient-dashboard/dashboard-model.mjs
function resolveView(inner) {
  return inner === "todo" ? "pendientes" : "resumen";
}
function filterDiagnosticos(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => String(item).trim()).filter(Boolean).slice(0, 3);
}
function buildIdentity(patient) {
  return {
    nombre: patient?.nombre != null ? String(patient.nombre) : "",
    edad: patient?.edad != null ? String(patient.edad).trim() : "",
    sexo: patient?.sexo != null ? String(patient.sexo).trim() : "",
    cuarto: patient?.cuarto != null ? String(patient.cuarto).trim() : "",
    cama: patient?.cama != null ? String(patient.cama).trim() : "",
    diagnosticos: filterDiagnosticos(patient?.diagnosticosList),
    interconsultServiceIds: Array.isArray(patient?.interconsultServiceIds) ? patient.interconsultServiceIds : []
  };
}
function localTodayKey() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function lastItems(items, count) {
  if (!Array.isArray(items) || !items.length) return [];
  return items.slice(-count);
}
function firstItems(items, count) {
  if (!Array.isArray(items) || !items.length) return [];
  return items.slice(0, count);
}
function resolveVitalsSnapshot(monitoreo) {
  if (monitoreo == null || typeof monitoreo !== "object") return null;
  return deriveSnapshot(monitoreo);
}
function buildDashboardModel({
  patient,
  inner,
  labSets,
  eaInput,
  eventualidades,
  pendientes,
  todayKey,
  skipLabs
} = {}) {
  const p = patient ?? {};
  const labs = skipLabs ? { envios: [], pending: true } : labSets ? buildLabsGlanceForDay({ todayKey: todayKey ?? localTodayKey(), orderedSets: labSets }) : { envios: [] };
  return {
    view: resolveView(inner),
    identity: buildIdentity(p),
    vitals: resolveVitalsSnapshot(p.monitoreo),
    labs,
    ea: eaInput ? buildEaGlance(eaInput) : { kpis: [], soap: [] },
    eventualidades: firstItems(eventualidades, 3),
    pendientes: lastItems(pendientes, 3)
  };
}

// public/js/features/patient-dashboard/dashboard-html.mjs
function numText(value) {
  if (value == null || value === "") return "";
  var n = Number(value);
  if (Number.isFinite(n)) return String(n);
  return String(value).trim();
}
function readingsFromModel(model) {
  var snap = model && model.vitals;
  if (!snap || typeof snap !== "object") return { vitals: {}, glucometrias: [], io: {} };
  return {
    vitals: snap.vitals && typeof snap.vitals === "object" ? snap.vitals : {},
    glucometrias: Array.isArray(snap.glucometrias) ? snap.glucometrias : [],
    io: snap.io && typeof snap.io === "object" ? snap.io : {}
  };
}
function lastGlu(glucometrias) {
  if (!glucometrias.length) return "";
  var last = glucometrias[glucometrias.length - 1];
  if (last == null) return "";
  if (typeof last === "object") return numText(last.value);
  return numText(last);
}
function ioBalance(io) {
  var ing = Number(io.ing);
  var egr = Number(io.egr);
  if (!Number.isFinite(ing) && !Number.isFinite(egr)) return "";
  var a = Number.isFinite(ing) ? ing : 0;
  var b = Number.isFinite(egr) ? egr : 0;
  var delta = a - b;
  return (delta > 0 ? "+" : "") + String(delta);
}
function vitalCell(label, value, hi) {
  if (!value) return "";
  return '<div class="vital' + (hi ? " hi" : "") + '"><small>' + escHtml(label) + "</small><b>" + escHtml(value) + "</b></div>";
}
function buildVitalsCellsHtml(v, ta, glu, gluLast, io) {
  return vitalCell("T/A", ta, isVitalAltered("tas", v.tas) || isVitalAltered("tad", v.tad)) + vitalCell("FC", numText(v.fc), isVitalAltered("fc", v.fc)) + vitalCell("FR", numText(v.fr), isVitalAltered("fr", v.fr)) + vitalCell("Temp", numText(v.temp), isVitalAltered("temp", v.temp)) + vitalCell("SatO\u2082", numText(v.sat) ? numText(v.sat) + "%" : "", isVitalAltered("sat", v.sat)) + vitalCell(
    "Glu",
    glu,
    isGlucometriaMarkedAltered(
      gluLast && typeof gluLast === "object" ? gluLast : { value: glu }
    )
  ) + vitalCell("I/O", io, false);
}
function renderVitalsHtml(model) {
  var r = readingsFromModel(model);
  var v = r.vitals;
  var tas = numText(v.tas);
  var tad = numText(v.tad);
  var ta = tas || tad ? (tas || "\u2014") + "/" + (tad || "\u2014") : "";
  var gluList = r.glucometrias;
  var gluLast = gluList.length ? gluList[gluList.length - 1] : null;
  var glu = lastGlu(gluList);
  var io = ioBalance(r.io);
  var cells = buildVitalsCellsHtml(v, ta, glu, gluLast, io);
  var hasCoreVitals = !!(ta || numText(v.fc) || numText(v.fr) || numText(v.temp) || numText(v.sat) || glu);
  var emptyClass = hasCoreVitals ? "" : " vitals-card--empty";
  return '<button class="card clickable vitals-card' + emptyClass + '" type="button" data-dash-action="estadoActual"><div class="card-h">Signos vitales</div><div class="card-b"><div class="vitals">' + (cells || '<p class="meta">Sin signos vitales</p>') + "</div></div></button>";
}
function renderIcAssignedHtml(ids) {
  var chips = (Array.isArray(ids) ? ids : []).map(function(id) {
    var svc = serviceById(id);
    if (!svc) return "";
    return '<button type="button" class="svc" style="--h:' + hueForService(svc) + '" data-dash-action="ic-toggle" data-ic-id="' + escAttr(svc.id) + '">' + escHtml(svc.name) + "</button>";
  }).join("");
  return chips + '<button type="button" class="svc-add" data-dash-action="ic-add">+ Agregar</button>';
}
function renderIdentityHtml(model) {
  var idn = model && model.identity || {};
  var dx = Array.isArray(idn.diagnosticos) ? idn.diagnosticos : [];
  var dxHtml = dx.map(function(d) {
    return '<span class="chip">' + escHtml(d) + "</span>";
  }).join("");
  return '<div class="idrow"><div><div class="id-name-row"><h1><button class="dash-name" type="button" data-dash-action="datos">' + escHtml(idn.nombre || "Paciente") + "</button></h1></div>" + (dxHtml ? '<div class="chips">' + dxHtml + "</div>" : "") + '<div class="ic-mod"><small>Servicios interconsultantes</small><div class="chips" id="ic-assigned">' + renderIcAssignedHtml(idn.interconsultServiceIds) + '</div></div></div><button type="button" class="btn-med-secondary" data-dash-action="actualizar-labs">Actualizar labs</button></div>';
}
function renderDrawHtml(envio) {
  var groups = (envio.groups || []).map(function(g) {
    var chips = (g.chips || []).map(function(c) {
      return '<span class="abn">' + escHtml(formatAlteredChip(c)) + "</span>";
    }).join("");
    if (!chips) return "";
    return '<div class="draw-g"><span class="tipo">' + escHtml(g.tipo || "") + '</span><div class="vals">' + chips + "</div></div>";
  }).join("");
  return '<button class="draw' + (envio.wide ? " is-wide" : "") + '" type="button" data-dash-action="labs-envio" data-lab-set-id="' + escAttr(String(envio.id || "")) + '"><time>' + escHtml(envio.hora || "") + '</time><div class="draw-groups">' + groups + "</div></button>";
}
function renderLabsHtml(model) {
  var pending = !!(model && model.labs && model.labs.pending);
  var envios = model && model.labs && Array.isArray(model.labs.envios) ? model.labs.envios : [];
  var visibleEnvios = envios.slice(-2);
  var body = pending ? "" : visibleEnvios.length ? '<div class="day-draws">' + visibleEnvios.map(renderDrawHtml).join("") + "</div>" : '<p class="empty-hint">Sin labs de hoy</p>';
  return '<div class="card labs-card clickable" data-dash-labs data-dash-action="labs-full"><div class="card-h">Labs: Solo alterados</div><div class="card-b">' + body + "</div></div>";
}
function medItemName(item) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  return String(item.name || "");
}
function medItemToken(item) {
  if (!item || typeof item === "string") return "";
  return String(item.token || "");
}
function renderMedItemHtml(item) {
  var name = medItemName(item);
  if (!name) return "";
  var token = medItemToken(item);
  var emphasis = item && typeof item === "object" && item.emphasis;
  return '<div class="med"><span class="name">' + escHtml(name) + "</span>" + (token ? '<span class="meta' + (emphasis ? " is-key" : "") + '">' + escHtml(token) + "</span>" : "") + "</div>";
}
function renderSoapZoneHtml(zone, headingClass) {
  var meds = (zone.items || []).map(renderMedItemHtml).join("");
  var letter = String(zone.letter || "");
  return '<span class="' + (headingClass || "z") + '" data-soap="' + escAttr(letter) + '">' + escHtml(letter) + (zone.subtitle ? " <em>" + escHtml(zone.subtitle) + "</em>" : "") + "</span>" + meds;
}
function renderEaSoapHtml(soap) {
  return packSoapCols(soap || []).map(function(col) {
    return "<section>" + col.map(function(zone, i) {
      return renderSoapZoneHtml(zone, i === 0 ? "z" : "z2");
    }).join("") + "</section>";
  }).join("");
}
function renderMedsHtml(model) {
  var soap = model && model.ea && model.ea.soap;
  if (!soap || !soap.length) return "";
  return '<div class="bento meds-band"><button class="card clickable meds-card" type="button" data-dash-action="estadoActual"><div class="card-h">Medicamentos</div><div class="card-b"><div class="soap-pack">' + renderEaSoapHtml(soap) + "</div></div></button></div>";
}
function rowTime(item) {
  if (item == null) return "";
  if (typeof item === "string") return "";
  if (item.time) return String(item.time);
  if (item.dueDate) return "Vence";
  if (item.at) {
    var d = new Date(item.at);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    }
  }
  return "";
}
function rowText(item) {
  if (item == null) return "";
  if (typeof item === "string") return item;
  return String(item.text || "");
}
function renderRowsHtml(items, emptyText) {
  var list = Array.isArray(items) ? items : [];
  if (!list.length) {
    return '<p class="empty-hint">' + escHtml(emptyText || "Sin registros") + "</p>";
  }
  return '<ul class="rows">' + list.map(function(item) {
    var t = rowTime(item);
    return "<li>" + (t ? "<time>" + escHtml(t) + "</time> " : "") + escHtml(rowText(item)) + "</li>";
  }).join("") + "</ul>";
}
function renderListCardHtml(title, action, items, emptyText) {
  return '<button class="card clickable" type="button" data-dash-action="' + escAttr(action) + '"><div class="card-h">' + escHtml(title) + '</div><div class="card-b">' + renderRowsHtml(items, emptyText) + "</div></button>";
}
function renderDashboardHtml(model) {
  var m = model || {};
  return '<div class="patient-dash dash">' + renderIdentityHtml(m) + '<div class="bento vitals-labs">' + renderVitalsHtml(m) + renderLabsHtml(m) + '</div><div class="bento rest">' + renderListCardHtml("Eventualidades", "eventualidades", m.eventualidades, "Sin eventualidades") + renderListCardHtml("Pendientes", "pendientes", m.pendientes, "Sin pendientes") + "</div>" + renderMedsHtml(m) + "</div>";
}

// public/js/features/patient-dashboard/ic-modal.mjs
var CAT_LABELS = { med: "M\xE9dicas", qx: "Quir\xFArgicas", sop: "Soporte" };
var CAT_ORDER = ["med", "qx", "sop"];
var icLayer = null;
function svcChipHtml(svc, selected) {
  return '<button type="button" class="svc' + (selected ? " is-on" : "") + '" style="--h:' + hueForService(svc) + '" data-ic-toggle="' + escAttr(svc.id) + '">' + escHtml(svc.name) + "</button>";
}
function renderIcPickerHtml(assignedIds) {
  var assigned = Array.isArray(assignedIds) ? assignedIds : [];
  return CAT_ORDER.map(function(cat) {
    var chips = INTERCONSULT_SERVICES.filter(function(s) {
      return s.cat === cat;
    }).map(function(s) {
      return svcChipHtml(s, assigned.indexOf(s.id) >= 0);
    }).join("");
    return '<div class="ic-cat"><small>' + escHtml(CAT_LABELS[cat]) + '</small><div class="chips">' + chips + "</div></div>";
  }).join("");
}
function ensureIcDom() {
  var scrim = document.getElementById("patient-ic-scrim");
  var panel = document.getElementById("patient-ic-panel");
  if (scrim && panel) return { scrim, panel };
  scrim = document.createElement("div");
  scrim.id = "patient-ic-scrim";
  scrim.hidden = true;
  scrim.setAttribute("aria-hidden", "true");
  panel = document.createElement("div");
  panel.id = "patient-ic-panel";
  panel.className = "patient-dash patient-dash-ic-modal";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "patient-ic-title");
  panel.innerHTML = '<h3 id="patient-ic-title">Servicios interconsultantes</h3><div id="ic-picker"></div><button type="button" class="btn-med-secondary" data-ic-done>Listo</button>';
  scrim.appendChild(panel);
  document.body.appendChild(scrim);
  return { scrim, panel };
}
function paintPicker(assignedIds) {
  var picker = document.getElementById("ic-picker");
  if (picker) picker.innerHTML = renderIcPickerHtml(assignedIds);
}
function openInterconsultModal(opts) {
  var assigned = Array.isArray(opts && opts.assignedIds) ? opts.assignedIds.slice() : [];
  var onToggle = opts && typeof opts.onToggle === "function" ? opts.onToggle : null;
  var dom = ensureIcDom();
  paintPicker(assigned);
  if (icLayer && typeof icLayer.close === "function") icLayer.close();
  icLayer = openDialog({
    panel: dom.panel,
    scrim: dom.scrim,
    nested: true,
    trigger: opts && opts.trigger
  });
  dom.panel.onclick = function(ev) {
    var t = ev.target;
    if (!t || typeof t.closest !== "function") return;
    var done = t.closest("[data-ic-done]");
    if (done) {
      if (icLayer) icLayer.close();
      return;
    }
    var btn = t.closest("[data-ic-toggle]");
    if (!btn || !onToggle) return;
    var id = btn.getAttribute("data-ic-toggle");
    assigned = onToggle(id) || toggleInterconsultId(assigned, id);
    paintPicker(assigned);
  };
}

// public/js/features/patient-dashboard/dashboard-mount.mjs
var rt = {
  getActiveId() {
    return null;
  },
  getActiveInner() {
    return "resumen";
  },
  getActiveAppTab() {
    return "nota";
  },
  switchAppTab() {
  },
  switchInnerTab() {
  },
  navigateToEstadoActualPanel() {
  },
  persistClinicalState,
  openLabRepoBatchModal() {
  },
  loadLabHistorySetIntoOutput() {
  },
  setLabHistorySelectedSetId() {
  }
};
function registerPatientDashboardRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
  wireDashboardLabRefresh();
}
function activePatient() {
  var id = rt.getActiveId();
  if (!id) return null;
  return getPatients().find(function(p) {
    return String(p.id) === String(id);
  }) || null;
}
function buildEaInputFromPatient(patient, opts) {
  opts = opts && typeof opts === "object" ? opts : {};
  var mon = patient && patient.monitoreo || {};
  var ec = mon.estadoClinico && typeof mon.estadoClinico === "object" ? mon.estadoClinico : {};
  var recetaMap = opts.medRecetaByPatient || getMedRecetaByPatient();
  var receta = patient && patient.id ? recetaMap[patient.id] : null;
  var soap = collectEaGlanceSoap({
    estadoClinico: ec,
    pendienteReceta: mon.pendienteReceta,
    recetaItems: receta && receta.items,
    fechaActualizacion: resolveEaAbxFechaActualizacion(patient && patient.id, recetaMap, mon),
    refDate: opts.refDate
  });
  var bombaOn = !!(Array.isArray(mon.historial) && mon.historial.some(function(row) {
    return row && Array.isArray(row.bombaInsulina) && row.bombaInsulina.length;
  }));
  return {
    soporte: ec.soporte,
    soporteLitros: ec.soporteLitros,
    dieta: ec.dieta,
    bombaOn,
    soap
  };
}
function collectEventualidades(patient) {
  var entries = patient && patient.eventualidades && patient.eventualidades.entries;
  return sortEntriesDesc(entries).map(function(e) {
    return {
      at: e && e.at,
      text: resolveEventualidadEntryText(e && e.text, e && e.kind)
    };
  });
}
function collectPendientes(patientId) {
  if (!patientId) return [];
  return (storage.getTodos(patientId) || []).filter(function(t) {
    return t && !t.completed && String(t.text || "").trim();
  });
}
function collectDashboardModel(inner, opts) {
  var patient = activePatient() || {};
  var pid = patient.id;
  var skipLabs = !!(opts && opts.skipLabs);
  return buildDashboardModel({
    patient,
    inner: inner || rt.getActiveInner(),
    labSets: skipLabs ? null : pid ? getLabHistory()[pid] || [] : [],
    eaInput: buildEaInputFromPatient(patient),
    eventualidades: collectEventualidades(patient),
    pendientes: collectPendientes(pid),
    skipLabs
  });
}
function syncPacienteCompositeVisibility(inner) {
  var onResumen = inner === "resumen";
  var onTodo = inner === "todo";
  var dash = document.getElementById("patient-dashboard-mount");
  var pend = document.querySelector("#itab-content-paciente .exp-pendientes-mount");
  var head = document.getElementById("exp-pendientes-header");
  if (dash) dash.hidden = !onResumen;
  if (pend) pend.hidden = !onTodo;
  if (head) head.hidden = !onTodo;
}
function persistIcToggle(id) {
  var patient = activePatient();
  if (!patient) return [];
  var cur = Array.isArray(patient.interconsultServiceIds) ? patient.interconsultServiceIds : [];
  var next = toggleInterconsultId(cur, id);
  patient.interconsultServiceIds = next;
  if (typeof rt.persistClinicalState === "function") rt.persistClinicalState();
  else persistClinicalState();
  renderPatientDashboard();
  return next;
}
function openLabs(setId) {
  if (typeof rt.switchAppTab === "function") rt.switchAppTab("lab");
  var pid = rt.getActiveId();
  if (setId && typeof rt.setLabHistorySelectedSetId === "function" && pid) {
    rt.setLabHistorySelectedSetId(pid, setId);
  }
  if (setId && typeof rt.loadLabHistorySetIntoOutput === "function") {
    rt.loadLabHistorySetIntoOutput(setId, { silent: true });
  }
}
function openLabsRepoModal() {
  if (typeof rt.openLabRepoBatchModal === "function") rt.openLabRepoBatchModal();
  else if (typeof window.openLabRepoBatchModal === "function") window.openLabRepoBatchModal();
}
function switchDashInner(tab) {
  if (tab === "estadoActual" && typeof rt.navigateToEstadoActualPanel === "function") {
    rt.navigateToEstadoActualPanel();
    return;
  }
  if (typeof rt.switchInnerTab === "function") rt.switchInnerTab(tab);
}
function handleDashboardAction(action, el) {
  if (action === "datos") {
    openPatientDatosModal();
    return;
  }
  if (action === "actualizar-labs") {
    openLabsRepoModal();
    return;
  }
  if (action === "ic-add") {
    var p = activePatient();
    openInterconsultModal({
      assignedIds: p && p.interconsultServiceIds || [],
      onToggle: persistIcToggle,
      trigger: el
    });
    return;
  }
  if (action === "ic-toggle") {
    persistIcToggle(el.getAttribute("data-ic-id"));
    return;
  }
  if (action === "labs-envio" || action === "labs-full") {
    openLabs(el.getAttribute("data-lab-set-id"));
    return;
  }
  if (action === "estadoActual") switchDashInner("estadoActual");
  else if (action === "eventualidades") switchDashInner("eventualidades");
  else if (action === "pendientes") switchDashInner("todo");
}
var dashWiredHosts = /* @__PURE__ */ new Set();
var dashBackWired = false;
var dashLabWired = false;
var dashLabTimer = null;
var dashPainting = false;
function shouldRefreshDashboardForLabs(appTab, inner, rondaHost) {
  if (appTab && appTab !== "nota") return false;
  if (inner === "resumen") return true;
  return !!(rondaHost && !rondaHost.hidden);
}
function paintDashboardFromLabRevision(patientId) {
  if (dashPainting) return;
  if (String(patientId || "") !== String(rt.getActiveId() || "")) return;
  var appTab = typeof rt.getActiveAppTab === "function" ? rt.getActiveAppTab() : "nota";
  var inner = rt.getActiveInner() || "resumen";
  var ronda = typeof document !== "undefined" ? document.getElementById("patient-ronda-dashboard-host") : null;
  if (!shouldRefreshDashboardForLabs(appTab, inner, ronda)) return;
  dashPainting = true;
  try {
    renderPatientDashboard(null, { settle: false });
  } finally {
    dashPainting = false;
  }
}
function scheduleDashboardLabRefresh(patientId) {
  if (String(patientId || "") !== String(rt.getActiveId() || "")) return;
  if (dashLabTimer) clearTimeout(dashLabTimer);
  dashLabTimer = setTimeout(function() {
    dashLabTimer = null;
    paintDashboardFromLabRevision(patientId);
  }, TREND_REFRESH_DEBOUNCE_MS);
}
function wireDashboardLabRefresh() {
  if (dashLabWired) return;
  dashLabWired = true;
  onLabHistoryRevision(scheduleDashboardLabRefresh);
}
function wireDashboardHost(mount) {
  if (!mount || dashWiredHosts.has(mount)) return;
  dashWiredHosts.add(mount);
  mount.addEventListener("click", function(ev) {
    var t = ev.target;
    if (!t || typeof t.closest !== "function") return;
    var btn = t.closest("[data-dash-action]");
    if (!btn || !mount.contains(btn)) return;
    handleDashboardAction(btn.getAttribute("data-dash-action"), btn);
  });
}
function wireDashboardOnce() {
  wireDashboardLabRefresh();
  wireDashboardHost(document.getElementById("patient-dashboard-mount"));
  wireDashboardHost(document.getElementById("patient-ronda-dashboard-host"));
  if (dashBackWired) return;
  dashBackWired = true;
  var back = document.getElementById("btn-volver-al-resumen");
  if (back) {
    back.addEventListener("click", function() {
      if (typeof rt.switchInnerTab === "function") rt.switchInnerTab("resumen");
    });
  }
}
function dashboardHostIsPaintable(el, wrapEl) {
  if (!el) return false;
  if (el.hidden) return false;
  if (wrapEl && (wrapEl.hidden || wrapEl.style && wrapEl.style.display === "none")) {
    return false;
  }
  return true;
}
function resolveDashboardPaintTargets(opts) {
  opts = opts || {};
  if (opts.hostEl) return [opts.hostEl];
  var inner = opts.inner || "resumen";
  var targets = [];
  if (opts.classic && inner === "resumen" && dashboardHostIsPaintable(opts.classic, opts.classicWrap)) {
    targets.push(opts.classic);
  }
  if (opts.ronda && dashboardHostIsPaintable(opts.ronda, opts.rondaWrap)) {
    targets.push(opts.ronda);
  }
  return targets;
}
function localTodayKey2() {
  var d = /* @__PURE__ */ new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
function fillDashboardLabs(targets, pid) {
  if (String(rt.getActiveId() || "") !== String(pid || "")) return;
  var html = renderLabsHtml({
    labs: pid ? buildLabsGlanceForDay({
      todayKey: localTodayKey2(),
      orderedSets: getLabHistory()[pid] || []
    }) : { envios: [] }
  });
  targets.forEach(function(mount) {
    if (!mount || !mount.isConnected) return;
    var slot = mount.querySelector("[data-dash-labs]");
    if (slot) slot.outerHTML = html;
  });
}
function renderPatientDashboard(hostEl, opts) {
  opts = opts || {};
  wireDashboardOnce();
  var inner = rt.getActiveInner() || "resumen";
  syncPacienteCompositeVisibility(inner);
  var targets = resolveDashboardPaintTargets({
    hostEl: hostEl || null,
    classic: document.getElementById("patient-dashboard-mount"),
    ronda: document.getElementById("patient-ronda-dashboard-host"),
    classicWrap: document.getElementById("patient-expediente-classic"),
    rondaWrap: document.getElementById("patient-ronda-overview"),
    inner
  });
  if (!targets.length) return;
  var deferLabs = !!opts.deferLabs;
  var pid = rt.getActiveId();
  var html = renderDashboardHtml(collectDashboardModel(inner, { skipLabs: deferLabs }));
  targets.forEach(function(mount) {
    wireDashboardHost(mount);
    mount.innerHTML = html;
  });
  if (!deferLabs) return;
  scheduleAfterPaintThenIdle(function() {
    fillDashboardLabs(targets, pid);
  });
}
var windowHandlers = {
  renderPatientDashboard
};

export {
  EA_MED_FIELD_LABELS,
  renderMedCategoryGrid,
  wireMedCategoryGrid,
  registerPatientDashboardRuntime,
  buildEaInputFromPatient,
  syncPacienteCompositeVisibility,
  persistIcToggle,
  shouldRefreshDashboardForLabs,
  dashboardHostIsPaintable,
  resolveDashboardPaintTargets,
  renderPatientDashboard,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-3RXBEWAZ.js.map

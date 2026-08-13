import { esc } from '../dom-escape.mjs';
// Lab panel — historial, dedupe, consolidación
import {
  procesarLabs,
  reprocessLabResultLines_,
  collectPriorRefsFromHistory,
  mergeGasRefs_,
  refreshCitoquimicoInterpretacionInResLabs_,
} from '../labs.js';
import { dedupeConsolidatedLabRows } from '../lab-bulk-paste.mjs';
import { sortLabHistoryChronological } from '../tend-core.mjs';
import { normalizeLabHistoryPatientSets } from '../storage.js';
import { getPatients, getLabHistory, persistClinicalState } from '../app-state.mjs';
import { bumpLabHistoryRevision, getLabHistoryRevision } from '../lab-history-cache.mjs';
import {
  filterLabHistorySetsForMobileReference,
  shouldApplyMobileLabHistoryWindow,
} from './cloud-mobile/lab-history-window.mjs';
import { isMobileWeb, syncMobileLabReferenceChrome } from '../mobile-web.mjs';

import { sanitizeResLabsChunks } from '../labs-reslabs-sanitize.mjs';
import { isPaseMode } from './chrome.mjs';
import { rt } from './lab-panel-runtime-state.mjs';
import { labPanelBridge } from './lab-panel-bridge.mjs';
import { buildSameDaySerumContext, refreshSameDayAscitisForPatient } from './lab-panel-history-same-day.mjs';
import {
  groupLabHistoryByDay,
  findLabHistoryDayIndexForSet,
  stepLabHistoryDayIndex,
  latestSetIdInLabHistoryDay,
} from '../lab-history-day-nav.mjs';
import {
  buildDayOutputPayload,
  buildLabHistoryDayOptionsHtml,
  daySelectValue,
  findDayForHistoryRef,
  resolveSelectedDayKey,
  filterOutDaySets,
} from '../lab-history-day-view.mjs';




export function setLabHistoryPanelCollapsed() {}

export function syncLabHistoryCollapseUI() {}

function labHistoryPanelIsCollapsed() {
  return false;
}

function toggleLabHistoryPanel() {}

function findLabHistorySetByRef(sets, setId) {
  var sid = String(setId == null ? '' : setId);
  if (sid.indexOf('__idx_') === 0) {
    var idx = parseInt(sid.slice(6), 10);
    if (Number.isFinite(idx) && idx >= 0 && idx < sets.length) return sets[idx];
    return null;
  }
  return sets.find(function (s) { return String(s.id) === sid; }) || null;
}

export function dedupeConsolidatedRowsBySection(rows, tipo) {
  return dedupeConsolidatedLabRows(rows, tipo);
}

var _labHistorySelectedSetId = Object.create(null);
var _labHistoryDateSelectCacheKey = "";

export function expandLabHistoryList() {}

function labSetIdForHistory(set, idx) {
  return set.id != null && String(set.id).trim() !== '' ? String(set.id) : '__idx_' + idx;
}

function getActivePatientLabHistory() {
  var pid = rt.getActiveId();
  if (!pid) return [];
  var hist = sortLabHistoryChronological(
    rt.ensureParsedLabHistoryCached
      ? rt.ensureParsedLabHistoryCached(pid)
      : rt.ensureParsedLabHistory(pid, { readOnly: true })
  );
  if (shouldApplyMobileLabHistoryWindow()) {
    return filterLabHistorySetsForMobileReference(hist);
  }
  return hist;
}

function mobileLabReferenceMode() {
  return isMobileWeb();
}

function setLabOutputHistoryHint(hintEl, message, opts) {
  if (!hintEl) return;
  var mobile = opts && opts.mobileReference;
  hintEl.style.display = 'block';
  if (mobile) {
    hintEl.className = 'lab-history-hint lab-mobile-reference-empty';
    hintEl.innerHTML =
      '<span class="lab-mobile-reference-empty-title">Estudios recientes</span>' +
      '<span class="lab-mobile-reference-empty-lead">' +
      esc(message) +
      '</span>';
    return;
  }
  hintEl.className = 'lab-history-hint';
  hintEl.textContent = message;
}

function ensureMobileLabOutputShellVisible() {
  if (!mobileLabReferenceMode()) return;
  syncMobileLabReferenceChrome();
}

/** hist (and therefore days[]) is newest-first, so index+1 is older and index-1 is newer. */
function syncLabHistoryDayNavButtons(hist, selectedId) {
  var prevBtn = document.getElementById('lab-history-day-prev');
  var nextBtn = document.getElementById('lab-history-day-next');
  if (!prevBtn && !nextBtn) return;
  var days = groupLabHistoryByDay(hist);
  var idx = days.length ? findLabHistoryDayIndexForSet(days, labSetIdForHistory, selectedId) : -1;
  if (prevBtn) prevBtn.disabled = idx < 0 || idx >= days.length - 1;
  if (nextBtn) nextBtn.disabled = idx <= 0;
}

function syncLabHistoryDateSelect(opts) {
  ensureMobileLabOutputShellVisible();
  var selectEl = document.getElementById('lab-history-date-select');
  var hintEl = document.getElementById('lab-output-history-hint');
  var moreMenu = document.querySelector('.lab-output-more');
  if (!selectEl) return '';
  var pid = rt.getActiveId();
  if (!pid) {
    _labHistoryDateSelectCacheKey = '';
    selectEl.hidden = true;
    selectEl.innerHTML = '';
    if (hintEl) {
      setLabOutputHistoryHint(
        hintEl,
        'Selecciona un paciente en la columna izquierda para ver los estudios guardados.',
        { mobileReference: mobileLabReferenceMode() }
      );
    }
    if (moreMenu) moreMenu.hidden = true;
    syncLabHistoryDayNavButtons([], '');
    if (mobileLabReferenceMode()) syncMobileLabReferenceChrome();
    return '';
  }
  var hist = getActivePatientLabHistory();
  var cacheKey = String(pid) + '|L' + getLabHistoryRevision(pid) + '|N' + hist.length;
  if (!hist.length) {
    _labHistoryDateSelectCacheKey = cacheKey;
    selectEl.hidden = true;
    selectEl.innerHTML = '';
    if (hintEl) {
      setLabOutputHistoryHint(
        hintEl,
        shouldApplyMobileLabHistoryWindow()
          ? 'Sin estudios en los últimos 3 días. En escritorio se procesan labs y sincronizan aquí para referencia rápida.'
          : 'Al procesar un reporte con paciente activo, cada conjunto queda guardado aquí (sirve para Tendencias y diagramas).',
        { mobileReference: mobileLabReferenceMode() && shouldApplyMobileLabHistoryWindow() }
      );
    }
    if (moreMenu) moreMenu.hidden = true;
    syncLabHistoryDayNavButtons([], '');
    ensureMobileLabOutputShellVisible();
    if (mobileLabReferenceMode()) syncMobileLabReferenceChrome();
    return '';
  }
  if (hintEl) hintEl.style.display = 'none';
  if (moreMenu) moreMenu.hidden = mobileLabReferenceMode() ? true : false;
  var days = groupLabHistoryByDay(hist);
  var selectedDayKey = resolveSelectedDayKey(
    days,
    (opts && opts.preferSetId) || _labHistorySelectedSetId[pid],
    labSetIdForHistory
  );
  var selectedValue = daySelectValue(selectedDayKey);
  _labHistorySelectedSetId[pid] = selectedValue;
  if (_labHistoryDateSelectCacheKey !== cacheKey) {
    selectEl.innerHTML = buildLabHistoryDayOptionsHtml(days, selectedDayKey);
    _labHistoryDateSelectCacheKey = cacheKey;
  } else if (selectEl.value !== selectedValue) {
    selectEl.value = selectedValue;
  }
  selectEl.hidden = false;
  var navSetId = latestSetIdInLabHistoryDay(
    days.find(function (d) { return d.dayKey === selectedDayKey; }) || days[0],
    labSetIdForHistory
  );
  syncLabHistoryDayNavButtons(hist, navSetId);
  if (mobileLabReferenceMode()) syncMobileLabReferenceChrome();
  return selectedValue;
}

/** Prev/next-day arrow buttons flanking the Día picker. */
function stepLabHistoryDay(delta) {
  var pid = rt.getActiveId();
  if (!pid) return;
  var hist = getActivePatientLabHistory();
  if (!hist.length) return;
  var days = groupLabHistoryByDay(hist);
  var currentDayKey = resolveSelectedDayKey(days, _labHistorySelectedSetId[pid], labSetIdForHistory);
  var currentDayIdx = days.findIndex(function (d) { return d.dayKey === currentDayKey; });
  if (currentDayIdx < 0) currentDayIdx = 0;
  var nextDayIdx = stepLabHistoryDayIndex(days, currentDayIdx, delta);
  if (nextDayIdx < 0 || nextDayIdx === currentDayIdx) return;
  var nextValue = daySelectValue(days[nextDayIdx].dayKey);
  onLabHistoryDateChange(nextValue);
  syncLabHistoryDateSelect({ preferSetId: nextValue });
}

function buildLabHistoryReplayResult_(set) {
  const patient = getPatients().find(function (p) { return p.id === rt.getActiveId(); });
  const name = patient ? patient.nombre || '' : '';
  const reg = patient ? patient.registro || '' : '';
  return {
    patient: { name: name, expediente: reg, sexo: '', edad: '', fecha: set.fecha || '' },
    resLabs: set.resLabs,
    sourceText: set.sourceText || '',
    bhExtras: set.bhExtras,
    refsBySection: set.refsBySection,
  };
}

function announceLabHistoryReplay_(setId) {
  rt.addAuditEntry('lab-history-replay', 'ok', 1, String(setId));
  rt.showToast('Estudio cargado en Laboratorio', 'success');
  const outSec = document.getElementById('lab-output-section');
  if (!outSec || outSec.style.display === 'none') return;
  try {
    outSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch {
    outSec.scrollIntoView(true);
  }
}

function loadLabHistorySetIntoOutput(setId, opts) {
  if (!rt.getActiveId()) return false;
  const hist = getActivePatientLabHistory();
  const day = findDayForHistoryRef(groupLabHistoryByDay(hist), setId, labSetIdForHistory);
  var payload = buildDayOutputPayload(day);
  if (!payload) return false;
  labPanelBridge.renderOutput(buildLabHistoryReplayResult_(payload.result), {
    fromHistory: true,
    silent: !!(opts && opts.silent),
    dayGroups: payload.view.groups,
  });
  if (!mobileLabReferenceMode()) rt.renderDiagramas(payload.newest.resLabs);
  if (!(opts && opts.silent)) announceLabHistoryReplay_(setId);
  return true;
}

function maybeShowLabHistoryForActivePatient(opts) {
  var pid = rt.getActiveId();
  if (!pid) return;
  var selectedId = syncLabHistoryDateSelect(opts);
  if (!selectedId) {
    if (!labPanelBridge.getActiveLab()) {
      var sec = document.getElementById('lab-output-section');
      if (sec && !mobileLabReferenceMode()) sec.style.display = 'none';
      else ensureMobileLabOutputShellVisible();
      labPanelBridge.syncLabOutputChrome();
    }
    return;
  }
  if (labPanelBridge.getActiveLab() && !(opts && opts.forceReload)) return;
  loadLabHistorySetIntoOutput(selectedId, { silent: true });
}

export function renderLabHistoryPanel() {
  ensureMobileLabOutputShellVisible();
  var selectedId = syncLabHistoryDateSelect();
  if (selectedId && !labPanelBridge.getActiveLab()) {
    loadLabHistorySetIntoOutput(selectedId, { silent: true });
  } else if (!selectedId && !labPanelBridge.getActiveLab()) {
    var sec = document.getElementById('lab-output-section');
    if (sec && !mobileLabReferenceMode()) sec.style.display = 'none';
    else ensureMobileLabOutputShellVisible();
    labPanelBridge.syncLabOutputChrome();
  }
  rt.renderRoundOverviewPanels();
  if (isPaseMode()) rt.renderPaseBoard();
}

function onLabHistoryDateChange(setId) {
  var pid = rt.getActiveId();
  if (pid && setId) _labHistorySelectedSetId[pid] = setId;
  loadLabHistorySetIntoOutput(setId, { silent: true });
}

function selectedDaySetIds() {
  var selectEl = document.getElementById('lab-history-date-select');
  if (!selectEl || selectEl.hidden || !selectEl.value) return [];
  var day = findDayForHistoryRef(
    groupLabHistoryByDay(getActivePatientLabHistory()),
    selectEl.value,
    labSetIdForHistory
  );
  if (!day) return [];
  return day.rows.map(function (row) {
    return labSetIdForHistory(row.set, row.idx);
  });
}

function reprocessSelectedLabHistorySet() {
  var ids = selectedDaySetIds();
  if (!ids.length) {
    rt.showToast('No hay estudio seleccionado', 'error');
    return;
  }
  reprocessLabHistorySet(ids[0]);
}

function deleteSelectedLabHistorySet() {
  var selectEl = document.getElementById('lab-history-date-select');
  if (!selectEl || selectEl.hidden || !selectEl.value) {
    rt.showToast('No hay estudio seleccionado', 'error');
    return;
  }
  var hist = getActivePatientLabHistory();
  var day = findDayForHistoryRef(groupLabHistoryByDay(hist), selectEl.value, labSetIdForHistory);
  if (!day || !day.rows.length) {
    rt.showToast('No hay estudio seleccionado', 'error');
    return;
  }
  if (day.rows.length === 1) {
    deleteLabHistorySet(labSetIdForHistory(day.rows[0].set, day.rows[0].idx));
    return;
  }
  deleteLabHistoryDay_(day);
}

function deleteAllLabHistorySets() {
  var pid = rt.getActiveId();
  if (!pid) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var sets = normalizeLabHistoryPatientSets(getLabHistory()[pid]);
  if (!sets.length) {
    rt.showToast('No hay estudios en el historial', 'info');
    return;
  }
  if (
    !confirm(
      '¿Eliminar todos los estudios de laboratorio de este paciente?\n\n' +
        'Se borrarán ' +
        sets.length +
        ' conjunto' +
        (sets.length === 1 ? '' : 's') +
        ' del historial. Las tendencias y diagramas se recalcularán.'
    )
  ) {
    return;
  }
  delete getLabHistory()[pid];
  bumpLabHistoryRevision(pid);
  
  persistClinicalState({ immediate: true });
  rt.addAuditEntry('lab-history-delete-all', 'ok', sets.length, String(pid));
  labPanelBridge.setActiveLab(null);
  clearLabHistoryDateSelectCache();
  _labHistorySelectedSetId[pid] = '';
  rt.rebuildEstudiosFromLabHistory(pid);
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  rt.showToast('Historial de laboratorio borrado', 'success');
}

function replayLabHistorySet(setId) {
  if (!rt.getActiveId()) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  _labHistorySelectedSetId[rt.getActiveId()] = String(setId || '');
  if (!loadLabHistorySetIntoOutput(setId)) {
    rt.showToast('No se encontró ese estudio', 'error');
    return;
  }
  syncLabHistoryDateSelect({ preferSetId: setId });
  rt.openPaseSectionInNormal('labs');
}

function collectReprocessSourceParts_(set, ctx) {
  const srcParts = [];
  if (set.sourceText && String(set.sourceText).trim()) srcParts.push(String(set.sourceText).trim());
  (ctx.extraSourceTexts || []).forEach(function (t) {
    if (t && srcParts.indexOf(t) === -1) srcParts.push(t);
  });
  return srcParts;
}

function chartPatientForActiveId_() {
  const patientId = rt.getActiveId();
  if (!patientId) return null;
  return getPatients().find(function (p) {
    return String(p.id) === String(patientId);
  }) || null;
}

function priorRefsForActivePatient_(excludeSetId) {
  const pid = rt.getActiveId();
  if (!pid) return Object.create(null);
  const others = sortLabHistoryChronological(getLabHistory()[pid] || []).filter(function (s) {
    return !excludeSetId || String(s.id) !== String(excludeSetId);
  });
  return collectPriorRefsFromHistory(others);
}

function reprocessLabSetResLabs_(set, ctx) {
  const srcParts = collectReprocessSourceParts_(set, ctx);
  const priorRefs = priorRefsForActivePatient_(set && set.id);
  const priorGas = priorRefs.GASES || Object.create(null);
  let repro;
  if (srcParts.length) {
    const mergedSrc = srcParts.join('\n\n---\n\n');
    const chartPatient = chartPatientForActiveId_();
    const parsed = procesarLabs(mergedSrc, {
      patient: chartPatient || undefined,
      priorRefsBySection: priorRefs,
    });
    repro = reprocessLabResultLines_(parsed.resLabs || [], {
      gasRefs: mergeGasRefs_(priorGas, parsed.refsBySection && parsed.refsBySection.GASES),
    });
    if (parsed.bhExtras && typeof parsed.bhExtras === 'object') {
      set.bhExtras = Object.assign({}, set.bhExtras || {}, parsed.bhExtras);
    }
  } else {
    repro = reprocessLabResultLines_(set.resLabs, {
      gasRefs: mergeGasRefs_(priorGas, set.refsBySection && set.refsBySection.GASES),
    });
  }
  return repro;
}

function finalizeReprocessedLabSet_(set, repro, setId) {
  set.resLabs = sanitizeResLabsChunks(repro);
  refreshSameDayAscitisForPatient(rt.getActiveId(), set.id);
  set.parsed = rt.extractParsedValues(set.resLabs);
  set.parsedBySection = rt.buildParsedBySectionFromResLabs(set.resLabs, set.bhExtras);
  delete set._parseFingerprint;
  bumpLabHistoryRevision(rt.getActiveId());
  rt.rebuildEstudiosFromLabHistory(rt.getActiveId());
  persistClinicalState({ immediate: true });
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  replayLabHistorySet(setId);
  rt.addAuditEntry('lab-history-reprocess', 'ok', 1, String(setId));
  rt.showToast('Estudio reprocesado desde resultados ✓', 'success');
}

function reprocessLabHistorySet(setId) {
  if (!rt.getActiveId()) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  const sets = normalizeLabHistoryPatientSets(getLabHistory()[rt.getActiveId()]);
  const set = findLabHistorySetByRef(sets, setId);
  if (!set) {
    rt.showToast('No se encontró ese estudio', 'error');
    return;
  }
  if (!set.resLabs || !set.resLabs.length) {
    rt.showToast('Este estudio no tiene resultados para reprocesar', 'error');
    return;
  }
  try {
    const ctx = buildSameDaySerumContext(rt.getActiveId(), set);
    const rawRepro = reprocessLabSetResLabs_(set, ctx);
    if (!rawRepro || !rawRepro.length) {
      rt.showToast('No se pudieron regenerar resultados desde el bloque guardado', 'error');
      return;
    }
    const repro = refreshCitoquimicoInterpretacionInResLabs_(rawRepro, set.sourceText || '', ctx);
    finalizeReprocessedLabSet_(set, repro, setId);
  } catch {
    rt.showToast('Error al reprocesar este estudio', 'error');
  }
}

function deleteLabHistorySet(setId) {
  var pid = rt.getActiveId();
  if (!pid) return;
  var sets = normalizeLabHistoryPatientSets(getLabHistory()[pid]);
  if (!sets.length) return;
  if (!confirm('¿Eliminar este conjunto del historial? Las tendencias se recalcularán.')) return;
  var sid = String(setId == null ? '' : setId);
  if (sid.indexOf('__idx_') === 0) {
    var idx = parseInt(sid.slice(6), 10);
    if (Number.isFinite(idx) && idx >= 0 && idx < sets.length) sets.splice(idx, 1);
  } else {
    sets = sets.filter(function (s) { return String(s.id) !== sid; });
  }
  if (sets.length) getLabHistory()[pid] = sets;
  else delete getLabHistory()[pid];
  bumpLabHistoryRevision(pid);
  persistClinicalState({ immediate: true });
  rt.addAuditEntry('lab-history-delete', 'ok', 1, String(setId));
  labPanelBridge.setActiveLab(null);
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  rt.showToast('Eliminado del historial', 'success');
}

function deleteLabHistoryDay_(day) {
  var pid = rt.getActiveId();
  if (!pid || !day || !day.rows.length) return;
  var n = day.rows.length;
  if (
    !confirm(
      '¿Eliminar los ' +
        n +
        ' conjuntos de este día?\n\nLas tendencias se recalcularán.'
    )
  ) {
    return;
  }
  var sets = filterOutDaySets(normalizeLabHistoryPatientSets(getLabHistory()[pid]), day);
  if (sets.length) getLabHistory()[pid] = sets;
  else delete getLabHistory()[pid];
  bumpLabHistoryRevision(pid);
  persistClinicalState({ immediate: true });
  rt.addAuditEntry('lab-history-delete-day', 'ok', n, String(day.dayKey || ''));
  labPanelBridge.setActiveLab(null);
  clearLabHistoryDateSelectCache();
  _labHistorySelectedSetId[pid] = '';
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  rt.showToast('Día eliminado del historial', 'success');
}

export function clearLabHistoryDateSelectCache() {
  _labHistoryDateSelectCacheKey = '';
}

export function setLabHistorySelectedSetId(pid, setId) {
  if (pid && setId) _labHistorySelectedSetId[pid] = setId;
}

export { labSetIdForHistory };

export {
  getActivePatientLabHistory,
  syncLabHistoryDateSelect,
  loadLabHistorySetIntoOutput,
  maybeShowLabHistoryForActivePatient,
  buildSameDaySerumContext,
  refreshSameDayAscitisForPatient,
  onLabHistoryDateChange,
  stepLabHistoryDay,
  reprocessSelectedLabHistorySet,
  deleteSelectedLabHistorySet,
  deleteAllLabHistorySets,
  replayLabHistorySet,
  reprocessLabHistorySet,
  deleteLabHistorySet,
  labHistoryPanelIsCollapsed,
  toggleLabHistoryPanel,
};

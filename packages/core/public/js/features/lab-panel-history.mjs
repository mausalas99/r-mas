import { esc } from '../dom-escape.mjs';
// Lab panel — historial, dedupe, consolidación
import { procesarLabs, reprocessLabResultLines_, collectPriorRefsFromHistory, collectPriorBhValuesFromHistory, mergeGasRefs_, refreshCitoquimicoInterpretacionInResLabs_, resLabsHasCitoquimFluid_ } from '../labs.js';
import { dedupeConsolidatedLabRows } from '../lab-bulk-paste.mjs';
import { sortLabHistoryChronological } from '../tend-core.mjs';
import { normalizeLabHistoryPatientSets } from '../storage.js';
import { getPatients, getLabHistory, persistClinicalState } from '../app-state.mjs';
import { applyExactLabHistoryDedupe } from '../lab-history-exact-prune.mjs';
import { bumpLabHistoryRevision, getLabHistoryRevision } from '../lab-history-cache.mjs';
import { filterLabHistorySetsForMobileReference, shouldApplyMobileLabHistoryWindow } from './cloud-mobile/lab-history-window.mjs';
import { isMobileWeb, syncMobileLabReferenceChrome } from '../mobile-web.mjs';
import { sanitizeResLabsChunks } from '../labs-reslabs-sanitize.mjs';
import { rt } from './lab-panel-runtime-state.mjs';
import { labPanelBridge } from './lab-panel-bridge.mjs';
import { groupLabHistoryByDay, findLabHistoryDayIndexForSet, stepLabHistoryDayIndex, latestSetIdInLabHistoryDay, labHistoryDayArrowDelta, canHandleLabHistoryDayArrow, findLabDaysWithStudy } from '../lab-history-day-nav.mjs';
import { setLabSearchQuery } from './lab-results-card.mjs';
import { buildDayOutputPayload, buildLabHistoryDayOptionsHtml, daySelectValue, findDayForHistoryRef, resolveSelectedDayKey, filterOutDaySets } from '../lab-history-day-view.mjs';
import { openConfirm } from './workbench/confirm.mjs';

function buildSameDaySerumContext(patientId, targetSet) {
  if (!patientId || !targetSet) return {};
  var dk = rt.dayKeyFromLabSet(targetSet);
  if (!dk || dk === 'unknown' || dk === 'Anterior') return {};
  var sets = getLabHistory()[patientId] || [];
  var extraSourceTexts = [];
  var extraResLabs = [];
  sets.forEach(function (other) {
    if (!other || String(other.id) === String(targetSet.id)) return;
    if (rt.dayKeyFromLabSet(other) !== dk) return;
    if (rt.primaryTipoForLabSet(other.resLabs || []) === 'cultivo') return;
    var src = String(other.sourceText || '').trim();
    if (src) extraSourceTexts.push(src);
    if (other.resLabs && other.resLabs.length) extraResLabs.push(other.resLabs);
  });
  return { extraSourceTexts: extraSourceTexts, extraResLabs: extraResLabs };
}

function refreshSameDayAscitisForPatient(patientId, triggerSetId) {
  if (!patientId) return false;
  var sets = getLabHistory()[patientId];
  if (!Array.isArray(sets) || !sets.length) return false;
  var trigger =
    triggerSetId != null
      ? sets.find(function (s) {
          return s && String(s.id) === String(triggerSetId);
        })
      : null;
  var dayKeys = Object.create(null);
  if (trigger) {
    var tdk = rt.dayKeyFromLabSet(trigger);
    if (tdk && tdk !== 'unknown' && tdk !== 'Anterior') dayKeys[tdk] = true;
  } else {
    sets.forEach(function (s) {
      var dk = rt.dayKeyFromLabSet(s);
      if (dk && dk !== 'unknown' && dk !== 'Anterior') dayKeys[dk] = true;
    });
  }
  var changed = false;
  Object.keys(dayKeys).forEach(function (dk) {
    sets.forEach(function (set) {
      if (!set || rt.dayKeyFromLabSet(set) !== dk) return;
      var src = String(set.sourceText || '').trim();
      var hasCitoquim =
        resLabsHasCitoquimFluid_(set.resLabs) ||
        (src && /\bCITOQUIMICO\b/i.test(src));
      if (!hasCitoquim) return;
      var ctx = buildSameDaySerumContext(patientId, set);
      var next = refreshCitoquimicoInterpretacionInResLabs_(set.resLabs || [], src, ctx);
      var prevStr = '';
      var nextStr = '';
      try {
        prevStr = JSON.stringify(set.resLabs || []);
        nextStr = JSON.stringify(next);
      } catch {
        set.resLabs = next;
        changed = true;
        return;
      }
      if (prevStr !== nextStr) {
        set.resLabs = next;
        set.parsed = rt.extractParsedValues(next);
        set.parsedBySection = rt.buildParsedBySectionFromResLabs(next, set.bhExtras);
        delete set._parseFingerprint;
        changed = true;
      }
    });
  });
  return changed;
}

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
  if (applyExactLabHistoryDedupe(pid).length) persistClinicalState();
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

/** Bar ⋯ menu: entries that need saved studies (copy days, delete) show only when there are some. */
function syncLabMenuHistoryItems_(hasHistory) {
  document.querySelectorAll('[data-lab-needs-history]').forEach(function (el) {
    el.hidden = !hasHistory;
  });
}

function handleLabHistoryNoPatientSelect_(selectEl, hintEl) {
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
  syncLabMenuHistoryItems_(false);
  syncLabHistoryDayNavButtons([], '');
  if (mobileLabReferenceMode()) syncMobileLabReferenceChrome();
  return '';
}

function handleLabHistoryEmptySelect_(selectEl, hintEl, cacheKey) {
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
  syncLabMenuHistoryItems_(false);
  syncLabHistoryDayNavButtons([], '');
  ensureMobileLabOutputShellVisible();
  if (mobileLabReferenceMode()) syncMobileLabReferenceChrome();
  return '';
}

function populateLabHistoryDateSelect_(selectEl, hist, pid, cacheKey, opts) {
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

function syncLabHistoryDateSelect(opts) {
  ensureMobileLabOutputShellVisible();
  var selectEl = document.getElementById('lab-history-date-select');
  var hintEl = document.getElementById('lab-output-history-hint');
  if (!selectEl) return '';
  var pid = rt.getActiveId();
  if (!pid) return handleLabHistoryNoPatientSelect_(selectEl, hintEl);
  var hist = getActivePatientLabHistory();
  var cacheKey = String(pid) + '|L' + getLabHistoryRevision(pid) + '|N' + hist.length;
  if (!hist.length) return handleLabHistoryEmptySelect_(selectEl, hintEl, cacheKey);
  if (hintEl) hintEl.style.display = 'none';
  syncLabMenuHistoryItems_(true);
  return populateLabHistoryDateSelect_(selectEl, hist, pid, cacheKey, opts);
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

/** Resultados search box: jump to the newest day that mentions the study, arrows step between days. */
var labSearch = { pid: '', hits: [], pos: 0 };

function labSearchInput_() {
  return document.getElementById('lab-search-input');
}

function syncLabSearchUi_() {
  var root = document.getElementById('lab-search');
  var input = labSearchInput_();
  if (!root || !input) return;
  var has = !!input.value.trim();
  root.classList.toggle('has-query', has);
  var n = labSearch.hits.length;
  document.getElementById('lab-search-count').textContent = !has ? '' : n ? labSearch.pos + 1 + ' de ' + n : 'Sin resultados';
  document.getElementById('lab-search-prev').disabled = labSearch.pos >= n - 1;
  document.getElementById('lab-search-next').disabled = labSearch.pos <= 0;
}

function jumpToLabSearchHit_() {
  var day = groupLabHistoryByDay(getActivePatientLabHistory())[labSearch.hits[labSearch.pos]];
  if (!day) return;
  var value = daySelectValue(day.dayKey);
  onLabHistoryDateChange(value);
  syncLabHistoryDateSelect({ preferSetId: value });
}

function runLabSearch_() {
  var pid = rt.getActiveId();
  var q = labSearchInput_().value;
  var days = pid ? groupLabHistoryByDay(getActivePatientLabHistory()) : [];
  labSearch = { pid: pid, hits: findLabDaysWithStudy(days, q), pos: 0 };
  setLabSearchQuery(labSearch.hits.length ? q : '');
  if (labSearch.hits.length) jumpToLabSearchHit_();
  syncLabSearchUi_();
}

/** delta +1 = older match, −1 = newer match (same direction as the day arrows). */
function stepLabSearch_(delta) {
  var next = labSearch.pos + delta;
  if (next < 0 || next >= labSearch.hits.length) return;
  labSearch.pos = next;
  jumpToLabSearchHit_();
  syncLabSearchUi_();
}

function clearLabSearch_() {
  var input = labSearchInput_();
  if (!input) return;
  input.value = '';
  labSearch = { pid: rt.getActiveId(), hits: [], pos: 0 };
  setLabSearchQuery('');
  syncLabSearchUi_();
}

function wireLabSearch_() {
  var input = labSearchInput_();
  if (!input) return;
  if (labSearch.pid !== rt.getActiveId() && input.value) clearLabSearch_();
  if (input.dataset.wired) return;
  input.dataset.wired = '1';
  input.addEventListener('input', runLabSearch_);
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') stepLabSearch_(ev.shiftKey ? -1 : 1);
    else if (ev.key === 'Escape') clearLabSearch_();
    else return;
    ev.preventDefault();
  });
  document.getElementById('lab-search-prev').addEventListener('click', function () { stepLabSearch_(1); });
  document.getElementById('lab-search-next').addEventListener('click', function () { stepLabSearch_(-1); });
  document.getElementById('lab-search-clear').addEventListener('click', function () { clearLabSearch_(); input.focus(); });
}

/** Bar ⋯ menu: Vista switches follow the saved prefs; outside click / Esc close it. */
function wireLabBarMenu_() {
  var menu = document.getElementById('lab-bar-more');
  if (!menu || menu.dataset.wired) return;
  menu.dataset.wired = '1';
  menu.addEventListener('toggle', function () {
    if (!menu.open) return;
    var prefs = rt.getLabOutputPrefs();
    var state = {
      'lab-menu-pref-bh': prefs.showBhExtendedLine,
      'lab-menu-pref-gaso': !prefs.hideGasoAdvInterp,
      'lab-menu-pref-quick': prefs.quickLabOutput,
    };
    Object.keys(state).forEach(function (id) {
      var cb = document.getElementById(id);
      if (!cb) return;
      cb.checked = !!state[id];
      cb.setAttribute('aria-checked', cb.checked ? 'true' : 'false');
    });
  });
  document.addEventListener('click', function (ev) {
    if (menu.open && !menu.contains(ev.target)) menu.open = false;
  });
  menu.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' || !menu.open) return;
    menu.open = false;
    menu.querySelector('summary').focus();
  });
}

function labHistoryDayArrowContext(ev) {
  var tag = ev.target && ev.target.tagName ? ev.target.tagName.toUpperCase() : '';
  var lab = document.getElementById('appcontent-lab');
  var picker = document.getElementById('lab-history-date-select');
  return {
    key: ev.key,
    modifier: !!(ev.metaKey || ev.ctrlKey || ev.altKey),
    typing:
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      !!(ev.target && ev.target.isContentEditable),
    labTabVisible: !!(lab && lab.style.display !== 'none' && !lab.hidden),
    hasDayPicker: !!(picker && !picker.hidden),
  };
}

var labHistoryDayKeysWired = false;

function wireLabHistoryDayKeys() {
  if (labHistoryDayKeysWired) return;
  labHistoryDayKeysWired = true;
  document.addEventListener('keydown', function (ev) {
    if (!canHandleLabHistoryDayArrow(labHistoryDayArrowContext(ev))) return;
    ev.preventDefault();
    stepLabHistoryDay(labHistoryDayArrowDelta(ev.key));
  });
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
  if (!mobileLabReferenceMode()) {
    rt.renderDiagramas((payload.labwork || payload.newest).resLabs);
  }
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

/** Clear the processed-lab output area (not the paste box). */
export function clearLabOutputDom() {
  var banner = document.getElementById('lab-banner');
  if (banner) banner.style.display = 'none';
  var diagramsBtn = document.getElementById('lab-diagrams-btn');
  if (diagramsBtn) diagramsBtn.hidden = true;
  ['diagrams-grid', 'lab-output-box'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
}

/** Output left over from another patient: a patient switch whose deferred
 * clear got replaced (a Nube pull repaint) or cancelled (a quick tab click)
 * would otherwise keep the previous patient's labs on screen. */
export function dropOtherPatientsLabOutput() {
  if (!labPanelBridge.getActiveLab()) return;
  if (String(labPanelBridge.getActiveLabPatientId() ?? '') === String(rt.getActiveId() ?? '')) return;
  labPanelBridge.setActiveLab(null);
  clearLabOutputDom();
}

export function renderLabHistoryPanel() {
  dropOtherPatientsLabOutput();
  wireLabHistoryDayKeys();
  wireLabSearch_();
  wireLabBarMenu_();
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

async function deleteSelectedLabHistorySet() {
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
    await deleteLabHistorySet(labSetIdForHistory(day.rows[0].set, day.rows[0].idx));
    return;
  }
  await deleteLabHistoryDay_(day);
}

async function deleteAllLabHistorySets() {
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
  var result = await openConfirm({
    weight: 'destructive',
    title: '¿Eliminar todos los estudios de laboratorio de este paciente?',
    message:
      'Se borrarán ' +
      sets.length +
      ' conjunto' +
      (sets.length === 1 ? '' : 's') +
      ' del historial. Las tendencias y diagramas se recalcularán.',
    confirmLabel: 'Eliminar',
  });
  if (result !== 'confirm') {
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
  rt.switchAppTab('lab');
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

function otherLabSetsForActivePatient_(excludeSetId) {
  const pid = rt.getActiveId();
  if (!pid) return [];
  return sortLabHistoryChronological(getLabHistory()[pid] || []).filter(function (s) {
    return !excludeSetId || String(s.id) !== String(excludeSetId);
  });
}

function priorRefsForActivePatient_(excludeSetId) {
  return collectPriorRefsFromHistory(otherLabSetsForActivePatient_(excludeSetId));
}

/** Hto/Ret de otra toma del mismo día para completar RetC cuando la toma actual solo trae uno. */
function priorBhValuesForActivePatient_(excludeSetId, fecha) {
  return collectPriorBhValuesFromHistory(otherLabSetsForActivePatient_(excludeSetId), fecha);
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
      priorBhValues: priorBhValuesForActivePatient_(set && set.id, set && set.fecha),
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

async function deleteLabHistorySet(setId) {
  var pid = rt.getActiveId();
  if (!pid) return;
  var sets = normalizeLabHistoryPatientSets(getLabHistory()[pid]);
  if (!sets.length) return;
  var result = await openConfirm({
    weight: 'destructive',
    title: '¿Eliminar este conjunto del historial? Las tendencias se recalcularán.',
    confirmLabel: 'Eliminar',
  });
  if (result !== 'confirm') return;
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

/** Removes one result line (a resLabs chunk) from every saved set of the selected day. */
function removeLabHistoryLine(text, fullRender) {
  var pid = rt.getActiveId();
  var ids = selectedDaySetIds();
  if (!pid || !ids.length) return false;
  var sets = normalizeLabHistoryPatientSets(getLabHistory()[pid]);
  var touched = 0;
  ids.forEach(function (id) {
    var set = findLabHistorySetByRef(sets, id);
    if (!set || !set.resLabs) return;
    var next = set.resLabs.filter(function (t) { return t !== text; });
    if (next.length === set.resLabs.length) return;
    touched++;
    set.resLabs = next;
    set.parsed = rt.extractParsedValues(next);
    set.parsedBySection = rt.buildParsedBySectionFromResLabs(next, set.bhExtras);
    delete set._parseFingerprint;
  });
  if (!touched) {
    rt.showToast('No se encontró esa línea', 'error');
    return false;
  }
  sets = sets.filter(function (s) { return s.resLabs && s.resLabs.length; });
  if (sets.length) getLabHistory()[pid] = sets;
  else delete getLabHistory()[pid];
  bumpLabHistoryRevision(pid);
  persistClinicalState({ immediate: true });
  rt.addAuditEntry('lab-history-delete-line', 'ok', touched, String(text).split(/[\t\s]/)[0]);
  rt.rebuildEstudiosFromLabHistory(pid);
  if (fullRender) {
    labPanelBridge.setActiveLab(null);
    clearLabHistoryDateSelectCache();
    renderLabHistoryPanel();
  } else {
    var lab = labPanelBridge.getActiveLab();
    var drop = function (o) {
      if (o && o.resLabs) o.resLabs = o.resLabs.filter(function (t) { return t !== text; });
    };
    drop(lab);
    if (lab && lab.dayGroups) lab.dayGroups.forEach(drop);
  }
  rt.refreshTendenciasOrCultivosPanel();
  rt.showToast('Línea quitada', 'success');
  return true;
}

async function deleteLabHistoryDay_(day) {
  var pid = rt.getActiveId();
  if (!pid || !day || !day.rows.length) return;
  var n = day.rows.length;
  var result = await openConfirm({
    weight: 'destructive',
    title: '¿Eliminar los ' + n + ' conjuntos de este día?',
    message: 'Las tendencias se recalcularán.',
    confirmLabel: 'Eliminar',
  });
  if (result !== 'confirm') {
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
  removeLabHistoryLine,
  labHistoryPanelIsCollapsed,
  toggleLabHistoryPanel,
};

// Built from app.js refactor — Laboratorio pane (historial, paste, multilab, salida)
import { storage } from "../storage.js";
import {
  procesarLabs,
  buildRefsBySectionFromReport,
  looksLikeSomeLabReport,
  reprocessLabResultLines_,
  refreshAscitisInterpretacionInResLabs_,
  resLabsHasAsciticFluid_,
  renderEntry,
} from "../labs.js";
import { parseSomeReportTables } from "../labs-some-table.mjs";
import {
  closeLabSomeTablesModal,
  openLabSomeTablesModal,
  registerLabSomeTablesModalRuntime,
  syncLabSomeTablesBtn,
} from "./lab-some-tables-modal.mjs";
import {
  closeSesionIngresoSendModal,
  openSesionIngresoSendModal,
  registerSesionIngresoSendRuntime,
} from "./sesion-ingreso-send-modal.mjs";
import {
  isDuplicateAgainstLatest,
  findDuplicateLabSetIdsToRemove,
  findExactDuplicateLabGroups,
  compareLabSetIdForDedupe,
  normalizeLabLine,
  areDuplicateLabSets,
} from "../lab-history-auto-store-core.mjs";
import {
  buildBulkLabPreview,
  mergeBulkParseResults,
  LAB_BULK_PATIENT_SEPARATOR,
  shouldShowBulkLabPreview,
} from "../lab-bulk-paste.mjs";
import {
  openLabBulkPreviewModal,
} from "./lab-bulk-preview-modal.mjs";
import {
  sortLabHistoryChronological,
  parseFechaLabToMs,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
} from "../tend-core.mjs";
import { evaluateLabSuggestions, filterNewLabSuggestions } from "../lab-clinical-suggestions.mjs";
import { evaluateElectrolyteManejo } from "../electrolyte-manejo.mjs";
import {
  areElectrolyteReplacementSuggestionsHidden,
  areLabClinicalSuggestionsHidden,
} from "../clinical-product-policy.mjs";
import { shouldClearManejoPendingForDismissals } from "../manejo-todo-dismiss.mjs";
import { normalizeLabHistoryPatientSets } from "../storage.js";
import { patients, notes, labHistory, saveState } from "../app-state.mjs";
import { bumpLabHistoryRevision } from "../lab-history-cache.mjs";
import { isPaseMode } from "./chrome.mjs";

let rt = {
  showToast() {},
  getActiveId() {
    return null;
  },
  setActiveId() {},
  selectPatient() {},
  renderRoundOverviewPanels() {},
  refreshTendenciasOrCultivosPanel() {},
  renderPaseBoard() {},
  onboardingAdvanceAfterParse() {},
  onboardingAdvanceAfterSend() {},
  tourAfterBulkLabParse() {},
  findPatientByRegistro() {
    return null;
  },
  addAuditEntry() {},
  openPaseSectionInNormal() {},
  renderDiagramas() {},
  pushUndoSnapshot() {},
  setMedTabAttention() {},
  switchAppTab() {},
  closeSettingsDropdown() {},
  extractParsedValues(resLabs) {
    return {};
  },
  buildParsedBySectionFromResLabs() {},
  ensureParsedLabHistory() {
    return [];
  },
  rebuildEstudiosFromLabHistory() {},
  inferFechaLabSetFromId() {},
  dayKeyFromLabSet() {},
  primaryTipoForLabSet() {},
  refreshAllTodoUIs() {},
  emitLiveSyncTodoUpsert() {},
  renderManejo() {},
  refreshManejoPanel() {},
  removeAtbRisPanelsFromBody() {},
  wireAtbRisHoverPanels() {},
  copyToClipboardSafe(_t) {
    return Promise.resolve(false);
  },
  getLabOutputPrefs() {
    return { showBhExtendedLine: false, hideGasoAdvInterp: false };
  },
  isGasoInterpretacionResLabChunk() {
    return false;
  },
  isAscitisInterpretacionResLabChunk() {
    return false;
  },
  ascitisInterpretacionBody_(text) {
    return String(text || '');
  },
  formatBhExtendedTabLine() {
    return "";
  },
  isBhMainResLabChunk() {
    return false;
  },
  isResLabChunkPureCultivo() {
    return false;
  },
  buildCultivoOutputHtmlFragments() {
    return "";
  },
  buildLabSetDateLine() {
    return "";
  },
};

export function registerLabPanelRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt, ctx);
}

var activeLab = null;

export function getActiveLab() {
  return activeLab;
}

export function setActiveLab(next) {
  activeLab = next;
}

export function rerenderParsedLabOutputAfterPrefsChange() {
  if (activeLab && activeLab.resLabs && activeLab.resLabs.length) renderOutput(activeLab);
}

var labCopyFabBound = false;

function ensureLabCopyFabController() {
  var fab = document.getElementById("lab-copy-fab");
  if (!fab || labCopyFabBound) return;
  labCopyFabBound = true;
  if (fab.parentElement !== document.body) document.body.appendChild(fab);
  fab.removeAttribute("onclick");
  fab.addEventListener(
    "mousedown",
    function (e) {
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );
  fab.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (fab.hidden) return;
    copiarLabsAlPortapapeles();
  });
}

export function syncLabCopyFab(show) {
  ensureLabCopyFabController();
  var visible = !!show;
  var fab = document.getElementById("lab-copy-fab");
  if (fab) {
    if (visible) {
      fab.removeAttribute("hidden");
      fab.style.display = "flex";
      fab.setAttribute("aria-hidden", "false");
    } else {
      fab.setAttribute("hidden", "");
      fab.style.display = "none";
      fab.setAttribute("aria-hidden", "true");
    }
  }
  document.documentElement.classList.toggle("lab-copy-fab-active", visible);
}

registerLabSomeTablesModalRuntime({
  showToast: function (msg, kind) {
    rt.showToast(msg, kind);
  },
  getParsed: function () {
    return activeLab && activeLab.someTablesParsed ? activeLab.someTablesParsed : null;
  },
  isPaseMode: isPaseMode,
  syncLabCopyFab: syncLabCopyFab,
  syncLabOutputChrome: function () {
    syncLabOutputChrome();
  },
  openSesionIngresoSend: function () {
    openSesionIngresoSendModal();
  },
});

registerSesionIngresoSendRuntime({
  showToast: function (msg, kind) {
    rt.showToast(msg, kind);
  },
  getParsed: function () {
    return activeLab && activeLab.someTablesParsed ? activeLab.someTablesParsed : null;
  },
  getPatientLabel: function () {
    var patient = patients.find(function (p) {
      return p.id === rt.getActiveId();
    });
    return patient ? patient.nombre || patient.registro || '' : '';
  },
  getReportDate: function () {
    if (activeLab && activeLab.patient && activeLab.patient.fecha) {
      return String(activeLab.patient.fecha).trim();
    }
    return '';
  },
  sendPayload: function (payload) {
    if (window.electronAPI && window.electronAPI.sendToSesionIngreso) {
      window.electronAPI.sendToSesionIngreso(payload).then(function (ok) {
        if (ok) rt.showToast('Enviado a Neo', 'ok');
        else rt.showToast('No se pudo abrir Neo', 'warn');
      });
      return;
    }
    rt.showToast('Integración disponible solo en la app de escritorio', 'warn');
  },
});

export function syncLabOutputChrome() {
  var sec = document.getElementById("lab-output-section");
  var show = !!(sec && sec.style.display !== "none");
  if (isPaseMode()) {
    syncLabCopyFab(false);
    syncLabSomeTablesBtn(false);
    closeLabSomeTablesModal();
    return;
  }
  var hasSome = !!(
    activeLab &&
    activeLab.someTablesParsed &&
    activeLab.someTablesParsed.departments &&
    activeLab.someTablesParsed.departments.length
  );
  syncLabCopyFab(show);
  syncLabSomeTablesBtn(show && hasSome);
}

export { openLabSomeTablesModal, closeLabSomeTablesModal };

export function closeLabHistoryMoreMenu() {
  document.querySelectorAll(".lab-history-more[open]").forEach(function (d) {
    d.removeAttribute("open");
  });
}

export function clearLabWorkbenchMinimalDom() {
  var b = document.getElementById("lab-banner");
  if (b) b.style.display = "none";
  var sec = document.getElementById("lab-output-section");
  if (sec) sec.style.display = "none";
  var box = document.getElementById("lab-output-box");
  if (box) box.innerHTML = "";
  var ta = document.getElementById("lab-input");
  if (ta) ta.value = "";
  syncLabOutputChrome();
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}




var LAB_HISTORY_COLLAPSED_LS = 'rpc-ui-labHistoryCollapsed';

function labHistoryPanelIsCollapsed() {
  try { return localStorage.getItem(LAB_HISTORY_COLLAPSED_LS) === '1'; } catch (_e) { return false; }
}

export function setLabHistoryPanelCollapsed(collapsed) {
  try {
    if (collapsed) localStorage.setItem(LAB_HISTORY_COLLAPSED_LS, '1');
    else localStorage.removeItem(LAB_HISTORY_COLLAPSED_LS);
  } catch (_e) {}
}

export function syncLabHistoryCollapseUI() {
  var card = document.getElementById('lab-history-card');
  var btn = document.getElementById('btn-lab-history-toggle');
  if (!card) return;
  var collapsed = labHistoryPanelIsCollapsed();
  card.classList.toggle('is-collapsed', collapsed);
  if (btn) btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

function toggleLabHistoryPanel(ev) {
  if (ev && ev.stopPropagation) ev.stopPropagation();
  setLabHistoryPanelCollapsed(!labHistoryPanelIsCollapsed());
  syncLabHistoryCollapseUI();
}

function clearLabInputAfterSuccessfulParse() {
  var ta = document.getElementById('lab-input');
  if (!ta) return;
  ta.value = '';
  try {
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  } catch (_e) {}
}

export function safeAttrJsString(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function findLabHistorySetByRef(sets, setId) {
  var sid = String(setId == null ? '' : setId);
  if (sid.indexOf('__idx_') === 0) {
    var idx = parseInt(sid.slice(6), 10);
    if (Number.isFinite(idx) && idx >= 0 && idx < sets.length) return sets[idx];
    return null;
  }
  return sets.find(function (s) { return String(s.id) === sid; }) || null;
}

function labRowSectionKey(row) {
  var s = String(row == null ? '' : row).trim();
  if (!s) return '';
  var tabIdx = s.indexOf('\t');
  if (tabIdx >= 0) return s.substring(0, tabIdx).trim().toUpperCase();
  var colonIdx = s.indexOf(':');
  if (colonIdx > 0) return s.substring(0, colonIdx + 1).trim().toUpperCase();
  var m = s.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\b/);
  return m ? m[1].toUpperCase() : s.toUpperCase();
}

function labRowRichnessScore(row) {
  var s = normalizeLabLine(String(row == null ? '' : row));
  if (!s) return 0;
  var score = s.length;
  score += (s.match(/\b(?:AG|DELTA-DELTA|ICA|LACTATO|BICA|PCO2|PO2)\b/gi) || []).length * 8;
  score += (s.match(/\d/g) || []).length;
  if (/INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A/i.test(s)) score += 20;
  return score;
}

function dedupeConsolidatedRowsBySection(rows, tipo) {
  var normalized = [];
  var seenExact = Object.create(null);
  (rows || []).forEach(function (row) {
    var norm = normalizeLabLine(String(row == null ? '' : row));
    if (!norm) return;
    if (seenExact[norm]) return;
    seenExact[norm] = true;
    normalized.push(String(row));
  });
  if (tipo !== 'labs') return normalized;

  var bestBySection = Object.create(null);
  normalized.forEach(function (row, idx) {
    var key = labRowSectionKey(row);
    if (!key) return;
    var cand = { row: row, idx: idx, score: labRowRichnessScore(row) };
    var prev = bestBySection[key];
    if (!prev || cand.score > prev.score || (cand.score === prev.score && cand.idx > prev.idx)) {
      bestBySection[key] = cand;
    }
  });
  var has = Object.create(null);
  Object.keys(bestBySection).forEach(function (k) {
    has[bestBySection[k].idx] = true;
  });
  return normalized.filter(function (_row, idx) {
    return !!has[idx];
  });
}

var LAB_HISTORY_LIST_CAP = 50;
var _labHistoryListExpanded = {};

export function expandLabHistoryList() {
  var pid = rt.getActiveId();
  if (!pid) return;
  _labHistoryListExpanded[pid] = true;
  renderLabHistoryPanel();
}

export function renderLabHistoryPanel() {
  var card = document.getElementById('lab-history-card');
  var listEl = document.getElementById('lab-history-list');
  var hintEl = document.getElementById('lab-history-hint');
  if (!card || !listEl || !hintEl) return;
  if (!rt.getActiveId()) {
    hintEl.style.display = 'block';
    hintEl.textContent = 'Selecciona un paciente en la columna izquierda para ver los estudios que hayas enviado a su nota.';
    listEl.innerHTML = '';
    syncLabHistoryCollapseUI();
    rt.renderRoundOverviewPanels();
    if (isPaseMode()) rt.renderPaseBoard();
    return;
  }
  var pid = rt.getActiveId();
  var hist = sortLabHistoryChronological(
    rt.ensureParsedLabHistoryCached
      ? rt.ensureParsedLabHistoryCached(pid)
      : rt.ensureParsedLabHistory(pid, { readOnly: true })
  );
  if (!hist.length) {
    hintEl.style.display = 'block';
    hintEl.textContent = 'Al procesar un reporte con paciente activo, cada conjunto queda guardado aquí (sirve para Tendencias y para volver a ver diagramas).';
    listEl.innerHTML = '';
    syncLabHistoryCollapseUI();
    rt.renderRoundOverviewPanels();
    if (isPaseMode()) rt.renderPaseBoard();
    return;
  }
  hintEl.style.display = 'none';
  var showAll = !!_labHistoryListExpanded[pid];
  var visible = hist;
  var hiddenCount = 0;
  if (!showAll && hist.length > LAB_HISTORY_LIST_CAP) {
    visible = hist.slice(0, LAB_HISTORY_LIST_CAP);
    hiddenCount = hist.length - LAB_HISTORY_LIST_CAP;
  }
  var rowsHtml = visible.map(function(set, idx) {
    var meta = rt.formatLabHistoryListMeta(set);
    var sid = safeAttrJsString(
      set.id != null && String(set.id).trim() !== '' ? set.id : '__idx_' + idx
    );
    return (
      '<div class="lab-history-row" role="listitem">' +
      '<div class="lab-history-meta">' + esc(meta) + '</div>' +
      '<div class="lab-history-actions">' +
      '<button type="button" class="btn-lab-history" onclick="replayLabHistorySet(\'' + sid + '\')">Ver en Laboratorio</button>' +
      '<button type="button" class="btn-lab-history" onclick="reprocessLabHistorySet(\'' + sid + '\')">Reprocesar</button>' +
      '<button type="button" class="btn-lab-history btn-lab-history-del" onclick="deleteLabHistorySet(\'' + sid + '\')">Eliminar</button>' +
      '</div></div>'
    );
  }).join('');
  if (hiddenCount > 0) {
    rowsHtml +=
      '<div class="lab-history-more-wrap">' +
      '<button type="button" class="btn-lab-history btn-lab-history-expand" onclick="expandLabHistoryList()">Mostrar ' +
      hiddenCount +
      ' entrada' +
      (hiddenCount === 1 ? '' : 's') +
      ' anteriores</button></div>';
  }
  listEl.innerHTML = rowsHtml;
  syncLabHistoryCollapseUI();
  rt.renderRoundOverviewPanels();
  if (isPaseMode()) rt.renderPaseBoard();
}

function replayLabHistorySet(setId) {
  if (!rt.getActiveId()) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var sets = normalizeLabHistoryPatientSets(labHistory[rt.getActiveId()]);
  var set = findLabHistorySetByRef(sets, setId);
  if (!set || !set.resLabs || !set.resLabs.length) {
    rt.showToast('No se encontró ese estudio', 'error');
    return;
  }
  var patient = patients.find(function(p) { return p.id === rt.getActiveId(); });
  var name = patient ? (patient.nombre || '') : '';
  var reg = patient ? (patient.registro || '') : '';
  var result = {
    patient: { name: name, expediente: reg, sexo: '', edad: '', fecha: set.fecha || '' },
    resLabs: set.resLabs,
    sourceText: set.sourceText || ''
  };
  activeLab = result;
  renderOutput(result);
  rt.renderDiagramas(result.resLabs);
  rt.addAuditEntry('lab-history-replay', 'ok', 1, String(setId));
  rt.showToast('Estudio cargado en Laboratorio', 'success');
  rt.openPaseSectionInNormal('labs');
  var outSec = document.getElementById('lab-output-section');
  if (outSec && outSec.style.display !== 'none') {
    try { outSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_e) { outSec.scrollIntoView(true); }
  }
}

function reprocessLabHistorySet(setId) {
  if (!rt.getActiveId()) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var sets = normalizeLabHistoryPatientSets(labHistory[rt.getActiveId()]);
  var set = findLabHistorySetByRef(sets, setId);
  if (!set) {
    rt.showToast('No se encontró ese estudio', 'error');
    return;
  }
  if (!set.resLabs || !set.resLabs.length) {
    rt.showToast('Este estudio no tiene resultados para reprocesar', 'error');
    return;
  }
  try {
    var ctx = buildSameDaySerumContext(rt.getActiveId(), set);
    var srcParts = [];
    if (set.sourceText && String(set.sourceText).trim()) srcParts.push(String(set.sourceText).trim());
    (ctx.extraSourceTexts || []).forEach(function (t) {
      if (t && srcParts.indexOf(t) === -1) srcParts.push(t);
    });
    var repro;
    if (srcParts.length) {
      var mergedSrc = srcParts.join('\n\n---\n\n');
      var parsed = procesarLabs(mergedSrc);
      repro = reprocessLabResultLines_(parsed.resLabs || []);
      if (parsed.bhExtras && typeof parsed.bhExtras === 'object') {
        set.bhExtras = Object.assign({}, set.bhExtras || {}, parsed.bhExtras);
      }
    } else {
      repro = reprocessLabResultLines_(set.resLabs);
    }
    if (!repro || !repro.length) {
      rt.showToast('No se pudieron regenerar resultados desde el bloque guardado', 'error');
      return;
    }
    repro = refreshAscitisInterpretacionInResLabs_(repro, set.sourceText || '', ctx);
    set.resLabs = repro.slice();
    refreshSameDayAscitisForPatient(rt.getActiveId(), set.id);
    set.parsed = rt.extractParsedValues(set.resLabs);
    set.parsedBySection = rt.buildParsedBySectionFromResLabs(set.resLabs, set.bhExtras);
    delete set._parseFingerprint;
    bumpLabHistoryRevision(rt.getActiveId());
    applyLabClinicalSuggestions(rt.getActiveId(), set.resLabs, set.fecha, set.bhExtras);
    rt.rebuildEstudiosFromLabHistory(rt.getActiveId());
    saveState({ immediate: true });
    renderLabHistoryPanel();
    rt.refreshTendenciasOrCultivosPanel();
    replayLabHistorySet(setId);
    rt.addAuditEntry('lab-history-reprocess', 'ok', 1, String(setId));
    rt.showToast('Estudio reprocesado desde resultados ✓', 'success');
  } catch (_e) {
    rt.showToast('Error al reprocesar este estudio', 'error');
  }
}

function deleteLabHistorySet(setId) {
  var pid = rt.getActiveId();
  if (!pid) return;
  var sets = normalizeLabHistoryPatientSets(labHistory[pid]);
  if (!sets.length) return;
  if (!confirm('¿Eliminar este conjunto del historial? Las tendencias se recalcularán.')) return;
  var sid = String(setId == null ? '' : setId);
  if (sid.indexOf('__idx_') === 0) {
    var idx = parseInt(sid.slice(6), 10);
    if (Number.isFinite(idx) && idx >= 0 && idx < sets.length) sets.splice(idx, 1);
  } else {
    sets = sets.filter(function (s) { return String(s.id) !== sid; });
  }
  if (sets.length) labHistory[pid] = sets;
  else delete labHistory[pid];
  bumpLabHistoryRevision(pid);
  saveState({ immediate: true });
  rt.addAuditEntry('lab-history-delete', 'ok', 1, String(setId));
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  rt.showToast('Eliminado del historial', 'success');
}

function removeDuplicateLabSetsForPatient(patientId) {
  if (!patientId || !labHistory[patientId] || !labHistory[patientId].length) return 0;
  var sets = rt.ensureParsedLabHistory(patientId);
  var ids = findDuplicateLabSetIdsToRemove(sets);
  if (!ids.length) return 0;
  var idSet = new Set(ids);
  var before = labHistory[patientId].length;
  labHistory[patientId] = labHistory[patientId].filter(function (s) {
    return !idSet.has(String(s.id));
  });
  if (!labHistory[patientId].length) delete labHistory[patientId];
  rt.rebuildEstudiosFromLabHistory(patientId);
  bumpLabHistoryRevision(patientId);
  return before - (labHistory[patientId] ? labHistory[patientId].length : 0);
}

function labDedupeSummaryLine(set) {
  if (!set) return '—';
  return rt.formatLabHistoryListMeta(set) + ' · id ' + String(set.id).slice(-12);
}

function labParsedFingerprintForDedupe(set) {
  var p = set && set.parsed;
  if (!p || !Object.keys(p).length) p = rt.extractParsedValues(set.resLabs || []);
  var keys = Object.keys(p).filter(function (k) {
    var v = p[k];
    return v != null && isFinite(Number(v));
  }).sort();
  if (!keys.length) return '';
  return keys.map(function (k) {
    return k + ':' + Number(p[k]);
  }).join('|');
}

function labLooseDupeKey(set) {
  if (!set) return '';
  var dk = rt.dayKeyFromLabSet(set);
  if (!dk || dk === 'unknown' || dk === 'Anterior') return '';
  var fp = labParsedFingerprintForDedupe(set);
  if (!fp) return '';
  return 'd:' + dk + '||' + fp;
}

function buildLabDedupeChecklistSections(patientId) {
  var sets = rt.ensureParsedLabHistory(patientId);
  var byId = {};
  sets.forEach(function (s) {
    if (s && s.id != null) byId[String(s.id)] = s;
  });
  var rows = [];
  var exactRemoveIds = new Set();

  findExactDuplicateLabGroups(sets).forEach(function (g) {
    g.removeIds.forEach(function (id) {
      exactRemoveIds.add(id);
      var s = byId[id];
      if (!s) return;
      rows.push({
        patientId: patientId,
        id: id,
        kind: 'exact',
        checked: true,
        summary: labDedupeSummaryLine(s),
      });
    });
  });

  var looseByKey = Object.create(null);
  sets.forEach(function (s) {
    if (!s || s.id == null) return;
    var k = labLooseDupeKey(s);
    if (!k) return;
    if (!looseByKey[k]) looseByKey[k] = [];
    looseByKey[k].push(s);
  });
  Object.keys(looseByKey).forEach(function (k) {
    var arr = looseByKey[k];
    if (arr.length < 2) return;
    arr.sort(compareLabSetIdForDedupe);
    arr.slice(1).forEach(function (s) {
      var sid = String(s.id);
      if (exactRemoveIds.has(sid)) return;
      rows.push({
        patientId: patientId,
        id: sid,
        kind: 'loose',
        checked: true,
        summary: labDedupeSummaryLine(s),
      });
    });
  });

  return rows;
}

function applyLabDedupeFromChecklist(mapByPatient) {
  var removedTotal = 0;
  Object.keys(mapByPatient).forEach(function (pid) {
    var ids = mapByPatient[pid];
    if (!ids || !ids.length || !labHistory[pid]) return;
    var idSet = new Set(ids.map(String));
    var before = labHistory[pid].length;
    labHistory[pid] = labHistory[pid].filter(function (s) {
      return !idSet.has(String(s.id));
    });
    if (!labHistory[pid].length) delete labHistory[pid];
    rt.rebuildEstudiosFromLabHistory(pid);
    removedTotal += before - (labHistory[pid] ? labHistory[pid].length : 0);
    if (before !== (labHistory[pid] ? labHistory[pid].length : 0)) bumpLabHistoryRevision(pid);
  });
  return removedTotal;
}

function showLabDedupeChecklistModal(sections) {
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'lab-dedupe-backdrop';
  var blocks = sections
    .map(function (sec) {
      var exact = sec.rows.filter(function (r) {
        return r.kind === 'exact';
      });
      var loose = sec.rows.filter(function (r) {
        return r.kind === 'loose';
      });
      var head =
        '<h4 style="margin:12px 0 8px;font-size:14px;font-weight:700;color:var(--text);">' +
        esc(sec.nombre || '—') +
        (sec.registro ? ' <span style="opacity:0.85;font-weight:500">· ' + esc(sec.registro) + '</span>' : '') +
        '</h4>';
      var part = '<div class="lab-dedupe-patient-block">' + head;
      if (exact.length) {
        part +=
          '<p style="margin:0 0 6px;font-size:12px;color:var(--text-muted);font-weight:600;">Duplicados exactos (misma fecha, hora y texto del reporte)</p><ul style="margin:0 0 14px;padding-left:0;list-style:none;max-height:220px;overflow-y:auto;font-size:13px;">';
        exact.forEach(function (r) {
          part +=
            '<li style="margin:6px 0;"><label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" class="lab-dedupe-cb" data-pid="' +
            esc(r.patientId) +
            '" data-sid="' +
            esc(r.id) +
            '" checked style="margin-top:3px;flex-shrink:0;" /> <span>' +
            esc(r.summary) +
            '</span></label></li>';
        });
        part += '</ul>';
      }
      if (loose.length) {
        part +=
          '<p style="margin:0 0 6px;font-size:12px;color:var(--text-muted);font-weight:600;">Posibles duplicados (misma fecha/hora y mismos valores numéricos parseados; el texto del reporte puede diferir)</p><ul style="margin:0 0 14px;padding-left:0;list-style:none;max-height:220px;overflow-y:auto;font-size:13px;">';
        loose.forEach(function (r) {
          part +=
            '<li style="margin:6px 0;"><label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" class="lab-dedupe-cb" data-pid="' +
            esc(r.patientId) +
            '" data-sid="' +
            esc(r.id) +
            '" checked style="margin-top:3px;flex-shrink:0;" /> <span>' +
            esc(r.summary) +
            '</span></label></li>';
        });
        part += '</ul>';
      }
      return part + '</div>';
    })
    .join('');
  var defaultCount = sections.reduce(function (acc, s) {
    return acc + s.rows.length;
  }, 0);
  backdrop.innerHTML =
    '<div class="lab-conflict-modal" style="max-width:520px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;">' +
    '<h3 style="margin:0 0 8px;">Sincronizar historial de laboratorio</h3>' +
    '<p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Marca las entradas a eliminar. Por defecto se seleccionan las copias redundantes y se conserva el conjunto con id más antiguo en cada grupo.</p>' +
    '<div style="overflow-y:auto;flex:1;min-height:0;padding-right:4px;">' +
    blocks +
    '</div>' +
    '<div style="display:flex;gap:10px;margin-top:14px;justify-content:space-between;flex-wrap:wrap;align-items:center;">' +
    '<span style="font-size:12px;color:var(--text-muted);" id="lab-dedupe-count">' +
    defaultCount +
    ' seleccionada' +
    (defaultCount === 1 ? '' : 's') +
    '</span>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
    '<button type="button" id="lab-dedupe-none" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Quitar todas</button>' +
    '<button type="button" id="lab-dedupe-all" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Seleccionar todas</button>' +
    '<button type="button" id="lab-dedupe-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button>' +
    '<button type="button" id="lab-dedupe-ok" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Eliminar seleccionadas</button>' +
    '</div></div></div>';
  document.body.appendChild(backdrop);

  function updateCount() {
    var n = backdrop.querySelectorAll('.lab-dedupe-cb:checked').length;
    var el = document.getElementById('lab-dedupe-count');
    if (el) {
      el.textContent = n + ' seleccionada' + (n === 1 ? '' : 's');
    }
  }
  backdrop.querySelectorAll('.lab-dedupe-cb').forEach(function (cb) {
    cb.addEventListener('change', updateCount);
  });
  document.getElementById('lab-dedupe-none').onclick = function () {
    backdrop.querySelectorAll('.lab-dedupe-cb').forEach(function (cb) {
      cb.checked = false;
    });
    updateCount();
  };
  document.getElementById('lab-dedupe-all').onclick = function () {
    backdrop.querySelectorAll('.lab-dedupe-cb').forEach(function (cb) {
      cb.checked = true;
    });
    updateCount();
  };
  document.getElementById('lab-dedupe-cancel').onclick = function () {
    backdrop.remove();
  };
  document.getElementById('lab-dedupe-ok').onclick = function () {
    var mapByPatient = {};
    backdrop.querySelectorAll('.lab-dedupe-cb:checked').forEach(function (cb) {
      var pid = cb.getAttribute('data-pid');
      var sid = cb.getAttribute('data-sid');
      if (!pid || !sid) return;
      if (!mapByPatient[pid]) mapByPatient[pid] = [];
      mapByPatient[pid].push(sid);
    });
    backdrop.remove();
    var nSel = Object.keys(mapByPatient).reduce(function (a, pid) {
      return a + mapByPatient[pid].length;
    }, 0);
    if (!nSel) {
      rt.showToast('No seleccionaste entradas para eliminar', 'error');
      return;
    }
    if (typeof rt.pushUndoSnapshot === 'function') rt.pushUndoSnapshot('Eliminar duplicados de historial de labs (' + nSel + ')');
    var removedTotal = applyLabDedupeFromChecklist(mapByPatient);
    saveState({ immediate: true });
    renderLabHistoryPanel();
    rt.refreshTendenciasOrCultivosPanel();
    var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
    if (el && rt.getActiveId() && notes[rt.getActiveId()]) el.value = notes[rt.getActiveId()].estudios || '';
    rt.addAuditEntry('lab-history-dedupe', 'ok', removedTotal, Object.keys(mapByPatient).length + ' pacientes');
    rt.showToast('Eliminadas ' + removedTotal + ' entrada' + (removedTotal === 1 ? '' : 's') + ' ✓', 'success');
  };
}

function openLabHistoryDedupeReview(scope) {
  scope = scope || 'active';
  if (scope === 'active') {
    if (!rt.getActiveId()) {
      rt.showToast('Selecciona un paciente primero', 'error');
      return;
    }
    var rows = buildLabDedupeChecklistSections(rt.getActiveId());
    if (!rows.length) {
      rt.showToast('No hay duplicados ni coincidencias por fecha/valores en este paciente', 'success');
      return;
    }
    var p = patients.find(function (x) {
      return x.id === rt.getActiveId();
    });
    showLabDedupeChecklistModal([
      {
        patientId: rt.getActiveId(),
        nombre: p ? p.nombre : '',
        registro: p ? p.registro : '',
        rows: rows,
      },
    ]);
    return;
  }
  if (scope === 'all') {
    rt.closeSettingsDropdown();
    runLabDedupeReviewAllPatients();
  }
}

function runLabDedupeReviewAllPatients() {
  var list = patients.filter(function (p) {
    return p && !p.isDemo;
  });
  if (!list.length) {
    rt.showToast('No hay pacientes para revisar', 'error');
    return;
  }
  rt.showToast('Buscando duplicados en ' + list.length + ' pacientes…', 'success');
  var sections = [];
  var index = 0;
  function step() {
    if (index >= list.length) {
      if (!sections.length) {
        rt.showToast('No se encontraron duplicados ni coincidencias por fecha/valores', 'success');
        return;
      }
      showLabDedupeChecklistModal(sections);
      return;
    }
    var batchEnd = Math.min(index + 4, list.length);
    while (index < batchEnd) {
      var p = list[index];
      index += 1;
      var r = buildLabDedupeChecklistSections(p.id);
      if (r.length) {
        sections.push({
          patientId: p.id,
          nombre: p.nombre || '—',
          registro: p.registro || '',
          rows: r,
        });
      }
    }
    setTimeout(step, 0);
  }
  setTimeout(step, 0);
}

/**
 * Fusiona entradas de labHistory del mismo día calendario y mismo tipo homogéneo (solo labs o solo cultivo).
 * Los conjuntos mixtos (laboratorio + cultivo en un mismo set) no se fusionan ni se agrupan con otros.
 */
function consolidateLabHistoryByDayAndTipo() {
  if (!rt.getActiveId()) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var list = labHistory[rt.getActiveId()];
  if (!list || list.length < 2) {
    rt.showToast('Se necesitan al menos 2 conjuntos en el historial', 'error');
    return;
  }
  if (
    !confirm(
      '¿Consolidar el historial por día?\n\n' +
        'R+ agrupa entradas que comparten la misma fecha (día calendario) solo si son del mismo tipo:\n\n' +
        '1) Varios envíos que traen únicamente laboratorio (sin bloque de cultivos) ese día → se unen en una sola entrada.\n\n' +
        '2) Varios envíos que traen únicamente cultivos ese día → se unen en una sola entrada.\n\n' +
        '3) Si un envío mezcla laboratorio y cultivos en el mismo conjunto, no se fusiona con otros ni se modifica.\n\n' +
        'En cada grupo se conserva la entrada más antigua (id más viejo), se combinan todos los renglones y las líneas de texto idénticas se guardan una sola vez.\n\n' +
        'Si hay varios envíos del mismo día (aunque la hora difiera), se unen. Ante el mismo panel (BH, QS, …), se priorizan los datos tomados desde SOME.'
    )
  ) {
    return;
  }
  rt.ensureParsedLabHistory(rt.getActiveId());
  var sets = labHistory[rt.getActiveId()].slice();
  var groups = Object.create(null);
  sets.forEach(function (set) {
    if (!set || set.fecha === 'Anterior') return;
    var dk = rt.dayKeyFromLabSet(set);
    if (dk === 'unknown') return;
    var tipo = rt.primaryTipoForLabSet(set.resLabs);
    if (tipo === 'mixed') return;
    var gk = dk + '\x01' + tipo;
    if (!groups[gk]) groups[gk] = [];
    groups[gk].push(set);
  });
  var todo = [];
  Object.keys(groups).forEach(function (gk) {
    var arr = groups[gk];
    if (arr.length < 2) return;
    var tipoGrupo = gk.split('\x01')[1] || 'labs';
    arr.sort(compareLabSetIdForDedupe);
    var keeper = arr[0];
    var mergeOrder = arr.slice().sort(function (a, b) {
      var sa = rt.labSetIsFromSome(a) ? 1 : 0;
      var sb = rt.labSetIsFromSome(b) ? 1 : 0;
      if (sa !== sb) return sa - sb;
      return compareLabSetIdForDedupe(a, b);
    });
    var merged = [];
    var sourceParts = [];
    mergeOrder.forEach(function (set, idx) {
      var other = set.resLabs || [];
      if (merged.length && other.length) merged.push('');
      merged = merged.concat(other);
      if (set.sourceText && String(set.sourceText).trim()) sourceParts.push(String(set.sourceText).trim());
    });
    var deduped = dedupeConsolidatedRowsBySection(merged, tipoGrupo);
    keeper.resLabs = deduped;
    keeper.parsed = rt.extractParsedValues(deduped);
    var mergedBhExtras = {};
    mergeOrder.forEach(function (sMerge) {
      if (sMerge && sMerge.bhExtras && typeof sMerge.bhExtras === 'object') {
        Object.keys(sMerge.bhExtras).forEach(function (bk) {
          mergedBhExtras[bk] = sMerge.bhExtras[bk];
        });
      }
    });
    keeper.bhExtras = mergedBhExtras;
    keeper.parsedBySection = rt.buildParsedBySectionFromResLabs(deduped, keeper.bhExtras);
    if (sourceParts.length) keeper.sourceText = sourceParts.join('\n\n---\n\n');
    refreshSameDayAscitisForPatient(rt.getActiveId(), keeper.id);
    keeper.hora = '';
    for (var j = 1; j < arr.length; j++) {
      todo.push(String(arr[j].id));
    }
  });
  if (!todo.length) {
    rt.showToast('No hay grupos del mismo día y tipo homogéneo para fusionar', 'success');
    return;
  }
  if (typeof rt.pushUndoSnapshot === 'function') rt.pushUndoSnapshot('Consolidar historial de labs por día y tipo');
  var idRemove = new Set(todo);
  labHistory[rt.getActiveId()] = labHistory[rt.getActiveId()].filter(function (s) {
    return !idRemove.has(String(s.id));
  });
  if (!labHistory[rt.getActiveId()].length) delete labHistory[rt.getActiveId()];
  rt.rebuildEstudiosFromLabHistory(rt.getActiveId());
  saveState({ immediate: true });
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
  if (el && notes[rt.getActiveId()]) el.value = notes[rt.getActiveId()].estudios || '';
  rt.addAuditEntry('lab-history-consolidate', 'ok', todo.length, String(rt.getActiveId()));
  rt.showToast('Fusionados ' + todo.length + ' conjunto(s) ✓', 'success');
}

// ── Lab ───────────────────────────────────────────────────────────
export function limpiarReporte() {
  document.getElementById('lab-input').value = '';
  document.getElementById('lab-banner').style.display = 'none';
  document.getElementById('lab-diagrams-section').style.display = 'none';
  document.getElementById('diagrams-grid').innerHTML = '';
  document.getElementById('lab-output-section').style.display = 'none';
  document.getElementById('lab-output-box').innerHTML = '';
  activeLab = null;
  closeLabSomeTablesModal();
  syncLabOutputChrome();
}

function openLabPatientPicker() {
  var overlay = document.createElement('div');
  overlay.id = 'lab-picker-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;';
  var box = document.createElement('div');
  box.style.cssText = 'background:#1f2937;border-radius:10px;padding:20px;min-width:260px;max-width:360px;width:90%;';
  var title = document.createElement('div');
  title.textContent = '¿A qué paciente enviar los labs?';
  title.style.cssText = 'color:#f9fafb;font-size:14px;font-weight:600;margin-bottom:14px;';
  box.appendChild(title);
  patients.forEach(function(p) {
    var btn = document.createElement('button');
    btn.textContent = p.nombre + (p.registro ? '  •  ' + p.registro : '');
    btn.style.cssText = 'display:block;width:100%;text-align:left;background:#374151;color:#f3f4f6;border:none;border-radius:6px;padding:10px 12px;margin-bottom:8px;cursor:pointer;font-size:13px;';
    btn.onmouseenter = function(){ this.style.background='#4b5563'; };
    btn.onmouseleave = function(){ this.style.background='#374151'; };
    btn.onclick = function() {
      document.body.removeChild(overlay);
      rt.selectPatient(p.id);
      enviarLabsANota();
    };
    box.appendChild(btn);
  });
  var cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.cssText = 'display:block;width:100%;background:transparent;color:#9ca3af;border:1px solid #374151;border-radius:6px;padding:8px;cursor:pointer;font-size:13px;margin-top:4px;';
  cancelBtn.onclick = function() { document.body.removeChild(overlay); };
  box.appendChild(cancelBtn);
  overlay.appendChild(box);
  overlay.onclick = function(e){ if(e.target===overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
}

async function copiarLabsAlPortapapeles() {
  if (!activeLab || !activeLab.resLabs || !activeLab.resLabs.length) {
    rt.showToast('No hay resultados procesados', 'error'); return;
  }
  var text = buildLabLines().join('\n');
  var ok = await rt.copyToClipboardSafe(text);
  rt.showToast(
    ok ? 'Labs copiados al portapapeles ✓' : 'Error al copiar al portapapeles',
    ok ? 'success' : 'error'
  );
}

export function enviarLabsANota() {
  if (!activeLab || !activeLab.resLabs || !activeLab.resLabs.length) {
    rt.showToast('No hay resultados procesados', 'error'); return;
  }
  if (!rt.getActiveId()) {
    if (!patients.length) { rt.showToast('Agrega un paciente primero', 'error'); return; }
    if (patients.length === 1) { rt.selectPatient(patients[0].id); }
    else { openLabPatientPicker(); return; }
  }
  checkStudiosAndInsertLabs();
}

// ── Multilab ──────────────────────────────────────────────────────
function buildLabLines() {
  var lines = [];
  var prefs = rt.getLabOutputPrefs();
  if (activeLab && activeLab.patient) {
    var raw = activeLab.patient.fecha || '';
    var fechaDm = normalizeFechaLabHistory(raw) || String(raw).trim();
    if (fechaDm === 'Anterior') fechaDm = '';
    if (!fechaDm && raw) {
      var mesesMap = {ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12',jan:'01',apr:'04',aug:'08',dec:'12'};
      var mFechaLab = raw.trim().match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/);
      var monNum = mFechaLab && mesesMap[mFechaLab[1].toLowerCase().slice(0, 3)];
      if (monNum) fechaDm = mFechaLab[2].padStart(2, '0') + '/' + monNum + '/' + mFechaLab[3];
    }
    if (fechaDm) {
      lines.push(fechaDm.length >= 5 && fechaDm.indexOf('/') !== -1 ? fechaDm.slice(0, 5) : fechaDm);
    }
  }
  var bhExtDone = false;
  activeLab.resLabs.forEach(function(entry) {
    if (prefs.hideGasoAdvInterp && rt.isGasoInterpretacionResLabChunk(entry)) return;
    if (rt.isAscitisInterpretacionResLabChunk(entry)) return;
    entry.split(/\r?\n/).forEach(function(subline) {
      var cleaned = subline.replace(/\t/g, ' ').replace(/  +/g, ' ').trim();
      if (cleaned) lines.push(cleaned);
    });
    if (prefs.showBhExtendedLine && !bhExtDone && activeLab.bhExtras && rt.isBhMainResLabChunk(entry)) {
      var extPlain = rt.formatBhExtendedTabLine(activeLab.bhExtras, activeLab.sourceText);
      if (extPlain) {
        extPlain.split(/\r?\n/).forEach(function(subline) {
          var cleanedExt = subline.replace(/\t/g, ' ').replace(/  +/g, ' ').trim();
          if (cleanedExt) lines.push(cleanedExt);
        });
        bhExtDone = true;
      }
    }
  });
  return lines;
}


function checkStudiosAndInsertLabs() {
  var lines = buildLabLines();
  var history = sortLabHistoryChronological(rt.ensureParsedLabHistory(rt.getActiveId()));
  var recentDate = history.length ? rt.buildLabSetDateLine(history[0]) : '';
  if (!history.length) {
    insertLabsAsRecent(lines);
  } else {
    showLabConflictModal(lines, recentDate);
  }
}

function buildSameDaySerumContext(patientId, targetSet) {
  if (!patientId || !targetSet) return {};
  var dk = rt.dayKeyFromLabSet(targetSet);
  if (!dk || dk === 'unknown' || dk === 'Anterior') return {};
  var sets = labHistory[patientId] || [];
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
  var sets = labHistory[patientId];
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
      var hasAscitis = resLabsHasAsciticFluid_(set.resLabs) || (src && /\bCITOQUIMICO DE LIQUIDOS CORPORALES\b/i.test(src));
      if (!hasAscitis) return;
      var ctx = buildSameDaySerumContext(patientId, set);
      var next = refreshAscitisInterpretacionInResLabs_(set.resLabs || [], src, ctx);
      var prevStr = '';
      var nextStr = '';
      try {
        prevStr = JSON.stringify(set.resLabs || []);
        nextStr = JSON.stringify(next);
      } catch (_e) {
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

function pushLabHistory(patientId, resLabs, fecha, hora, sourceText, bhExtras, refsBySection, idSeed) {
  if (!patientId || !resLabs || !resLabs.length) return;
  if (!labHistory[patientId]) labHistory[patientId] = [];
  var extras = bhExtras && typeof bhExtras === 'object' ? bhExtras : {};
  var refs = refsBySection && typeof refsBySection === 'object' ? refsBySection : {};
  if (!Object.keys(refs).length && sourceText) {
    refs = buildRefsBySectionFromReport(sourceText);
  }
  var fechaNorm = normalizeFechaLabHistory(fecha) || String(fecha || '').trim();
  if (!fechaNorm && notes[patientId] && notes[patientId].fecha) {
    fechaNorm = normalizeFechaLabHistory(notes[patientId].fecha) || '';
  }
  if (!fechaNorm) {
    var nd = new Date();
    fechaNorm = String(nd.getDate()).padStart(2, '0') + '/' + String(nd.getMonth() + 1).padStart(2, '0') + '/' + nd.getFullYear();
  }
  var horaNorm = normalizeHoraLabHistory(hora);
  var set = {
    id: idSeed != null && String(idSeed).trim() !== '' ? String(Date.now()) + '-' + String(idSeed) : Date.now().toString(),
    fecha: fechaNorm,
    hora: horaNorm,
    resLabs: resLabs,
    bhExtras: extras,
    parsed: rt.extractParsedValues(resLabs),
    parsedBySection: rt.buildParsedBySectionFromResLabs(resLabs, extras),
    refsBySection: refs,
    updatedAt: new Date().toISOString(),
  };
  var raw = String(sourceText || '').trim();
  if (raw) set.sourceText = raw;
  labHistory[patientId].push(set);
  refreshSameDayAscitisForPatient(patientId, set.id);
  bumpLabHistoryRevision(patientId);
}

/** Tras nuevo set en historial: marca manejo electrolitos pendiente si hay alteraciones. */
function applyManejoPending(patientId, parsed, parsedBySection, labSetId, fecha) {
  if (areElectrolyteReplacementSuggestionsHidden()) return;
  if (!patientId || !labSetId) return;
  var patient = patients.find(function (p) {
    return p && String(p.id) === String(patientId);
  });
  if (!patient) return;
  var evalOut = evaluateElectrolyteManejo({
    parsedBySection: parsedBySection || {},
    parsed: parsed || {},
    patient: patient,
    labSetId: labSetId,
    labFecha: fecha,
  });
  if (!evalOut || !evalOut.hasAlterations) return;
  var fechaNorm = normalizeFechaLabHistory(fecha) || String(fecha || "").trim();
  if (shouldClearManejoPendingForDismissals(patient, null, evalOut, fechaNorm)) {
    patient.manejoPending = null;
    return;
  }
  patient.manejoPending = {
    labSetId: labSetId,
    detectedAt: new Date().toISOString(),
  };
  if (typeof rt.renderManejo === 'function') rt.renderManejo();
  if (typeof rt.refreshManejoPanel === 'function') rt.refreshManejoPanel();
}

function pushLabHistoryFromBulkPayload(patientId, payload, idSeed) {
  if (!payload || !payload.resLabs || !payload.resLabs.length) return;
  pushLabHistory(
    patientId,
    payload.resLabs,
    payload.fecha,
    payload.hora,
    payload.sourceText,
    payload.bhExtras,
    payload.refsBySection,
    idSeed
  );
}

function isDuplicateInPatientHistory(patientId, payload) {
  var list = labHistory[patientId] || [];
  var incoming = {
    fecha: normalizeFechaLabHistory(payload.fecha) || String(payload.fecha || '').trim(),
    hora: normalizeHoraLabHistory(payload.hora),
    resLabs: payload.resLabs || [],
  };
  return list.some(function (existing) {
    return areDuplicateLabSets(existing, incoming);
  });
}

/**
 * @param {{ id: string }} patient
 * @param {Array<{ fecha?: string, hora?: string, resLabs?: string[], sourceText?: string, bhExtras?: object }>} labSets
 */
export async function applyDriveImportLabSets(patient, labSets) {
  if (!patient || !patient.id || !labSets || !labSets.length) {
    return { added: 0, skipped: 0 };
  }
  var patientId = patient.id;
  var added = 0;
  var skipped = 0;
  labSets.forEach(function (set, idx) {
    var payload = {
      fecha: set.fecha,
      hora: set.hora || '',
      resLabs: set.resLabs || [],
      sourceText: set.sourceText || '',
    };
    if (!payload.resLabs.length) return;
    if (isDuplicateInPatientHistory(patientId, payload)) {
      skipped += 1;
      return;
    }
    pushLabHistory(
      patientId,
      payload.resLabs,
      payload.fecha,
      payload.hora,
      payload.sourceText,
      set.bhExtras || {},
      {},
      'drive-import-' + idx
    );
    added += 1;
  });
  if (!added) return { added: 0, skipped: skipped };

  rt.rebuildEstudiosFromLabHistory(patientId);
  rt.ensureParsedLabHistory(patientId);
  var hist = labHistory[patientId] || [];
  var lastSet = hist.length ? hist[hist.length - 1] : null;
  if (lastSet) {
    applyManejoPending(
      patientId,
      lastSet.parsed,
      lastSet.parsedBySection,
      lastSet.id,
      lastSet.fecha
    );
    applyLabClinicalSuggestions(patientId, lastSet.resLabs, lastSet.fecha, lastSet.bhExtras);
  }
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  return { added: added, skipped: skipped };
}

function storeBulkLabBlocks(blocks, processable) {
  if (processable.length > 1 && typeof rt.pushUndoSnapshot === 'function') {
    rt.pushUndoSnapshot('Procesar laboratorios (' + processable.length + ' pacientes)');
  }
  var storedSets = 0;
  var skippedDupes = 0;
  processable.forEach(function (block) {
    var patientId = block.patient.id;
    var patientReg = String(block.patient.registro || '').trim();
    var okItems = block.reports
      .filter(function (r) {
        return r.ok && r.result && (!patientReg || r.expediente === patientReg);
      })
      .map(function (r) {
        return { result: r.result, reportText: r.reportText };
      });
    var mergedSets = mergeBulkParseResults(okItems);
    mergedSets.forEach(function (payload, idx) {
      if (isDuplicateInPatientHistory(patientId, payload)) {
        skippedDupes += 1;
        return;
      }
      pushLabHistoryFromBulkPayload(patientId, payload, block.blockIndex + '-' + idx);
      applyLabClinicalSuggestions(patientId, payload.resLabs, payload.fecha, payload.bhExtras);
      storedSets += 1;
    });
    rt.rebuildEstudiosFromLabHistory(patientId);
    var hist = labHistory[patientId] || [];
    var lastSet = hist.length ? hist[hist.length - 1] : null;
    if (lastSet) {
      applyManejoPending(patientId, lastSet.parsed, lastSet.parsedBySection, lastSet.id, lastSet.fecha);
    }
  });
  if (storedSets || skippedDupes) {
    saveState({ immediate: true });
    renderLabHistoryPanel();
    rt.refreshTendenciasOrCultivosPanel();
  }
  return { storedSets: storedSets, skippedDupes: skippedDupes, skippedBlocks: blocks.length - processable.length };
}

function pickDisplayLabReport(blocks, processable, activeId) {
  var activeBlock = null;
  if (activeId) {
    activeBlock = processable.find(function (b) {
      return b.patient && String(b.patient.id) === String(activeId);
    });
  }
  var block = activeBlock || processable[0] || blocks.find(function (b) {
    return b.okReportCount > 0;
  });
  if (!block) return null;
  var okReports = block.reports.filter(function (r) {
    return r.ok && r.result;
  });
  if (!okReports.length) return null;
  return okReports[okReports.length - 1];
}

export function insertLabPatientSeparator() {
  var ta = document.getElementById('lab-input');
  if (!ta) return;
  var val = ta.value;
  var start = typeof ta.selectionStart === 'number' ? ta.selectionStart : val.length;
  var end = typeof ta.selectionEnd === 'number' ? ta.selectionEnd : start;
  var before = val.slice(0, start);
  var after = val.slice(end);
  var insert = LAB_BULK_PATIENT_SEPARATOR;
  if (before && !before.endsWith('\n')) insert = '\n' + insert;
  insert += '\n';
  ta.value = before + insert + after;
  var pos = before.length + insert.length;
  ta.focus();
  ta.setSelectionRange(pos, pos);
}

function isDuplicateLatestLabSet(patientId, resLabs, fecha, hora) {
  if (!patientId) return false;
  var list = labHistory[patientId] || [];
  if (!list.length) return false;
  var latest = list[list.length - 1];
  var incoming = {
    fecha: normalizeFechaLabHistory(fecha) || String(fecha || '').trim(),
    hora: normalizeHoraLabHistory(hora),
    resLabs: resLabs || []
  };
  var latestNormalized = {
    fecha: normalizeFechaLabHistory(latest && latest.fecha) || String((latest && latest.fecha) || '').trim(),
    hora: normalizeHoraLabHistory(latest && latest.hora),
    resLabs: (latest && latest.resLabs) || []
  };
  return isDuplicateAgainstLatest(latestNormalized, incoming);
}

/**
 * Alinea el paciente activo con el expediente del reporte pegado.
 * @see docs/superpowers/specs/2026-05-03-lab-auto-switch-active-patient-design.md
 * @returns {{ shouldAutoStore: boolean }}
 */
function applyLabPastePatientResolution(result) {
  if (!result || !result.patient) return { shouldAutoStore: true };
  var reg = String(result.patient.expediente || '').trim();
  if (!reg) return { shouldAutoStore: true };
  var match = rt.findPatientByRegistro(reg);
  if (!match) {
    if (!rt.getLabOutputPrefs().quickLabOutput) {
      rt.showToast(
        'Registro ' + reg + ' no está en la lista. No se guardó en el historial.',
        'error'
      );
    }
    return { shouldAutoStore: false };
  }
  if (match.id !== rt.getActiveId()) {
    rt.selectPatient(match.id);
    rt.showToast('Paciente: ' + (match.nombre || 'Sin nombre') + ' · Exp ' + reg, 'success');
    rt.addAuditEntry('lab-patient-auto-switch', 'ok', 1, reg);
  }
  return { shouldAutoStore: true };
}

function autoStoreProcessedLabResult(result) {
  if (!rt.getActiveId()) return;
  if (!result || !result.resLabs || !result.resLabs.length) return;
  var fecha = (result.patient && result.patient.fecha) ? result.patient.fecha : '';
  var hora = (result.patient && result.patient.hora) ? result.patient.hora : '';
  if (isDuplicateLatestLabSet(rt.getActiveId(), result.resLabs, fecha, hora)) {
    rt.showToast('Resultado ya registrado en historial', 'success');
    return;
  }
  pushLabHistory(
    rt.getActiveId(),
    result.resLabs,
    fecha,
    hora,
    result.sourceText || '',
    result.bhExtras,
    result.refsBySection
  );
  var pid = rt.getActiveId();
  var hist = labHistory[pid];
  var lastSet = hist && hist.length ? hist[hist.length - 1] : null;
  if (lastSet) {
    applyManejoPending(
      pid,
      lastSet.parsed,
      lastSet.parsedBySection,
      lastSet.id,
      lastSet.fecha
    );
  }
  applyLabClinicalSuggestions(rt.getActiveId(), result.resLabs, fecha, result.bhExtras);
  saveState({ immediate: true });
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
}

function applyLabClinicalSuggestions(patientId, resLabs, fecha, bhExtras) {
  if (areLabClinicalSuggestionsHidden()) return;
  if (!patientId || !resLabs || !resLabs.length) return;
  var fechaNorm = normalizeFechaLabHistory(fecha) || String(fecha || '').trim();
  if (!fechaNorm) return;
  var parsed = rt.extractParsedValues(resLabs);
  var parsedBySection = rt.buildParsedBySectionFromResLabs(resLabs, bhExtras);
  var suggestions = evaluateLabSuggestions(parsed, parsedBySection, fechaNorm);
  if (!suggestions.length) return;
  var todos = storage.getTodos(patientId);
  var toAdd = filterNewLabSuggestions(suggestions, todos);
  if (!toAdd.length) return;
  var nowIso = new Date().toISOString();
  var added = 0;
  toAdd.forEach(function (s) {
    var row = {
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6),
      text: s.text,
      completed: false,
      priority: 'media',
      createdAt: nowIso,
      updatedAt: nowIso,
      labRuleId: s.ruleId,
      labFecha: s.fechaEstudio,
    };
    todos.push(row);
    rt.emitLiveSyncTodoUpsert(patientId, row);
    added += 1;
  });
  if (added > 0) {
    storage.saveTodos(patientId, todos);
    rt.refreshAllTodoUIs();
    rt.showToast(
      added === 1 ? '1 sugerencia agregada a pendientes' : added + ' sugerencias agregadas a pendientes',
      'success'
    );
  }
}

function insertLabsAsRecent(lines) {
  if (!notes[rt.getActiveId()]) notes[rt.getActiveId()] = {};
  pushLabHistory(
    rt.getActiveId(),
    activeLab.resLabs,
    activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : '',
    activeLab.patient && activeLab.patient.hora ? activeLab.patient.hora : '',
    activeLab.sourceText || '',
    activeLab.bhExtras,
    activeLab.refsBySection
  );
  rt.rebuildEstudiosFromLabHistory(rt.getActiveId());
  saveState({ immediate: true });
  rt.refreshTendenciasOrCultivosPanel();
  renderLabHistoryPanel();
  var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
  if (el) el.value = notes[rt.getActiveId()].estudios;
  rt.onboardingAdvanceAfterSend();
  rt.showToast('Labs enviados a la nota ✓', 'success');
  rt.setMedTabAttention(true);
  rt.openPaseSectionInNormal('expediente');
}

function insertLabsAsAnteriorThenRecent(newLines) {
  if (!notes[rt.getActiveId()]) notes[rt.getActiveId()] = {};
  pushLabHistory(
    rt.getActiveId(),
    activeLab.resLabs,
    activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : '',
    activeLab.patient && activeLab.patient.hora ? activeLab.patient.hora : '',
    activeLab.sourceText || '',
    activeLab.bhExtras,
    activeLab.refsBySection
  );
  rt.rebuildEstudiosFromLabHistory(rt.getActiveId());
  saveState({ immediate: true });
  rt.refreshTendenciasOrCultivosPanel();
  renderLabHistoryPanel();
  var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
  if (el) el.value = notes[rt.getActiveId()].estudios;
  rt.onboardingAdvanceAfterSend();
  rt.showToast('Fecha anterior guardada + nuevos labs agregados ✓', 'success');
  rt.setMedTabAttention(true);
  rt.openPaseSectionInNormal('expediente');
}

function showLabConflictModal(newLines, existingDate) {
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'lab-conflict-backdrop';
  backdrop.innerHTML = (
    '<div class="lab-conflict-modal">' +
    '<h3>Los estudios ya tienen datos</h3>' +
    '<p>El bloque reciente ya tiene labs del <strong>' + esc(existingDate) + '</strong>. ¿Qué hago con los nuevos labs?</p>' +
    '<div class="lab-conflict-actions">' +
    '<button class="btn-conflict-primary" id="btn-conflict-move">📋 Mover anterior + agregar reciente<br><span style="font-size:11px;font-weight:400;opacity:0.8;">Los labs actuales pasan al bloque anterior y los nuevos quedan como recientes</span></button>' +
    '<button class="btn-conflict-secondary" id="btn-conflict-replace">🔄 Reemplazar fecha reciente<br><span style="font-size:11px;font-weight:400;opacity:0.7;">Los labs actuales se borran, se escriben los nuevos</span></button>' +
    '<button class="btn-conflict-cancel" id="btn-conflict-cancel">Cancelar</button>' +
    '</div></div>'
  );
  document.body.appendChild(backdrop);
  document.getElementById('btn-conflict-move').onclick = function() {
    document.body.removeChild(backdrop);
    insertLabsAsAnteriorThenRecent(newLines);
  };
  document.getElementById('btn-conflict-replace').onclick = function() {
    document.body.removeChild(backdrop);
    if (!notes[rt.getActiveId()]) notes[rt.getActiveId()] = {};
    pushLabHistory(
      rt.getActiveId(),
      activeLab.resLabs,
      activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : '',
      activeLab.patient && activeLab.patient.hora ? activeLab.patient.hora : '',
      activeLab.sourceText || '',
      activeLab.bhExtras,
      activeLab.refsBySection
    );
    rt.rebuildEstudiosFromLabHistory(rt.getActiveId());
    saveState({ immediate: true });
    rt.refreshTendenciasOrCultivosPanel();
    renderLabHistoryPanel();
    var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
    if (el) el.value = notes[rt.getActiveId()].estudios;
    rt.onboardingAdvanceAfterSend();
    rt.showToast('Fecha reciente reemplazada ✓', 'success');
    rt.setMedTabAttention(true);
    rt.openPaseSectionInNormal('expediente');
  };
  document.getElementById('btn-conflict-cancel').onclick = function() {
    document.body.removeChild(backdrop);
  };
}

function finalizeBulkLabPaste(text, blocks, totalOkReports) {
  var quickOut = rt.getLabOutputPrefs().quickLabOutput;
  var processable = blocks.filter(function (b) {
    return b.canProcess && b.okReportCount > 0 && b.patient;
  });
  var storeSummary = { storedSets: 0, skippedDupes: 0, skippedBlocks: blocks.length - processable.length };

  if (processable.length) {
    storeSummary = storeBulkLabBlocks(blocks, processable);
    if (typeof rt.addAuditEntry === 'function') {
      rt.addAuditEntry(
        'lab-bulk-paste',
        storeSummary.storedSets ? 'ok' : 'skip',
        storeSummary.storedSets,
        processable.length + ' pacientes'
      );
    }
  } else if (blocks.some(function (b) {
    return b.status === 'no-patient';
  })) {
    if (!quickOut) {
      rt.showToast('Ningún expediente del pegado coincide con pacientes en la lista', 'error');
    }
  }

  var displayReport = pickDisplayLabReport(blocks, processable, rt.getActiveId());
  if (!displayReport) {
    displayReport = blocks.reduce(function (found, b) {
      if (found) return found;
      return b.reports.find(function (r) { return r.ok && r.result; }) || null;
    }, null);
  }

  if (!displayReport || !displayReport.result) {
    rt.showToast('No se pudo interpretar el laboratorio pegado', 'error');
    return;
  }

  var displayResult = displayReport.result;
  displayResult.sourceText = displayReport.reportText || text;
  if (processable.length === 1 && processable[0].okReportCount === 1) {
    applyLabPastePatientResolution(displayResult);
  } else if (displayReport.expediente) {
    var match = rt.findPatientByRegistro(displayReport.expediente);
    if (match && match.id !== rt.getActiveId()) {
      rt.selectPatient(match.id);
    }
  }

  renderOutput(displayResult);
  toastAscitisAlertsFromResult(displayResult);
  rt.renderDiagramas(displayResult.resLabs);

  var multi = blocks.length > 1 || totalOkReports > 1 || processable.length > 1;
  if (multi) {
    var parts = [];
    if (storeSummary.storedSets) {
      parts.push(
        storeSummary.storedSets +
          ' conjunto' +
          (storeSummary.storedSets === 1 ? '' : 's') +
          ' guardado' +
          (storeSummary.storedSets === 1 ? '' : 's')
      );
    }
    if (storeSummary.skippedDupes) {
      parts.push(
        storeSummary.skippedDupes +
          ' duplicado' +
          (storeSummary.skippedDupes === 1 ? '' : 's') +
          ' omitido' +
          (storeSummary.skippedDupes === 1 ? '' : 's')
      );
    }
    if (storeSummary.skippedBlocks) {
      parts.push(
        storeSummary.skippedBlocks +
          ' bloque' +
          (storeSummary.skippedBlocks === 1 ? '' : 's') +
          ' omitido' +
          (storeSummary.skippedBlocks === 1 ? '' : 's')
      );
    }
    rt.showToast(parts.length ? parts.join(' · ') + ' ✓' : 'Laboratorio procesado ✓', storeSummary.storedSets ? 'success' : 'success');
  } else if (processable.length === 1 && storeSummary.storedSets === 0 && storeSummary.skippedDupes) {
    rt.showToast('Resultado ya registrado en historial', 'success');
  } else if (
    processable.length === 0 &&
    blocks.length === 1 &&
    blocks[0].status === 'no-patient' &&
    quickOut &&
    displayReport
  ) {
    rt.showToast('Laboratorio formateado · salida rápida ✓', 'success');
  } else if (processable.length === 1 && !storeSummary.storedSets && blocks[0].status === 'no-patient') {
    /* toast ya mostrado arriba */
  } else if (processable.length === 1 && storeSummary.storedSets) {
    /* renderOutput ya avanzó onboarding; sin toast extra en single */
  }

  clearLabInputAfterSuccessfulParse();
  if (typeof rt.tourAfterBulkLabParse === 'function') {
    rt.tourAfterBulkLabParse(blocks);
  }
}

function procesarReporte() {
  var text = document.getElementById('lab-input').value.trim();
  if (!text) { rt.showToast('Pega el texto del reporte primero', 'error'); return; }

  var blocks = buildBulkLabPreview(text, { findPatientByRegistro: rt.findPatientByRegistro });
  if (!blocks.length) {
    rt.showToast('No se detectaron reportes SOME en el texto pegado', 'error');
    return;
  }

  var totalOkReports = blocks.reduce(function (acc, b) {
    return acc + b.okReportCount;
  }, 0);
  if (!totalOkReports) {
    rt.showToast(
      looksLikeSomeLabReport(text)
        ? 'No se encontraron resultados de laboratorio en el texto pegado'
        : 'No parece un reporte de SOME. Copia desde «Expediente:» hasta el final del reporte.',
      'error'
    );
    return;
  }

  try {
    if (
      shouldShowBulkLabPreview(blocks, totalOkReports, {
        quickLabOutput: rt.getLabOutputPrefs().quickLabOutput,
      })
    ) {
      openLabBulkPreviewModal({
        blocks: blocks,
        sourceText: text,
        onConfirm: function () {
          var freshBlocks = buildBulkLabPreview(text, { findPatientByRegistro: rt.findPatientByRegistro });
          var freshTotal = freshBlocks.reduce(function (acc, b) {
            return acc + b.okReportCount;
          }, 0);
          finalizeBulkLabPaste(text, freshBlocks, freshTotal);
        },
      });
      return;
    }
    finalizeBulkLabPaste(text, blocks, totalOkReports);
  } catch (e) {
    rt.showToast('Error al procesar el reporte', 'error');
    console.error(e);
  }
}

function toastAscitisAlertsFromResult(result) {
  if (!result || !result.resLabs || !result.resLabs.length) return;
  result.resLabs.forEach(function (chunk) {
    if (!rt.isAscitisInterpretacionResLabChunk(chunk)) return;
    var msg = rt.ascitisInterpretacionBody_(chunk);
    if (msg) rt.showToast(msg, 'warn');
  });
}

function renderOutput(result) {
  var patient = result.patient, resLabs = result.resLabs;
  activeLab = result;
  rt.onboardingAdvanceAfterParse();
  var fechaBanner = '';
  if (patient.fecha) {
    fechaBanner = normalizeFechaLabHistory(patient.fecha) || String(patient.fecha).trim();
    if (fechaBanner === 'Anterior') fechaBanner = '';
  }
  if (patient.name) {
    document.getElementById('lab-patient-name').textContent = patient.name;
    document.getElementById('lab-patient-meta').textContent = [
      patient.expediente ? 'Exp: '+patient.expediente : '',
      patient.sexo, patient.edad || '', fechaBanner || patient.fecha
    ].filter(Boolean).join('  |  ');
    document.getElementById('lab-banner').style.display = 'block';
  }
  var box = document.getElementById('lab-output-box');
  rt.removeAtbRisPanelsFromBody();
  box.innerHTML = '';
  if (fechaBanner) {
    var fechaTop = document.createElement('div');
    fechaTop.className = 'lab-output-fecha';
    fechaTop.textContent = fechaBanner;
    box.appendChild(fechaTop);
  }
  var src = String(result.sourceText || '').trim();
  result.someTablesParsed = null;
  if (src && looksLikeSomeLabReport(src)) {
    var someParsed = parseSomeReportTables(src);
    if (someParsed.departments && someParsed.departments.length) {
      result.someTablesParsed = someParsed;
    }
  }
  var labDisp = rt.getLabOutputPrefs();
  resLabs.forEach(function (text) {
    if (labDisp.hideGasoAdvInterp && rt.isGasoInterpretacionResLabChunk(text)) return;
    if (rt.isAscitisInterpretacionResLabChunk(text)) {
      var alertDiv = document.createElement('div');
      alertDiv.className = 'lab-out-ascitis-alert out-line';
      alertDiv.setAttribute('role', 'status');
      alertDiv.textContent = rt.ascitisInterpretacionBody_(text);
      box.appendChild(alertDiv);
      return;
    }
    if (rt.isResLabChunkPureCultivo(text)) {
      var wrap = document.createElement('div');
      wrap.className = 'lab-out-cultivo-chunk';
      wrap.innerHTML = rt.buildCultivoOutputHtmlFragments(text, src);
      box.appendChild(wrap);
      return;
    }
    renderEntry(text).forEach(function (html, idx) {
      var div = document.createElement('div');
      div.className = idx === 0 ? 'out-line' : 'out-indent';
      div.innerHTML = html;
      box.appendChild(div);
    });
    if (labDisp.showBhExtendedLine && result.bhExtras && rt.isBhMainResLabChunk(text)) {
      var extTab = rt.formatBhExtendedTabLine(result.bhExtras, result.sourceText);
      if (extTab) {
        renderEntry(extTab).forEach(function (html, idx) {
          var divEx = document.createElement('div');
          divEx.className =
            (idx === 0 ? 'out-line' : 'out-indent') + ' lab-bh-extended-line';
          divEx.innerHTML = html;
          box.appendChild(divEx);
        });
      }
    }
  });
  document.getElementById('lab-output-section').style.display = 'block';
  syncLabOutputChrome();
  rt.wireAtbRisHoverPanels(box);
}

export const windowHandlers = {
  procesarReporte,
  clearLabInputAfterSuccessfulParse,
  limpiarReporte,
  replayLabHistorySet,
  reprocessLabHistorySet,
  deleteLabHistorySet,
  toggleLabHistoryPanel,
  syncLabHistoryCollapseUI,
  setLabHistoryPanelCollapsed,
  labHistoryPanelIsCollapsed,
  copiarLabsAlPortapapeles,
  openLabSomeTablesModal,
  closeLabSomeTablesModal,
  openSesionIngresoSendModal,
  closeSesionIngresoSendModal,
  closeLabHistoryMoreMenu,
  openLabPatientPicker,
  openLabHistoryDedupeReview,
  expandLabHistoryList,
  consolidateLabHistoryByDayAndTipo,
  insertLabPatientSeparator,
};

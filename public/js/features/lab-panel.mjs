// Built from app.js refactor — Laboratorio pane (historial, paste, multilab, salida)
import { storage } from "../storage.js";
import {
  procesarLabs,
  buildRefsBySectionFromReport,
  looksLikeSomeLabReport,
  reprocessLabResultLines_,
  renderEntry,
} from "../labs.js";
import {
  parseSomeReportTables,
  renderSomeReportTablesHtml,
  wireSomeTableExportButtons,
} from "../labs-some-table.mjs";
import {
  isDuplicateAgainstLatest,
  findDuplicateLabSetIdsToRemove,
  findExactDuplicateLabGroups,
  compareLabSetIdForDedupe,
  normalizeLabLine,
} from "../lab-history-auto-store-core.mjs";
import {
  sortLabHistoryChronological,
  parseFechaLabToMs,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
} from "../tend-core.mjs";
import { evaluateLabSuggestions, filterNewLabSuggestions } from "../lab-clinical-suggestions.mjs";
import { normalizeLabHistoryPatientSets } from "../storage.js";
import { patients, notes, labHistory, saveState } from "../app-state.mjs";
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

export function registerLabPanelRuntime(partial) {
  if (!partial || typeof partial !== "object") return;
  Object.assign(rt, partial);
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
  var headerBtn = document.getElementById("lab-copy-header-btn");
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
  if (headerBtn) {
    if (visible) {
      headerBtn.removeAttribute("hidden");
      headerBtn.setAttribute("aria-hidden", "false");
    } else {
      headerBtn.setAttribute("hidden", "");
      headerBtn.setAttribute("aria-hidden", "true");
    }
  }
  document.documentElement.classList.toggle("lab-copy-fab-active", visible);
}

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
  syncLabCopyFab(false);
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
  var hist = sortLabHistoryChronological(rt.ensureParsedLabHistory(rt.getActiveId()));
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
  listEl.innerHTML = hist.map(function(set, idx) {
    var n = (set.resLabs && set.resLabs.length) ? set.resLabs.length : 0;
    var rawFe = set.fecha === 'Anterior' ? '' : (normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || rt.inferFechaLabSetFromId(set) || '');
    var fe;
    if (set.id === 'migrated-anterior') {
      fe = rawFe ? ('Anterior · ' + rawFe) : 'Anterior (sin fecha en bloque)';
    } else {
      fe = rawFe || (set.fecha === 'Anterior' ? 'Anterior' : '—');
    }
    var ho = (set.hora && String(set.hora).trim()) ? String(set.hora).trim().slice(0, 8) : '';
    var parts = [fe];
    if (ho) parts.push(ho);
    parts.push(n + ' bloque' + (n === 1 ? '' : 's'));
    var meta = parts.join(' · ');
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
  var diag = document.getElementById('lab-diagrams-section');
  if (diag && diag.style.display !== 'none') {
    try { diag.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_e) { diag.scrollIntoView(true); }
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
    var repro = reprocessLabResultLines_(set.resLabs);
    if (!repro || !repro.length) {
      rt.showToast('No se pudieron regenerar resultados desde el bloque guardado', 'error');
      return;
    }
    set.resLabs = repro.slice();
    set.parsed = rt.extractParsedValues(set.resLabs);
    set.parsedBySection = rt.buildParsedBySectionFromResLabs(set.resLabs, set.bhExtras);
    applyLabClinicalSuggestions(rt.getActiveId(), set.resLabs, set.fecha, set.bhExtras);
    rt.rebuildEstudiosFromLabHistory(rt.getActiveId());
    saveState();
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
  saveState();
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
  return before - (labHistory[patientId] ? labHistory[patientId].length : 0);
}

function labDedupeSummaryLine(set) {
  if (!set) return '—';
  var rawFe =
    set.fecha === 'Anterior'
      ? ''
      : normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || rt.inferFechaLabSetFromId(set) || '';
  var fe = set.id === 'migrated-anterior' ? (rawFe ? 'Anterior · ' + rawFe : 'Anterior (sin fecha en bloque)') : rawFe || (set.fecha === 'Anterior' ? 'Anterior' : '—');
  var ho = set.hora && String(set.hora).trim() ? String(set.hora).trim().slice(0, 8) : '';
  var n = set.resLabs && set.resLabs.length ? set.resLabs.length : 0;
  var parts = [fe];
  if (ho) parts.push(ho);
  parts.push(n + ' línea' + (n === 1 ? '' : 's'));
  parts.push('id ' + String(set.id).slice(-12));
  return parts.join(' · ');
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
  var ms = parseFechaLabToMs(set.fecha, set.hora);
  var timePart =
    typeof ms === 'number' && isFinite(ms)
      ? 't:' + ms
      : 'f:' + normalizeFechaLabHistory(set.fecha) + '|h:' + normalizeHoraLabHistory(set.hora);
  var fp = labParsedFingerprintForDedupe(set);
  if (!fp) return '';
  return timePart + '||' + fp;
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
    saveState();
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
    var sections = [];
    patients.forEach(function (p) {
      if (p.isDemo) return;
      var r = buildLabDedupeChecklistSections(p.id);
      if (r.length) {
        sections.push({
          patientId: p.id,
          nombre: p.nombre || '—',
          registro: p.registro || '',
          rows: r,
        });
      }
    });
    if (!sections.length) {
      rt.showToast('No se encontraron duplicados ni coincidencias por fecha/valores', 'success');
      rt.closeSettingsDropdown();
      return;
    }
    showLabDedupeChecklistModal(sections);
    rt.closeSettingsDropdown();
  }
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
        'En cada grupo se conserva la entrada más antigua (id más viejo), se combinan todos los renglones y las líneas de texto idénticas se guardan una sola vez.'
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
    var merged = (keeper.resLabs || []).slice();
    var sourceParts = [];
    if (keeper.sourceText && String(keeper.sourceText).trim()) sourceParts.push(String(keeper.sourceText).trim());
    for (var i = 1; i < arr.length; i++) {
      var other = arr[i].resLabs || [];
      if (merged.length && other.length) merged.push('');
      merged = merged.concat(other);
      if (arr[i].sourceText && String(arr[i].sourceText).trim()) sourceParts.push(String(arr[i].sourceText).trim());
    }
    var deduped = dedupeConsolidatedRowsBySection(merged, tipoGrupo);
    keeper.resLabs = deduped;
    keeper.parsed = rt.extractParsedValues(deduped);
    var mergedBhExtras = {};
    for (var mi = 0; mi < arr.length; mi++) {
      var sMerge = arr[mi];
      if (sMerge && sMerge.bhExtras && typeof sMerge.bhExtras === 'object') {
        Object.keys(sMerge.bhExtras).forEach(function (bk) {
          mergedBhExtras[bk] = sMerge.bhExtras[bk];
        });
      }
    }
    keeper.bhExtras = mergedBhExtras;
    keeper.parsedBySection = rt.buildParsedBySectionFromResLabs(deduped, keeper.bhExtras);
    if (sourceParts.length) keeper.sourceText = sourceParts.join('\n\n---\n\n');
    var newest = arr[arr.length - 1];
    if (newest.hora) keeper.hora = newest.hora;
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
  saveState();
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
  syncLabCopyFab(false);
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

function pushLabHistory(patientId, resLabs, fecha, hora, sourceText, bhExtras, refsBySection) {
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
    id: Date.now().toString(),
    fecha: fechaNorm,
    hora: horaNorm,
    resLabs: resLabs,
    bhExtras: extras,
    parsed: rt.extractParsedValues(resLabs),
    parsedBySection: rt.buildParsedBySectionFromResLabs(resLabs, extras),
    refsBySection: refs
  };
  var raw = String(sourceText || '').trim();
  if (raw) set.sourceText = raw;
  labHistory[patientId].push(set);
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
    rt.showToast(
      'Registro ' + reg + ' no está en la lista. No se guardó en el historial.',
      'error'
    );
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
  applyLabClinicalSuggestions(rt.getActiveId(), result.resLabs, fecha, result.bhExtras);
  saveState();
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
}

function applyLabClinicalSuggestions(patientId, resLabs, fecha, bhExtras) {
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
  saveState();
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
  saveState();
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
    saveState();
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

function procesarReporte() {
  var text = document.getElementById('lab-input').value.trim();
  if (!text) { rt.showToast('Pega el texto del reporte primero','error'); return; }
  var fromSomeExpediente = looksLikeSomeLabReport(text);
  if (!fromSomeExpediente) {
    rt.showToast(
      'No parece un reporte de SOME. En el reporte de laboratorio, copia desde «Expediente:» hasta el final del reporte y pégalo completo aquí.',
      'error'
    );
  }
  try {
    var result = procesarLabs(text);
    result.sourceText = text;
    var resStore = applyLabPastePatientResolution(result);
    renderOutput(result);
    rt.renderDiagramas(result.resLabs);
    if (resStore.shouldAutoStore) autoStoreProcessedLabResult(result);
    if (!result.resLabs.length) {
      rt.showToast(
        fromSomeExpediente
          ? 'No se encontraron resultados de laboratorio en el texto pegado'
          : 'No se encontraron resultados. Copia el reporte completo desde SOME (desde «Expediente:»).',
        'error'
      );
    } else clearLabInputAfterSuccessfulParse();
  } catch(e) { rt.showToast('Error al procesar el reporte','error'); console.error(e); }
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
  if (src && looksLikeSomeLabReport(src)) {
    var someParsed = parseSomeReportTables(src);
    if (someParsed.departments && someParsed.departments.length) {
      var someHost = document.createElement('div');
      someHost.className = 'lab-some-tables-host';
      someHost.innerHTML = renderSomeReportTablesHtml(someParsed);
      box.appendChild(someHost);
      wireSomeTableExportButtons(someHost, function (msg, kind) {
        rt.showToast(msg, kind);
      });
      var someSep = document.createElement('div');
      someSep.className = 'lab-some-compact-sep';
      someSep.textContent = 'Resumen R+';
      box.appendChild(someSep);
    }
  }
  var labDisp = rt.getLabOutputPrefs();
  resLabs.forEach(function (text) {
    if (labDisp.hideGasoAdvInterp && rt.isGasoInterpretacionResLabChunk(text)) return;
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
  syncLabCopyFab(true);
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
  closeLabHistoryMoreMenu,
  openLabPatientPicker,
  openLabHistoryDedupeReview,
  consolidateLabHistoryByDayAndTipo,
};

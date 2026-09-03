// Lab panel — historial dedupe y consolidación por día
import {
  sortLabHistoryChronological,
  parseFechaLabToMs,
} from '../tend-core.mjs';
import { getPatients, getLabHistory, getNotes, persistClinicalState } from '../app-state.mjs';
import { esc } from '../dom-escape.mjs';
import { labPanelBridge } from './lab-panel-bridge.mjs';
import { bumpLabHistoryRevision } from '../lab-history-cache.mjs';
import {
  findExactDuplicateLabGroups,
  findComplementaryLabHistoryMergeGroups,
  compareLabSetIdForDedupe,
} from '../lab-history-auto-store-core.mjs';
import { resLabsHasGasometria } from '../lab-history-format.mjs';
import { sanitizeResLabsChunks } from '../labs-reslabs-sanitize.mjs';
import { labTimestampMsFromFechaHora } from '../lab-consolidation-cluster.mjs';
import {
  buildLabConsolidationMergeJobs,
  buildManualLabConsolidationJobs,
  buildSameDateTimeLabMergeJobs,
  labSetSectionSummary,
  listLabConsolidationCandidates,
  validateManualConsolidationGroup,
} from '../lab-consolidation-plan.mjs';
import { isGasometriaOnlyResLabs } from '../lab-history-format.mjs';
import {
  finishLabConsolidateUi,
  wireLabConsolidateModal,
  buildLabConsolidateModalHtml,
  tipoLabel,
} from './lab-panel-history-consolidate-modal.mjs';
import { preferKeeperSetIdFromConsolidateResult } from './lab-panel-history-consolidate-refresh.mjs';

import { rt } from './lab-panel-runtime-state.mjs';
import { labSetIdForHistory, clearLabHistoryDateSelectCache, dedupeConsolidatedRowsBySection, refreshSameDayAscitisForPatient, setLabHistorySelectedSetId } from './lab-panel-history.mjs';

function renderLabDedupeRowsHtml(rows) {
  return rows
    .map(function (r) {
      return (
        '<li style="margin:6px 0;"><label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;">' +
        '<input type="checkbox" class="lab-dedupe-cb" data-pid="' +
        esc(r.patientId) +
        '" data-sid="' +
        esc(r.id) +
        '" checked style="margin-top:3px;flex-shrink:0;" /> <span>' +
        esc(r.summary) +
        '</span></label></li>'
      );
    })
    .join('');
}

function renderLabDedupePatientBlock(sec) {
  const exact = sec.rows.filter(function (r) {
    return r.kind === 'exact';
  });
  const loose = sec.rows.filter(function (r) {
    return r.kind === 'loose';
  });
  const head =
    '<h4 style="margin:12px 0 8px;font-size:14px;font-weight:700;color:var(--text);">' +
    esc(sec.nombre || '—') +
    (sec.registro ? ' <span style="opacity:0.85;font-weight:500">· ' + esc(sec.registro) + '</span>' : '') +
    '</h4>';
  let part = '<div class="lab-dedupe-patient-block">' + head;
  if (exact.length) {
    part +=
      '<p style="margin:0 0 6px;font-size:12px;color:var(--text-muted);font-weight:600;">Duplicados exactos (misma fecha, hora y texto del reporte)</p>' +
      '<ul style="margin:0 0 14px;padding-left:0;list-style:none;max-height:220px;overflow-y:auto;font-size:13px;">' +
      renderLabDedupeRowsHtml(exact) +
      '</ul>';
  }
  if (loose.length) {
    part +=
      '<p style="margin:0 0 6px;font-size:12px;color:var(--text-muted);font-weight:600;">Posibles duplicados (misma fecha/hora y mismos valores numéricos parseados; el texto del reporte puede diferir)</p>' +
      '<ul style="margin:0 0 14px;padding-left:0;list-style:none;max-height:220px;overflow-y:auto;font-size:13px;">' +
      renderLabDedupeRowsHtml(loose) +
      '</ul>';
  }
  return part + '</div>';
}

function buildLabDedupeModalHtml(sections) {
  const blocks = sections.map(renderLabDedupePatientBlock).join('');
  const defaultCount = sections.reduce(function (acc, s) {
    return acc + s.rows.length;
  }, 0);
  return (
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
    '</div></div></div>'
  );
}

/** @param {HTMLElement} backdrop @param {(mapByPatient: Record<string, string[]>) => number} onConfirm */
function wireLabDedupeModal(backdrop, onConfirm) {
  function updateCount() {
    const n = backdrop.querySelectorAll('.lab-dedupe-cb:checked').length;
    const el = document.getElementById('lab-dedupe-count');
    if (el) el.textContent = n + ' seleccionada' + (n === 1 ? '' : 's');
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
    const mapByPatient = {};
    backdrop.querySelectorAll('.lab-dedupe-cb:checked').forEach(function (cb) {
      const pid = cb.getAttribute('data-pid');
      const sid = cb.getAttribute('data-sid');
      if (!pid || !sid) return;
      if (!mapByPatient[pid]) mapByPatient[pid] = [];
      mapByPatient[pid].push(sid);
    });
    backdrop.remove();
    const nSel = Object.keys(mapByPatient).reduce(function (a, pid) {
      return a + mapByPatient[pid].length;
    }, 0);
    if (!nSel) {
      rt.showToast('No seleccionaste entradas para eliminar', 'error');
      return;
    }
    if (typeof rt.pushUndoSnapshot === 'function') {
      rt.pushUndoSnapshot('Eliminar duplicados de historial de labs (' + nSel + ')');
    }
    const removedTotal = onConfirm(mapByPatient);
    persistClinicalState({ immediate: true });
    labPanelBridge.renderLabHistoryPanel();
    rt.refreshTendenciasOrCultivosPanel();
    const el = document.querySelector('#note-form textarea[oninput*="estudios"]');
    if (el && rt.getActiveId() && getNotes()[rt.getActiveId()]) {
      el.value = getNotes()[rt.getActiveId()].estudios || '';
    }
    rt.addAuditEntry('lab-history-dedupe', 'ok', removedTotal, Object.keys(mapByPatient).length + ' pacientes');
    rt.showToast('Eliminadas ' + removedTotal + ' entrada' + (removedTotal === 1 ? '' : 's') + ' ✓', 'success');
  };
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
    if (!ids || !ids.length || !getLabHistory()[pid]) return;
    var idSet = new Set(ids.map(String));
    var before = getLabHistory()[pid].length;
    getLabHistory()[pid] = getLabHistory()[pid].filter(function (s) {
      return !idSet.has(String(s.id));
    });
    if (!getLabHistory()[pid].length) delete getLabHistory()[pid];
    rt.rebuildEstudiosFromLabHistory(pid);
    removedTotal += before - (getLabHistory()[pid] ? getLabHistory()[pid].length : 0);
    if (before !== (getLabHistory()[pid] ? getLabHistory()[pid].length : 0)) bumpLabHistoryRevision(pid);
  });
  return removedTotal;
}

function showLabDedupeChecklistModal(sections) {
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'lab-dedupe-backdrop';
  backdrop.innerHTML = buildLabDedupeModalHtml(sections);
  document.body.appendChild(backdrop);
  wireLabDedupeModal(backdrop, applyLabDedupeFromChecklist);
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
    var p = getPatients().find(function (x) {
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
  var list = getPatients().filter(function (p) {
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

function labSetDayKey(set) {
  return rt.dayKeyFromLabSet(set);
}

function labSetTipo(set) {
  return rt.primaryTipoForLabSet(set.resLabs);
}

/** True si el set ya ocupa el cupo de gasometría (solo-gaso o labs+GASES). */
function labSetHasGasometria(set) {
  return resLabsHasGasometria(set && set.resLabs);
}

/** Solo gasometría pura — para no colapsar ABG seriadas a la misma hora. */
function labSetIsGasometriaOnly(set) {
  return isGasometriaOnlyResLabs(set && set.resLabs);
}

function combineConsolidationResults_(a, b) {
  return {
    merged: (a.merged || 0) + (b.merged || 0),
    removedIds: [].concat(a.removedIds || [], b.removedIds || []),
    keeperIds: [].concat(a.keeperIds || [], b.keeperIds || []),
  };
}

function labSetTimestampMs(set) {
  return labTimestampMsFromFechaHora(set.fecha, set.hora);
}

function mergeLabHistorySetsCluster(patientId, setsToMerge, tipoGrupo) {
  var removedIds = [];
  if (!setsToMerge || setsToMerge.length < 2) return removedIds;

  var arr = setsToMerge.slice();
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
  mergeOrder.forEach(function (set) {
    var other = set.resLabs || [];
    if (merged.length && other.length) merged.push('');
    merged = merged.concat(other);
    if (set.sourceText && String(set.sourceText).trim()) sourceParts.push(String(set.sourceText).trim());
  });
  var deduped = sanitizeResLabsChunks(dedupeConsolidatedRowsBySection(merged, tipoGrupo));
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
  refreshSameDayAscitisForPatient(patientId, keeper.id);
  // Conserva hora solo si todos los sets coinciden al minuto; si no, evita hora engañosa.
  var horas = {};
  arr.forEach(function (s) {
    var h = String(s.hora || '').trim().slice(0, 5);
    if (h) horas[h] = true;
  });
  var horaKeys = Object.keys(horas);
  if (horaKeys.length === 1) keeper.hora = horaKeys[0];
  else keeper.hora = '';
  for (var j = 1; j < arr.length; j++) {
    removedIds.push(String(arr[j].id));
  }
  return removedIds;
}

function executeLabConsolidationMergeJobs(patientId, jobs) {
  var out = { merged: 0, removedIds: [], keeperIds: [] };
  if (!patientId || !jobs || !jobs.length || !getLabHistory()[patientId]) return out;

  var todo = [];
  var keeperIds = [];
  jobs.forEach(function (job) {
    var tipoGrupo = job.sets.some(function (s) {
      return labSetTipo(s) === 'labs';
    })
      ? 'labs'
      : labSetTipo(job.sets[0]) || 'labs';
    var removed = mergeLabHistorySetsCluster(patientId, job.sets, tipoGrupo);
    if (!removed.length) return;
    removed.forEach(function (id) {
      todo.push(id);
    });
    keeperIds.push(String(job.sets[0].id));
  });

  if (!todo.length) return out;

  var idRemove = new Set(todo);
  getLabHistory()[patientId] = getLabHistory()[patientId].filter(function (s) {
    return !idRemove.has(String(s.id));
  });
  if (!getLabHistory()[patientId].length) delete getLabHistory()[patientId];
  bumpLabHistoryRevision(patientId);
  clearLabHistoryDateSelectCache();
  out.merged = todo.length;
  out.removedIds = todo;
  out.keeperIds = keeperIds;
  return out;
}

function dayLabelFromDayKey(dayKey) {
  if (!dayKey || dayKey === 'unknown') return '—';
  var parts = String(dayKey).split('-').map(function (x) {
    return parseInt(x, 10);
  });
  if (parts.length !== 3 || !isFinite(parts[0])) return dayKey;
  var dd = String(parts[2]).padStart(2, '0');
  var mm = String(parts[1]).padStart(2, '0');
  return dd + '/' + mm + '/' + parts[0];
}

function buildConsolidationCandidateRows(patientId) {
  rt.ensureParsedLabHistory(patientId);
  var sets = getLabHistory()[patientId] ? getLabHistory()[patientId].slice() : [];
  return listLabConsolidationCandidates(sets, labSetDayKey, labSetTipo).map(function (set) {
    var tipo = labSetTipo(set);
    return {
      id: String(set.id),
      label: rt.formatLabHistoryDateSelectLabel(set),
      dayKey: labSetDayKey(set),
      dayLabel: dayLabelFromDayKey(labSetDayKey(set)),
      tipo: tipo,
      tipoLabel: tipoLabel(tipo),
      sections: labSetSectionSummary(set.resLabs),
    };
  });
}

function setsByIdForPatient(patientId) {
  var map = Object.create(null);
  (getLabHistory()[patientId] || []).forEach(function (set) {
    if (set && set.id != null) map[String(set.id)] = set;
  });
  return map;
}

/** Auto (import): misma hora primero, luego ventana ≤2 h. Manual UI: grupos del usuario. */
function runLabConsolidationForPatient(patientId, outlierGroupKeys) {
  if (!patientId || !getLabHistory()[patientId] || getLabHistory()[patientId].length < 2) {
    return { merged: 0, removedIds: [], keeperIds: [] };
  }
  rt.ensureParsedLabHistory(patientId);
  var sets = getLabHistory()[patientId].slice();
  var sameDtJobs = buildSameDateTimeLabMergeJobs(sets, labSetTipo, labSetIsGasometriaOnly);
  var sameDtResult = executeLabConsolidationMergeJobs(patientId, sameDtJobs);
  sets = getLabHistory()[patientId] ? getLabHistory()[patientId].slice() : [];
  var jobs =
    sets.length >= 2
      ? buildLabConsolidationMergeJobs(
          sets,
          labSetDayKey,
          labSetTipo,
          labSetTimestampMs,
          outlierGroupKeys,
          labSetHasGasometria
        )
      : [];
  var windowResult = executeLabConsolidationMergeJobs(patientId, jobs);
  // Fragmentos del mismo día que nunca chocan en ningún analito (p. ej. LCR: recuento
  // celular de Bacteriología + pH/Glu/Prot/Cl de Química Clínica) — sin tope de horas,
  // fusionar dos analitos distintos nunca pisa un valor.
  sets = getLabHistory()[patientId] ? getLabHistory()[patientId].slice() : [];
  var complementaryCandidates = sets.filter(function (s) {
    var t = labSetTipo(s);
    return t !== 'mixed' && t !== 'cultivo';
  });
  var complementaryGroups = findComplementaryLabHistoryMergeGroups(complementaryCandidates);
  var complementaryJobs = complementaryGroups.length
    ? buildManualLabConsolidationJobs(complementaryGroups, setsByIdForPatient(patientId))
    : [];
  var complementaryResult = executeLabConsolidationMergeJobs(patientId, complementaryJobs);
  var result = combineConsolidationResults_(
    combineConsolidationResults_(sameDtResult, windowResult),
    complementaryResult
  );
  if (result.merged) rt.rebuildEstudiosFromLabHistory(patientId);
  return result;
}

function runManualLabConsolidationForPatient(patientId, groups) {
  if (!patientId || !getLabHistory()[patientId] || !groups || !groups.length) {
    return { merged: 0, removedIds: [], keeperIds: [] };
  }
  rt.ensureParsedLabHistory(patientId);
  var byId = setsByIdForPatient(patientId);
  var jobs = buildManualLabConsolidationJobs(groups, byId);
  var result = executeLabConsolidationMergeJobs(patientId, jobs);
  if (result.merged) rt.rebuildEstudiosFromLabHistory(patientId);
  return result;
}

/**
 * Fusiona entradas del mismo día, tipo homogéneo y ventana horaria ≤2 h.
 * @returns {{ merged: number, removedIds: string[], keeperIds: string[] }}
 */
function runLabHistoryDayTipoConsolidation(patientId) {
  return runLabConsolidationForPatient(patientId, null);
}

function autoConsolidateLabHistoryForPatient(patientId) {
  return runLabHistoryDayTipoConsolidation(patientId);
}

function findDisplayLabHistorySetId(patientId, displayResult) {
  if (!patientId || !displayResult) return '';
  var hist = sortLabHistoryChronological(
    rt.ensureParsedLabHistoryCached
      ? rt.ensureParsedLabHistoryCached(patientId)
      : rt.ensureParsedLabHistory(patientId, { readOnly: true })
  );
  if (!hist.length) return '';

  var targetDay = rt.dayKeyFromLabSet({
    fecha: displayResult.patient && displayResult.patient.fecha,
    hora: displayResult.patient && displayResult.patient.hora,
  });
  var candidates = hist.filter(function (set) {
    return rt.dayKeyFromLabSet(set) === targetDay;
  });
  if (!candidates.length) candidates = [hist[0]];

  candidates.sort(function (a, b) {
    var la = (a.resLabs && a.resLabs.length) || 0;
    var lb = (b.resLabs && b.resLabs.length) || 0;
    if (lb !== la) return lb - la;
    var ta = parseFechaLabToMs(a.fecha, a.hora);
    var tb = parseFechaLabToMs(b.fecha, b.hora);
    if (typeof ta === 'number' && typeof tb === 'number' && isFinite(ta) && isFinite(tb) && tb !== ta) {
      return tb - ta;
    }
    return 0;
  });

  var pick = candidates[0];
  var idx = hist.indexOf(pick);
  return labSetIdForHistory(pick, idx >= 0 ? idx : 0);
}

/**
 * Consolidación manual: el usuario arma grupos de conjuntos (mismo día).
 * Los mixtos no aparecen como candidatos. El auto ≤2 h sigue en import (autoConsolidate).
 */
function consolidateLabHistoryByDayAndTipo() {
  if (!rt.getActiveId()) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var patientId = rt.getActiveId();
  var list = getLabHistory()[patientId];
  if (!list || list.length < 2) {
    rt.showToast('Se necesitan al menos 2 conjuntos en el historial', 'error');
    return;
  }

  var candidates = buildConsolidationCandidateRows(patientId);
  if (candidates.length < 2) {
    rt.showToast('No hay suficientes conjuntos con fecha para consolidar', 'success');
    return;
  }

  var byDay = Object.create(null);
  candidates.forEach(function (c) {
    byDay[c.dayKey] = (byDay[c.dayKey] || 0) + 1;
  });
  var hasPairableDay = Object.keys(byDay).some(function (dk) {
    return byDay[dk] >= 2;
  });
  if (!hasPairableDay) {
    rt.showToast('Necesitas al menos 2 conjuntos del mismo día para armar un grupo', 'success');
    return;
  }

  function applyManualGroups(groups) {
    if (typeof rt.pushUndoSnapshot === 'function') {
      rt.pushUndoSnapshot('Consolidar historial de labs (grupos manuales)');
    }
    var result = runManualLabConsolidationForPatient(patientId, groups);
    
    var preferSetId = preferKeeperSetIdFromConsolidateResult(result);
    if (preferSetId) setLabHistorySelectedSetId(patientId, preferSetId);
    finishLabConsolidateUi(patientId, result.merged);
  }

  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'lab-consolidate-backdrop';
  backdrop.innerHTML = buildLabConsolidateModalHtml({ candidates: candidates });
  document.body.appendChild(backdrop);
  wireLabConsolidateModal(backdrop, {
    candidates: candidates,
    validateGroup: function (setIds) {
      return validateManualConsolidationGroup(
        setIds,
        setsByIdForPatient(patientId),
        labSetDayKey,
        labSetTipo
      );
    },
    onConfirm: applyManualGroups,
  });
}
export {
  findDisplayLabHistorySetId,
  autoConsolidateLabHistoryForPatient,
  openLabHistoryDedupeReview,
  consolidateLabHistoryByDayAndTipo,
};

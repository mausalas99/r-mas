/**
 * Utilidades de conjuntos de laboratorio en historial: parseo, fusión por tipo, estudios en nota.
 */
import {
  procesarLabs,
  buildRefsBySectionFromReport,
  extractLabReportHora,
  reprocessLabResultLines_,
} from './labs.js';
import {
  findExactDuplicateLabGroups,
  findNormalizedSourceDuplicateGroups,
  findConflictingSameDateTimeGroups,
  areLabSetsEquivalent,
  compareLabSetIdForDedupe,
  normalizeLabLine,
} from './lab-history-auto-store-core.mjs';
import {
  sortLabHistoryChronological,
  parseFechaLabToMs,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
} from './tend-core.mjs';
import { extractParsedValues, buildParsedBySectionFromResLabs } from './features/diagrams.mjs';
import { inferFechaLabSetFromId } from './features/tendencias.mjs';
import { normalizeLabHistoryPatientSets } from './storage.js';
import {
  patients,
  notes,
  labHistory,
  medRecetaByPatient,
  listadoProblemas,
  saveState,
} from './app-state.mjs';
import { storage } from './storage.js';

let maintRt = {
  getActiveId() {
    return null;
  },
  renderLabHistoryPanel() {},
  refreshTendenciasOrCultivosPanel() {},
};

export function registerLabHistoryMaintRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(maintRt, partial);
}

export function isLikelyLabDataLine(line) {
  if (!line) return false;
  var t = line.trim();
  if (!t) return false;
  if (/^\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?$/.test(t)) return false;
  if (t.indexOf('\t') !== -1) return true;
  if (/^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|CULTIVO)\b/i.test(t)) return true;
  return /\d/.test(t) && /[A-Za-z]/.test(t);
}

export function extractLabDataLines(lines) {
  return (lines || []).filter(isLikelyLabDataLine);
}

export function buildLabSetDateLine(set) {
  if (!set) return '';
  var rawDate = normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || inferFechaLabSetFromId(set) || '';
  var rawHora = normalizeHoraLabHistory(set.hora);
  if (!rawDate) return '';
  return rawHora ? rawDate + ' ' + rawHora.slice(0, 5) : rawDate;
}

export function buildLabSetDateLineForNota(set) {
  if (!set) return '';
  if (set.fecha === 'Anterior' || set.id === 'migrated-anterior') return 'Anterior';
  var rawDate = normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || inferFechaLabSetFromId(set) || '';
  if (!rawDate) return '';
  if (rawDate.length >= 5 && rawDate.indexOf('/') !== -1) return rawDate.slice(0, 5);
  return rawDate;
}

export function isLabSectionHeaderLine(s) {
  return /^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|PltCit|FROTIS)\b/i.test(String(s).trim());
}

export function isCultivoBlockStartLine(s) {
  var t = String(s).trim();
  if (!t) return false;
  if (/^CULTIVO\b/i.test(t)) return true;
  if (/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S/i.test(t)) return true;
  if (/^BACTERIOLOGIA\b/i.test(t)) return true;
  if (/^UROCULTIVO\b/i.test(t)) return true;
  if (/^HEMOCULTIVO\b/i.test(t)) return true;
  if (/^FUNGICULTIVO\b/i.test(t)) return true;
  if (/^TINCION\s+DE\s+GRAM/i.test(t)) return true;
  if (/^CATETER\b/i.test(t)) return true;
  if (/^ATB\b/i.test(t)) return true;
  if (/^Cuenta:/i.test(t)) return true;
  if (/^[•\u2022\u00B7]\s*/.test(t)) return true;
  if (/^Cultivos$/i.test(t)) return true;
  if (t.indexOf('\t') === -1 && /^[A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ]+){1,4}$/.test(t)) {
    var ws = t.split(/\s+/).filter(Boolean);
    if (ws.length < 2 || ws[0].length < 5 || ws[1].length < 3) return false;
    if (/^(INTERCONSULTA|SALA|SERVICIO|UNIDAD|PACIENTE|HOSPITAL|AREA|CONTROL|DEPARTAMENTO)/i.test(ws[0])) return false;
    if (/^(CARDIOLOGIA|CIRUGIA|URGENCIAS|INTERNA|MEDICINA|PEDIATRIA|NEFROLOGIA|HEMATOLOGIA)$/i.test(ws[1])) return false;
    return true;
  }
  return false;
}

export function splitResLabsByTipo(rows) {
  var labs = [];
  var cultivo = [];
  var inCultivo = false;
  (rows || []).forEach(function (row) {
    var raw = row == null ? '' : row;
    var s = String(raw).trim();
    if (isLabSectionHeaderLine(s)) {
      inCultivo = false;
      labs.push(raw);
      return;
    }
    if (inCultivo) {
      cultivo.push(raw);
      return;
    }
    if (isCultivoBlockStartLine(s)) {
      inCultivo = true;
      cultivo.push(raw);
      return;
    }
    labs.push(raw);
  });
  return { labs: labs, cultivo: cultivo };
}

export function dayKeyFromLabSet(set) {
  if (!set || set.fecha === 'Anterior') return 'Anterior';
  var ms = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof ms === 'number' && isFinite(ms)) {
    var d = new Date(ms);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  var n = normalizeFechaLabHistory(set.fecha);
  if (n && n !== 'Anterior') {
    var ms2 = parseFechaLabToMs(n, set.hora);
    if (typeof ms2 === 'number' && isFinite(ms2)) {
      var d2 = new Date(ms2);
      return d2.getFullYear() + '-' + (d2.getMonth() + 1) + '-' + d2.getDate();
    }
  }
  return 'unknown';
}

function dayKeyToSortMs(dk) {
  if (dk === 'Anterior') return Number.NEGATIVE_INFINITY;
  if (dk === 'unknown') return Number.MIN_SAFE_INTEGER;
  var p = dk.split('-').map(function (x) {
    return parseInt(x, 10);
  });
  if (p.length !== 3 || !isFinite(p[0])) return 0;
  return new Date(p[0], p[1] - 1, p[2]).getTime();
}

export function primaryTipoForLabSet(resLabs) {
  var sp = splitResLabsByTipo(resLabs || []);
  var hasL = sp.labs.some(function (r) {
    return String(r || '').trim();
  });
  var hasC = sp.cultivo.some(function (r) {
    return String(r || '').trim();
  });
  if (hasC && hasL) return 'mixed';
  if (hasC) return 'cultivo';
  return 'labs';
}

export function rebuildEstudiosFromLabHistory(patientId) {
  if (!patientId) return;
  if (!notes[patientId]) notes[patientId] = {};
  var ordered = sortLabHistoryChronological(ensureParsedLabHistory(patientId));
  if (!ordered.length) {
    notes[patientId].estudios = '';
    return;
  }
  var byDay = Object.create(null);
  ordered.forEach(function (set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var dk = dayKeyFromLabSet(set);
    if (!byDay[dk]) byDay[dk] = { sets: [] };
    byDay[dk].sets.push(set);
  });
  var dayKeys = Object.keys(byDay).sort(function (a, b) {
    if (a === 'Anterior') return 1;
    if (b === 'Anterior') return -1;
    return dayKeyToSortMs(b) - dayKeyToSortMs(a);
  });
  var lines = [];
  dayKeys.forEach(function (dk) {
    var sets = byDay[dk].sets.slice().sort(function (a, b) {
      var ta = parseFechaLabToMs(a.fecha, a.hora);
      var tb = parseFechaLabToMs(b.fecha, b.hora);
      if (typeof ta === 'number' && typeof tb === 'number' && isFinite(ta) && isFinite(tb) && ta !== tb) return tb - ta;
      return compareLabSetIdForDedupe(a, b);
    });
    var labsAcc = [];
    var cultAcc = [];
    var seenLab = Object.create(null);
    var seenCul = Object.create(null);
    sets.forEach(function (set) {
      var sp = splitResLabsByTipo(set.resLabs);
      sp.labs.forEach(function (row) {
        var clean = String(row == null ? '' : row).trim();
        if (!clean) return;
        var norm = normalizeLabLine(clean);
        if (seenLab[norm]) return;
        seenLab[norm] = true;
        labsAcc.push(row);
      });
      sp.cultivo.forEach(function (row) {
        var clean = String(row == null ? '' : row).trim();
        if (!clean) return;
        var norm = normalizeLabLine(clean);
        if (seenCul[norm]) return;
        seenCul[norm] = true;
        cultAcc.push(row);
      });
    });
    if (!labsAcc.length && !cultAcc.length) return;
    var headerSet = sets[0];
    var dateLine = buildLabSetDateLineForNota(headerSet);
    if (dateLine) lines.push(dateLine);
    if (labsAcc.length) {
      labsAcc.forEach(function (row) {
        var clean = String(row == null ? '' : row).trim();
        if (clean) lines.push(clean);
      });
    }
    if (cultAcc.length) {
      if (labsAcc.length) lines.push('');
      lines.push('Cultivos');
      cultAcc.forEach(function (row) {
        var clean = String(row == null ? '' : row).trim();
        if (clean) lines.push(clean);
      });
    }
    lines.push('');
  });
  while (lines.length && !String(lines[lines.length - 1]).trim()) lines.pop();
  notes[patientId].estudios = lines.join('\n');
}

export function ensureParsedLabHistory(patientId) {
  var raw = labHistory[patientId];
  var history = normalizeLabHistoryPatientSets(raw);
  var changed = !Array.isArray(raw) || raw !== history;
  var rebuildNota = false;
  var noteLines = notes[patientId] && notes[patientId].estudios ? notes[patientId].estudios.split('\n') : [];

  history.forEach(function (set) {
    if (!set) return;
    if (!set.resLabs || !set.resLabs.length) {
      if (set.id === 'migrated-anterior') {
        set.resLabs = extractLabDataLines(noteLines.slice(0, 3));
        changed = true;
      } else if (set.id === 'migrated-recent') {
        set.resLabs = extractLabDataLines(noteLines.slice(3));
        changed = true;
      }
    }
    if (!set.bhExtras && set.sourceText) {
      try {
        var reParse = procesarLabs(set.sourceText);
        set.bhExtras = reParse && reParse.bhExtras ? reParse.bhExtras : {};
      } catch (_e) {
        set.bhExtras = {};
      }
      changed = true;
    }
    var needsParse = !set.parsed || !Object.keys(set.parsed).length;
    if (needsParse) {
      if (!set.resLabs || !set.resLabs.length) {
        set.parsed = {};
        changed = true;
      } else {
        set.parsed = extractParsedValues(set.resLabs);
        changed = true;
      }
    }
    if (set.resLabs && set.resLabs.length) {
      var pbNext = buildParsedBySectionFromResLabs(set.resLabs, set.bhExtras);
      var pbStr = JSON.stringify(pbNext);
      if (JSON.stringify(set.parsedBySection || null) !== pbStr) {
        set.parsedBySection = pbNext;
        changed = true;
      }
    } else if (set.parsedBySection && Object.keys(set.parsedBySection).length) {
      set.parsedBySection = {};
      changed = true;
    }
    var nf = normalizeFechaLabHistory(set.fecha);
    if (nf && nf !== set.fecha && set.fecha !== 'Anterior') {
      set.fecha = nf;
      changed = true;
    }
    var nh = normalizeHoraLabHistory(set.hora);
    if (nh !== (set.hora || '')) {
      set.hora = nh;
      changed = true;
    }
    if (set.sourceText) {
      if (!set.refsBySection || !Object.keys(set.refsBySection).length) {
        var refsNext = buildRefsBySectionFromReport(set.sourceText);
        if (refsNext && Object.keys(refsNext).length) {
          set.refsBySection = refsNext;
          changed = true;
        }
      }
      var horaFromSrc = extractLabReportHora(set.sourceText);
      if (horaFromSrc && horaFromSrc !== normalizeHoraLabHistory(set.hora)) {
        set.hora = horaFromSrc;
        changed = true;
        rebuildNota = true;
      }
    }
    if ((!set.fecha || !String(set.fecha).trim()) && set.fecha !== 'Anterior') {
      var inferred = inferFechaLabSetFromId(set);
      if (inferred) {
        set.fecha = inferred;
        changed = true;
      }
    }
  });
  if (rebuildNota && patientId && notes[patientId]) {
    rebuildEstudiosFromLabHistory(patientId);
    changed = true;
  }
  if (!Array.isArray(raw) || raw !== history) {
    if (history.length) labHistory[patientId] = history;
    else delete labHistory[patientId];
    changed = true;
  }
  if (changed) saveState();
  return history;
}

var _labMaintTimer = null;
var _labMaintRunning = false;
var LAB_MAINT_DEBOUNCE_MS = 550;

export function runLabHistoryPostSaveMaintenance() {
  var report = {
    at: new Date().toISOString(),
    reprocessedSetCount: 0,
    patientsReprocessed: [],
    exactDuplicates: [],
    sourceDuplicates: [],
    sameDateTimeConflicts: [],
  };
  var changed = false;
  Object.keys(labHistory || {}).forEach(function (pid) {
    if (pid.indexOf('demo-') === 0) return;
    var sets = labHistory[pid];
    if (!Array.isArray(sets) || !sets.length) return;
    sets.forEach(function (set) {
      if (!set.resLabs || !set.resLabs.length) return;
      var repro = reprocessLabResultLines_(set.resLabs);
      if (!repro || !repro.length) return;
      if (!areLabSetsEquivalent(set.resLabs, repro)) {
        set.resLabs = repro.slice();
        set.parsed = extractParsedValues(repro);
        set.parsedBySection = buildParsedBySectionFromResLabs(repro, set.bhExtras);
        changed = true;
        report.reprocessedSetCount++;
        if (report.patientsReprocessed.indexOf(pid) === -1) report.patientsReprocessed.push(pid);
      }
    });
    var ex = findExactDuplicateLabGroups(sets);
    if (ex.length) {
      report.exactDuplicates.push({ patientId: pid, groups: ex });
    }
    var src = findNormalizedSourceDuplicateGroups(sets);
    if (src.length) {
      report.sourceDuplicates.push({ patientId: pid, groups: src });
    }
    var ct = findConflictingSameDateTimeGroups(sets);
    if (ct.length) {
      report.sameDateTimeConflicts.push({ patientId: pid, groups: ct });
    }
  });
  try {
    window.__rpcLabAudit = report;
  } catch (_e) {}
  var noise =
    report.reprocessedSetCount > 0 ||
    report.exactDuplicates.length > 0 ||
    report.sourceDuplicates.length > 0 ||
    report.sameDateTimeConflicts.length > 0;
  if (noise) {
    console.info('[R+ Laboratorio] Auditoría tras guardado — revisa window.__rpcLabAudit:', report);
  }
  return changed;
}

export function scheduleLabHistoryPostSaveMaintenance() {
  clearTimeout(_labMaintTimer);
  _labMaintTimer = setTimeout(function () {
    _labMaintTimer = null;
    if (_labMaintRunning) return;
    _labMaintRunning = true;
    try {
      var changed = runLabHistoryPostSaveMaintenance();
      if (changed) {
        storage.saveAll(patients, notes, labHistory, medRecetaByPatient, listadoProblemas);
        var aid = maintRt.getActiveId();
        if (aid) {
          try {
            maintRt.renderLabHistoryPanel();
          } catch (_r) {}
        }
        try {
          maintRt.refreshTendenciasOrCultivosPanel();
        } catch (_t) {}
      }
    } catch (err) {
      console.warn('[R+ Laboratorio] Falló mantenimiento post-guardado:', err);
    } finally {
      _labMaintRunning = false;
    }
  }, LAB_MAINT_DEBOUNCE_MS);
}

export function installLabHistoryAuditHook() {
  try {
    window.runRpcLabAuditNow = function () {
      var ch = runLabHistoryPostSaveMaintenance();
      if (ch) {
        storage.saveAll(patients, notes, labHistory, medRecetaByPatient, listadoProblemas);
        var aid = maintRt.getActiveId();
        if (aid) {
          try {
            maintRt.renderLabHistoryPanel();
          } catch (_e) {}
        }
        try {
          maintRt.refreshTendenciasOrCultivosPanel();
        } catch (_e2) {}
      }
      return window.__rpcLabAudit;
    };
  } catch (_eRun) {}
}

// ── Lab History Migration ─────────────────────────────────────────
(function migrateLabHistory() {
  try {
    if (localStorage.getItem('rpc-labHistory')) return;
  } catch (_lsErr) {
    return;
  }
  patients.forEach(function (p) {
    try {
      if (!notes[p.id] || !notes[p.id].estudios) return;
      var lines = notes[p.id].estudios.split('\n');
      var anteriorLines = lines.slice(0, 3).filter(function (l) {
        return l.trim();
      });
      var recentLines = lines.slice(3).filter(function (l) {
        return l.trim();
      });
      var sets = [];
      if (anteriorLines.length) {
        var migratedAnteriorLabs = extractLabDataLines(anteriorLines);
        sets.push({
          id: 'migrated-anterior',
          fecha: 'Anterior',
          hora: '',
          resLabs: migratedAnteriorLabs,
          parsed: extractParsedValues(migratedAnteriorLabs),
        });
      }
      if (recentLines.length) {
        var migratedRecentLabs = extractLabDataLines(recentLines);
        sets.push({
          id: 'migrated-recent',
          fecha: normalizeFechaLabHistory(recentLines[0] || notes[p.id].fecha || ''),
          hora: notes[p.id].hora || '',
          resLabs: migratedRecentLabs,
          parsed: extractParsedValues(migratedRecentLabs),
        });
      }
      if (sets.length) labHistory[p.id] = sets;
    } catch (e) {
      console.error('migrateLabHistory patient error:', p && p.id, e && e.message);
    }
  });
  try {
    localStorage.setItem('rpc-labHistory', JSON.stringify(labHistory));
  } catch (e) {
    console.error('migrateLabHistory write error:', e && e.message);
  }
})();

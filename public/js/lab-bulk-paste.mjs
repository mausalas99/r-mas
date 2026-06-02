/**
 * Entrada masiva de laboratorios SOME: separadores de paciente, split por Expediente:,
 * vista previa y consolidación por día + tipo antes de guardar en historial.
 */
import { procesarLabs, looksLikeSomeLabReport, isParsedCultivoHeaderLine } from './labs.js';
import { normalizeFechaLabHistory, normalizeHoraLabHistory, parseFechaLabToMs } from './tend-core.mjs';
import { normalizeLabLine } from './lab-history-auto-store-core.mjs';

export const LAB_BULK_PATIENT_SEPARATOR = '--- PACIENTE ---';

function isLabSectionHeaderLine(s) {
  return /^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|PltCit|FROTIS)\b/i.test(String(s).trim());
}

function isCultivoBlockStartLine(s) {
  var t = String(s).trim();
  if (!t) return false;
  if (/^CULTIVO\b/i.test(t)) return true;
  if (isParsedCultivoHeaderLine(t)) return true;
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
  return false;
}

function splitResLabsByTipo(rows) {
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

function primaryTipoForResLabs(resLabs) {
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

function dayKeyFromResult(result) {
  var fecha = normalizeFechaLabHistory(result.patient && result.patient.fecha) || '';
  var hora = normalizeHoraLabHistory(result.patient && result.patient.hora);
  if (fecha === 'Anterior') return 'Anterior';
  var ms = parseFechaLabToMs(fecha, hora);
  if (typeof ms === 'number' && isFinite(ms)) {
    var d = new Date(ms);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  return 'unknown';
}

export function isLabBulkPatientSeparatorLine(line) {
  return /^\s*---\s*PACIENTE\s*---\s*$/i.test(String(line || '').trim());
}

/** Parte el pegado masivo en bloques por separador de paciente. */
export function splitBulkLabTextByPatient(text) {
  var raw = String(text || '');
  if (!raw.trim()) return [];
  var lines = raw.split(/\r?\n/);
  var blocks = [];
  var current = [];
  lines.forEach(function (line) {
    if (isLabBulkPatientSeparatorLine(line)) {
      if (current.length) {
        var chunk = current.join('\n').trim();
        if (chunk) blocks.push(chunk);
        current = [];
      }
      return;
    }
    current.push(line);
  });
  if (current.length) {
    var tail = current.join('\n').trim();
    if (tail) blocks.push(tail);
  }
  return blocks;
}

/** Dentro de un bloque de paciente, separa reportes SOME por encabezado Expediente:. */
export function splitSomeReportsInBlock(blockText) {
  var raw = String(blockText || '').trim();
  if (!raw) return [];
  return raw
    .split(/(?=^Expediente\s*:)/im)
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
}

function labRowSectionKey(row) {
  var s = String(row || '').trim();
  if (!s) return '';
  var m = s.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+)/);
  return m ? m[1].toUpperCase() : '';
}

function labRowRichnessScore(row) {
  var s = String(row || '');
  var score = s.length;
  score += (s.match(/\b(?:AG|DELTA-DELTA|ICA|LACTATO|BICA|PCO2|PO2)\b/gi) || []).length * 8;
  score += (s.match(/\d/g) || []).length;
  if (/INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A/i.test(s)) score += 20;
  return score;
}

/** Dedupe de renglones al consolidar mismo día (misma lógica que lab-panel). */
export function dedupeConsolidatedLabRows(rows, tipo) {
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

function sortDaysDesc(days) {
  return days.slice().sort(function (a, b) {
    var ma = parseFechaLabToMs(a, '');
    var mb = parseFechaLabToMs(b, '');
    if (typeof ma === 'number' && typeof mb === 'number' && ma !== mb) return mb - ma;
    return String(b).localeCompare(String(a));
  });
}

function parseReportChunk(reportText, reportIndex) {
  if (!looksLikeSomeLabReport(reportText)) {
    return {
      reportIndex: reportIndex,
      ok: false,
      error: 'No parece reporte SOME (copia desde «Expediente:»)',
    };
  }
  try {
    var result = procesarLabs(reportText);
    if (!result.resLabs || !result.resLabs.length) {
      return {
        reportIndex: reportIndex,
        ok: false,
        error: 'Sin resultados parseables',
        expediente: result.patient && result.patient.expediente,
        nombre: result.patient && result.patient.name,
      };
    }
    return {
      reportIndex: reportIndex,
      ok: true,
      reportText: reportText,
      result: result,
      expediente: String((result.patient && result.patient.expediente) || '').trim(),
      nombre: String((result.patient && result.patient.name) || '').trim(),
      fecha: normalizeFechaLabHistory(result.patient && result.patient.fecha) || '',
      hora: normalizeHoraLabHistory(result.patient && result.patient.hora),
      bloques: result.resLabs.length,
    };
  } catch (e) {
    return {
      reportIndex: reportIndex,
      ok: false,
      error: e && e.message ? e.message : 'Error al parsear',
    };
  }
}

/**
 * @param {string} text
 * @param {{ findPatientByRegistro: (reg: string) => { id: string, nombre?: string, registro?: string } | null }} opts
 */
export function buildBulkLabPreview(text, opts) {
  var findPatient = opts && opts.findPatientByRegistro;
  var blocks = splitBulkLabTextByPatient(text);
  if (!blocks.length && String(text || '').trim()) {
    blocks = [String(text).trim()];
  }
  return blocks.map(function (blockText, blockIndex) {
    var chunks = splitSomeReportsInBlock(blockText);
    var reports = chunks.map(function (chunk, ri) {
      return parseReportChunk(chunk, ri);
    });
    var okReports = reports.filter(function (r) {
      return r.ok;
    });
    var expedientes = [];
    okReports.forEach(function (r) {
      if (r.expediente && expedientes.indexOf(r.expediente) === -1) expedientes.push(r.expediente);
    });
    var primaryExp = expedientes[0] || '';
    var match = primaryExp && findPatient ? findPatient(primaryExp) : null;
    var patientReg = match ? String(match.registro || '').trim() : '';
    var usableReports = okReports;
    if (match && patientReg) {
      usableReports = okReports.filter(function (r) {
        return r.expediente === patientReg;
      });
    }
    var days = [];
    usableReports.forEach(function (r) {
      if (r.fecha && days.indexOf(r.fecha) === -1) days.push(r.fecha);
    });
    var status = 'ok';
    if (!chunks.length) status = 'empty';
    else if (!okReports.length) status = 'parse-errors';
    else if (!match) status = 'no-patient';
    else if (expedientes.length > 1) status = 'mixed-expediente';
    else if (!usableReports.length) status = 'parse-errors';

    var setsAfterMerge = usableReports.length
      ? mergeBulkParseResults(
          usableReports.map(function (r) {
            return { result: r.result, reportText: r.reportText };
          })
        ).length
      : 0;

    return {
      blockIndex: blockIndex,
      reportCount: chunks.length,
      okReportCount: usableReports.length,
      reports: reports,
      expedientes: expedientes,
      patient: match,
      patientName: match ? match.nombre || 'Sin nombre' : okReports[0] ? okReports[0].nombre || '—' : '—',
      primaryExpediente: patientReg || primaryExp,
      days: sortDaysDesc(days),
      daysLabel: sortDaysDesc(days).join(', ') || '—',
      setsAfterMerge: setsAfterMerge,
      status: status,
      canProcess: !!match && usableReports.length > 0,
    };
  });
}

function buildMergedPayloadFromGroup(items, tipo) {
  var mergeOrder = (items || []).slice().sort(function (a, b) {
    var sa =
      a && a.reportText && looksLikeSomeLabReport(a.reportText) ? 1 : 0;
    var sb =
      b && b.reportText && looksLikeSomeLabReport(b.reportText) ? 1 : 0;
    if (sa !== sb) return sa - sb;
    return 0;
  });
  var merged = [];
  var sourceParts = [];
  var mergedBhExtras = {};
  var mergedRefs = {};
  var newestHora = '';
  var horaSome = '';
  mergeOrder.forEach(function (item, idx) {
    var result = item.result;
    var rows = (result.resLabs || []).slice();
    if (merged.length && rows.length) merged.push('');
    merged = merged.concat(rows);
    if (item.reportText && String(item.reportText).trim()) sourceParts.push(String(item.reportText).trim());
    if (result.bhExtras && typeof result.bhExtras === 'object') {
      Object.keys(result.bhExtras).forEach(function (k) {
        mergedBhExtras[k] = result.bhExtras[k];
      });
    }
    if (result.refsBySection && typeof result.refsBySection === 'object') {
      Object.keys(result.refsBySection).forEach(function (k) {
        mergedRefs[k] = result.refsBySection[k];
      });
    }
    var h = normalizeHoraLabHistory(result.patient && result.patient.hora);
    if (h) newestHora = h;
    if (item.reportText && looksLikeSomeLabReport(item.reportText) && h) horaSome = h;
  });
  var deduped = dedupeConsolidatedLabRows(merged, tipo);
  var first = mergeOrder[0].result;
  var fecha = normalizeFechaLabHistory(first.patient && first.patient.fecha) || '';
  return {
    resLabs: deduped,
    fecha: fecha,
    hora: horaSome || newestHora,
    sourceText: sourceParts.join('\n\n---\n\n'),
    bhExtras: mergedBhExtras,
    refsBySection: mergedRefs,
    patient: first.patient,
  };
}

/**
 * Agrupa reportes parseados del mismo paciente por día + tipo y consolida renglones.
 * @param {{ result: object, reportText: string }[]} parsedItems
 */
export function mergeBulkParseResults(parsedItems) {
  var groups = Object.create(null);
  var mixedSingles = [];

  (parsedItems || []).forEach(function (item) {
    if (!item || !item.result) return;
    var resLabs = item.result.resLabs || [];
    if (!resLabs.length) return;
    var tipo = primaryTipoForResLabs(resLabs);
    if (tipo === 'mixed') {
      mixedSingles.push(item);
      return;
    }
    var dk = dayKeyFromResult(item.result);
    var gk = dk + '\x01' + tipo;
    if (!groups[gk]) groups[gk] = [];
    groups[gk].push(item);
  });

  var out = [];
  mixedSingles.forEach(function (item) {
    out.push(buildMergedPayloadFromGroup([item], 'mixed'));
  });
  Object.keys(groups).forEach(function (gk) {
    var arr = groups[gk];
    var tipo = gk.split('\x01')[1] || 'labs';
    out.push(buildMergedPayloadFromGroup(arr, tipo));
  });
  return out;
}

function bulkBlocksHaveProcessablePatient(blocks) {
  return blocks.some(function (b) {
    return b && b.canProcess && b.okReportCount > 0 && b.patient;
  });
}

function bulkBlocksHaveDisplayableReports(blocks) {
  return blocks.some(function (b) {
    return b && b.okReportCount > 0;
  });
}

/** Muestra vista previa antes de guardar cuando hay pegado masivo o avisos. */
export function shouldShowBulkLabPreview(blocks, totalOkReports, opts) {
  if (!Array.isArray(blocks) || !blocks.length) return false;
  var quickLabOutput = !!(opts && opts.quickLabOutput);
  // Salida rápida: si ningún expediente está en la lista, formatear sin modal
  // (varios días/reportes en un pegado también aplican).
  if (
    quickLabOutput &&
    bulkBlocksHaveDisplayableReports(blocks) &&
    !bulkBlocksHaveProcessablePatient(blocks)
  ) {
    return false;
  }
  if (blocks.length > 1) return true;
  if (totalOkReports > 1) return true;
  return blocks.some(function (b) {
    return b && b.status !== 'ok';
  });
}

/** Datos SOME del paciente para el modal de alta (primer reporte válido del bloque). */
export function extractLabPatientFromBulkBlock(block) {
  if (!block || !Array.isArray(block.reports)) return null;
  var ok = block.reports.find(function (r) {
    return r.ok && r.result && r.result.patient;
  });
  if (!ok || !ok.result.patient) return null;
  return ok.result.patient;
}

export function bulkPreviewStatusLabel(status) {
  switch (status) {
    case 'ok':
      return 'Listo';
    case 'mixed-expediente':
      return 'Varios expedientes';
    case 'no-patient':
      return 'Paciente no encontrado';
    case 'parse-errors':
      return 'Error al parsear';
    case 'empty':
      return 'Vacío';
    default:
      return status || '—';
  }
}

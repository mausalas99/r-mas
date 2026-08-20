// Lab panel — renderOutput helpers
import {
  renderEntry,
  isLabSectionHeaderHtml,
} from '../labs.js';
import { parseSomeTablesFromSources } from '../labs-some-table.mjs';
import { normalizeFechaLabHistory, parseFechaLabToMs } from '../tend-core.mjs';
import { sortResLabsByClinicalOrder } from '../labs-section-order.mjs';
import {
  getActivePatientLabHistory,
  labSetIdForHistory,
  syncLabHistoryDateSelect,
  setLabHistorySelectedSetId,
} from './lab-panel-history.mjs';
import { findDisplayLabHistorySetId } from './lab-panel-history-dedupe.mjs';
import { buildLabTrendLookup } from './lab-trend-arrows.mjs';

export function resolveLabOutputFechaBanner(patient) {
  if (!patient || !patient.fecha) return '';
  var fechaBanner = normalizeFechaLabHistory(patient.fecha) || String(patient.fecha).trim();
  return fechaBanner === 'Anterior' ? '' : fechaBanner;
}

export function updateLabPatientBanner(patient, fechaBanner, findPatientByRegistro) {
  var banner = document.getElementById('lab-banner');
  if (!banner) return;
  if (!patient || !patient.name) {
    banner.style.display = 'none';
    return;
  }
  var reg = String(patient.expediente || '').trim();
  var inCensus = reg && findPatientByRegistro(reg);
  if (inCensus) {
    banner.style.display = 'none';
    return;
  }
  document.getElementById('lab-patient-name').textContent = patient.name;
  document.getElementById('lab-patient-meta').textContent = [
    patient.expediente ? 'Exp: ' + patient.expediente : '',
    patient.sexo,
    patient.edad || '',
    fechaBanner || patient.fecha,
  ]
    .filter(Boolean)
    .join('  |  ');
  banner.style.display = 'block';
}

export function attachSomeTablesParsed(result, src, extraSources) {
  var list = [src];
  if (Array.isArray(extraSources)) list = list.concat(extraSources);
  result.someTablesParsed = parseSomeTablesFromSources(list);
}

function appendBhExtendedLines(box, text, result, labDisp, rt) {
  if (!labDisp.showBhExtendedLine || !result.bhExtras || !rt.isBhMainResLabChunk(text)) return;
  var extTab = rt.formatBhExtendedTabLine(result.bhExtras, result.sourceText);
  if (!extTab) return;
  renderEntry(extTab).forEach(function (html, idx) {
    var divEx = document.createElement('div');
    divEx.className = (idx === 0 ? 'out-line' : 'out-indent') + ' lab-bh-extended-line';
    divEx.innerHTML = html;
    box.appendChild(divEx);
  });
}

function appendCitoquimInterpretacionChunk(box, text, rt) {
  var alertDiv = document.createElement('div');
  alertDiv.className = 'lab-out-citoquim-interp out-line';
  alertDiv.setAttribute('role', 'status');
  alertDiv.textContent = rt.citoquimInterpretacionBody_
    ? rt.citoquimInterpretacionBody_(text)
    : rt.ascitisInterpretacionBody_(text);
  box.appendChild(alertDiv);
}

function appendCultivoChunk(box, text, src, rt) {
  var wrap = document.createElement('div');
  wrap.className = 'lab-out-cultivo-chunk';
  wrap.innerHTML = rt.buildCultivoOutputHtmlFragments(text, src);
  box.appendChild(wrap);
}

function appendStandardResLabChunk(box, text, trendLookup) {
  renderEntry(text, trendLookup).forEach(function (html, idx) {
    var div = document.createElement('div');
    div.className = idx === 0 || isLabSectionHeaderHtml(html) ? 'out-line' : 'out-indent';
    div.innerHTML = html;
    box.appendChild(div);
  });
}

/** Toma representativa (fecha/hora) de un grupo de clusterDayLabSets, para comparar tendencia. */
export function representativeFechaHoraForGroup_(group) {
  var sets = (group && group.sets) || [];
  var best = null;
  var bestMs = -Infinity;
  sets.forEach(function (s) {
    var ms = parseFechaLabToMs(s && s.fecha, s && s.hora);
    if (typeof ms === 'number' && isFinite(ms) && ms > bestMs) {
      bestMs = ms;
      best = s;
    }
  });
  return best || sets[0] || {};
}

/** Fase 5 — flechas de tendencia (Laboratorio). Ausente en otros consumidores de renderEntry. */
function buildLabOutputTrendLookup_(currentSet) {
  var history = getActivePatientLabHistory();
  if (!history.length) return null;
  return buildLabTrendLookup(history, currentSet);
}

export function appendLabHourGroupHeader(box, group) {
  if (!box || !group) return;
  var head = box.ownerDocument.createElement('div');
  head.className = 'lab-hour-group-h';
  var hora = String(group.hora || '').trim();
  var tipo = String(group.tipoLabel || '').trim();
  head.textContent = [hora, tipo].filter(Boolean).join(' · ') || 'Envío';
  box.appendChild(head);
}

/**
 * @param {object} [group] cuando resLabs viene de un grupo de clusterDayLabSets (sin parsedBySection propio).
 *   Se reconstruye aquí para la toma actual; ausente = reporte plano (result.resLabs).
 */
/**
 * Toma actual para el trend lookup: fecha/hora del registro representativo del grupo,
 * pero SIEMPRE el parsedBySection combinado (todas las secciones del día), nunca el de
 * un solo registro crudo dentro del grupo — ese registro trae su propio parsedBySection
 * parcial (de esa toma individual sola) y si se aplicara después pisaría el combinado,
 * dejando fuera secciones que llegaron en otro fragmento del mismo día (p. ej. Biometría
 * antes, Química Sanguínea después).
 */
export function buildCurrentSetForGroup_(group, buildParsedBySectionFromResLabs) {
  return Object.assign(
    {},
    representativeFechaHoraForGroup_(group),
    { parsedBySection: buildParsedBySectionFromResLabs(group.resLabs, group.bhExtras) }
  );
}

export function appendResLabChunksToBox(box, resLabs, src, result, labDisp, rt, group) {
  var currentSet = group
    ? buildCurrentSetForGroup_(group, rt.buildParsedBySectionFromResLabs)
    : {
        fecha: result && result.patient && result.patient.fecha,
        hora: result && result.patient && result.patient.hora,
        parsedBySection: rt.buildParsedBySectionFromResLabs(resLabs, result && result.bhExtras),
      };
  var trendLookup = buildLabOutputTrendLookup_(currentSet);
  sortResLabsByClinicalOrder(resLabs || []).forEach(function (text) {
    if (labDisp.hideGasoAdvInterp && rt.isGasoInterpretacionResLabChunk(text)) return;
    if (
      (rt.isCitoquimInterpretacionResLabChunk && rt.isCitoquimInterpretacionResLabChunk(text)) ||
      rt.isAscitisInterpretacionResLabChunk(text)
    ) {
      appendCitoquimInterpretacionChunk(box, text, rt);
      return;
    }
    if (rt.isResLabChunkPureCultivo(text)) {
      appendCultivoChunk(box, text, src, rt);
      return;
    }
    appendStandardResLabChunk(box, text, trendLookup);
    appendBhExtendedLines(box, text, result, labDisp, rt);
  });
}

export function syncLabOutputHistoryAfterRender(opts, result, rt) {
  if (opts && opts.fromHistory) return;
  var pid = rt.getActiveId();
  if (!pid) return;
  var preferId =
    (opts && opts.preferHistorySetId) ||
    findDisplayLabHistorySetId(pid, result) ||
    '';
  if (!preferId) {
    var hist = getActivePatientLabHistory();
    preferId = hist.length ? labSetIdForHistory(hist[0], 0) : '';
  }
  syncLabHistoryDateSelect({ preferSetId: preferId });
  if (preferId) setLabHistorySelectedSetId(pid, preferId);
}

export function prepareLabOutputBox(fechaBanner, rt) {
  var box = document.getElementById('lab-output-box');
  rt.removeAtbRisPanelsFromBody();
  box.innerHTML = '';
  if (fechaBanner) {
    var fechaTop = document.createElement('div');
    fechaTop.className = 'lab-output-fecha';
    fechaTop.textContent = fechaBanner;
    box.appendChild(fechaTop);
  }
  return box;
}

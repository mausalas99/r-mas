/**
 * Fase 5 — flechas de tendencia para valores alterados en Laboratorio.
 * Compara el valor actual contra la toma previa más reciente (misma sección/campo).
 * @see docs/superpowers/plans/2026-08-18-teal-workbench-full-fidelity.md (Fase 5)
 */
import { sortLabHistoryChronological, parseTrendNumeric, parseFechaLabToMs } from '../tend-core.mjs';

function trendValue(set, sectionKey, fieldKey) {
  if (!set || !set.parsedBySection || !set.parsedBySection[sectionKey]) return null;
  return parseTrendNumeric(set.parsedBySection[sectionKey][fieldKey]);
}

function currentTimestampMs(currentSet) {
  if (!currentSet) return null;
  var ms = parseFechaLabToMs(currentSet.fecha, currentSet.hora);
  return typeof ms === 'number' && isFinite(ms) ? ms : null;
}

function dayStartMs(fecha) {
  var ms = parseFechaLabToMs(fecha, null);
  return typeof ms === 'number' && isFinite(ms) ? ms : null;
}

/**
 * Tomas estrictamente anteriores a la actual (excluye la propia y cualquiera más reciente).
 * También excluye tomas del mismo día calendario: la vista "hoy" en vivo puede traer su
 * propio registro ya persistido con la misma fecha (hora ligeramente distinta), y compararse
 * contra ese duplicado esconde el cambio real contra el día anterior.
 */
function priorSetsForCurrent(historySets, currentSet) {
  var desc = sortLabHistoryChronological(historySets || []);
  var curMs = currentTimestampMs(currentSet);
  if (curMs == null) return desc;
  var curDayMs = dayStartMs(currentSet && currentSet.fecha);
  return desc.filter(function (s) {
    var ms = parseFechaLabToMs(s && s.fecha, s && s.hora);
    if (!(typeof ms === 'number' && isFinite(ms) && ms < curMs)) return false;
    if (curDayMs != null) {
      var sDayMs = dayStartMs(s && s.fecha);
      if (sDayMs === curDayMs) return false;
    }
    return true;
  });
}

/**
 * @param {Array<{fecha, hora, parsedBySection}>} historySets historial del paciente (cualquier orden).
 * @param {{fecha?: string, hora?: string, parsedBySection: object}} currentSet toma mostrada actualmente.
 * @returns {(sectionKey: string, fieldKey: string) => ({trend: 'up'|'down', delta: number} | null)}
 */
export function buildLabTrendLookup(historySets, currentSet) {
  if (!currentSet || !currentSet.parsedBySection) {
    return function () {
      return null;
    };
  }
  var prior = priorSetsForCurrent(historySets, currentSet);
  return function get(sectionKey, fieldKey) {
    var curVal = trendValue(currentSet, sectionKey, fieldKey);
    if (curVal == null) return null;
    for (var i = 0; i < prior.length; i++) {
      var prevVal = trendValue(prior[i], sectionKey, fieldKey);
      if (prevVal == null) continue;
      if (prevVal === curVal) return null;
      return { trend: curVal > prevVal ? 'up' : 'down', delta: curVal - prevVal };
    }
    return null;
  };
}

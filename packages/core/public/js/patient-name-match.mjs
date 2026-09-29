/**
 * Cruce de nombre de reporte con el censo (sin expediente). Puro, sin DOM.
 */
import { foldText } from './fuzzy-match.mjs';

var NAME_STOP = Object.create(null);
['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'dos', 'das'].forEach(function (w) {
  NAME_STOP[w] = true;
});

/**
 * @param {string} name
 * @returns {string[]}
 */
export function significantNameTokens(name) {
  return foldText(name)
    .split(/[^a-z0-9]+/)
    .filter(function (t) {
      return t.length >= 3 && !NAME_STOP[t];
    });
}

/**
 * Higher is better; -Infinity = no match.
 * @param {string} reportName
 * @param {string} patientName
 * @returns {number}
 */
export function scoreNombreAgainstPatient(reportName, patientName) {
  var a = foldText(reportName);
  var b = foldText(patientName);
  if (!a || !b) return -Infinity;
  if (a === b) return 1000;
  var ta = significantNameTokens(a);
  var tb = significantNameTokens(b);
  if (!ta.length || !tb.length) return -Infinity;
  var setB = Object.create(null);
  tb.forEach(function (t) {
    setB[t] = true;
  });
  var hits = 0;
  ta.forEach(function (t) {
    if (setB[t]) hits += 1;
  });
  if (hits < 2 && !(hits === 1 && ta.length === 1 && tb.length === 1)) {
    return -Infinity;
  }
  var coverage = hits / Math.max(ta.length, tb.length);
  return hits * 10 + coverage * 5 - Math.abs(ta.length - tb.length) * 0.5;
}

/**
 * @param {string} nombre
 * @param {{ id: string, nombre?: string, registro?: string, cuarto?: string }[]} patients
 * @param {{ minScore?: number, limit?: number }} [opts]
 * @returns {{ patient: object, score: number }[]}
 */
export function matchPatientsByNombre(nombre, patients, opts) {
  var minScore = opts && typeof opts.minScore === 'number' ? opts.minScore : 15;
  var limit = opts && opts.limit ? opts.limit : 8;
  var out = [];
  (patients || []).forEach(function (p) {
    if (!p || p.id == null) return;
    var score = scoreNombreAgainstPatient(nombre, p.nombre || '');
    if (score < minScore || score === -Infinity) return;
    out.push({ patient: p, score: score });
  });
  out.sort(function (a, b) {
    return b.score - a.score;
  });
  return out.slice(0, limit);
}


var ALIAS_KEY = 'rplus-lab-name-aliases';

function aliasKey_(nombre) {
  return foldText(nombre).replace(/[^a-z0-9]+/g, ' ').trim();
}

function readAliases_() {
  try {
    return JSON.parse(localStorage.getItem(ALIAS_KEY) || '{}') || {};
  } catch (e) {
    void e;
    return {};
  }
}

/** Registro que el usuario asignó a mano a este nombre de reporte ('' si ninguno). */
export function getNameAlias(nombre) {
  return readAliases_()[aliasKey_(nombre)] || '';
}

/** Recuerda nombre del reporte → registro del censo, para que la próxima vez coincida solo. */
export function setNameAlias(nombre, registro) {
  var k = aliasKey_(nombre);
  if (!k || !registro) return;
  var all = readAliases_();
  all[k] = registro;
  try {
    localStorage.setItem(ALIAS_KEY, JSON.stringify(all));
  } catch (e) {
    void e;
  }
}

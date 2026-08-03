/**
 * Labs → Eventualidades: mismo formato que Estudios / labs consolidados
 * (fecha + líneas BH/QS/GASES…), fusionando sets como al consolidar.
 */
import { normalizeFechaLabHistory, normalizeHoraLabHistory } from '../tend-core.mjs';
import {
  buildEstudiosCopyLinesFromLabSets,
  dayKeyFromLabSet,
  isGasometriaOnlyResLabs,
  primaryTipoForLabSet,
} from '../lab-history-format.mjs';
import { dedupeConsolidatedLabRows } from '../lab-bulk-paste.mjs';
import { labTimestampMsFromFechaHora } from '../lab-consolidation-cluster.mjs';
import {
  buildLabConsolidationMergeJobs,
  buildSameDateTimeLabMergeJobs,
} from '../lab-consolidation-plan.mjs';

/** @param {Date} [d] @returns {string} DD/MM/YYYY */
export function formatLocalTodayFecha(d) {
  var date = d instanceof Date ? d : new Date();
  var dd = String(date.getDate()).padStart(2, '0');
  var mm = String(date.getMonth() + 1).padStart(2, '0');
  return dd + '/' + mm + '/' + date.getFullYear();
}

/**
 * Fusiona sets como al consolidar historial (misma fecha+hora, luego ventana ≤2 h).
 * No muta el historial — solo para armar el texto de Eventualidades.
 * @param {object[]} labSets
 * @returns {object[]}
 */
export function consolidateLabSetsForEventualidad(labSets) {
  var working = (labSets || [])
    .filter(function (s) {
      return s && Array.isArray(s.resLabs) && s.resLabs.length;
    })
    .map(function (s, i) {
      return {
        id: s.id != null ? s.id : '__ev_' + i,
        fecha: s.fecha,
        hora: s.hora,
        resLabs: (s.resLabs || []).slice(),
        origin: s.origin,
      };
    });
  if (working.length < 2) return working;

  var getTipo = function (set) {
    return primaryTipoForLabSet(set.resLabs || []);
  };
  var isGasoOnly = function (set) {
    return isGasometriaOnlyResLabs(set.resLabs || []);
  };
  var getDayKey = dayKeyFromLabSet;
  var getMs = function (set) {
    return labTimestampMsFromFechaHora(set.fecha, set.hora);
  };

  working = applyMergeJobsVirtual_(working, buildSameDateTimeLabMergeJobs(working, getTipo, isGasoOnly));
  if (working.length < 2) return working;
  working = applyMergeJobsVirtual_(
    working,
    buildLabConsolidationMergeJobs(working, getDayKey, getTipo, getMs, null, isGasoOnly)
  );
  return working;
}

/**
 * @param {object[]} labSets
 * @param {{
 *   todayFecha?: string,
 *   normalizeFecha?: (raw: unknown) => string,
 *   filterToday?: boolean,
 * }} [opts]
 * @returns {string}
 */
export function buildLabEventualidadInterpretText(labSets, opts) {
  var o = opts || {};
  var today = String(o.todayFecha || formatLocalTodayFecha()).trim();
  var norm =
    typeof o.normalizeFecha === 'function' ? o.normalizeFecha : normalizeFechaLabHistory;
  var filterToday = o.filterToday !== false;
  var todays = (labSets || []).filter(function (set) {
    if (!set || !Array.isArray(set.resLabs) || !set.resLabs.length) return false;
    if (!filterToday) return true;
    var f = norm(set.fecha) || String(set.fecha || '').trim();
    return f === today;
  });
  if (!todays.length) return '';

  var consolidated = consolidateLabSetsForEventualidad(todays);
  var lines = buildEstudiosCopyLinesFromLabSets(consolidated);
  return lines.join('\n').trim();
}

function applyMergeJobsVirtual_(sets, jobs) {
  var byId = Object.create(null);
  (sets || []).forEach(function (s) {
    if (s && s.id != null) byId[String(s.id)] = s;
  });
  var removed = Object.create(null);
  (jobs || []).forEach(function (job) {
    var cluster = [];
    (job.sets || []).forEach(function (s) {
      if (!s || s.id == null) return;
      var id = String(s.id);
      if (removed[id]) return;
      var cur = byId[id];
      if (cur) cluster.push(cur);
    });
    if (cluster.length < 2) return;
    var keeper = virtualMergeCluster_(cluster);
    byId[String(keeper.id)] = keeper;
    for (var i = 1; i < cluster.length; i++) {
      var rid = String(cluster[i].id);
      removed[rid] = true;
      delete byId[rid];
    }
  });
  return Object.keys(byId).map(function (k) {
    return byId[k];
  });
}

function virtualMergeCluster_(cluster) {
  var arr = cluster.slice();
  var merged = [];
  arr.forEach(function (set) {
    var rows = set.resLabs || [];
    if (merged.length && rows.length) merged.push('');
    merged = merged.concat(rows);
  });
  var horas = Object.create(null);
  arr.forEach(function (s) {
    var h = normalizeHoraLabHistory(s.hora) || String(s.hora || '').trim().slice(0, 5);
    if (h) horas[h] = true;
  });
  var horaKeys = Object.keys(horas);
  return {
    id: arr[0].id,
    fecha: arr[0].fecha,
    hora: horaKeys.length === 1 ? horaKeys[0] : '',
    resLabs: dedupeConsolidatedLabRows(merged, 'labs'),
    origin: arr[0].origin,
  };
}

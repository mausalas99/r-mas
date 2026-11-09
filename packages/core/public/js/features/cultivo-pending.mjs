/**
 * Cultivos «sin revisar»: aislamiento nuevo o antibiograma nuevo desde la última vez
 * que el médico lo marcó como visto. Estado local (localStorage), sin PHI: solo claves
 * normalizadas por paciente.
 * También: tras Actualizar labs, busca en segundo plano el antibiograma de los cultivos
 * que lo esperan y avisa de lo nuevo.
 */
import { getLabHistory, getPatients } from '../app-state.mjs';
import { showToast } from '../app-shell.mjs';
import { extractCultivoFollowUpCandidates, chunkHasAntibiograma } from './cultivo-queue-model.mjs';
import {
  pendingAtbCultivoItemsForPatient,
  refreshCultivoLabsForPatient,
  isCultivoRefreshInFlight,
} from './cultivo-queue-refresh.mjs';

var LS_KEY = 'rplus.cultSeen.v1';
var NO_ISOLATE_RE = /CONTAMINAD|MICROBIOTA|NEGATIV/i;

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function loadSeen() {
  try {
    var o = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    return o && typeof o === 'object' ? o : null;
  } catch (_e) {
    void _e;
    return null;
  }
}

function saveSeen(o) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(o));
  } catch (_e) {
    void _e;
  }
}

/** Aislamientos positivos del paciente, con clave estable (cambia cuando llega el antibiograma). */
export function cultivoPendingCandidates(patientId, history) {
  var map = history || getLabHistory();
  return extractCultivoFollowUpCandidates(map[String(patientId)] || [])
    .filter(function (c) {
      return !NO_ISOLATE_RE.test(String(c.organismo || ''));
    })
    .map(function (c) {
      return {
        key: [norm(c.sitio), norm(c.organismo), norm(c.fecha), chunkHasAntibiograma(c.chunk) ? 'atb' : 'sin'].join('|'),
        sitio: c.sitio,
        organismo: c.organismo,
        fecha: c.fecha,
        atb: chunkHasAntibiograma(c.chunk),
        labSetId: c.labSetId,
      };
    });
}

/**
 * Primera vez que corre: todo lo que ya existe cuenta como visto (si no, el día de la
 * actualización todo el historial aparecería «sin revisar»). Llamar ANTES de guardar labs.
 */
export function ensureCultivoSeenBaseline() {
  if (loadSeen()) return;
  var map = getLabHistory();
  var byPid = {};
  Object.keys(map).forEach(function (pid) {
    byPid[pid] = cultivoPendingCandidates(pid, map).map(function (c) {
      return c.key;
    });
  });
  saveSeen({ v: 1, byPid: byPid });
}

/** @returns {{ key: string, sitio: string, organismo: string, fecha: string, atb: boolean }[]} */
export function pendingCultivosForPatient(patientId, history) {
  var seen = loadSeen();
  if (!seen) return [];
  var done = new Set((seen.byPid && seen.byPid[String(patientId)]) || []);
  return cultivoPendingCandidates(patientId, history)
    .filter(function (c) {
      return !done.has(c.key);
    })
    .map(function (c) {
      // Solo llegó el antibiograma: el aislamiento ya estaba visto sin él.
      c.atbOnly = c.atb && done.has(c.key.replace(/\|atb$/, '|sin'));
      return c;
    });
}

/** La entrada pendiente que corresponde a una fila de la tabla Cultivos (mismo set, o mismo sitio+organismo+fecha). */
export function findPendingForRow(pending, row, fecha) {
  var org = norm(row.organismo);
  return (
    pending.find(function (c) {
      return (
        norm(c.organismo) === org &&
        ((c.labSetId && c.labSetId === String(row.labSetId)) ||
          (norm(c.sitio) === norm(row.sitio) && norm(c.fecha) === norm(fecha)))
      );
    }) || null
  );
}

/** Marca un solo cultivo (por su clave) como visto. */
export function markCultivoSeen(patientId, key) {
  var seen = loadSeen() || { v: 1, byPid: {} };
  seen.byPid = seen.byPid || {};
  var pid = String(patientId);
  var list = seen.byPid[pid] || [];
  if (list.indexOf(key) < 0) list.push(key);
  seen.byPid[pid] = list;
  saveSeen(seen);
}

export function markCultivosSeen(patientId) {
  var seen = loadSeen() || { v: 1, byPid: {} };
  seen.byPid = seen.byPid || {};
  seen.byPid[String(patientId)] = cultivoPendingCandidates(patientId).map(function (c) {
    return c.key;
  });
  saveSeen(seen);
}

function patientName(pid) {
  var p = (getPatients() || []).find(function (x) {
    return x && String(x.id) === String(pid);
  });
  return (p && (p.nombre || p.name)) || '';
}

var announced = new Set();
var bgBusy = false;

function announcePending(pid) {
  var fresh = pendingCultivosForPatient(pid).filter(function (c) {
    return !announced.has(pid + '|' + c.key);
  });
  if (!fresh.length) return;
  fresh.forEach(function (c) {
    announced.add(pid + '|' + c.key);
  });
  var who = patientName(pid);
  showToast(
    'Cultivo sin revisar' + (who ? ' · ' + who : '') + ': ' + fresh[0].organismo + (fresh.length > 1 ? ' (+' + (fresh.length - 1) + ')' : ''),
    'warn'
  );
}

/**
 * Después de guardar labs traídos del repositorio: busca el antibiograma de los cultivos
 * pendientes (sin bloquear la pantalla) y avisa de lo nuevo. Corre una vez a la vez; el
 * propio refresco vuelve a guardar labs y no se encadena.
 */
export function scheduleCultivoBackgroundCheck(patientIds) {
  if (bgBusy || isCultivoRefreshInFlight() || !patientIds || !patientIds.length) return;
  setTimeout(async function () {
    if (bgBusy) return;
    bgBusy = true;
    try {
      for (var i = 0; i < patientIds.length; i++) {
        var pid = String(patientIds[i]);
        var items = pendingAtbCultivoItemsForPatient(pid);
        if (items.length) await refreshCultivoLabsForPatient(pid, items);
        announcePending(pid);
      }
    } catch (_e) {
      void _e;
    } finally {
      bgBusy = false;
    }
  }, 0);
}

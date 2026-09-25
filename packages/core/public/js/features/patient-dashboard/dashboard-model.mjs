/**
 * Pure model: patient dashboard glance assembled from identity, labs, EA, lists.
 */
import { deriveSnapshot } from '../estado-actual-data.mjs';
import { buildLabsGlanceForDay } from './labs-glance-model.mjs';
import { buildEaGlance } from './ea-glance-model.mjs';

function resolveView(inner) {
  return inner === 'todo' ? 'pendientes' : 'resumen';
}

function filterDiagnosticos(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => String(item).trim()).filter(Boolean).slice(0, 3);
}

function buildIdentity(patient) {
  return {
    nombre: patient?.nombre != null ? String(patient.nombre) : '',
    edad: patient?.edad != null ? String(patient.edad).trim() : '',
    sexo: patient?.sexo != null ? String(patient.sexo).trim() : '',
    cuarto: patient?.cuarto != null ? String(patient.cuarto).trim() : '',
    cama: patient?.cama != null ? String(patient.cama).trim() : '',
    diagnosticos: filterDiagnosticos(patient?.diagnosticosList),
    interconsultServiceIds: Array.isArray(patient?.interconsultServiceIds)
      ? patient.interconsultServiceIds
      : [],
  };
}

function localTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function lastItems(items, count) {
  if (!Array.isArray(items) || !items.length) return [];
  return items.slice(-count);
}

function firstItems(items, count) {
  if (!Array.isArray(items) || !items.length) return [];
  return items.slice(0, count);
}

function resolveVitalsSnapshot(monitoreo) {
  if (monitoreo == null || typeof monitoreo !== 'object') return null;
  return deriveSnapshot(monitoreo);
}

function lastVitalsAt(monitoreo) {
  var hist = monitoreo && Array.isArray(monitoreo.historial) ? monitoreo.historial : [];
  var latest = '';
  for (var i = 0; i < hist.length; i++) {
    var at = hist[i] && typeof hist[i] === 'object' ? hist[i].recordedAt : null;
    if (at != null && String(at) > latest) latest = String(at);
  }
  return latest || null;
}

/**
 * @param {{
 *   patient?: Record<string, unknown>,
 *   inner?: string,
 *   labSets?: unknown[],
 *   eaInput?: Record<string, unknown>,
 *   eventualidades?: unknown[],
 *   pendientes?: unknown[],
 *   todayKey?: string,
 *   skipLabs?: boolean,
 * }} params
 */
export function buildDashboardModel({
  patient,
  inner,
  labSets,
  eaInput,
  eventualidades,
  pendientes,
  todayKey,
  skipLabs,
} = {}) {
  const p = patient ?? {};
  const labs = skipLabs
    ? { envios: [], pending: true, enRangoCount: 0 }
    : labSets
      ? buildLabsGlanceForDay({ todayKey: todayKey ?? localTodayKey(), orderedSets: labSets })
      : { envios: [], enRangoCount: 0 };
  return {
    view: resolveView(inner),
    identity: buildIdentity(p),
    vitals: resolveVitalsSnapshot(p.monitoreo),
    vitalsAt: lastVitalsAt(p.monitoreo),
    labs,
    ea: eaInput ? buildEaGlance(eaInput) : { kpis: [], soap: [] },
    eventualidades: firstItems(eventualidades, 3),
    pendientes: lastItems(pendientes, 3),
  };
}

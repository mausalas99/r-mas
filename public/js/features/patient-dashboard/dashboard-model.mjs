/**
 * Pure model: patient dashboard glance assembled from identity, labs, EA, lists.
 */
import { deriveSnapshot } from '../estado-actual-data.mjs';
import { buildLabsGlanceForDay } from './labs-glance-model.mjs';
import { buildEaGlance } from './ea-glance-model.mjs';

function resolveView(inner) {
  return inner === 'todo' ? 'pendientes' : 'resumen';
}

function buildIdentityMeta(patient) {
  const parts = [];
  const edad = patient?.edad != null ? String(patient.edad).trim() : '';
  const sexo = patient?.sexo != null ? String(patient.sexo).trim() : '';
  if (edad) parts.push(edad);
  if (sexo) parts.push(sexo);
  return parts.join(' · ');
}

function filterDiagnosticos(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => String(item).trim()).filter(Boolean);
}

function buildIdentity(patient) {
  return {
    nombre: patient?.nombre != null ? String(patient.nombre) : '',
    meta: buildIdentityMeta(patient),
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

/**
 * @param {{
 *   patient?: Record<string, unknown>,
 *   inner?: string,
 *   labSets?: unknown[],
 *   eaInput?: Record<string, unknown>,
 *   eventualidades?: unknown[],
 *   pendientes?: unknown[],
 *   todayKey?: string,
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
} = {}) {
  const p = patient ?? {};
  const labs = labSets
    ? buildLabsGlanceForDay({ todayKey: todayKey ?? localTodayKey(), orderedSets: labSets })
    : { envios: [] };
  return {
    view: resolveView(inner),
    identity: buildIdentity(p),
    vitals: resolveVitalsSnapshot(p.monitoreo),
    labs,
    ea: eaInput ? buildEaGlance(eaInput) : { kpis: [], soap: [] },
    eventualidades: firstItems(eventualidades, 3),
    pendientes: lastItems(pendientes, 3),
  };
}

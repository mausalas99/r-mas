/**
 * Pure model: patient dashboard glance assembled from identity, labs, EA, lists.
 */
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

function vitalsFromMonitoreo(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return null;
  const hist = Array.isArray(monitoreo.historial) ? monitoreo.historial.slice() : [];
  hist.sort((a, b) => {
    const ra = a && typeof a === 'object' && 'recordedAt' in a ? String(a.recordedAt) : '';
    const rb = b && typeof b === 'object' && 'recordedAt' in b ? String(b.recordedAt) : '';
    return rb.localeCompare(ra);
  });
  for (const row of hist) {
    if (!row || typeof row !== 'object') continue;
    const vitals = row.vitals;
    if (vitals && typeof vitals === 'object' && Object.keys(vitals).length) return vitals;
  }
  return null;
}

function resolveVitals(patient, eaInput) {
  if (eaInput?.vitals && typeof eaInput.vitals === 'object') return eaInput.vitals;
  return vitalsFromMonitoreo(patient?.monitoreo);
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
    vitals: resolveVitals(p, eaInput),
    labs,
    ea: eaInput ? buildEaGlance(eaInput) : { kpis: [], soap: [] },
    eventualidades: lastItems(eventualidades, 3),
    pendientes: lastItems(pendientes, 3),
  };
}

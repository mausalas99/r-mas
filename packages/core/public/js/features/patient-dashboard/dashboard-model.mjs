/**
 * Pure model: patient dashboard glance assembled from identity, labs, EA, lists.
 */
import { deriveSnapshot } from '../estado-actual-data.mjs';
import { buildLabsGlanceForDay } from './labs-glance-model.mjs';
import { extractCultivoFollowUpCandidates, cultivoNeedsAtbFollowUp } from '../cultivo-queue-model.mjs';
import { viaAccesoLabel } from '../../patient-accesos.mjs';
import { accesoFechaToDateInputValue } from '../../patient-date-fields.mjs';
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

// Flora-only reports and contaminated samples name no isolate worth following.
const NO_ISOLATE_RE = /^(REPORTE\s+PRELIMINAR,?\s*)?MICROBIOTA\b|\bCONTAMINAD/i;
const PRELIM_RE = /\s*·\s*Preliminar\b/i;

function sentenceCase(text) {
  const t = String(text || '').trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** «UROCULTIVO POR SONDA» → «Urocultivo»; «HEMOCULTIVO (PERIFERICO IZQUIERDO)» → «Hemocultivo». */
function shortSitio(sitio) {
  const base = String(sitio || '')
    .replace(/\(.*?\)/g, '')
    .split('/')[0]
    .replace(/\s+POR\s+.*$/i, '');
  return sentenceCase(base) || String(sitio || '');
}

/** Condensed antibiogram («ATB R: AMP, CRO | S: MERO») → [{ k: 'R', drugs: 'AMP, CRO' }, …]. */
function atbGroups(chunk) {
  const m = String(chunk || '').match(/^ATB\b[^\n]*(?:\n(?:R|I|S|ESBL)\s*:[^\n]*)*/im);
  if (!m) return [];
  return m[0]
    .replace(/^ATB\s*/i, '')
    .split(/\s*\|\s*|\n/)
    .map((part) => part.match(/^(R|I|S|ESBL)\s*:\s*(.+)$/i))
    .filter(Boolean)
    .map((g) => ({ k: g[1].toUpperCase(), drugs: g[2].trim() }));
}

/**
 * Today's lab glance plus the newest positive cultures (newest first, max 3),
 * each flagged when its antibiograma is still missing.
 */
export function buildLabsForDashboard({ todayKey, orderedSets }) {
  const labs = buildLabsGlanceForDay({ todayKey, orderedSets });
  const positives = extractCultivoFollowUpCandidates(orderedSets).filter(
    (c) => !NO_ISOLATE_RE.test(String(c.organismo || '').trim()),
  );
  // extractCultivoFollowUpCandidates walks the history newest-first.
  labs.cultivos = positives.slice(0, 3).map((c) => {
    const organismo = String(c.organismo || '');
    return {
      sitio: shortSitio(c.sitio),
      sitioFull: String(c.sitio || ''),
      organismo: sentenceCase(organismo.replace(PRELIM_RE, '')),
      preliminar: PRELIM_RE.test(organismo),
      fecha: c.fecha,
      atbPendiente: cultivoNeedsAtbFollowUp(c, c.chunk),
      atb: atbGroups(c.chunk),
    };
  });
  labs.cultivosTotal = positives.length;
  return labs;
}

/** Calendar day of a line/tube, insertion day = día 1. Null when the date is missing or in the future. */
function accesoDia(fecha, refDate) {
  const iso = accesoFechaToDateInputValue(fecha);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const today = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const n = Math.round((today - Date.UTC(y, m - 1, d)) / 86400000) + 1;
  return n >= 1 ? n : null;
}

function buildAccesos(patient, refDate) {
  const list = Array.isArray(patient?.accesosList)
    ? patient.accesosList
    : patient?.viaAcceso
      ? [{ via: patient.viaAcceso, fecha: patient.accesoFecha }]
      : [];
  return list
    .map((a) => ({ label: viaAccesoLabel(String(a?.via ?? '').trim()), dia: accesoDia(a?.fecha, refDate) }))
    .filter((a) => a.label);
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
 *   refDate?: Date,
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
  refDate,
  skipLabs,
} = {}) {
  const p = patient ?? {};
  const labs = skipLabs
    ? { envios: [], pending: true, enRangoCount: 0 }
    : labSets
      ? buildLabsForDashboard({ todayKey: todayKey ?? localTodayKey(), orderedSets: labSets })
      : { envios: [], enRangoCount: 0 };
  return {
    view: resolveView(inner),
    identity: buildIdentity(p),
    vitals: resolveVitalsSnapshot(p.monitoreo),
    vitalsAt: lastVitalsAt(p.monitoreo),
    accesos: buildAccesos(p, refDate ?? new Date()),
    labs,
    ea: eaInput ? buildEaGlance(eaInput) : { kpis: [], soap: [] },
    // Upper bound only: dashboard-fit.mjs shows as many as the screen holds.
    eventualidades: firstItems(eventualidades, 30),
    pendientes: lastItems(pendientes, 30),
    eventualidadesTotal: Array.isArray(eventualidades) ? eventualidades.length : 0,
    pendientesTotal: Array.isArray(pendientes) ? pendientes.length : 0,
  };
}

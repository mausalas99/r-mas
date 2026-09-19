/** Merge de expedientes (entradas paciente) para sync Nube — unión sin borrar locales. */

import { compareIso } from './live-sync-room.mjs';
import { mergeTodoListsById } from './livesync-patient-ids.mjs';
import { mergeMonitoreo, emptyEstadoClinico } from './features/estado-actual-data.mjs';
import { hasPendingEaProposals } from './features/estado-actual-meds.mjs';
import { bumpLabHistoryRevision } from './lab-history-cache.mjs';
import { medPharmProfileUpdatedAt } from './med-pharm-profile-core.mjs';
import { mergePatientRegistrationMeta } from './patient-registration-meta.mjs';
import { mergeCensoPatientFieldsFromBoth } from './patient-diagnosticos.mjs';
import { isDemoPatientId } from './demo-patient.mjs';
import { eventualidadesUpdatedAt, mergeEventualidades } from './patient-merge-eventualidades.mjs';
import { stripDuplicateLabSets } from './lab-history-auto-store-core.mjs';
import { looksLikeSomeLabReport } from './labs-report-refs.mjs';

export { isDemoPatientId, eventualidadesUpdatedAt, mergeEventualidades };

/** @param {object} entry */
export function entryMatchKey(entry) {
  const reg = String(entry?.patient?.registro || '').trim();
  if (reg) return 'reg:' + reg;
  return 'id:' + String(entry?.patient?.id || '');
}

function parseDateDMY(value) {
  const t = String(value || '').trim();
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  const d = new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  return isNaN(d.getTime()) ? null : d;
}

function docTimestamp(fecha, hora) {
  const d = parseDateDMY(fecha);
  if (!d) return '';
  const hm = String(hora || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (hm) d.setHours(parseInt(hm[1], 10), parseInt(hm[2], 10), 0, 0);
  return d.toISOString();
}

/** @param {object} set */
export function labSetTimestamp(set) {
  if (!set) return '';
  if (set.updatedAt) return String(set.updatedAt);
  const n = Number(set.id);
  if (!isNaN(n) && n > 1e11) return new Date(n).toISOString();
  return docTimestamp(set.fecha, set.hora);
}

function noteTimestamp(note) {
  if (!note || typeof note !== 'object') return '';
  if (note.updatedAt) return String(note.updatedAt);
  return docTimestamp(note.fecha, note.hora);
}

function listadoTimestamp(lst) {
  if (!lst || typeof lst !== 'object') return '';
  if (lst.updatedAt) return String(lst.updatedAt);
  return docTimestamp(lst.fecha, lst.hora);
}

/** @param {unknown} hc */
export function historiaClinicaUpdatedAt(hc) {
  if (!hc || typeof hc !== 'object') return '';
  /** @type {{ data?: { meta?: { updatedAt?: string } } }} */
  const row = hc;
  return row.data?.meta?.updatedAt ? String(row.data.meta.updatedAt) : '';
}

/** @param {unknown} a @param {unknown} b */
export function mergeHistoriaClinica(a, b) {
  if (!a && !b) return undefined;
  if (!a) return structuredClone(/** @type {object} */ (b));
  if (!b) return structuredClone(/** @type {object} */ (a));
  const av = Number(/** @type {{ version?: number }} */ (a).version || 0);
  const bv = Number(/** @type {{ version?: number }} */ (b).version || 0);
  let winner = bv >= av ? b : a;
  if (av === bv) {
    const at = historiaClinicaUpdatedAt(a);
    const bt = historiaClinicaUpdatedAt(b);
    if (compareIso(bt, at) > 0) winner = b;
    else if (compareIso(at, bt) > 0) winner = a;
  }
  const out = {
    version: Number(/** @type {{ version?: number }} */ (winner).version || 0),
    data: structuredClone(/** @type {{ data?: object }} */ (winner).data || {}),
  };
  return out;
}

function medRecetaTimestamp(med) {
  if (!med || typeof med !== 'object') return '';
  if (med.updatedAt) return String(med.updatedAt);
  return docTimestamp(med.fechaActualizacion, med.hora);
}

function medPharmTimestamp(profile) {
  return medPharmProfileUpdatedAt(profile);
}

/**
 * Timestamp más reciente del bloque Estado actual / monitoreo para sync LWW (historial + texto guardado).
 * @param {unknown} monitoreo
 */
function bestRecordedAtFromHistorial(hist, best) {
  let max = best;
  for (let i = 0; i < hist.length; i += 1) {
    const row = hist[i];
    if (!row || typeof row !== 'object') continue;
    // savedAt is the real save-time clock; recordedAt is the user-chosen clinical
    // time (minute precision, editable) and ties too easily across rapid entries —
    // an LWW tie is broken by actorId, so one instance would always lose forever.
    const ra =
      /** @type {any} */ (row).savedAt != null
        ? String(/** @type {any} */ (row).savedAt)
        : /** @type {any} */ (row).recordedAt != null
          ? String(/** @type {any} */ (row).recordedAt)
          : '';
    // Must scan all rows — historial is oldest-first; early return picked the oldest clock
    // and Nube LWW rejected later client signos as stale.
    if (ra && compareIso(ra, max) > 0) max = ra;
  }
  return max;
}

export function monitoreoUpdatedAt(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return '';
  let best = '';
  /** @type {any} */
  const m = monitoreo;
  const ecAt =
    m.estadoClinicoUpdatedAt != null && String(m.estadoClinicoUpdatedAt).trim()
      ? String(m.estadoClinicoUpdatedAt)
      : '';
  if (ecAt) best = ecAt;
  const tg = m.textoGuardado && typeof m.textoGuardado === 'object' ? m.textoGuardado : null;
  if (tg != null && tg.savedAt != null && String(tg.savedAt).trim()) {
    const saved = String(tg.savedAt);
    if (compareIso(saved, best) > 0) best = saved;
  }
  const hist = Array.isArray(m.historial) ? m.historial : [];
  return bestRecordedAtFromHistorial(hist, best);
}

function estadoClinicoHasContent(ec) {
  const template = emptyEstadoClinico();
  for (const key of Object.keys(template)) {
    if (String(ec[key] || '').trim()) return true;
  }
  return false;
}

function confirmadoHasContent(conf) {
  for (const key of Object.keys(conf)) {
    if (conf[key]) return true;
  }
  return false;
}

function monitoreoTextoGuardadoHasPayload(tg) {
  if (tg != null && tg.savedAt != null && String(tg.savedAt).trim()) return true;
  return !!String(tg?.text || '').trim();
}

/** @param {unknown} monitoreo */
export function monitoreoHasLanPayload(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return false;
  return monitoreoHasHistorialOrText(monitoreo) || monitoreoHasClinicalFlags(monitoreo);
}

function monitoreoHasHistorialOrText(monitoreo) {
  /** @type {any} */
  const m = monitoreo;
  if (Array.isArray(m.historial) && m.historial.length > 0) return true;
  const tg = m.textoGuardado && typeof m.textoGuardado === 'object' ? m.textoGuardado : null;
  return !!(tg && monitoreoTextoGuardadoHasPayload(tg));
}

function monitoreoHasClinicalFlags(monitoreo) {
  /** @type {any} */
  const m = monitoreo;
  const ec = m.estadoClinico && typeof m.estadoClinico === 'object' ? m.estadoClinico : null;
  if (ec && estadoClinicoHasContent(ec)) return true;
  if (hasPendingEaProposals(m.pendienteReceta)) return true;
  const conf = m.confirmado && typeof m.confirmado === 'object' ? m.confirmado : null;
  return !!(conf && confirmadoHasContent(conf));
}

/** @param {object} entry */
export function entryUpdatedAt(entry) {
  if (!entry) return '';
  const p = entry.patient || {};
  if (p.lanUpdatedAt) return String(p.lanUpdatedAt);
  const parts = [
    noteTimestamp(entry.note),
    noteTimestamp(entry.indicaciones),
    medRecetaTimestamp(entry.medReceta),
    medPharmTimestamp(entry.medPharmProfile),
    listadoTimestamp(entry.listadoProblemas),
    monitoreoUpdatedAt(p.monitoreo),
    eventualidadesUpdatedAt(p.eventualidades),
  ];
  const labs = Array.isArray(entry.labHistory) ? entry.labHistory : [];
  for (let i = 0; i < labs.length; i += 1) {
    parts.push(labSetTimestamp(labs[i]));
  }
  let best = '';
  for (let j = 0; j < parts.length; j += 1) {
    if (compareIso(parts[j], best) > 0) best = parts[j];
  }
  return best;
}

function labSetHasSomeSource(set) {
  return looksLikeSomeLabReport(String((set && set.sourceText) || ''));
}

function pickSomeSourceText(a, b) {
  const as = labSetHasSomeSource(a) ? String(a.sourceText || '') : '';
  const bs = labSetHasSomeSource(b) ? String(b.sourceText || '') : '';
  if (as && bs) {
    return compareIso(labSetTimestamp(b), labSetTimestamp(a)) >= 0 ? bs : as;
  }
  return as || bs;
}

/** LWW by timestamp, but a SOME report always beats parsed-only Nube values. */
function mergeLabSetPreferSome(cur, incoming) {
  if (!cur) return { ...incoming };
  const incomingNewer = compareIso(labSetTimestamp(incoming), labSetTimestamp(cur)) >= 0;
  const newer = incomingNewer ? incoming : cur;
  const older = incomingNewer ? cur : incoming;
  const out = { ...newer };
  const src = pickSomeSourceText(cur, incoming);
  if (!src) return out;
  out.sourceText = src;
  if (!labSetHasSomeSource(newer) && labSetHasSomeSource(older)) {
    if (Array.isArray(older.resLabs)) out.resLabs = older.resLabs;
    if (older.bhExtras) out.bhExtras = older.bhExtras;
  }
  return out;
}

/** @param {object[]} a @param {object[]} b */
export function mergeLabHistorySets(a, b) {
  const map = new Map();
  for (const s of a || []) {
    if (!s || !s.id) continue;
    map.set(String(s.id), { ...s });
  }
  for (const s of b || []) {
    if (!s || !s.id) continue;
    const id = String(s.id);
    const cur = map.get(id);
    map.set(id, mergeLabSetPreferSome(cur, s));
  }
  return stripDuplicateLabSets(Array.from(map.values())).sets;
}

function mergeProblemaLists(aList, bList) {
  const map = new Map();
  for (const arr of [aList, bList]) {
    for (const p of arr || []) {
      if (!p || !p.id) continue;
      const id = String(p.id);
      const cur = map.get(id);
      const at = String(p.updatedAt || p.fecha || '');
      const curAt = cur ? String(cur.updatedAt || cur.fecha || '') : '';
      if (!cur || compareIso(at, curAt) >= 0) map.set(id, { ...p });
    }
  }
  return Array.from(map.values());
}

/** @param {object|null} a @param {object|null} b */
export function mergeListadoProblemas(a, b) {
  if (!a && !b) return null;
  if (!a) return b ? { ...b } : null;
  if (!b) return { ...a };
  const at = listadoTimestamp(a);
  const bt = listadoTimestamp(b);
  const base = compareIso(at, bt) >= 0 ? { ...a } : { ...b };
  const other = base === a ? b : a;
  return {
    ...base,
    activos: mergeProblemaLists(base.activos, other.activos),
    inactivos: mergeProblemaLists(base.inactivos, other.inactivos),
  };
}

function pickPatientFields(older, newer) {
  const fields = [
    'nombre',
    'edad',
    'sexo',
    'area',
    'servicio',
    'cuarto',
    'cama',
    'peso',
    'talla',
    'viaAcceso',
    'accesoFecha',
    'fiuxFecha',
    'fimiFecha',
    'registro',
    'fromLab',
  ];
  const out = { ...older };
  for (const f of fields) {
    const nv = newer[f];
    const ov = older[f];
    if (nv != null && String(nv).trim() !== '') out[f] = nv;
    else if (ov != null) out[f] = ov;
  }
  const at = String(older.lanUpdatedAt || '');
  const bt = String(newer.lanUpdatedAt || '');
  if (compareIso(bt, at) >= 0 && newer.lanUpdatedAt) out.lanUpdatedAt = newer.lanUpdatedAt;
  else if (older.lanUpdatedAt) out.lanUpdatedAt = older.lanUpdatedAt;
  out.id = older.id || newer.id;
  mergePatientRegistrationMeta(out, older);
  mergePatientRegistrationMeta(out, newer);
  return out;
}

function pickNewerByTimestamp(tsA, tsB, aVal, bVal, cloneFn) {
  return compareIso(tsA, tsB) >= 0 ? cloneFn(aVal) : cloneFn(bVal);
}

function mergePatientMonitoreo(patient, first, second) {
  const monOlder = second.patient?.monitoreo;
  const monNewer = first.patient?.monitoreo;
  const payOlder = monitoreoHasLanPayload(monOlder);
  const payNewer = monitoreoHasLanPayload(monNewer);
  if (payOlder && payNewer) {
    patient.monitoreo = mergeMonitoreo(monOlder, monNewer);
    return;
  }
  if (payNewer && monNewer) {
    patient.monitoreo = structuredClone(monNewer);
    return;
  }
  if (payOlder && monOlder) {
    patient.monitoreo = structuredClone(monOlder);
    return;
  }
  delete patient.monitoreo;
}

function mergePatientDocuments(a, b) {
  return {
    note: pickNewerByTimestamp(
      noteTimestamp(a.note),
      noteTimestamp(b.note),
      a.note,
      b.note,
      (v) => ({ ...(v || {}) })
    ),
    indicaciones: pickNewerByTimestamp(
      noteTimestamp(a.indicaciones),
      noteTimestamp(b.indicaciones),
      a.indicaciones,
      b.indicaciones,
      (v) => ({ ...(v || {}) })
    ),
    medReceta: pickNewerByTimestamp(
      medRecetaTimestamp(a.medReceta),
      medRecetaTimestamp(b.medReceta),
      a.medReceta,
      b.medReceta,
      (v) => (v ? { ...v } : null)
    ),
    medPharmProfile: pickNewerByTimestamp(
      medPharmTimestamp(a.medPharmProfile),
      medPharmTimestamp(b.medPharmProfile),
      a.medPharmProfile,
      b.medPharmProfile,
      (v) => (v ? structuredClone(v) : null)
    ),
  };
}

function buildMergedPatientEntry(a, b, patient, first, second) {
  mergePatientMonitoreo(patient, first, second);

  const mergedEventualidades = mergeEventualidades(first.patient?.eventualidades, second.patient?.eventualidades);
  if (mergedEventualidades) patient.eventualidades = mergedEventualidades;

  // pickPatientFields only whitelists demographics — restore censo/dx from both sides.
  mergeCensoPatientFieldsFromBoth(patient, first.patient, second.patient);

  if (patient.id) bumpLabHistoryRevision(patient.id);

  const docs = mergePatientDocuments(a, b);
  return {
    patient,
    ...docs,
    labHistory: mergeLabHistorySets(a.labHistory, b.labHistory),
    vpo: mergeVpoPayload(a.vpo, b.vpo),
    listadoProblemas: mergeListadoProblemas(a.listadoProblemas, b.listadoProblemas),
    todos: mergeTodoListsById(a.todos, b.todos),
  };
}

/** @param {object} a @param {object} b */
export function mergePatientEntry(a, b) {
  if (!a || !a.patient) return b ? cloneEntry(b) : null;
  if (!b || !b.patient) return cloneEntry(a);
  const at = entryUpdatedAt(a);
  const bt = entryUpdatedAt(b);
  const first = compareIso(at, bt) >= 0 ? a : b;
  const second = first === a ? b : a;
  const patient = pickPatientFields(
    compareIso(entryUpdatedAt(second), entryUpdatedAt(first)) <= 0 ? second.patient : first.patient,
    compareIso(entryUpdatedAt(first), entryUpdatedAt(second)) >= 0 ? first.patient : second.patient
  );
  patient.id = first.patient.id || second.patient.id;
  return buildMergedPatientEntry(a, b, patient, first, second);
}

/** @param {object|null|undefined} a @param {object|null|undefined} b */
function mergeVpoPayload(a, b) {
  if (!a && !b) return null;
  if (!a) return b ? structuredClone(b) : null;
  if (!b) return structuredClone(a);
  try {
    return JSON.parse(JSON.stringify(b));
  } catch {
    return structuredClone(b);
  }
}

function clonePatientShell(patRaw) {
  const patient =
    typeof patRaw === 'object' && patRaw != null ? { ...patRaw } : /** @type {any} */ ({});
  const monSrc = patient.monitoreo;
  if (monSrc != null && typeof monSrc === 'object') {
    patient.monitoreo = structuredClone(monSrc);
  }
  return patient;
}

/** @param {object} entry */
export function cloneEntry(entry) {
  return {
    patient: clonePatientShell(entry.patient || {}),
    note: { ...(entry.note || {}) },
    indicaciones: { ...(entry.indicaciones || {}) },
    labHistory: Array.isArray(entry.labHistory) ? entry.labHistory.map((s) => ({ ...s })) : [],
    medReceta: entry.medReceta ? { ...entry.medReceta } : null,
    medPharmProfile: entry.medPharmProfile ? structuredClone(entry.medPharmProfile) : null,
    vpo: entry.vpo ? structuredClone(entry.vpo) : null,
    listadoProblemas: entry.listadoProblemas ? { ...entry.listadoProblemas } : null,
    todos: Array.isArray(entry.todos) ? entry.todos.map((t) => ({ ...t })) : [],
  };
}

/**
 * Une entradas de varios bundles/snapshots (no elimina pacientes que solo existen en un lado).
 * @param {Array<{ entries?: object[] }>} sources
 */
export function mergeLanPatientEntrySources(sources) {
  const byKey = new Map();
  for (let s = 0; s < (sources || []).length; s += 1) {
    const list = Array.isArray(sources[s].entries) ? sources[s].entries : [];
    for (let i = 0; i < list.length; i += 1) {
      const entry = list[i];
      if (!entry || !entry.patient || isDemoPatientId(entry.patient.id)) continue;
      const k = entryMatchKey(entry);
      const cur = byKey.get(k);
      byKey.set(k, cur ? mergePatientEntry(cur, entry) : cloneEntry(entry));
    }
  }
  return Array.from(byKey.values());
}

/**
 * Quita entradas de paciente anuladas por un delete remoto más reciente (LiveSync).
 * @param {object[]} entries
 * @param {Array<{ id?: string, registro?: string, updatedAt?: string, deleted?: boolean }>} patientDeletes
 */
function patientDeleteKey(row) {
  const reg = String(row?.registro || '').trim();
  if (reg) return 'reg:' + reg;
  return 'id:' + String(row?.id || '');
}

/** Union patient delete rows by registro/id (newest updatedAt wins). */
export function mergePatientDeleteRecords(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const row of list || []) {
      if (!row || !row.deleted) continue;
      const k = patientDeleteKey(row);
      if (!k) continue;
      const cur = map.get(k);
      if (!cur || compareIso(row.updatedAt, cur.updatedAt) >= 0) {
        map.set(k, row);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Patients present in a stale local snapshot but absent from the host census were
 * purged on the LAN host and must not be resurrected on reconcile.
 * @param {object[]} snapshotEntries
 * @param {object[]} hostEntries
 */
export function derivePatientDeletesFromHostCensus(snapshotEntries, hostEntries) {
  if (!Array.isArray(hostEntries)) return [];
  const hostKeys = new Set();
  for (const entry of hostEntries) {
    const k = entryMatchKey(entry);
    if (k) hostKeys.add(k);
  }
  const deletes = [];
  const seen = new Set();
  const now = new Date().toISOString();
  for (const entry of snapshotEntries || []) {
    if (!entry?.patient) continue;
    const k = entryMatchKey(entry);
    if (!k || hostKeys.has(k) || seen.has(k)) continue;
    seen.add(k);
    deletes.push({
      id: String(entry.patient.id || ''),
      registro: String(entry.patient.registro || '').trim(),
      updatedAt: now,
      deleted: true,
    });
  }
  return deletes;
}

export function filterEntriesByPatientDeletes(entries, patientDeletes) {
  if (!patientDeletes || !patientDeletes.length) return entries || [];
  const delMap = new Map();
  for (let i = 0; i < patientDeletes.length; i += 1) {
    const d = patientDeletes[i];
    if (!d || !d.deleted) continue;
    delMap.set(patientDeleteKey(d), d);
  }
  if (!delMap.size) return entries || [];
  return (entries || []).filter((entry) => {
    if (!entry || !entry.patient) return false;
    const del = delMap.get(entryMatchKey(entry));
    if (!del) return true;
    if (del.deleted) {
      const entryId = String(entry.patient.id || '').trim();
      const delId = String(del.id || '').trim();
      // New admission reusing hospital registro — keep the fresh chart.
      if (entryId && delId && entryId !== delId) return true;
      return false;
    }
    return compareIso(entryUpdatedAt(entry), del.updatedAt || '') > 0;
  });
}

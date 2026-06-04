/** Merge de expedientes (entradas paciente) para sync LAN — unión sin borrar locales. */

import { compareIso } from './live-sync-room.mjs';
import { mergeTodoListsById } from './livesync-patient-ids.mjs';
import { mergeMonitoreo } from './features/estado-actual-data.mjs';
import { bumpLabHistoryRevision } from './lab-history-cache.mjs';
import { filterNewEventualidades, dedupeEventualidadKey } from '../../lib/drive-import/merge-eventualidades.mjs';
import { medPharmProfileUpdatedAt } from './med-pharm-profile-core.mjs';

export function isDemoPatientId(patientId) {
  return String(patientId || '').indexOf('demo-') === 0;
}

/** @param {object} entry */
export function entryMatchKey(entry) {
  const reg = String(entry?.patient?.registro || '').trim();
  if (reg) return 'reg:' + reg;
  return 'id:' + String(entry?.patient?.id || '');
}

function parseDateDMY(value) {
  const t = String(value || '').trim();
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
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

/** @param {unknown} store */
export function eventualidadesUpdatedAt(store) {
  if (!store || typeof store !== 'object') return '';
  /** @type {{ entries?: object[], updatedAt?: string }} */
  const s = store;
  let best = s.updatedAt ? String(s.updatedAt) : '';
  const entries = Array.isArray(s.entries) ? s.entries : [];
  for (let i = 0; i < entries.length; i += 1) {
    const row = entries[i];
    if (!row || typeof row !== 'object') continue;
    const at = String(/** @type {{ at?: string, updatedAt?: string }} */ (row).at || /** @type {{ updatedAt?: string }} */ (row).updatedAt || '');
    if (compareIso(at, best) > 0) best = at;
  }
  return best;
}

/** @param {unknown} a @param {unknown} b */
export function mergeEventualidades(a, b) {
  const left = a && typeof a === 'object' ? /** @type {{ entries?: object[] }} */ (a) : null;
  const right = b && typeof b === 'object' ? /** @type {{ entries?: object[] }} */ (b) : null;
  if (!left && !right) return undefined;
  const leftEntries = left && Array.isArray(left.entries) ? left.entries : [];
  const rightEntries = right && Array.isArray(right.entries) ? right.entries : [];
  const byId = new Map();
  for (const row of leftEntries) {
    if (!row || typeof row !== 'object') continue;
    const id = String(/** @type {{ id?: string }} */ (row).id || '').trim();
    if (id) byId.set(id, { ...row });
  }
  for (const row of rightEntries) {
    if (!row || typeof row !== 'object') continue;
    const id = String(/** @type {{ id?: string }} */ (row).id || '').trim();
    if (id) {
      const cur = byId.get(id);
      const at = String(/** @type {{ at?: string }} */ (row).at || '');
      const curAt = cur ? String(/** @type {{ at?: string }} */ (cur).at || '') : '';
      if (!cur || compareIso(at, curAt) >= 0) byId.set(id, { ...row });
      continue;
    }
  }
  const { toAdd } = filterNewEventualidades(
    Array.from(byId.values()),
    rightEntries.filter((row) => !String(/** @type {{ id?: string }} */ (row).id || '').trim())
  );
  for (const row of toAdd) {
    byId.set('anon:' + dedupeEventualidadKey(row), { ...row });
  }
  const entries = Array.from(byId.values()).sort(function (x, y) {
    return compareIso(String(/** @type {{ at?: string }} */ (y).at || ''), String(/** @type {{ at?: string }} */ (x).at || ''));
  });
  return { entries };
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
export function monitoreoUpdatedAt(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return '';
  let best = '';
  /** @type {any} */
  const m = monitoreo;
  const tg = m.textoGuardado && typeof m.textoGuardado === 'object' ? m.textoGuardado : null;
  if (tg != null && tg.savedAt != null && String(tg.savedAt).trim()) {
    const s = String(tg.savedAt);
    if (compareIso(s, best) > 0) best = s;
  }
  const hist = Array.isArray(m.historial) ? m.historial : [];
  for (let i = 0; i < hist.length; i += 1) {
    const row = hist[i];
    if (!row || typeof row !== 'object') continue;
    const ra =
      /** @type {any} */ (row).recordedAt != null ? String(/** @type {any} */ (row).recordedAt) : '';
    if (ra && compareIso(ra, best) > 0) best = ra;
  }
  return best;
}

/** @param {unknown} monitoreo */
function monitoreoHasLanPayload(monitoreo) {
  if (!monitoreo || typeof monitoreo !== 'object') return false;
  /** @type {any} */
  const m = monitoreo;
  const hist = Array.isArray(m.historial) ? m.historial : [];
  if (hist.length > 0) return true;
  const tg = m.textoGuardado && typeof m.textoGuardado === 'object' ? m.textoGuardado : null;
  if (!tg) return false;
  if (tg.savedAt != null && String(tg.savedAt).trim()) return true;
  if (String(tg.text || '').trim()) return true;
  return false;
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
    historiaClinicaUpdatedAt(p.historiaClinica),
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
    if (!cur || compareIso(labSetTimestamp(s), labSetTimestamp(cur)) >= 0) {
      map.set(id, { ...s });
    }
  }
  return Array.from(map.values());
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
  return out;
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

  const note =
    compareIso(noteTimestamp(a.note), noteTimestamp(b.note)) >= 0
      ? { ...(a.note || {}) }
      : { ...(b.note || {}) };
  const indicaciones =
    compareIso(noteTimestamp(a.indicaciones), noteTimestamp(b.indicaciones)) >= 0
      ? { ...(a.indicaciones || {}) }
      : { ...(b.indicaciones || {}) };
  const medReceta =
    compareIso(medRecetaTimestamp(a.medReceta), medRecetaTimestamp(b.medReceta)) >= 0
      ? a.medReceta
        ? { ...a.medReceta }
        : null
      : b.medReceta
        ? { ...b.medReceta }
        : null;
  const medPharmProfile =
    compareIso(medPharmTimestamp(a.medPharmProfile), medPharmTimestamp(b.medPharmProfile)) >= 0
      ? a.medPharmProfile
        ? structuredClone(a.medPharmProfile)
        : null
      : b.medPharmProfile
        ? structuredClone(b.medPharmProfile)
        : null;

  const monOlder = second.patient?.monitoreo;
  const monNewer = first.patient?.monitoreo;
  const payOlder = monitoreoHasLanPayload(monOlder);
  const payNewer = monitoreoHasLanPayload(monNewer);
  if (payOlder && payNewer) {
    patient.monitoreo = mergeMonitoreo(monOlder, monNewer);
  } else if (payNewer && monNewer) {
    patient.monitoreo = structuredClone(monNewer);
  } else if (payOlder && monOlder) {
    patient.monitoreo = structuredClone(monOlder);
  } else {
    delete patient.monitoreo;
  }

  const mergedEventualidades = mergeEventualidades(first.patient?.eventualidades, second.patient?.eventualidades);
  if (mergedEventualidades) patient.eventualidades = mergedEventualidades;

  const mergedHc = mergeHistoriaClinica(first.patient?.historiaClinica, second.patient?.historiaClinica);
  if (mergedHc) patient.historiaClinica = mergedHc;

  if (patient.id) bumpLabHistoryRevision(patient.id);

  return {
    patient,
    note,
    indicaciones,
    labHistory: mergeLabHistorySets(a.labHistory, b.labHistory),
    medReceta,
    medPharmProfile,
    vpo: mergeVpoPayload(a.vpo, b.vpo),
    listadoProblemas: mergeListadoProblemas(a.listadoProblemas, b.listadoProblemas),
    todos: mergeTodoListsById(a.todos, b.todos),
  };
}

/** @param {object|null|undefined} a @param {object|null|undefined} b */
function mergeVpoPayload(a, b) {
  if (!a && !b) return null;
  if (!a) return b ? structuredClone(b) : null;
  if (!b) return structuredClone(a);
  try {
    return JSON.parse(JSON.stringify(b));
  } catch (_e) {
    return structuredClone(b);
  }
}

/** @param {object} entry */
export function cloneEntry(entry) {
  const patRaw = entry.patient || {};
  const patient =
    typeof patRaw === 'object' && patRaw != null ? { ...patRaw } : /** @type {any} */ ({});
  const monSrc = patient.monitoreo;
  if (monSrc != null && typeof monSrc === 'object') {
    patient.monitoreo = structuredClone(monSrc);
  }
  if (patient.historiaClinica != null && typeof patient.historiaClinica === 'object') {
    patient.historiaClinica = structuredClone(patient.historiaClinica);
  }
  return {
    patient,
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
export function filterEntriesByPatientDeletes(entries, patientDeletes) {
  if (!patientDeletes || !patientDeletes.length) return entries || [];
  const delMap = new Map();
  for (let i = 0; i < patientDeletes.length; i += 1) {
    const d = patientDeletes[i];
    if (!d || !d.deleted) continue;
    const reg = String(d.registro || '').trim();
    const k = reg ? 'reg:' + reg : 'id:' + String(d.id || '');
    delMap.set(k, d);
  }
  if (!delMap.size) return entries || [];
  return (entries || []).filter((entry) => {
    if (!entry || !entry.patient) return false;
    const del = delMap.get(entryMatchKey(entry));
    if (!del) return true;
    return compareIso(entryUpdatedAt(entry), del.updatedAt || '') > 0;
  });
}

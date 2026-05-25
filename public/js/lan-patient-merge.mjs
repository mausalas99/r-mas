/** Merge de expedientes (entradas paciente) para sync LAN — unión sin borrar locales. */

import { compareIso } from './live-sync-room.mjs';
import { mergeTodoListsById } from './livesync-patient-ids.mjs';

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

function medRecetaTimestamp(med) {
  if (!med || typeof med !== 'object') return '';
  if (med.updatedAt) return String(med.updatedAt);
  return docTimestamp(med.fecha, med.hora);
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
    listadoTimestamp(entry.listadoProblemas),
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

  return {
    patient,
    note,
    indicaciones,
    labHistory: mergeLabHistorySets(a.labHistory, b.labHistory),
    medReceta,
    listadoProblemas: mergeListadoProblemas(a.listadoProblemas, b.listadoProblemas),
    todos: mergeTodoListsById(a.todos, b.todos),
  };
}

function cloneEntry(entry) {
  return {
    patient: { ...(entry.patient || {}) },
    note: { ...(entry.note || {}) },
    indicaciones: { ...(entry.indicaciones || {}) },
    labHistory: Array.isArray(entry.labHistory) ? entry.labHistory.map((s) => ({ ...s })) : [],
    medReceta: entry.medReceta ? { ...entry.medReceta } : null,
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

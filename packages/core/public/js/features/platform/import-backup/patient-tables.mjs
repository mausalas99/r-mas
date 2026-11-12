/**
 * Turns the backup `data` object into sheets for the Excel export.
 * Pure: no DOM, no storage. Empty columns are dropped; per-patient rows get the patient name.
 */
import { fitColumns } from './xlsx-workbook.mjs';

// Patient-data keys in `data`, with the sheet name. Settings and the med catalog are skipped.
const TABLES = [
  { key: 'patients', name: 'Pacientes', shape: 'list' },
  { key: 'notes', name: 'Notas', shape: 'byPatient' },
  { key: 'indicaciones', name: 'Indicaciones', shape: 'byPatient' },
  { key: 'medRecetaByPatient', name: 'Receta', shape: 'byPatient' },
  { key: 'medPharmProfileByPatient', name: 'Perfil farmacéutico', shape: 'byPatient' },
  { key: 'listadoProblemas', name: 'Problemas', shape: 'byPatient' },
  { key: 'vpoByPatient', name: 'VPO', shape: 'byPatient' },
  { key: 'labHistory', name: 'Labs', shape: 'labs' },
  { key: 'scheduledProcedures', name: 'Procedimientos', shape: 'list' },
];

/** Nested objects get "a / b" names. Arrays stay as JSON text in one cell. */
export function flattenRecord(obj, prefix, out) {
  const target = out || {};
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    const name = prefix ? prefix + ' / ' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flattenRecord(v, name, target);
    else target[name] = Array.isArray(v) ? JSON.stringify(v) : v;
  });
  return target;
}

const isEmpty = (v) => v == null || v === '';

function rowsFor(entry, value, nameById) {
  if (value == null || typeof value !== 'object') return [];
  const out = [];
  if (entry.shape === 'list') {
    (Array.isArray(value) ? value : []).forEach((x) => {
      if (x && typeof x === 'object') out.push(flattenRecord(x));
    });
    return out;
  }
  Object.keys(value).forEach((pid) => {
    const base = { 'ID paciente': pid, Paciente: nameById[pid] || '' };
    const items = entry.shape === 'labs' ? value[pid] : [value[pid]];
    (Array.isArray(items) ? items : []).forEach((item) => {
      if (!item || typeof item !== 'object') return;
      if (entry.shape !== 'labs') {
        out.push(flattenRecord(Object.assign({}, base, item)));
        return;
      }
      // Labs: one row per result line. Set fields repeat on each line.
      const set = Object.assign({}, item);
      delete set.resLabs;
      (Array.isArray(item.resLabs) ? item.resLabs : []).forEach((line) => {
        const text = String(line == null ? '' : line).trim();
        if (text) out.push(flattenRecord(Object.assign({}, base, set, { resultado: text })));
      });
    });
  });
  return out;
}

/** Flat rows → sheet: keeps only columns with at least one value. */
function toSheet(name, flatRows) {
  const keys = [];
  const seen = Object.create(null);
  flatRows.forEach((r) =>
    Object.keys(r).forEach((k) => {
      if (!seen[k]) {
        seen[k] = true;
        keys.push(k);
      }
    })
  );
  const used = keys.filter((k) => flatRows.some((r) => !isEmpty(r[k])));
  const rows = flatRows.map((r) => used.map((k) => (isEmpty(r[k]) ? '' : r[k])));
  return { name, columns: fitColumns(used, rows), rows };
}

/** @returns {Array<{name, columns, rows}>} one sheet per non-empty table, patients first. */
export function buildPatientSheets(data) {
  const nameById = {};
  (Array.isArray(data && data.patients) ? data.patients : []).forEach((p) => {
    if (p && p.id != null) nameById[String(p.id)] = p.nombre || '';
  });
  const sheets = [];
  TABLES.forEach((entry) => {
    const rows = rowsFor(entry, data ? data[entry.key] : null, nameById);
    if (rows.length) sheets.push(toSheet(entry.name, rows));
  });
  return sheets;
}

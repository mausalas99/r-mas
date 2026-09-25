/**
 * Inicio de turno (screen 12a) — counters + "Lo primero" table, built from the
 * same real data sources as Guardia (censo, todos/pendientes, admisión):
 *   - patientPendientes / isPatientAdmittedToday (guardia-census-table.mjs)
 *   - isPatientAdmissionIncomplete (patient-admission-incomplete.mjs)
 *   - patient.monitoreo.historial (vitals)
 * Pure functions only — no DOM here.
 */
import { formatTodoDueLabel } from '../../todos-due.mjs';
import { formatAccesoFechaDisplay } from '../../patient-date-fields.mjs';
import { patientPendientes, isPatientAdmittedToday, admissionDateForPatient } from '../guardia-census-table.mjs';
import { isPatientAdmissionIncomplete } from '../../patient-admission-incomplete.mjs';

function isTodayIso(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** @param {object} p */
function lastVitalsEntry(p) {
  const hist = Array.isArray(p?.monitoreo?.historial) ? p.monitoreo.historial : [];
  return hist.length ? hist[hist.length - 1] : null;
}

/** @param {object} p */
function lastVitalsRecordedAt(p) {
  const last = lastVitalsEntry(p);
  if (!last) return null;
  return String(last?.recordedAt || last?.registeredAt || last?.createdAt || '') || null;
}

/** @param {object} last */
function vitalsObjectFromEntry(last) {
  if (last?.vitals && typeof last.vitals === 'object') return last.vitals;
  if (last?.values && typeof last.values === 'object') return last.values;
  return {};
}

/** @param {object} p */
function lastVitalsAlteredChips(p) {
  const last = lastVitalsEntry(p);
  if (!last) return [];
  const vitals = vitalsObjectFromEntry(last);
  const alt = last?.alteredAt && typeof last.alteredAt === 'object' ? last.alteredAt : {};
  return Object.keys(alt)
    .filter((k) => vitals[k] != null)
    .map((k) => `${k.toUpperCase()} ${vitals[k]}`);
}

/**
 * "Heredas pendientes" counter.
 * @param {object[]} patients
 * @returns {{ open: number, overdue: number, oldestOverdueIso: string|null }}
 */
export function computeHeredasPendientesSummary(patients) {
  let open = 0;
  let overdue = 0;
  let oldestOverdueIso = null;
  (patients || []).forEach((p) => {
    const { open: o, overdue: v } = patientPendientes(p.id);
    open += o.length;
    overdue += v.length;
    v.forEach((t) => {
      const iso = String(t.dueDate || t.reminderAt || t.createdAt || '');
      if (iso && (!oldestOverdueIso || iso < oldestOverdueIso)) oldestOverdueIso = iso;
    });
  });
  return { open, overdue, oldestOverdueIso };
}

/**
 * "Toma de signos" counter — vitals recorded today vs. total census.
 * @param {object[]} patients
 * @returns {{ total: number, receivedToday: number, percent: number }}
 */
export function computeTomaSignosSummary(patients) {
  const total = (patients || []).length;
  const receivedToday = (patients || []).filter((p) => isTodayIso(lastVitalsRecordedAt(p))).length;
  const percent = total > 0 ? Math.round((receivedToday / total) * 100) : 0;
  return { total, receivedToday, percent };
}

/**
 * "Ingresos de la noche" counter.
 *
 * Note on what this actually measures: `isPatientAdmissionIncomplete` (from
 * patient-admission-incomplete.mjs) checks for a missing cuarto/cama/servicio/
 * area on the chart — it does NOT know whether a clinical admission note
 * exists (R+ has no such field). The mockup's "sin nota de ingreso" copy would
 * misrepresent that signal, so this is reported as "ficha incompleta" instead.
 * @param {object[]} patients
 * @returns {{ admittedToday: number, incompleteChart: number }}
 */
export function computeIngresosNocheSummary(patients) {
  let admittedToday = 0;
  let incompleteChart = 0;
  (patients || []).forEach((p) => {
    if (!isPatientAdmittedToday(p)) return;
    admittedToday += 1;
    if (isPatientAdmissionIncomplete(p)) incompleteChart += 1;
  });
  return { admittedToday, incompleteChart };
}

function bedLabelForPatient(p) {
  const joined = [p?.cuarto, p?.cama].filter(Boolean).join(' · ');
  return joined || '—';
}

function daysAdmittedLabel(p) {
  if (isPatientAdmittedToday(p)) return 'ingreso';
  const iso = admissionDateForPatient(p);
  if (!iso) return '';
  const admitted = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(admitted.getTime())) return '';
  const days = Math.max(0, Math.round((Date.now() - admitted.getTime()) / 86400000));
  return `d${days}`;
}

function inferOverdueActionLabel(text) {
  return /control|potasio|electrol|k\+|repos/i.test(String(text || ''))
    ? 'Pedir control'
    : 'Revalorar';
}

/** @param {object[]} overdue @param {object} base */
function overdueLoPrimeroRow(overdue, base) {
  const t = overdue[0];
  const iso = String(t.dueDate || t.reminderAt || t.createdAt || '');
  return {
    ...base,
    reasonText: String(t.text || 'Pendiente vencido'),
    sinceLabel: `${formatTodoDueLabel(iso) || 'vencido'} · vencido`,
    urgency: 'vencido',
    action: { label: inferOverdueActionLabel(t.text), tone: 'primary' },
  };
}

/** @param {object} p @param {object} base */
function incompleteAdmissionLoPrimeroRow(p, base) {
  const iso = admissionDateForPatient(p);
  return {
    ...base,
    reasonText: 'Ingreso de hoy con ficha incompleta (falta cuarto, cama, servicio o área)',
    sinceLabel: `${formatAccesoFechaDisplay(iso) || 'hoy'} · ficha incompleta`,
    urgency: 'en_espera',
    action: { label: 'Completar ficha', tone: 'secondary' },
  };
}

/** @param {object} inProgress @param {object} base */
function inProgressLoPrimeroRow(inProgress, base) {
  const iso = String(inProgress.dueDate || inProgress.reminderAt || inProgress.createdAt || '');
  return {
    ...base,
    reasonText: String(inProgress.text || 'En curso'),
    sinceLabel: `${formatTodoDueLabel(iso) || 'en curso'} · en curso`,
    urgency: 'en_curso',
    action: { label: 'Ver manejo', tone: 'secondary' },
  };
}

/**
 * @param {object} p
 * @returns {{ id: string, bedLabel: string, name: string, ageLabel: string,
 *   stayLabel: string, reasonText: string, alteredText: string,
 *   sinceLabel: string, urgency: 'vencido'|'en_espera'|'en_curso',
 *   action: { label: string, tone: 'primary'|'secondary' } }|null}
 */
function loPrimeroRowForPatient(p) {
  const name = String(p.name || p.nombre || '—');
  const ageLabel = p.edad != null && p.edad !== '' ? `${p.edad} a` : '';
  const stayLabel = daysAdmittedLabel(p);
  const { overdue, open } = patientPendientes(p.id);
  const alteredText = lastVitalsAlteredChips(p).join(' · ');
  const base = { id: p.id, bedLabel: bedLabelForPatient(p), name, ageLabel, stayLabel, alteredText };

  if (overdue.length) return overdueLoPrimeroRow(overdue, base);
  if (isPatientAdmittedToday(p) && isPatientAdmissionIncomplete(p)) {
    return incompleteAdmissionLoPrimeroRow(p, base);
  }

  const inProgress = open.find((t) => t && t.inProgress);
  if (inProgress) return inProgressLoPrimeroRow(inProgress, base);

  return null;
}

const URGENCY_RANK = { vencido: 0, en_espera: 1, en_curso: 2 };

/**
 * "Lo primero" table rows — vencidos first, then en_espera, then en_curso.
 * @param {object[]} patients
 * @param {{ limit?: number }} [opts]
 * @returns {{ rows: ReturnType<typeof loPrimeroRowForPatient>[], remainingCount: number, totalCount: number }}
 */
export function buildLoPrimeroRows(patients, opts = {}) {
  const limit = opts.limit || 4;
  const all = (patients || []).map(loPrimeroRowForPatient).filter(Boolean);
  all.sort((a, b) => {
    const rankDiff = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (rankDiff !== 0) return rankDiff;
    return String(a.sinceLabel).localeCompare(String(b.sinceLabel));
  });
  const rows = all.slice(0, limit);
  return {
    rows,
    remainingCount: Math.max(0, (patients || []).length - rows.length),
    totalCount: (patients || []).length,
  };
}

/**
 * Populated Guardia census fixture (teal-workbench rollout, Phase 2, screens 6a/6b).
 *
 * DEMO PÉREZ (`tour-pitch-seed-data.mjs`) is a single-patient fixture — Guardia has
 * never been exercised with a real 25-row census through it (Phase 0 finding). This
 * module builds 24 more synthetic patients, on top of DEMO PÉREZ, so the Censo table,
 * Ingresos filter (D3a), and VENCIDO/EN CURSO/ABIERTO/LISTO statuses (D3b) can be
 * screenshot-verified against `Paciente Rediseño.dc.html` #6a/#6b instead of showing
 * the (correct, but unverifiable) empty state. Fake data only — no PHI.
 *
 * Patient ids deliberately avoid the `demo-` prefix so `storage.saveTodos` (which
 * silently skips `demo-*` ids) works normally for their pendientes.
 */
import { storage } from './storage.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** @param {Date} today @param {number} hour @param {number} minute */
function todayAt(today, hour, minute) {
  const d = new Date(today.getTime());
  d.setHours(hour, minute, 0, 0);
  return d;
}

function vitalsEntry(id, recordedAt, vitals, alteredAt) {
  return {
    id,
    recordedAt: recordedAt.toISOString(),
    vitals,
    alteredAt: alteredAt || {},
  };
}

/**
 * The 9 mockup rows with an open pendiente — 2 VENCIDO, 2 EN CURSO, 5 ABIERTO
 * (matches "Con pendiente · 9" in the mockup's filter chip).
 * @param {Date} today
 */
function pendienteBearingPatientSpecs(today) {
  return [
    {
      id: 'pitch-gcx-01',
      nombre: 'PÉREZ GARCÍA, JUAN M.',
      edad: '68', sexo: 'M', cuarto: '214-B', cama: '2',
      vitals: { sat: 89, fc: 110 }, alteredAt: { sat: todayAt(today, 8, 4).toISOString() },
      todo: { text: 'Reponer potasio y control', overdue: true },
    },
    {
      id: 'pitch-gcx-02',
      nombre: 'RAMÍREZ SOTO, ANA',
      edad: '74', sexo: 'F', cuarto: '219', cama: '1',
      vitals: { tas: 82, tad: 50, fc: 122 }, alteredAt: { tas: todayAt(today, 8, 2).toISOString() },
      todo: { text: 'Carga de volumen, revalorar', overdue: true },
      registeredAt: todayAt(today, 19, 20).toISOString(),
    },
    {
      id: 'pitch-gcx-03',
      nombre: 'DOMÍNGUEZ LARA, MARÍA',
      edad: '59', sexo: 'F', cuarto: '217', cama: '3',
      vitals: { temp: 38.4, fc: 96 }, alteredAt: { temp: todayAt(today, 7, 58).toISOString() },
      todo: { text: 'Esquema de insulina c/4 h', inProgress: true },
    },
    {
      id: 'pitch-gcx-04',
      nombre: 'OLVERA RUIZ, PEDRO',
      edad: '81', sexo: 'M', cuarto: '221', cama: '2',
      vitals: { fc: 118, sat: 92 }, alteredAt: { fc: todayAt(today, 7, 40).toISOString() },
      todo: { text: 'Transfusión 1 CE, consentimiento', inProgress: true },
      registeredAt: todayAt(today, 23, 5).toISOString(),
    },
    {
      id: 'pitch-gcx-05',
      nombre: 'SÁNCHEZ MORA, ELENA',
      edad: '66', sexo: 'F', cuarto: '213', cama: '1',
      vitals: { tas: 118, tad: 72, fc: 82 }, alteredAt: {},
      todo: { text: 'Ajustar dosis por depuración' },
    },
    {
      id: 'pitch-gcx-06',
      nombre: 'TREJO ISLAS, ROBERTO',
      edad: '70', sexo: 'M', cuarto: '216', cama: '4',
      vitals: { temp: 38.4, fc: 92 }, alteredAt: { temp: todayAt(today, 5, 10).toISOString() },
      todo: { text: 'Hemocultivos y control térmico' },
    },
    {
      id: 'pitch-gcx-07',
      nombre: 'IBARRA CASTRO, DANIELA',
      edad: '54', sexo: 'F', cuarto: '215', cama: '2',
      vitals: { tas: 116, tad: 70, fc: 78 }, alteredAt: {},
      todo: { text: 'Control de electrolitos' },
    },
    {
      id: 'pitch-gcx-08',
      nombre: 'MORENO DELGADO, CARLOS',
      edad: '77', sexo: 'M', cuarto: '218', cama: '1',
      vitals: { tas: 122, tad: 74, fc: 80 }, alteredAt: {},
      todo: { text: 'Valorar egreso a piso' },
    },
    {
      id: 'pitch-gcx-09',
      nombre: 'CASTRO LEÓN, IRMA',
      edad: '62', sexo: 'F', cuarto: '220', cama: '4',
      vitals: { tas: 150, tad: 96, fc: 88 }, alteredAt: {},
      todo: { text: 'Ajuste de dieta hiposódica' },
      registeredAt: todayAt(today, 3, 40).toISOString(),
    },
  ];
}

/**
 * The 16 quiet rows (no alterados, no pendientes) — mockup's closing summary
 * line "16 pacientes sin alterados ni pendientes". Two show `sin toma 08:00`
 * (no vitals recorded today), matching Nava Cortés / Esquivel Ponce in the mockup.
 * @param {Date} today
 */
function quietPatientSpecs(today) {
  const names = [
    'GUTIÉRREZ VÁZQUEZ, LUIS', 'NAVA CORTÉS, SOFÍA', 'ESQUIVEL PONCE, JORGE',
    'VARGAS PEÑA, MARTHA', 'ROJAS AGUILAR, FERNANDO', 'HERRERA SOTO, PATRICIA',
    'CAMPOS RUIZ, ALEJANDRO', 'LUNA MEDINA, GABRIELA', 'AGUILAR TORRES, RICARDO',
    'MENDOZA CRUZ, LAURA', 'FLORES ORTIZ, SERGIO', 'VÁZQUEZ ROMERO, CLAUDIA',
    'JIMÉNEZ SILVA, HÉCTOR', 'REYES NAVARRO, BEATRIZ', 'CORTÉS RAMOS, EDUARDO',
    'SALAZAR GÓMEZ, VERÓNICA',
  ];
  return names.map((nombre, i) => {
    const noVitalsToday = i === 1 || i === 2; // Nava Cortés, Esquivel Ponce
    return {
      id: `pitch-gcx-q${String(i + 1).padStart(2, '0')}`,
      nombre,
      edad: String(45 + i),
      sexo: i % 2 === 0 ? 'F' : 'M',
      cuarto: String(222 + Math.floor(i / 2)),
      cama: String((i % 2) + 1),
      vitals: noVitalsToday ? null : { tas: 116 + (i % 5), tad: 70, fc: 76 + (i % 6) },
      alteredAt: {},
      todo: null,
    };
  });
}

/**
 * @param {object} spec
 * @param {Date} today
 */
function buildPatientFromSpec(spec, today) {
  const historial = spec.vitals
    ? [vitalsEntry(spec.id + '-v1', todayAt(today, 6, 0), { tas: 118, tad: 72, fc: 78 }, {})]
    : [];
  if (spec.vitals) {
    historial.push(vitalsEntry(spec.id + '-v2', todayAt(today, 8, 0), spec.vitals, spec.alteredAt || {}));
  }
  const patient = {
    id: spec.id,
    nombre: spec.nombre,
    registro: spec.id,
    edad: spec.edad,
    sexo: spec.sexo,
    area: 'MEDICINA INTERNA',
    servicio: 'MEDICINA INTERNA',
    cuarto: spec.cuarto,
    cama: spec.cama,
    isDemo: true,
    monitoreo: { historial },
  };
  if (spec.registeredAt) patient.registeredAt = spec.registeredAt;
  return patient;
}

/**
 * 24 synthetic patients (9 with a pendiente, matching the mockup's visible/implied
 * rows; 15 quiet) — plus DEMO PÉREZ (which already carries its own pendientes)
 * makes 25 total, close to the mockup's "Censo · 25 pacientes" scale. The exact
 * "Con pendiente · N" and closing-summary counts are computed live from real data
 * (`guardiaCensusFilterChips`, `guardiaCensusSummaryLine`) — not hardcoded here —
 * so they may differ slightly from the mockup's literal numbers; that is expected
 * and correct (no fabricated counters).
 * @param {Date} [ref]
 * @returns {object[]}
 */
export function buildPitchGuardiaCensusPatients(ref) {
  const today = ref instanceof Date ? ref : new Date();
  const pending = pendienteBearingPatientSpecs(today).map((s) => buildPatientFromSpec(s, today));
  const quiet = quietPatientSpecs(today)
    .slice(0, 15)
    .map((s) => buildPatientFromSpec(s, today));
  return [...pending, ...quiet];
}

/** @param {Date} [ref] @returns {Record<string, { text: string, overdue?: boolean, inProgress?: boolean }>} */
function pendienteTodoSpecsById(ref) {
  const today = ref instanceof Date ? ref : new Date();
  const out = {};
  pendienteBearingPatientSpecs(today).forEach((s) => {
    if (s.todo) out[s.id] = s.todo;
  });
  return out;
}

/**
 * Writes one pendiente per patient that has one, via the normal `storage.saveTodos`
 * path (works because these ids don't start with `demo-`).
 * @param {Date} [ref]
 */
export function seedPitchGuardiaCensusTodos(ref) {
  const today = ref instanceof Date ? ref : new Date();
  const specs = pendienteTodoSpecsById(today);
  Object.keys(specs).forEach((patientId) => {
    const spec = specs[patientId];
    const now = today.toISOString();
    const row = {
      id: patientId + '-todo',
      text: spec.text,
      completed: false,
      priority: 'media',
      createdAt: now,
      updatedAt: now,
    };
    if (spec.overdue) {
      row.dueDate = new Date(today.getTime() - DAY_MS).toISOString();
    } else if (!spec.inProgress) {
      row.dueDate = new Date(today.getTime() + 3 * DAY_MS).toISOString();
    }
    if (spec.inProgress) row.inProgress = true;
    storage.saveTodos(patientId, [row]);
  });
}

/**
 * Extends whatever patients are already in the (isolated, pitch-demo) census with
 * the populated Guardia fixture, and seeds the matching pendientes. Meant to run
 * right after `startPresentationMode()` has already seeded DEMO PÉREZ — this adds
 * 24 more patients on top rather than replacing the array, so the mockup's ~25-row
 * scale is reachable without touching the existing single-patient pitch tour.
 * @param {{
 *   getPatients: () => object[],
 *   setPatients: (list: object[]) => void,
 *   setDemoPatients?: (list: object[]) => void,
 *   getDemoPatients?: () => object[],
 *   persistClinicalState: () => void,
 *   renderPatientList: () => void,
 * }} state
 * @param {Date} [ref]
 */
export function extendPresentationModeWithGuardiaCensus(state, ref) {
  const today = ref instanceof Date ? ref : new Date();
  const extra = buildPitchGuardiaCensusPatients(today);
  const existing = (state.getPatients() || []).filter(
    (p) => !extra.some((e) => e.id === p.id)
  );
  const merged = [...existing, ...extra];
  state.setPatients(merged);
  if (typeof state.setDemoPatients === 'function') {
    const existingDemo = (
      typeof state.getDemoPatients === 'function' ? state.getDemoPatients() : existing
    ).filter((p) => !extra.some((e) => e.id === p.id));
    state.setDemoPatients([...existingDemo, ...extra]);
  }
  seedPitchGuardiaCensusTodos(today);
  state.persistClinicalState();
  state.renderPatientList();
}

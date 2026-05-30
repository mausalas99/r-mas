/**
 * Exportación estática de DEMO PÉREZ (modo presentación) a JSON importable en R+.
 */
import { buildTourDemoListadoProblemas } from './tour-demo-listado-problemas.mjs';
import { normalizeRecetaHuDraft } from './receta-hu-core.mjs';
import {
  PITCH_DEMO_PATIENT_ID,
  buildPitchMonitoreoHistorial,
  buildPitchLabHistoryEntries,
} from './tour-pitch-demo-seed.mjs';
import { buildPitchDemoTodosForPatient } from './tour-pitch-demo-todos.mjs';

/** Fecha fija para JSON reproducibles (alineada con labs demo de mayo 2026). */
export const PITCH_DEMO_EXPORT_REF = new Date('2026-05-10T12:00:00');

function formatFechaHora(ref) {
  const d = ref instanceof Date ? ref : PITCH_DEMO_EXPORT_REF;
  const fecha =
    String(d.getDate()).padStart(2, '0') +
    '/' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '/' +
    d.getFullYear();
  const hora =
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  return { fecha, hora };
}

function buildDemoPerez(ref) {
  const { fecha, hora } = formatFechaHora(ref);
  return {
    patient: {
      id: PITCH_DEMO_PATIENT_ID,
      nombre: 'DEMO PÉREZ',
      registro: '0008421-7',
      edad: '67 años',
      sexo: 'M',
      area: 'SERVICIO DEMO',
      servicio: 'SERVICIO DEMO',
      cuarto: '101',
      cama: '1',
      fromLab: false,
      isDemo: true,
      monitoreo: buildPitchMonitoreoHistorial(ref),
    },
    note: {
      fecha,
      hora,
      interrogatorio: '',
      evolucion:
        'Paciente masculino de 67 años con peritonitis asociada a diálisis peritoneal en manejo antibiótico. ' +
        'Hemodinámicamente estable, afebril en el turno. Glucometrías seriadas c/6h con tendencia ascendente en 48 h.',
      estudios: 'Cultivos con aislamientos documentados; ver pestaña Cultivos.',
      diagnosticos: [
        'Peritonitis asociada a diálisis peritoneal',
        'DM2 descompensada',
        'IRC estadio 3',
        'HAS',
      ],
      tratamiento: ['Cefepime 1 g IV c/8h', 'Paracetamol 1 g IV c/8h'],
      ta: '118/72',
      fr: '18',
      fc: '88',
      temp: '36.8',
      peso: '70',
      medico: 'Dr. Demo',
      profesor: '',
    },
    indicaciones: {
      fecha,
      hora,
      medicos: 'Dr. Demo · SERVICIO DEMO',
      dieta: 'Dieta renal, restricción de K y P',
      cuidados: 'Signos vitales c/8h, glucometría c/6h, balance hídrico estricto',
      estudios: 'Control de BH y QS mañana',
      medicamentos:
        '1. Cefepime 1 g IV c/8h\n2. Paracetamol 1 g IV c/8h PRN dolor\n3. Losartán 50 mg VO c/24h',
      interconsultas: 'Nefrología de seguimiento',
      otros: [],
    },
    labHistory: buildPitchLabHistoryEntries(),
    medReceta: {
      fechaActualizacion: fecha,
      items: [
        {
          id: 'pitch-med-1',
          nombreRaw: 'PARACETAMOL 1 G SOL INY (*)',
          viaRaw: 'VIA INTRAVENOSA',
          dosisRaw: '1 G //',
          frecuenciaRaw: 'CADA 8 HORAS',
          suspendido: false,
          diaTratamiento: null,
        },
        {
          id: 'pitch-med-2',
          nombreRaw: 'CEFEPIME 1 G SOL INY (*)',
          viaRaw: 'VIA INTRAVENOSA',
          dosisRaw: '1 G // *DIA# 2*',
          frecuenciaRaw: 'CADA 8 HORAS',
          suspendido: false,
          diaTratamiento: 2,
        },
      ],
    },
    medNotaSelection: {
      'pitch-med-1': true,
      'pitch-med-2': true,
    },
    listadoProblemas: buildTourDemoListadoProblemas(fecha, hora),
    recetaHu: normalizeRecetaHuDraft({
      fecha,
      meds: [
        { medicamento: 'Cefepime', presentacion: '1 g IV', dosis: '1 g IV c/8h' },
        { medicamento: 'Paracetamol', presentacion: '1 g IV', dosis: '1 g IV c/8h PRN' },
      ],
      labs: ['Biometría hemática', 'Química sanguínea', 'Cultivos de control'],
      cuidados: 'Signos vitales, glucometría c/6h y balance hídrico',
      proximaCita: 'Consulta de Nefrología en 2 semanas',
      proximaCitaFecha: fecha,
    }),
    todos: buildPitchDemoTodosForPatient(PITCH_DEMO_PATIENT_ID),
    scheduledProcedures: [
      {
        id: 'pitch-agenda-1',
        patientId: PITCH_DEMO_PATIENT_ID,
        procedure: 'Catéter peritoneal — revisión',
        location: 'Quirófano menor',
        date: fecha,
        time: '10:30',
        notes: 'Demo presentación',
      },
      {
        id: 'pitch-agenda-2',
        patientId: PITCH_DEMO_PATIENT_ID,
        procedure: 'BH + QS control',
        location: 'Laboratorio',
        date: fecha,
        time: '06:00',
        notes: 'Demo presentación',
      },
    ],
  };
}

/**
 * @param {{ refDate?: Date, appVersion?: string|null }} [opts]
 */
export function buildPitchDemoPatientExport(opts) {
  const ref = opts && opts.refDate instanceof Date ? opts.refDate : PITCH_DEMO_EXPORT_REF;
  const snap = buildDemoPerez(ref);
  const patient = Object.assign({}, snap.patient);
  delete patient.isDemo;

  return {
    format: 'r-plus-patient-export',
    version: 1,
    exportedAt: ref.toISOString(),
    appVersion: opts && opts.appVersion != null ? opts.appVersion : null,
    patient,
    note: snap.note || null,
    indicaciones: snap.indicaciones || null,
    labHistory: snap.labHistory || [],
    medReceta: snap.medReceta || null,
  };
}

/** Misma forma que buildPatientEntry (import por rango / herramientas). */
export function buildPitchDemoPatientEntry(opts) {
  const ref = opts && opts.refDate instanceof Date ? opts.refDate : PITCH_DEMO_EXPORT_REF;
  const { fecha, hora } = formatFechaHora(ref);
  const payload = buildPitchDemoPatientExport(opts);
  return {
    patient: payload.patient,
    note: payload.note || {},
    indicaciones: payload.indicaciones || {},
    labHistory: payload.labHistory || [],
    medReceta: payload.medReceta || null,
    listadoProblemas: buildTourDemoListadoProblemas(fecha, hora),
    todos: buildPitchDemoTodosForPatient(PITCH_DEMO_PATIENT_ID),
  };
}

export function buildPitchDemoBundleExport(opts) {
  const ref = opts && opts.refDate instanceof Date ? opts.refDate : PITCH_DEMO_EXPORT_REF;
  const payload = buildPitchDemoPatientExport(opts);
  return {
    format: 'r-plus-pitch-demo-bundle',
    version: 1,
    exportedAt: ref.toISOString(),
    appVersion: opts && opts.appVersion != null ? opts.appVersion : null,
    patients: [payload],
  };
}

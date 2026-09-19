/**
 * Cardio (heart-failure) data for the DEMO PÉREZ pitch patient, adapted from
 * Cardionotas's Rosa María Delgado Vázquez reference fixture
 * (docs/demo-patients/demo-ic-seguimiento.json) — a real 7-day HFpEF
 * descongestión course. Dates are shifted to stay relative to `ref` so the
 * demo always reads as "current" instead of drifting into the past.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** @param {Date} ref @param {number} dayOffset days before ref's calendar day (0 = ref's day) */
function ymdOffset(ref, dayOffset) {
  const d = new Date(ref.getTime() - dayOffset * DAY_MS);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/**
 * Builds `patient.cardio` for DEMO PÉREZ: HFpEF descongestión course over the
 * last 6 days, ending today (`ref`). Day offsets below mirror the original
 * 2026-03-13..2026-03-19 narrative (day 6 ago = admission, day 0 = today).
 * @param {Date} ref
 */
export function buildDemoPerezCardio(ref) {
  const d = (n) => ymdOffset(ref, n);
  return {
    inicioDescongestion: d(6),
    ekg: 'Ritmo de marcapasos, FC: 60 lpm, Morfología de bloqueo de rama izquierda',
    ritmo: 'Ritmo de marcapasos',
    estrategiaControlFa: '',
    vexusIngreso: 2,
    dosisInicialDiuretico: '80 mg IV DU bolo',
    seguimientoHospitalizacion: '',
    seguimientoConsulta: '',
    fenotipo: 'HFpEF',
    etiologia: 'Hipertensiva',
    residente: 'Dra. Ana Laura Méndez Soto',
    overrides: {
      diuresisAcumuladaMl: 17245,
      furosemidaAcumuladaMg: 800,
    },
    pocusByDay: [
      {
        date: d(6),
        vciCm: 2.8,
        vexus: 2,
        congestionScore: 3,
        lungPattern: 'B',
        stevenson: 'Caliente-húmedo',
        note: 'VCI: 2.8 no colapsa >50%, Patrón B pulmonar en ambos hemitórax 3-4 líneas B por campo, VExUS 2, congestion 3 (derrame pleural + edema MI). Sin defectos segmentarios, FEVI preservada.',
        checklist: {
          pvy: true,
          rhy: true,
          soplo: false,
          estertores: true,
          edemaMi: true,
          llenadoCapilar: 'Muy retardado >4s',
          ascitisHepatomegalia: false,
        },
        vciCollapse: '<50%',
        lungLinesB: 'difusas',
      },
      {
        date: d(5),
        vciCm: 1.96,
        vexus: 0,
        congestionScore: 3,
        lungPattern: 'B',
        stevenson: 'Caliente-húmedo',
        note: 'VCI: 1.96 VExUS 0, congestion 3 por edema MI + derrame pleural derecho, Patrón B, 3-4 líneas B por campo',
        checklist: {
          pvy: true,
          rhy: false,
          soplo: false,
          estertores: true,
          edemaMi: true,
          llenadoCapilar: 'Retardado 2-4s',
          ascitisHepatomegalia: false,
        },
        vciCollapse: '≥50%',
        lungLinesB: 'moderadas',
      },
      {
        date: d(4),
        vciCm: 2.2,
        vexus: 1,
        congestionScore: 2,
        lungPattern: 'B',
        stevenson: 'Caliente-húmedo',
        note: 'VCI: 2.2 VExUS 1, congestion 2 derrame pleural derecho no puncionable, Patrón B, 2-3 líneas B por campo',
        checklist: {
          pvy: true,
          rhy: false,
          soplo: false,
          estertores: true,
          edemaMi: true,
          llenadoCapilar: 'Normal <2s',
          ascitisHepatomegalia: false,
        },
        vciCollapse: '≥50%',
        lungLinesB: 'moderadas',
      },
      {
        date: d(3),
        vciCm: 1.8,
        vexus: 0,
        congestionScore: 1,
        lungPattern: 'A',
        stevenson: 'Caliente-seco',
        note: 'VCI: 1.8 colapsa >50%, VExUS 0, congestion 1, Patrón A predominante, sin derrame pleural relevante',
        checklist: {
          pvy: false,
          rhy: false,
          soplo: false,
          estertores: false,
          edemaMi: true,
          llenadoCapilar: 'Normal <2s',
          ascitisHepatomegalia: false,
        },
        vciCollapse: '≥50%',
        lungLinesB: 'escasas',
      },
      {
        date: d(2),
        vciCm: 1.7,
        vexus: 0,
        congestionScore: 1,
        lungPattern: 'A',
        stevenson: 'Caliente-seco',
        note: 'VCI: 1.7 colapsa >50%, VExUS 0, congestion 1 (edema MI leve residual), sin líneas B relevantes',
        checklist: {
          pvy: false,
          rhy: false,
          soplo: false,
          estertores: false,
          edemaMi: true,
          llenadoCapilar: 'Normal <2s',
          ascitisHepatomegalia: false,
        },
        vciCollapse: '≥50%',
        lungLinesB: 'ninguna',
      },
      {
        date: d(1),
        vciCm: 1.6,
        vexus: 0,
        congestionScore: 0,
        lungPattern: 'A',
        stevenson: 'Caliente-seco',
        note: 'VCI: 1.6 colapsa >50%, VExUS 0, congestion 0. Euvolémica.',
        checklist: {
          pvy: false,
          rhy: false,
          soplo: false,
          estertores: false,
          edemaMi: false,
          llenadoCapilar: 'Normal <2s',
          ascitisHepatomegalia: false,
        },
        vciCollapse: '≥50%',
        lungLinesB: 'ninguna',
      },
      {
        date: d(0),
        vciCm: 1.6,
        vexus: 0,
        congestionScore: 0,
        lungPattern: 'A',
        stevenson: 'Caliente-seco',
        note: 'Euvolémica, tolera diurético VO de mantenimiento. Candidata a alta con seguimiento en Clínica de IC en 7 días.',
        checklist: {
          pvy: false,
          rhy: false,
          soplo: false,
          estertores: false,
          edemaMi: false,
          llenadoCapilar: 'Normal <2s',
          ascitisHepatomegalia: false,
        },
        vciCollapse: '≥50%',
        lungLinesB: 'ninguna',
      },
    ],
    fantasticos: [
      { className: 'IECA/ARA/ARNI', drug: 'Neparvis', inicio: d(6), dosis: '', tolerancia: 'Buena' },
      { className: 'SGLT2i', drug: 'Dapagliflozina', inicio: d(6), dosis: '10 mg c/24h', tolerancia: 'Buena' },
      { className: 'Betabloqueador', drug: 'Bisoprolol', inicio: d(6), dosis: '2.5 mg c/24h', tolerancia: 'Buena' },
      { className: 'MRA', drug: 'Finerrenona', inicio: d(6), dosis: '20 mg c/24h', tolerancia: 'Buena' },
    ],
    diureticSegments: [
      {
        id: 'd1',
        tipo: 'Furosemida',
        inicio: d(6),
        dosis: '80 mg IV DU bolo',
        indicacion: 'Descongestión aguda',
        endedAt: d(6),
        mgTotal: 80,
      },
      {
        id: 'd2',
        tipo: 'Furosemida',
        inicio: d(5),
        dosis: '80 mg IV cada 12 horas',
        indicacion: 'Descongestión',
        endedAt: d(3),
        mgTotal: 480,
      },
      {
        id: 'd3',
        tipo: 'Furosemida',
        inicio: d(2),
        dosis: '40 mg IV cada 12 horas',
        indicacion: 'Titulación a la baja',
        endedAt: d(2),
        mgTotal: 80,
      },
      {
        id: 'd4',
        tipo: 'Furosemida',
        inicio: d(1),
        dosis: '40 mg VO cada 12 horas',
        indicacion: 'Mantenimiento VO',
        endedAt: null,
        mgTotal: 160,
      },
    ],
    medSegments: [
      {
        id: 'm2',
        tipo: 'Enoxaparina',
        inicio: d(6),
        dosis: '100 mg cada 12h',
        indicacion: 'Anticoagulación',
        endedAt: null,
        mgTotal: null,
      },
      {
        id: 'm3',
        tipo: 'Prednisona',
        inicio: d(6),
        dosis: '40 mg cada 24h',
        indicacion: 'Exacerbación EPOC',
        endedAt: null,
        mgTotal: null,
      },
      {
        id: 'm5',
        tipo: 'Polietilenglicol',
        inicio: d(5),
        dosis: '17 g cada 24 horas',
        indicacion: 'Estreñimiento',
        endedAt: null,
        mgTotal: null,
      },
    ],
    medCatalog: [],
  };
}

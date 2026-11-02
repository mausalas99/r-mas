/** Synthetic DEMO records for exports.test.mjs. No real patient data. */
import { emptyEstadoClinico } from '../../public/js/features/estado-actual-data.mjs';
import { emptyVpoState } from '../../public/js/vpo-data.mjs';

const patient = {
  nombre: 'DEMO GOLDEN EXPORT',
  registro: '7000991-2',
  edad: '71',
  sexo: 'M',
  area: 'HOSPITALIZACION',
  servicio: 'MEDICINA INTERNA',
  cuarto: '514',
  cama: '03',
};
const hostilePatient = { ...patient, nombre: 'DEMO MUÑOZ O\'BRIEN & <HIJOS> "ÁÉÍÓÚ"', registro: '7000992-3', cuarto: '1&2' };

const HOSTILE = 'Ñandú & cía <b>"cita"</b> \'apóstrofo\' $1 $& $\' $` 100% café — 5 µg ≥ 3 ≤ 8 → ok 😀 日本 \u0001ctl\u0007bell￾';
const lines = (n, f) => Array.from({ length: n }, (_, i) => f(i + 1)).join('\n');
const para = (n) => Array.from({ length: n }, (_, i) => `HALLAZGO ${i + 1} CON PRESION ${100 + (i % 60)}/${60 + (i % 30)} Y CREATININA ${(0.5 + (i % 40) / 10).toFixed(1)}.`).join(' ');

// ── Nota de evolución ──────────────────────────────────────────────────────
export const noteBusy = {
  patient,
  note: {
    fecha: '2026-09-21',
    hora: '08:30',
    interrogatorio:
      'MASCULINO DE 71 AÑOS CON DM2, HAS Y ERC G4 EN HEMODIALISIS, HOSPITALIZADO POR SEPSIS DE ORIGEN URINARIO. EVOLUCIONA CON MEJORIA, AFEBRIL DESDE HACE 48 H, CON DIURESIS CONSERVADA.',
    evolucion: [
      'N: ALERTA, ORIENTADO || SIN FOCALIZACION',
      'V: FR 18 RPM, SATO2 96% AL AIRE AMBIENTE',
      'HD: TA 132/78 MMHG, FC 74 LPM',
      'HI: AFEBRIL || MEROPENEM 1 G IV CADA 8 HORAS (DIA 5)',
      'NM: DIETA RENAL || GLUCOMETRIAS 150, 172, 138 MG/DL',
    ].join('\n'),
    estudios: ['21.09.26', 'Hb 10.4 Hto 31.2 Leu 11.8 Plt 188', 'Glu 150 Cr 3.2 BUN 48', 'Na 136 K 4.9 Cl 100', '20.09.26', 'Hb 10.1 Hto 30.8 Leu 14.2 Plt 175', 'Glu 171 Cr 3.4 BUN 52', 'Na 134 K 5.1 Cl 98'].join('\n'),
    diagnosticos: ['SEPSIS DE ORIGEN URINARIO', 'ERC G4 EN HEMODIALISIS', 'DIABETES MELLITUS TIPO 2', 'HIPERTENSION ARTERIAL SISTEMICA'],
    tratamiento: Array.from({ length: 10 }, (_, i) => `FARMACO${i + 1} ${10 * (i + 1)} MG VO CADA ${6 + i} H`),
    ta: '132/78',
    fr: '18',
    fc: '74',
    temp: '36.4',
    peso: '82',
    medico: 'DRA. DEMO RESIDENTE',
    profesor: 'DR. DEMO PROFESOR',
  },
};
export const noteHostile = {
  patient: hostilePatient,
  note: { ...noteBusy.note, interrogatorio: HOSTILE, evolucion: `N: ${HOSTILE}\nV: ${HOSTILE}`, estudios: HOSTILE, diagnosticos: [HOSTILE, 'DX2'], tratamiento: [HOSTILE, 'TX2 $& 5 MG'], medico: HOSTILE, profesor: 'DR. ÑU' },
};
export const noteLong = {
  patient,
  note: {
    ...noteBusy.note,
    interrogatorio: para(180),
    evolucion: lines(5, (i) => `N${i}: ${para(25)}`),
    estudios: lines(40, (i) => `D${i}.09.26 Hb ${9 + (i % 5)}.${i % 10} Leu ${i}.${i % 7} Plt ${150 + i}`),
    diagnosticos: Array.from({ length: 30 }, (_, i) => `DIAGNOSTICO NUMERO ${i + 1} DEMO`),
    tratamiento: Array.from({ length: 40 }, (_, i) => `MEDICAMENTO${i + 1} ${i + 1} MG VO`),
  },
};

// ── Indicaciones ───────────────────────────────────────────────────────────
export const indicacionesBusy = {
  patient,
  indicaciones: {
    fecha: '2026-09-21',
    hora: '09:00',
    medicos: 'DRA. DEMO RESIDENTE',
    dieta: 'DIETA RENAL 1800 KCAL',
    cuidados: lines(6, (i) => `CUIDADO ${i}: VIGILAR SIGNOS A LAS ${6 + i}:00`),
    estudios: 'BH, QS, ES, PFH MAÑANA',
    medicamentos: lines(12, (i) => `MEDICAMENTO${i} ${i * 5} MG IV CADA ${4 + i} H`),
    interconsultas: 'NEFROLOGIA POR AJUSTE DE HEMODIALISIS',
    otros: [
      { titulo: 'Vigilancia', contenido: 'REPORTAR TA MAYOR A 160/100' },
      { titulo: 'Soluciones', contenido: 'SOLUCION SALINA 0.9% 500 ML PARA 8 H' },
    ],
  },
};
export const indicacionesHostile = {
  patient: hostilePatient,
  indicaciones: { ...indicacionesBusy.indicaciones, dieta: HOSTILE, cuidados: HOSTILE, estudios: HOSTILE, medicamentos: `${HOSTILE}\nX $& Y`, interconsultas: HOSTILE, medicos: HOSTILE, otros: [{ titulo: HOSTILE, contenido: HOSTILE }] },
};
export const indicacionesLong = {
  patient,
  indicaciones: {
    ...indicacionesBusy.indicaciones,
    cuidados: lines(60, (i) => `CUIDADO ${i} ${para(2)}`),
    medicamentos: lines(80, (i) => `MEDICAMENTO${i} ${i} MG IV CADA ${(i % 12) + 1} H`),
    otros: Array.from({ length: 15 }, (_, i) => ({ titulo: `Titulo${i + 1}`, contenido: para(6) })),
  },
};

// ── Listado de problemas ───────────────────────────────────────────────────
const medicos = { profesor: 'DR. DEMO PROFESOR', r4: 'R4 DEMO', r2: 'R2 DEMO', r1a: 'R1 DEMO A', r1b: 'R1 DEMO B' };
export const listadoBusy = {
  patient,
  medicos,
  listado: {
    fecha: '2026-09-21',
    activos: [
      { fecha: '2026-09-18', descripcion: 'A) SEPSIS DE ORIGEN URINARIO\nB) EN MANEJO CON MEROPENEM\nC) PENDIENTE UROCULTIVO' },
      { fecha: '2026-09-18', descripcion: 'A) ERC G4 EN HEMODIALISIS\nB) ULTIMA SESION 20/09' },
      { fecha: '2026-09-19', descripcion: 'DESCONTROL GLUCEMICO' },
    ],
    inactivos: [{ fecha: '2026-09-10', descripcion: 'NEUMONIA RESUELTA' }],
  },
};
export const listadoHostile = {
  patient: hostilePatient,
  medicos: { ...medicos, profesor: HOSTILE },
  listado: { fecha: '2026-09-21', activos: [{ fecha: '2026-09-18', descripcion: `A) ${HOSTILE}\nB) ${HOSTILE}` }, { fecha: '', descripcion: HOSTILE }], inactivos: [{ fecha: '2026-09-10', descripcion: HOSTILE }] },
};
export const listadoLong = {
  patient,
  medicos,
  listado: {
    fecha: '2026-09-21',
    activos: Array.from({ length: 50 }, (_, i) => ({ fecha: '2026-09-18', descripcion: `A) PROBLEMA${i + 1} ${para(4)}\nB) PLAN${i + 1}` })),
    inactivos: Array.from({ length: 20 }, (_, i) => ({ fecha: '2026-09-01', descripcion: `RESUELTO${i + 1} ${para(2)}` })),
  },
};

// ── Censo PDF ──────────────────────────────────────────────────────────────
const censoRow = (i, name = `DEMO PACIENTE${i}`) => ({
  num: String(i),
  cama: `51${i % 10}-${(i % 4) + 1}`,
  pacienteNombre: name,
  pacienteMeta: `${40 + (i % 40)} AÑOS | 700${String(1000 + i)}-${i % 9}`,
  dx: `SEPSIS URINARIA${i}\nERC G4 HD`,
  atb: `MEROPENEM D${(i % 7) + 1}`,
  meds: `LOSARTAN\nENOXAPARINA`,
  labs: `Hb ${9 + (i % 5)}.${i % 10} Leu ${10 + i} Plt ${200 + i}\nCr ${(1 + i / 10).toFixed(1)} BUN ${30 + i}`,
  signosCol: `TA ${110 + i}/${60 + i} FC ${60 + i}`,
  ioCol: `I ${1000 + i} E ${900 + i}`,
  accesos: 'CVC 12/09',
  cultivos: `UROCULTIVO ${i}`,
  pendientes: `TAC ABDOMEN ${i}`,
});
export const censoBusy = {
  servicio: 'MEDICINA INTERNA',
  header: { servicio: 'MEDICINA INTERNA', mes: 'SEPTIEMBRE 2026', fecha: '21/09/2026', equipoLine: 'EQUIPO DEMO' },
  rows: Array.from({ length: 8 }, (_, i) => censoRow(i + 1)),
};
export const censoHostile = {
  servicio: 'MEDICINA INTERNA',
  header: { servicio: 'MEDICINA INTERNA', mes: 'SEPTIEMBRE 2026', fecha: '21/09/2026', equipoLine: HOSTILE },
  rows: [{ ...censoRow(1, 'DEMO MUÑOZ'), dx: HOSTILE, meds: HOSTILE, labs: HOSTILE, pendientes: `${'LARGO '.repeat(400)}`, cultivos: HOSTILE }, { num: '2', cama: '', pacienteNombre: '' }],
};
export const censoMany = {
  servicio: 'MEDICINA INTERNA',
  header: { servicio: 'MEDICINA INTERNA', mes: 'SEPTIEMBRE 2026', fecha: '21/09/2026', equipoLine: 'EQUIPO DEMO' },
  rows: Array.from({ length: 60 }, (_, i) => censoRow(i + 1, `DEMO PX${String(i + 1).padStart(3, '0')}`)),
};

// ── Estado actual ──────────────────────────────────────────────────────────
export const eaBusy = {
  ec: {
    ...emptyEstadoClinico(),
    four: '16',
    esferas: '3',
    analgesia: 'PARACETAMOL 1 G IV CADA 8 H',
    antiemeticos: 'ONDANSETRON 8 MG IV CADA 8 H',
    abx: 'MEROPENEM 1 G IV CADA 8 H (DIA 5)',
    antihta: 'AMLODIPINO 10 MG VO CADA 24 H',
    antitromboticos: 'ENOXAPARINA 40 MG SC CADA 24 H',
    diureticos: 'FUROSEMIDA 40 MG IV CADA 12 H',
    estatinas: 'ATORVASTATINA 40 MG VO CADA 24 H',
    dieta: 'RENAL',
    kcal: '1800',
    proteinG: '60',
  },
  snapshot: {
    vitals: { fr: '18', sat: '96', tas: '132', tad: '78', fc: '74', temp: '36.4' },
    glucometrias: [{ value: '150' }, { value: '172' }, { value: '138' }],
    bombaInsulina: [],
    io: { ing: '1100', egr: '900', egrParts: [], evac: '1' },
    alteredAt: {},
  },
  balances: { balanceTurno: 200 },
};
export const eaHostile = {
  ...eaBusy,
  ec: {
    ...eaBusy.ec,
    analgesia: Array.from({ length: 40 }, (_, i) => `ANALGESICO${i + 1} ${i + 1} MG VO`).join(', '),
    abx: HOSTILE,
    antihta: HOSTILE,
    dieta: HOSTILE,
  },
};

// ── VPO ────────────────────────────────────────────────────────────────────
export const vpoBusy = {
  ...emptyVpoState(),
  fcLpm: '78',
  ekgText: 'RITMO SINUSAL, FC ___ LPM, EJE NORMAL, SIN ALTERACIONES AGUDAS DEL ST.',
  rxText: 'SIN INFILTRADOS NI DERRAME. SILUETA CARDIACA DE TAMAÑO NORMAL.',
  diagnosticosText: '1. HERNIA INGUINAL DERECHA\n2. HIPERTENSION ARTERIAL SISTEMICA\n3. DIABETES MELLITUS TIPO 2',
  scaleResults: { ...emptyVpoState().scaleResults, mets: '>4 METs', abvd: 'Independiente', rcri: '1 punto, clase II, 6%', asa: 'III', ariscat: '26 puntos, riesgo intermedio', caprini: '5 puntos, riesgo alto', stopbang: '3 puntos' },
};
export const vpoHostile = {
  ...vpoBusy,
  ekgText: HOSTILE,
  rxText: HOSTILE,
  diagnosticosText: HOSTILE,
  valoracionIntro: HOSTILE,
  scaleResults: { ...vpoBusy.scaleResults, mets: HOSTILE, rcri: 'ñ $& 100%' },
};

// ── Censo: patient records → buildCensusPayload → PDF ──────────────────────
export const censoPatients = [
  {
    id: 'p1',
    nombre: 'MUÑOZ LOPEZ JOSE DEMO',
    registro: '7001011-1',
    edad: '71',
    cuarto: '514',
    cama: '3',
    servicio: 'MEDICINA INTERNA',
    diagnosticosList: ['SEPSIS URINARIA', 'ERC G4 EN HEMODIALISIS', 'DM2'],
    accesosList: [{ via: 'cvc', fecha: '2026-09-12' }],
    censoMedsText: 'ENOXAPARINA\nLOSARTAN',
    censoAtbText: 'MEROPENEM Día 5',
  },
  {
    id: 'p2',
    nombre: 'GARCIA PEREZ ANA DEMO',
    registro: '7001012-2',
    edad: '58',
    cuarto: '515',
    cama: '1',
    servicio: 'MEDICINA INTERNA',
    diagnosticosList: ['NEUMONIA ADQUIRIDA EN COMUNIDAD'],
    accesosList: [],
  },
];
export const censoPipelineCtx = {
  settings: { defaultServicio: 'MEDICINA INTERNA' },
  labHistoryByPatient: {},
  medRecetaByPatient: {
    p2: {
      fechaActualizacion: '2026-09-21',
      items: [
        { nombreRaw: 'CEFTRIAXONA 1 G', dosisRaw: '1 g', frecuenciaRaw: 'c/24h', viaRaw: 'IV', diaTratamiento: 3 },
        { nombreRaw: 'PIPERACILINA/TAZOBACTAM 4.5 G', dosisRaw: '4.5 g', frecuenciaRaw: 'c/8h', viaRaw: 'IV', diaTratamiento: 12 },
        { nombreRaw: 'METFORMINA 850 MG', dosisRaw: '850 mg', frecuenciaRaw: 'c/12h', viaRaw: 'VO' },
      ],
    },
  },
  todosByPatient: { p1: [{ text: 'TAC ABDOMEN CONTRASTADA', completed: false }, { text: 'YA HECHO', completed: true }], p2: [] },
  now: new Date('2026-09-21T10:00:00'),
};

/** One census cell far longer than its column: used to prove clipped text is always marked with «…». */
export const censoClip = {
  servicio: 'MEDICINA INTERNA',
  header: { servicio: 'MEDICINA INTERNA', mes: 'SEPTIEMBRE 2026', fecha: '21/09/2026', equipoLine: 'EQUIPO DEMO' },
  rows: [{ ...censoRow(1), meds: 'INSULINA GLARGINA 14 UI\nTRIMETOPRIM SULFAMETOXAZOL', atb: 'PIPERACILINA TAZOBACTAM Día 12', accesos: 'CVC YUGULAR DERECHO 12/09/2026', cama: '514-3' }],
};

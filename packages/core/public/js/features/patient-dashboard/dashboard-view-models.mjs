/** Synthetic dashboard models shared by the view test and its old-HTML snapshot. No real patients. */
const chip = (label, value, extra) => Object.assign({ label, value, prev: '', trend: '' }, extra);
const series = (vals) => vals.map((v, i) => ({ value: v, recordedAt: new Date(Date.UTC(2026, 0, 5, 6 + i * 3)).toISOString() }));

export const FULL = {
  identity: { nombre: 'Paciente <Prueba> & "Co"', diagnosticos: ['Neumonía', "Sepsis 'x'"], interconsultServiceIds: ['no-such', 'cardiologia'] },
  vitalsAt: '2026-01-05T08:30:00',
  vitals: {
    vitals: { tas: 118, tad: 70, fc: 112, fr: 18, temp: 38.4, sat: 91 },
    glucometrias: [{ value: 110, time: '06:00' }, { value: 310, time: '12:00' }, 95, { value: 'x', time: '18:00' }],
    io: { ing: 1200, egr: 900 },
    vitalSeries: { tas: series([100, 130, 120]), fc: series([90, 90]), fr: series([16, 20]), temp: series([37, 38.4]), sat: series([95, 91]) },
  },
  accesos: [{ label: 'CVC', dia: 3 }, { label: 'Sonda', dia: 0 }],
  ea: {
    kpis: [{ label: 'Soporte', value: 'VMI' }, { label: 'Bomba', value: '' }, { label: 'Dieta', value: 'Ayuno' }],
    soap: [
      { letter: 'S', subtitle: 'Sub', items: [{ name: 'Med <A>', token: 'IV c/8h', emphasis: true }, 'Solo texto', { name: 'Sin token', token: '' }, null] },
      { letter: 'A', subtitle: '', items: [{ name: 'Ceftriaxona', token: 'D3', emphasis: false }] },
      { letter: 'P', subtitle: 'Plan', items: [] },
    ],
  },
  labs: {
    envios: [
      { id: 'e1', hora: '06:00', wide: false, groups: [{ tipo: 'bh', chips: [chip('Na', '130*', { prev: '135', trend: 'down', delta: '-5' }), chip('K', '5.9', { prev: '5.1', trend: 'up', delta: '+0.8' })] }] },
      { id: 'e2', hora: '14:00', wide: true, groups: [{ tipo: 'bh', chips: [chip('Na', '128', { prev: '130', trend: 'down', delta: '-2' }), chip('Hb', '7.1', { prev: '7.1', trend: 'flat' }), chip('Cr', '2.2')] }, { tipo: 'x', chips: [] }] },
      { id: 'e3', hora: '', wide: false, groups: [{ chips: [chip('Glu', '300', { prev: '280', trend: 'up' })] }] },
    ],
    enRangoCount: 12, prevFecha: '04/01/2026', lastFecha: '04/01/2026',
    cultivos: [
      { sitio: 'Hemo', sitioFull: 'Hemocultivo', fecha: '03/01/2026', organismo: 'E. coli', preliminar: true, atbPendiente: true },
      { sitio: 'Orina', fecha: '02/01', organismo: 'Kleb', atb: [{ k: 'R', drugs: 'Amp, Cef' }, { k: 'S', drugs: 'Mero' }] },
    ],
    cultivosTotal: 4, cultivosSinRevisar: 2,
  },
  pendientes: [{ text: 'Vencida <1>', dueDate: '2000-01-01' }, { text: 'Futura', dueDate: '2999-01-01' }, { text: 'Con hora', time: '09:00' }, 'texto', { text: 'Sin nada' }],
  pendientesTotal: 8,
};

export const SINGLE_ENVIO = { ...FULL, labs: { envios: [FULL.labs.envios[0]], enRangoCount: 0, cultivos: [], cultivosSinRevisar: 0 }, pendientes: [], ea: { kpis: [], soap: [] }, accesos: [] };
export const PENDING_LABS = { ...FULL, labs: { pending: true, cultivos: FULL.labs.cultivos } };
export const EMPTY_LABS = { ...FULL, labs: { envios: [], enRangoCount: 0, lastFecha: '01/01/2026' }, vitals: { vitals: {}, glucometrias: [], io: {} }, vitalsAt: '' };
export const EN_RANGO_ONLY = { ...FULL, labs: { envios: [], enRangoCount: 5 } };
export const BARE = {};

export const MODELS = { FULL, SINGLE_ENVIO, PENDING_LABS, EMPTY_LABS, EN_RANGO_ONLY, BARE };

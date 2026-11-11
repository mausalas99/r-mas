/**
 * Synthetic VPO states (no real patients) shared by the old-vs-new HTML test and the capture that
 * made vpo-panel-view.old.json. `calc` is the «calculadora VPO» setting, `note` the «Faltan datos» line.
 */
import { emptyVpoState, ensureVpoState } from '../vpo-data.mjs';

const make = (extra) => {
  const map = {};
  const s = ensureVpoState(map, 'p1');
  Object.assign(s, extra);
  if (extra && extra.scaleResults) s.scaleResults = Object.assign({}, emptyVpoState().scaleResults, extra.scaleResults);
  return ensureVpoState(map, 'p1');
};

export const SCENARIOS = {
  empty: { calc: false, note: '', state: () => make({}) },
  filled: {
    calc: false,
    note: '',
    state: () => make({
      fcLpm: '88',
      ekgText: 'RITMO SINUSAL <FC 88> & "sin cambios"',
      rxText: 'SIN INFILTRADOS\nCARDIOMEGALIA GRADO I',
      valoracionIntro: 'VALORACIÓN <PRE> "OP"',
      diagnosticosList: ['DIABETES MELLITUS 2', 'HIPERTENSIÓN <ARTERIAL>', ''],
      farmacos: [
        { nombreDisplay: 'Metformina 850 mg', notaEditable: 'Suspender 24 h antes' },
        { nombreDisplay: 'Enoxaparina "40" & mg', notaEditable: '' },
        { nombreDisplay: 'Losartán 50 mg' },
      ],
      scaleResults: { mets: '<4 METs', cfs: 'CFS 4 "vulnerable"', rcri: 'RCRI 1 punto', ariscat: 'ARISCAT 26', stopbang: 'STOP-Bang 3', meld: 'MELD 9' },
    }),
  },
  calcOnMissing: {
    calc: true,
    note: '',
    state: () => make({ edad: '67', spo2: '94', diagnosticosList: ['EPOC', 'IAM PREVIO', 'ERC'] }),
  },
  calcOnNote: {
    calc: true,
    note: 'Faltan datos: RCRI (cirugía, creatinina); Gupta MICA (ASA).',
    state: () => make({
      edad: '72', creatinina: '1.4', hemoglobina: '11.2', spo2: '92', asaKey: 'asa-iii', procedureId: 'gupta-foregut-hpb',
      duracionCirugiaHoras: '3', scaleResults: { mets: '≥4 METs', gupta: 'Gupta 0.8 %' },
      farmacos: [{ nombreDisplay: 'Insulina glargina', notaEditable: 'Reducir 20 %' }],
    }),
  },
  calcOffManyDx: {
    calc: false,
    note: '',
    state: () => make({ diagnosticosList: ['A', 'B', 'C', 'D', 'E', ''], farmacos: [] }),
  },
};

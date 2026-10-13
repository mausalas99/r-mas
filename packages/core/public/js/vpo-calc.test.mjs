import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyVpoState } from './vpo-data.mjs';
import { autofillCalc, buildScaleLines } from './vpo-calc.mjs';

function sample() {
  const s = emptyVpoState();
  Object.assign(s, { edad: '64', spo2: '97', hemoglobina: '13.1', creatinina: '0.9', duracionCirugiaHoras: '2.5', asaKey: 'asa-ii', procedureId: 'gupta-foregut-hpb' });
  s.diagnosticosList = ['COLELITIASIS', 'DM2 INSULINO REQUIRIENTE', 'EPOC', 'TABAQUISMO', 'CARDIOPATIA ISQUEMICA CON STENT'];
  return s;
}

test('autofill reads diagnoses and keeps what the user touched', () => {
  const s = sample();
  s.calc = { touched: { smoker: true }, smoker: false };
  const filled = autofillCalc(s, {});
  assert.deepEqual([s.calc.copd, s.calc.insulin, s.calc.ischemic, s.calc.modStent, s.calc.smoker], [true, true, true, true, false]);
  assert.ok(filled.includes('copd') && !filled.includes('smoker'));
});

test('autofill takes creatinine and hemoglobin from the latest labs only when empty', () => {
  const s = sample();
  s.creatinina = '';
  const labs = [{ fecha: '2026-10-10', parsedBySection: { QS: { Cr: 1.8, Hb: 9.2 } } }];
  autofillCalc(s, { labHistory: labs });
  assert.equal(s.creatinina, '1.8');
  assert.equal(s.hemoglobina, '13.1');
});

test('lines list what is missing', () => {
  const s = emptyVpoState();
  const l = buildScaleLines(s);
  assert.deepEqual(l.rcri.missing, ['cirugía']);
  assert.deepEqual(l.gupta.missing, ['cirugía', 'ASA', 'edad']);
  assert.equal(l.ahaMod.text, 'NINGUNO');
});

test('lines for a full patient', () => {
  const s = sample();
  autofillCalc(s, {});
  s.calc.mets = 'ge4';
  s.calc.cfs = '2';
  const l = buildScaleLines(s);
  assert.equal(l.mets.text, '≥4 METS');
  assert.equal(l.cfs.text, 'CFS 2. NO FRÁGIL.');
  assert.equal(l.asa.text, 'ASA II');
  assert.match(l.rcri.text, /^3 PUNTOS\. CLASE IV\./); // high-risk surgery + ischemic + insulin
  assert.match(l.gupta.text, /^\d+(\.\d)?% DE IAM/);
  assert.equal(l.ahaCv.text.startsWith('ELEVADO'), true);
  assert.equal(l.ahaMod.text, 'STENT CORONARIO O CABG PREVIO');
  assert.match(l.caprini.text, /^\d+ PUNTOS\. /);
});

test('optional scales: autofill and lines', () => {
  const s = sample();
  s.diagnosticosList = ['HTA', 'DM2', 'EVC PREVIO'];
  s.farmacos = [{ nombreDisplay: 'ASPIRINA 100 MG' }];
  autofillCalc(s, { patient: { sexo: 'F' } });
  assert.deepEqual([s.calc.htn, s.calc.dm, s.calc.cva, s.calc.antiplatelets, s.calc.sex], [true, true, true, true, 'F']);
  const l = buildScaleLines(s);
  // HTN 1 + DM 1 + stroke 2 + age 64 (0) + female 1 = 5
  assert.equal(l.chads.text, '5 PUNTOS. 7.2% DE EVC ISQUÉMICO AL AÑO SIN ANTICOAGULACIÓN.');
  // stroke 1 + age>65 no (64) + antiplatelets 1 = 2
  assert.equal(l.hasbled.text, '2 PUNTOS. RIESGO MODERADO. 4.1% DE SANGRADO MAYOR AL AÑO.');
  // HTN 1 + age>50 1 = 2 -> low
  assert.equal(l.stopbang.text, '2 PUNTOS. RIESGO BAJO DE SAOS.');
  assert.equal(l.padua.text, '0 PUNTOS. RIESGO BAJO DE TEV.');
});

test('optional scales ask for sex', () => {
  assert.deepEqual(buildScaleLines(sample()).stopbang.missing, ['sexo']);
});

test('liver scales: lab autofill and lines', () => {
  const s = sample();
  s.creatinina = '1.5';
  s.calc = { sex: 'M', ascites: '2', encephalopathy: '1', touched: {} };
  const labs = [{ fecha: '2026-10-10', parsedBySection: { QS: { BT: 2.5, Alb: 3, Na: 130 }, COAG: { INR: 1.3 } } }];
  autofillCalc(s, { labHistory: labs });
  assert.deepEqual([s.calc.bili, s.calc.alb, s.calc.na, s.calc.inr], ['2.5', '3', '130', '1.3']);
  const l = buildScaleLines(s);
  // bili 2.5 (2) + alb 3.0 (2) + INR 1.3 (1) + slight ascites (2) + none (1) = 8
  assert.equal(l.childpugh.text, '8 PUNTOS. CLASE B.');
  assert.match(l.meld.text, /^MELD 3\.0: \d+ \(SUPERVIVENCIA A 90 DÍAS [\d.]+%\)\. MELD-NA: \d+\. MELD: \d+\.$/);
});

test('liver scales name what is missing', () => {
  const l = buildScaleLines(sample());
  assert.deepEqual(l.childpugh.missing, ['bilirrubina', 'albúmina', 'INR', 'ascitis', 'encefalopatía']);
  assert.deepEqual(l.meld.missing, ['bilirrubina', 'INR', 'sodio', 'albúmina', 'sexo']);
});

test('NRS-2002 and AWOL lines', () => {
  const s = sample();
  s.edad = '82';
  s.calc = { nrsBmi: true, nrsNutrition: '1', nrsSeverity: '2', awolWorld: true, touched: {} };
  const l = buildScaleLines(s);
  assert.equal(l.nrs.text, '4 PUNTOS. EN RIESGO NUTRICIONAL, INICIAR PLAN DE NUTRICIÓN.');
  assert.equal(l.awol.text, '2 PUNTOS. TAMIZAJE POSITIVO DE DELIRIO (15% EN LA COHORTE DE DERIVACIÓN).');
  s.calc = { nrsNutrition: '3', nrsSeverity: '3', touched: {} };
  assert.equal(buildScaleLines(s).nrs.text, 'TAMIZAJE INICIAL NEGATIVO. REPETIR CADA SEMANA.');
  assert.deepEqual(buildScaleLines(emptyVpoState()).nrs.missing, ['estado nutricional', 'gravedad', 'edad']);
});

test('ESC 2022 surgical risk line', () => {
  const s = sample();
  s.calc = { escProcedure: 'esophagectomy', touched: {} };
  assert.equal(buildScaleLines(s).escSurg.text, 'ALTO. >5% DE MUERTE CV, IAM O EVC A 30 DÍAS POR LA CIRUGÍA (ESOFAGECTOMÍA).');
  assert.deepEqual(buildScaleLines(emptyVpoState()).escSurg.missing, ['procedimiento ESC']);
});

test('bridging: warfarin tier line and autofill from drugs and diagnoses', () => {
  const s = sample();
  s.diagnosticosList = ['FIBRILACION AURICULAR', 'HTA', 'DM2', 'ICC'];
  s.farmacos = [{ nombreDisplay: 'WARFARINA 5 MG' }];
  autofillCalc(s, { patient: { sexo: 'M' } });
  assert.deepEqual([s.calc.anticoag, s.calc.af], ['vka', true]);
  // HF 1 + HTN 1 + DM 1 + age 64 (0) = 3 -> low; no valve, no other factor
  assert.equal(buildScaleLines(s).bridging.text, 'BRIDGING: TIER BAJO. SIN PUENTE. SIN FACTORES DE RIESGO MAYORES.');
  s.calc.valveType = 'mitral'; // AF counts as a stroke risk factor -> high
  assert.equal(buildScaleLines(s).bridging.text, 'BRIDGING: TIER ALTO. PUENTE CON HBPM. PRÓTESIS MITRAL CON FACTORES DE RIESGO DE EVC, PRÓTESIS MITRAL.');
  s.calc.antiplatelets = true; // bleeding risk up -> judgment
  assert.match(buildScaleLines(s).bridging.text, /^BRIDGING: TIER ALTO\. PUENTE A CRITERIO CLÍNICO\..*RIESGO DE SANGRADO ELEVADO\.$/);
});

test('bridging: asks for what is missing', () => {
  const s = sample();
  assert.deepEqual(buildScaleLines(s).bridging.missing, ['anticoagulante']);
  s.calc = { touched: {}, anticoag: 'vka' };
  assert.deepEqual(buildScaleLines(s).bridging.missing, ['indicación (válvula, FA o TEV)']);
  s.calc = { touched: {}, anticoag: 'vka', af: true };
  assert.deepEqual(buildScaleLines(s).bridging.missing, ['sexo']);
  s.calc = { touched: {}, anticoag: 'dabigatran' };
  assert.deepEqual(buildScaleLines(s).bridging.missing, ['peso', 'sexo']);
});

test('bridging: DOAC lines', () => {
  const s = sample(); // age 64, creatinine 0.9
  s.calc = { touched: {}, sex: 'M', peso: '80', anticoag: 'apixaban' };
  assert.equal(buildScaleLines(s).bridging.text, 'APIXABÁN: ÚLTIMA DOSIS DÍA -2. REINICIAR DÍA +1. SIN PUENTE.');
  s.calc.bleedSurgHigh = true;
  assert.equal(buildScaleLines(s).bridging.text, 'APIXABÁN: ÚLTIMA DOSIS DÍA -3. REINICIAR DÍA +2 A +3. SIN PUENTE.');
  // CrCl = 76 x 80 / (72 x 0.9) = 93.8 -> dabigatran standard
  s.calc.anticoag = 'dabigatran';
  assert.match(buildScaleLines(s).bridging.text, /^DABIGATRÁN: ÚLTIMA DOSIS DÍA -3\./);
  // CrCl = 76 x 40 / (72 x 3) = 14.07 -> 14: slow clearance, high bleed risk -> day -5, below the PAUSE minimum
  s.edad = '64'; s.creatinina = '3'; s.calc.peso = '40';
  assert.equal(buildScaleLines(s).bridging.text, 'DABIGATRÁN: ÚLTIMA DOSIS DÍA -5. REINICIAR DÍA +2 A +3. SIN PUENTE. CrCl 14 ML/MIN: PAUSE EXCLUYÓ CrCl <30.');
  s.calc.anticoag = 'edoxaban'; s.calc.neuraxial = true;
  assert.match(buildScaleLines(s).bridging.text, /^EDOXABÁN: ÚLTIMA DOSIS DÍA -3\..*ANESTESIA NEURAXIAL.*NO ESTUDIADO EN PAUSE/);
});

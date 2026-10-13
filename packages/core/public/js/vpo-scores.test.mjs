import test from 'node:test';
import assert from 'node:assert/strict';
import { awol, nrs2002, childPugh, meld, stopBang, hasBled, cha2ds2Vasc, padua, ariscat, rcri, ahaCvRisk, guptaMica, guptaPneumonia, guptaRespiratoryFailure, capriniCategory, aubHas2 } from './vpo-scores.mjs';

// Hand-computed from the published coefficients: x = -4.1658 (pneumonia), -4.1290 (resp failure).
const base = { asa: 2, functional: 'independent', sepsis: 'none', procedureId: 'gupta-foregut-hpb' };

test('Gupta pneumonia', () => {
  assert.equal(guptaPneumonia({ ...base, age: 64, copd: false, smoker: false }), 1.5);
  assert.equal(guptaPneumonia({ ...base, age: 64, copd: false, smoker: false, procedureId: 'x' }), null);
});

test('Gupta respiratory failure', () => {
  assert.equal(guptaRespiratoryFailure({ ...base, emergency: false }), 1.6);
});

test('Caprini bands', () => {
  assert.deepEqual([0, 2, 4, 6, 8, 9].map(capriniCategory), [
    'Riesgo mínimo', 'Riesgo bajo', 'Riesgo moderado', 'Riesgo alto', 'Riesgo alto', 'Riesgo más alto',
  ]);
});

test('AUB-HAS2', () => {
  assert.deepEqual(aubHas2({ age: 60, hb: 13, heartDisease: false, anginaOrDyspnea: false, vascularSurgery: false, emergency: true }), { points: 1, riskPct: 1.6 });
  assert.equal(aubHas2({ age: 80, hb: 10, heartDisease: true, anginaOrDyspnea: true, vascularSurgery: true, emergency: true }).riskPct, 17.5);
});

test('Gupta MICA', () => {
  // x = -5.87 -> 0.28%
  assert.equal(guptaMica({ age: 64, asa: 2, functional: 'independent', creatinine: 0.9, procedureId: 'gupta-foregut-hpb' }), 0.3);
  assert.equal(guptaMica({ age: 64, asa: 2, functional: 'independent', creatinine: 0.9, procedureId: 'x' }), null);
});

test('AHA/ACC cardiovascular risk cutoffs', () => {
  assert.equal(ahaCvRisk({ rcriPoints: 1, micaPct: 0.4, aubPoints: 1 }), 'Bajo');
  assert.equal(ahaCvRisk({ rcriPoints: 2, micaPct: 0.4, aubPoints: 1 }), 'Elevado');
  assert.equal(ahaCvRisk({ rcriPoints: 1, micaPct: 1.2, aubPoints: 0 }), 'Elevado');
  assert.equal(ahaCvRisk({ rcriPoints: 0, micaPct: 0.4, aubPoints: 2 }), 'Elevado');
});

test('Gupta respiratory failure matches the paper examples', () => {
  const b = { sepsis: 'none', emergency: false };
  assert.equal(guptaRespiratoryFailure({ ...b, asa: 3, functional: 'independent', procedureId: 'gupta-thoracic' }), 4.5);
  assert.equal(guptaRespiratoryFailure({ ...b, asa: 3, functional: 'partially-dependent', procedureId: 'gupta-aortic' }), 13.3);
});

test('ARISCAT', () => {
  // 51-80 (3) + SpO2 91-95 (8) + upper abdominal (15) + 2-3 h (16) + anemia (11) + infection (17) = 70
  const r = ariscat({ age: 64, spo2: 94, respInfection: true, anemia: true, incision: 'upperAbdominal', hours: 2.5, emergency: false });
  assert.deepEqual(r, { points: 70, group: 'Alto', pct: 42.1 });
  assert.equal(ariscat({ age: 40, spo2: 98, respInfection: false, anemia: false, incision: 'peripheral', hours: 1, emergency: false }).group, 'Bajo');
});

test('RCRI', () => {
  assert.deepEqual(rcri({ highRiskSurgery: true, creatinine: 1 }), { points: 1, cls: 'II', pct: 1.1 });
  assert.equal(rcri({ highRiskSurgery: true, heartFailure: true, insulin: true, creatinine: 2.5 }).cls, 'IV');
});

test('STOP-Bang tiers and the upgrade rule', () => {
  const none = { snoring: false, tired: false, observed: false, pressure: false, bmi35: false, neck40: false, male: false };
  assert.deepEqual(stopBang({ ...none, age: 40 }), { points: 0, risk: 'Bajo' });
  assert.deepEqual(stopBang({ ...none, age: 60, pressure: true, tired: true }), { points: 3, risk: 'Intermedio' });
  // 2 STOP items + male + age>50 = 4, upgraded to high
  assert.equal(stopBang({ ...none, age: 60, snoring: true, tired: true, male: true }).risk, 'Alto');
  assert.equal(stopBang({ ...none, age: 60, snoring: true, tired: true, bmi35: true, neck40: true }).risk, 'Alto');
});

test('HAS-BLED', () => {
  const none = { htn: false, renal: false, liver: false, stroke: false, bleeding: false, labileInr: false, drugs: false, alcohol: false };
  assert.deepEqual(hasBled({ ...none, age: 60 }), { points: 0, risk: 'Bajo', pct: 0.9 });
  assert.deepEqual(hasBled({ ...none, age: 70, htn: true, drugs: true }), { points: 3, risk: 'Alto', pct: 5.8 });
  const all = hasBled({ htn: true, renal: true, liver: true, stroke: true, bleeding: true, labileInr: true, age: 70, drugs: true, alcohol: true });
  assert.deepEqual(all, { points: 9, risk: 'Muy alto', pct: null });
});

test('CHA2DS2-VASc', () => {
  const none = { hf: false, htn: false, dm: false, stroke: false, vascular: false, female: false };
  assert.deepEqual(cha2ds2Vasc({ ...none, age: 50 }), { points: 0, strokePct: 0.2 });
  // HTN 1 + DM 1 + age 65-74 1 + female 1 = 4
  assert.deepEqual(cha2ds2Vasc({ ...none, age: 70, htn: true, dm: true, female: true }), { points: 4, strokePct: 4.8 });
  assert.equal(cha2ds2Vasc({ hf: true, htn: true, dm: true, stroke: true, vascular: true, female: true, age: 80 }).points, 9);
});

test('Padua', () => {
  const none = { cancer: false, priorVte: false, immobile: false, thrombophilia: false, recentSurgery: false, failure: false, acuteMiStroke: false, infection: false, obesity: false, hormonal: false };
  assert.deepEqual(padua({ ...none, age: 60, infection: true }), { points: 1, high: false });
  // reduced mobility 3 + age>=70 1 = 4
  assert.deepEqual(padua({ ...none, age: 72, immobile: true }), { points: 4, high: true });
  assert.equal(padua({ ...none, age: 60, recentSurgery: true, failure: true }).points, 3);
});

test('Child-Pugh', () => {
  assert.deepEqual(childPugh({ bili: 1, alb: 4, inr: 1.1, ascites: 1, encephalopathy: 1 }), { points: 5, cls: 'A' });
  // bili 2.5 (2) + alb 3.0 (2) + INR 1.8 (2) + slight ascites (2) + none (1) = 9
  assert.deepEqual(childPugh({ bili: 2.5, alb: 3, inr: 1.8, ascites: 2, encephalopathy: 1 }), { points: 9, cls: 'B' });
  assert.equal(childPugh({ bili: 4, alb: 2.5, inr: 2.5, ascites: 3, encephalopathy: 3 }).cls, 'C');
});

test('MELD, MELD-Na and MELD 3.0 match hand calculations', () => {
  // Cr 1.5, bili 2, INR 1.3, Na 130, albumin 3.0, male: 15.87, 21.54, 21.19
  assert.deepEqual(meld({ cr: 1.5, bili: 2, inr: 1.3, na: 130, alb: 3, female: false, dialysis: false }), { meld: 16, meldNa: 22, meld3: 21, survival90: 93.7 });
  assert.equal(meld({ cr: 0.5, bili: 0.4, inr: 1, na: 140, alb: 4, female: false, dialysis: false }).meld, 6);
  assert.equal(meld({ cr: 0.5, bili: 1, inr: 1, na: 140, alb: 4, female: false, dialysis: true }).meld, 20); // Cr set to 4.0
});

test('NRS-2002', () => {
  assert.deepEqual(nrs2002({ prescreen: true, nutrition: 1, severity: 2, age: 70 }), { screened: true, points: 4, atRisk: true });
  assert.deepEqual(nrs2002({ prescreen: true, nutrition: 1, severity: 1, age: 50 }), { screened: true, points: 2, atRisk: false });
  assert.equal(nrs2002({ prescreen: false, nutrition: 3, severity: 3, age: 80 }).atRisk, false); // failed pre-screen: rescreen weekly
});

test('AWOL', () => {
  assert.deepEqual(awol({ age: 60, worldWrong: false, disoriented: false, ill: false }), { points: 0, derivationPct: 0, elevated: false });
  assert.deepEqual(awol({ age: 82, worldWrong: true, disoriented: false, ill: false }), { points: 2, derivationPct: 15, elevated: true });
  assert.deepEqual(awol({ age: 82, worldWrong: true, disoriented: true, ill: true }), { points: 4, derivationPct: null, elevated: true });
});

import { thromboticTier, pauseSchedule, cockcroftGault } from './vpo-scores.mjs';

test('thromboticTier: valve tiers', () => {
  assert.deepEqual(thromboticTier({ valve: 'mitral', valveRisk: true }), { tier: 'Alto', bridge: 'HBPM', reasons: ['PRÓTESIS MITRAL CON FACTORES DE RIESGO DE EVC', 'PRÓTESIS MITRAL'] });
  assert.equal(thromboticTier({ valve: 'cagedDisc' }).tier, 'Alto');
  assert.equal(thromboticTier({ valve: 'mitral', valveRisk: false }).tier, 'Moderado');
  assert.equal(thromboticTier({ valve: 'bileaflet', valveRisk: true }).tier, 'Moderado');
  assert.deepEqual(thromboticTier({ valve: 'bileaflet', valveRisk: false }), { tier: 'Bajo', bridge: 'Sin puente', reasons: [] });
});

test('thromboticTier: AF tiers by CHA2DS2-VASc', () => {
  assert.equal(thromboticTier({ af: 7 }).tier, 'Alto');
  assert.equal(thromboticTier({ af: 6 }).tier, 'Moderado');
  assert.equal(thromboticTier({ af: 5 }).tier, 'Moderado');
  assert.equal(thromboticTier({ af: 4 }).tier, 'Bajo');
  assert.equal(thromboticTier({ af: 1 }).tier, 'Bajo');
  assert.equal(thromboticTier({ af: 2, strokeRecent: true }).tier, 'Alto');
  assert.equal(thromboticTier({ af: 2, rheumatic: true }).tier, 'Alto');
});

test('thromboticTier: VTE tiers', () => {
  assert.equal(thromboticTier({ vteMonthsAgo: 2 }).tier, 'Alto');
  assert.equal(thromboticTier({ vteMonthsAgo: 3 }).tier, 'Moderado');
  assert.equal(thromboticTier({ vteMonthsAgo: 12 }).tier, 'Moderado');
  assert.equal(thromboticTier({ vteMonthsAgo: 13 }).tier, 'Bajo');
  assert.equal(thromboticTier({ vteMonthsAgo: 24, thrombophiliaSevere: true }).tier, 'Alto');
  assert.equal(thromboticTier({ vteMonthsAgo: 24, thrombophilia: true }).tier, 'Moderado');
  assert.equal(thromboticTier({ vteMonthsAgo: 24, vteRecurrent: true }).tier, 'Moderado');
  assert.equal(thromboticTier({ vteMonthsAgo: 24, cancer: true }).tier, 'Moderado');
  assert.equal(thromboticTier({ vteMonthsAgo: 24, cancer: true, cancerHighVte: true }).tier, 'Alto');
});

test('thromboticTier: highest tier wins, bleeding lowers the bridge, no indication gives null', () => {
  assert.equal(thromboticTier({ valve: 'bileaflet', af: 7 }).tier, 'Alto');
  assert.equal(thromboticTier({ af: 7, bleedHigh: true }).bridge, 'Individualizar');
  assert.equal(thromboticTier({ af: 5 }).bridge, 'Individualizar');
  assert.equal(thromboticTier({ af: 5, bleedHigh: true }).bridge, 'Sin puente');
  assert.equal(thromboticTier({}), null);
});

test('Cockcroft-Gault', () => {
  // (140-70) x 70 / (72 x 1.0) = 68.06
  assert.equal(cockcroftGault({ age: 70, weight: 70, scr: 1, female: false }), 68);
  // (140-80) x 60 / (72 x 1.2) = 41.67, x 0.85 = 35.42
  assert.equal(cockcroftGault({ age: 80, weight: 60, scr: 1.2, female: true }), 35);
  assert.equal(cockcroftGault({ age: 70, weight: null, scr: 1, female: false }), null);
});

test('PAUSE schedule: each DOAC row', () => {
  for (const drug of ['apixaban', 'rivaroxaban']) {
    assert.deepEqual(pauseSchedule({ drug, crcl: 80 }), { stopDay: -2, restartDay: '+1', high: false, studied: true, belowPauseCrcl: false });
    assert.deepEqual(pauseSchedule({ drug, crcl: 80, highBleedRisk: true }), { stopDay: -3, restartDay: '+2 a +3', high: true, studied: true, belowPauseCrcl: false });
  }
  assert.equal(pauseSchedule({ drug: 'dabigatran', crcl: 50 }).stopDay, -2);
  assert.equal(pauseSchedule({ drug: 'dabigatran', crcl: 50, highBleedRisk: true }).stopDay, -3);
  assert.equal(pauseSchedule({ drug: 'dabigatran', crcl: 49 }).stopDay, -3);
  assert.deepEqual(pauseSchedule({ drug: 'dabigatran', crcl: 49, highBleedRisk: true }), { stopDay: -5, restartDay: '+2 a +3', high: true, studied: true, belowPauseCrcl: false });
  assert.equal(pauseSchedule({ drug: 'dabigatran', crcl: null }), null);
  assert.deepEqual(pauseSchedule({ drug: 'edoxaban' }), { stopDay: -2, restartDay: '+1', high: false, studied: false, belowPauseCrcl: false });
});

test('PAUSE schedule: neuraxial counts as high bleed risk, low CrCl flagged', () => {
  assert.equal(pauseSchedule({ drug: 'apixaban', neuraxial: true }).stopDay, -3);
  assert.equal(pauseSchedule({ drug: 'apixaban', crcl: 24 }).belowPauseCrcl, true);
  assert.equal(pauseSchedule({ drug: 'apixaban', crcl: 25 }).belowPauseCrcl, false);
  assert.equal(pauseSchedule({ drug: 'rivaroxaban', crcl: 29 }).belowPauseCrcl, true);
  assert.equal(pauseSchedule({ drug: 'dabigatran', crcl: 29 }).belowPauseCrcl, true);
});

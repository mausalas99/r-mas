import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeVpoScores } from './vpo-calculator.mjs';

test('computeVpoScores — caso demo Excel ASA IV RCRI 0 ARISCAT 51 Caprini 3', () => {
  var input = {
    edad: 90,
    creatinina: 1.5,
    hemoglobina: 8,
    spo2: 88,
    duracionCirugiaHoras: 1,
    asaKey: 'asa-iv',
    functionalKey: 'independent',
    procedureId: 'gupta-gallbladder-appendix',
    rcri: {
      cardiopatiaIsquemica: false,
      insuficienciaCardiaca: false,
      evc: false,
      dmInsulina: false,
      cirugiaAltoRiesgo: false,
      urgente: false,
    },
    ariscat: {
      infeccionRespiratoriaUltimoMes: false,
      incisionKey: 'peripheral',
      cirugiaMayor45Min: true,
      urgente: false,
    },
    caprini: {
      imcMayor25: false,
      insuficienciaVenosa: false,
      reposoMovilidadReducida: false,
      antecedenteEvc: false,
      trombofilia: false,
      esteroideCronico: false,
      artritisInflamatoria: false,
    },
  };
  var r = computeVpoScores(input);
  assert.equal(r.asaClass, 'IV');
  assert.equal(r.rcri.points, 0);
  assert.equal(r.ariscat.points, 51);
  assert.equal(r.ariscat.riskLabel, 'Alto');
  assert.equal(r.caprini.points, 3);
  assert.equal(r.caprini.riskLabel, 'Moderado');
  assert.ok(r.gupta.micaPercent >= 0.015 && r.gupta.micaPercent <= 0.03);
});

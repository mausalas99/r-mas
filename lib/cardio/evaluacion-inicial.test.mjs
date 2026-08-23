import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyEvaluacionInicial, normalizeEvaluacionInicial } from './evaluacion-inicial.mjs';

test('emptyEvaluacionInicial has full intake schema', () => {
  const e = emptyEvaluacionInicial();
  assert.equal(e.fecha, '');
  assert.equal(e.motivoConsulta, '');
  assert.deepEqual(e.medicamentosPrevios, []);
  assert.equal(e.tratamientoPrevio.bb, null);
  assert.equal(e.tratamientoPrevio.anticoagulante, '');
  assert.equal(e.exploracion.pvy, null);
  assert.equal(e.vexusInicial.grado, '');
  assert.equal(e.usPulmonar.campos.length, 8);
  assert.equal(e.usPulmonar.campos[0].lineasB, '');
  assert.deepEqual(e.rxTorax.hallazgos, []);
  assert.equal(e.labsIngreso.ntProBnp, null);
  assert.equal(e.residente, '');
});

test('normalizeEvaluacionInicial returns defaults when given nothing', () => {
  assert.deepEqual(normalizeEvaluacionInicial(undefined), emptyEvaluacionInicial());
  assert.deepEqual(normalizeEvaluacionInicial(null), emptyEvaluacionInicial());
});

test('normalizeEvaluacionInicial merges top-level and sub-object fields', () => {
  const out = normalizeEvaluacionInicial({
    fecha: '2026-03-14',
    tratamientoPrevio: { bb: true },
    exploracion: { pvy: true, ta: '120/80' },
  });
  assert.equal(out.fecha, '2026-03-14');
  assert.equal(out.tratamientoPrevio.bb, true);
  assert.equal(out.tratamientoPrevio.arm, null);
  assert.equal(out.exploracion.pvy, true);
  assert.equal(out.exploracion.ta, '120/80');
  assert.equal(out.exploracion.fc, null);
});

test('normalizeEvaluacionInicial merges usPulmonar campos by index and preserves the rest as defaults', () => {
  const out = normalizeEvaluacionInicial({
    usPulmonar: { campos: [{ lineasB: '≥3', derrame: true }], nota: 'derrame derecho' },
  });
  assert.equal(out.usPulmonar.campos.length, 8);
  assert.equal(out.usPulmonar.campos[0].lineasB, '≥3');
  assert.equal(out.usPulmonar.campos[0].derrame, true);
  assert.equal(out.usPulmonar.campos[1].lineasB, '');
  assert.equal(out.usPulmonar.nota, 'derrame derecho');
});

test('normalizeEvaluacionInicial merges rxTorax hallazgos array', () => {
  const out = normalizeEvaluacionInicial({ rxTorax: { hallazgos: ['Cardiomegalia'] } });
  assert.deepEqual(out.rxTorax.hallazgos, ['Cardiomegalia']);
  assert.equal(out.rxTorax.nota, '');
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyApoyoKind,
  isApoyoMedicationNombre,
  isApoyoMedicationItem,
  apoyoKindLabel,
  APOYO_KIND_OXIGENO,
} from './med-receta-apoyo.mjs';

describe('classifyApoyoKind — detecta apoyo de oxígeno', () => {
  it('reconoce oxígeno por dispositivo o nombre', () => {
    assert.equal(classifyApoyoKind('OXIGENO · MASCARILLA RESERVORIO 10 L/MIN'), APOYO_KIND_OXIGENO);
    assert.equal(classifyApoyoKind('PUNTAS NASALES 2 L/MIN'), APOYO_KIND_OXIGENO);
    assert.equal(classifyApoyoKind('CANULA NASAL DE ALTO FLUJO'), APOYO_KIND_OXIGENO);
    assert.equal(classifyApoyoKind('O2 SUPLEMENTARIO'), APOYO_KIND_OXIGENO);
    assert.equal(classifyApoyoKind('CPAP NOCTURNO'), APOYO_KIND_OXIGENO);
  });

  it('no clasifica medicamentos reales como apoyo', () => {
    assert.equal(classifyApoyoKind('CEFTRIAXONA 1 G IV C/12 H'), '');
    assert.equal(classifyApoyoKind('SOL. FISIOLOGICA 0.9% 80 ML/H'), '');
    assert.equal(classifyApoyoKind('SALBUTAMOL 2 DISPAROS C/6 H'), '');
  });
});

describe('isApoyoMedicationNombre / isApoyoMedicationItem', () => {
  it('acepta nombre crudo directamente', () => {
    assert.equal(isApoyoMedicationNombre('OXIGENO MASCARILLA SIMPLE'), true);
    assert.equal(isApoyoMedicationNombre('ENALAPRIL 5 MG VO C/12 H'), false);
  });

  it('acepta un item con nombreRaw', () => {
    assert.equal(isApoyoMedicationItem({ nombreRaw: 'OXIGENO PUNTAS NASALES' }), true);
    assert.equal(isApoyoMedicationItem({ nombreRaw: 'FUROSEMIDA 20 MG IV C/24 H' }), false);
    assert.equal(isApoyoMedicationItem(null), false);
  });
});

describe('apoyoKindLabel', () => {
  it('etiqueta O₂ para oxígeno', () => {
    assert.equal(apoyoKindLabel(APOYO_KIND_OXIGENO), 'O₂');
  });
  it('vacío para tipos desconocidos', () => {
    assert.equal(apoyoKindLabel('otro'), '');
  });
});

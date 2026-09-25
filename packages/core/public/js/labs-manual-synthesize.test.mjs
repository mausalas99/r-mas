import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fieldsForManualLabType, listManualLabTypes, getManualLabType } from './labs-manual-catalog.mjs';
import {
  normalizeManualLabValue,
  synthesizeManualResLab,
  synthesizeManualResLabs,
} from './labs-manual-synthesize.mjs';

describe('labs-manual-catalog', () => {
  it('incluye tipos core y extendidos', () => {
    var keys = listManualLabTypes().map(function (t) {
      return t.sectionKey;
    });
    assert.ok(keys.includes('BH'));
    assert.ok(keys.includes('QS'));
    assert.ok(keys.includes('ESC'));
    assert.ok(keys.includes('PFHs'));
    assert.ok(keys.includes('GASES'));
    assert.ok(keys.includes('TIR'));
    assert.ok(keys.includes('ENDO'));
    assert.ok(getManualLabType('BH'));
    assert.ok(fieldsForManualLabType('BH').some(function (f) {
      return f.key === 'Hb';
    }));
  });
});

describe('labs-manual-synthesize', () => {
  it('normaliza números con coma', () => {
    assert.equal(normalizeManualLabValue('12,4', 'num'), '12.4');
    assert.equal(normalizeManualLabValue('12.4*', 'num'), '12.4*');
    assert.equal(normalizeManualLabValue('  ', 'num'), '');
  });

  it('sintetiza BH omitiendo vacíos', () => {
    var line = synthesizeManualResLab('BH', { Hb: '12.4', Hto: '', Leu: '8.1' });
    assert.equal(line, 'BH\tHb 12.4 Leu 8.1');
    assert.deepEqual(synthesizeManualResLabs('BH', { Hb: '12,4' }), ['BH\tHb 12.4']);
  });

  it('devuelve vacío sin valores', () => {
    assert.equal(synthesizeManualResLab('BH', {}), '');
    assert.deepEqual(synthesizeManualResLabs('BH', { Hb: '  ' }), []);
  });

  it('qual colapsa espacios a un token', () => {
    var line = synthesizeManualResLab('VIRAL', { VDRL: 'No reactivo' });
    assert.equal(line, 'VIRAL\tVDRL No_reactivo');
  });
});

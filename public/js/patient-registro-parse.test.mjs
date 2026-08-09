import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRegistrosFromBulkInput } from './patient-registro-parse.mjs';

describe('parseRegistrosFromBulkInput', () => {
  it('separa por líneas', () => {
    assert.deepEqual(parseRegistrosFromBulkInput('1087426-1\n1087427-2'), ['1087426-1', '1087427-2']);
  });

  it('separa por coma y espacio', () => {
    assert.deepEqual(parseRegistrosFromBulkInput('1087426-1, 1087427-2;1087428'), [
      '1087426-1',
      '1087427-2',
      '1087428',
    ]);
  });

  it('deduplica sin perder orden', () => {
    assert.deepEqual(parseRegistrosFromBulkInput('1087426-1\n1087426-1\n1087427'), [
      '1087426-1',
      '1087427',
    ]);
  });
});

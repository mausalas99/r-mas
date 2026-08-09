import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRegistroModalValues } from './patient-registro-modal-ui.mjs';

describe('normalizeRegistroModalValues', () => {
  it('deduplica valores de cajas separadas', () => {
    assert.deepEqual(normalizeRegistroModalValues(['1087426-1', '1087427-2', '1087426-1']), [
      '1087426-1',
      '1087427-2',
    ]);
  });

  it('ignora cajas vacías', () => {
    assert.deepEqual(normalizeRegistroModalValues(['', '1087426-1', '']), ['1087426-1']);
  });
});

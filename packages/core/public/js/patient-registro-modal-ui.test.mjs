import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  expandRegistroRowsFromInput,
  mergeRegistroPasteIntoRows,
  normalizeRegistroModalValues,
} from './patient-registro-modal-ui.mjs';

describe('normalizeRegistroModalValues', () => {
  it('deduplica valores de cajas separadas', () => {
    assert.deepEqual(normalizeRegistroModalValues(['9000002-1', '1087427-2', '9000002-1']), [
      '9000002-1',
      '1087427-2',
    ]);
  });

  it('ignora cajas vacías', () => {
    assert.deepEqual(normalizeRegistroModalValues(['', '9000002-1', '']), ['9000002-1']);
  });
});

describe('expandRegistroRowsFromInput', () => {
  it('deja un solo registro en su caja', () => {
    assert.deepEqual(expandRegistroRowsFromInput([''], 0, '8100002-6'), ['8100002-6']);
  });

  it('separa varios registros pegados (líneas o espacios) en cajas individuales', () => {
    assert.deepEqual(
      expandRegistroRowsFromInput(
        [''],
        0,
        '8100002-6\n8100008-4\n8100011-2\n8100030-9\n8100031-3\n8100032-5'
      ),
      ['8100002-6', '8100008-4', '8100011-2', '8100030-9', '8100031-3', '8100032-5', '']
    );
  });

  it('también separa cuando el pegado llega con espacios (input type=text)', () => {
    assert.deepEqual(
      expandRegistroRowsFromInput([''], 0, '8100002-6 8100008-4 8100011-2'),
      ['8100002-6', '8100008-4', '8100011-2', '']
    );
  });

  it('conserva cajas previas y posteriores al pegar varios', () => {
    assert.deepEqual(expandRegistroRowsFromInput(['111', '', '999'], 1, '222\n333'), [
      '111',
      '222',
      '333',
      '999',
      '',
    ]);
  });
});

describe('mergeRegistroPasteIntoRows', () => {
  it('vuelca el área de pegado a cajas individuales', () => {
    assert.deepEqual(mergeRegistroPasteIntoRows([''], '8100002-6\n8100008-4'), [
      '8100002-6',
      '8100008-4',
      '',
    ]);
  });

  it('no cambia filas si el pegado está vacío', () => {
    assert.deepEqual(mergeRegistroPasteIntoRows(['8100002-6', ''], '  \n'), ['8100002-6', '']);
  });
});

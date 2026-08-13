import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  expandRegistroRowsFromInput,
  mergeRegistroPasteIntoRows,
  normalizeRegistroModalValues,
} from './patient-registro-modal-ui.mjs';

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

describe('expandRegistroRowsFromInput', () => {
  it('deja un solo registro en su caja', () => {
    assert.deepEqual(expandRegistroRowsFromInput([''], 0, '2237300-6'), ['2237300-6']);
  });

  it('separa varios registros pegados (líneas o espacios) en cajas individuales', () => {
    assert.deepEqual(
      expandRegistroRowsFromInput(
        [''],
        0,
        '2237300-6\n2237239-4\n2218070-2\n2237335-9\n2237971-3\n2238040-5'
      ),
      ['2237300-6', '2237239-4', '2218070-2', '2237335-9', '2237971-3', '2238040-5', '']
    );
  });

  it('también separa cuando el pegado llega con espacios (input type=text)', () => {
    assert.deepEqual(
      expandRegistroRowsFromInput([''], 0, '2237300-6 2237239-4 2218070-2'),
      ['2237300-6', '2237239-4', '2218070-2', '']
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
    assert.deepEqual(mergeRegistroPasteIntoRows([''], '2237300-6\n2237239-4'), [
      '2237300-6',
      '2237239-4',
      '',
    ]);
  });

  it('no cambia filas si el pegado está vacío', () => {
    assert.deepEqual(mergeRegistroPasteIntoRows(['2237300-6', ''], '  \n'), ['2237300-6', '']);
  });
});

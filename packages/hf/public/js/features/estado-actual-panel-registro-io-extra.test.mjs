import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIoExtraRow,
  readIoExtraPartsFromForm,
  fillIoFields,
  clearIoFields,
} from './estado-actual-panel-registro-io.mjs';

function hasRealDom() {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function formWithExtraList() {
  const form = document.createElement('form');
  const list = document.createElement('div');
  list.id = 'ea-io-extra-list';
  form.appendChild(list);
  return form;
}

describe('fuentes cuantificables sueltas (ultrafiltrado, drenaje, toracocentesis)', () => {
  it('buildIoExtraRow prefills the kind selector and the value from data', () => {
    if (!hasRealDom()) return;
    const row = buildIoExtraRow({ kind: 'drain', value: 150 });
    assert.equal(row.querySelector('[data-ea-io-extra-kind]').value, 'drain');
    assert.equal(row.querySelector('[data-ea-io-extra-value]').value, '150');
  });

  it('buildIoExtraRow swaps the dropdown for the name field for a custom source (never both)', () => {
    if (!hasRealDom()) return;
    const row = buildIoExtraRow({ label: 'Sonda nasogástrica', value: 50 });
    const select = row.querySelector('[data-ea-io-extra-kind]');
    const custom = row.querySelector('[data-ea-io-extra-custom]');
    assert.equal(select.value, '__custom__');
    assert.equal(select.hidden, true);
    assert.equal(custom.hidden, false);
    assert.equal(custom.value, 'Sonda nasogástrica');
  });

  it('readIoExtraPartsFromForm accepts a source that is not in the known list', () => {
    if (!hasRealDom()) return;
    const form = formWithExtraList();
    const list = form.querySelector('#ea-io-extra-list');
    list.appendChild(buildIoExtraRow({ label: 'Sonda nasogástrica', value: 50 }));
    const parts = readIoExtraPartsFromForm(form);
    assert.deepEqual(parts, [{ kind: 'custom', label: 'SONDA NASOGÁSTRICA', value: 50 }]);
  });

  it('readIoExtraPartsFromForm drops a custom row left without a name', () => {
    if (!hasRealDom()) return;
    const form = formWithExtraList();
    const list = form.querySelector('#ea-io-extra-list');
    const row = buildIoExtraRow({});
    row.querySelector('[data-ea-io-extra-kind]').value = '__custom__';
    list.appendChild(row);
    assert.deepEqual(readIoExtraPartsFromForm(form), []);
  });

  it('readIoExtraPartsFromForm reads every row, keyed by its selected kind', () => {
    if (!hasRealDom()) return;
    const form = formWithExtraList();
    const list = form.querySelector('#ea-io-extra-list');
    list.appendChild(buildIoExtraRow({ kind: 'ultrafiltrado', value: 300 }));
    list.appendChild(buildIoExtraRow({ kind: 'thoracentesis', value: 'NC' }));
    const parts = readIoExtraPartsFromForm(form);
    assert.deepEqual(parts, [
      { kind: 'ultrafiltrado', label: 'ULTRAFILTRADO', value: 300 },
      { kind: 'thoracentesis', label: 'TORACOCENTESIS', value: 'NC' },
    ]);
  });

  it('fillIoFields rebuilds the extra rows from io.egrExtra, clearIoFields empties them', () => {
    if (!hasRealDom()) return;
    const form = formWithExtraList();
    fillIoFields(form, { egrExtra: [{ kind: 'drain', value: 80 }] });
    const parts = readIoExtraPartsFromForm(form);
    assert.deepEqual(parts, [{ kind: 'drain', label: 'DRENAJE', value: 80 }]);
    clearIoFields(form);
    assert.equal(form.querySelector('#ea-io-extra-list').children.length, 0);
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderAnalytePickerBar } from './tend-group-analyte-picker.mjs';

function makeCtx(slot) {
  return {
    slot,
    deps: { esc: (s) => String(s), getSectionLabel: () => '' },
    state: { tableExtraSpecs: [] },
    sectionKey: 'BH',
    renderTable: () => {},
  };
}

test('add button opens a dropdown anchored inside the positioned bar', () => {
  if (typeof document === 'undefined') return;
  const slot = document.createElement('div');
  document.body.appendChild(slot);
  renderAnalytePickerBar(makeCtx(slot));

  const addBtn = slot.querySelector('.tend-analyte-picker-add-btn');
  addBtn.click();

  const bar = slot.querySelector('.tend-analyte-picker-bar');
  const dd = slot.querySelector('.tend-analyte-picker-dropdown');
  assert.ok(dd, 'dropdown should be in the DOM after clicking add');
  assert.equal(dd.parentElement, bar, 'dropdown must mount inside the position:relative bar, not as its sibling');

  slot.remove();
});

function makeEligibilityCtx(slot) {
  const setA = { fecha: '10/08/2026', hora: '08:00', parsedBySection: { QS: { Glu: '90' } } };
  const setB = { fecha: '12/08/2026', hora: '08:00', parsedBySection: { QS: { Glu: '95' } } };
  return {
    slot,
    deps: {
      esc: (s) => String(s),
      getSectionLabel: (sk) => (sk === 'QS' ? 'Química sanguínea' : sk),
      getCatalogSpecs: (sectionKey) =>
        sectionKey === 'QS' ? [{ fieldKey: 'Glu', cardTitle: 'Glucosa', sectionKey: 'QS' }] : [],
    },
    state: { sectionKey: 'BH', historyDescFull: [setA, setB], tableExtraSpecs: [] },
    sectionKey: 'BH',
    renderTable: () => {},
  };
}

test('picker lists studies first, then analytes for the chosen study', () => {
  if (typeof document === 'undefined') return;
  const slot = document.createElement('div');
  document.body.appendChild(slot);
  const ctx = makeEligibilityCtx(slot);
  renderAnalytePickerBar(ctx);
  slot.querySelector('.tend-analyte-picker-add-btn').click();

  const studyBtn = slot.querySelector('[data-section-key]');
  assert.ok(studyBtn, 'first screen must list the study, not its analytes');
  assert.equal(studyBtn.textContent, 'Química sanguínea');
  assert.equal(slot.querySelector('[data-field-key]'), null, 'analytes should not show before a study is chosen');

  studyBtn.click();

  assert.ok(slot.querySelector('.tend-analyte-picker-back'), 'a back button should appear after picking a study');
  const fieldBtn = slot.querySelector('[data-field-key]');
  assert.ok(fieldBtn, 'analytes for the chosen study should now be listed');
  assert.equal(fieldBtn.textContent, 'Glucosa');

  slot.remove();
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tendEligibleSectionKey } from './tend-core.mjs';
import { DYNAMIC_TABLE_SECTION_KEY, createTendDynamicTableModal } from './tend-dynamic-table-modal.mjs';

test('DYNAMIC_TABLE_SECTION_KEY never matches a real lab section code', () => {
  assert.equal(tendEligibleSectionKey(DYNAMIC_TABLE_SECTION_KEY), false);
});

test('createTendDynamicTableModal exposes the expected controls', () => {
  const modal = createTendDynamicTableModal({});
  assert.equal(typeof modal.open, 'function');
  assert.equal(typeof modal.close, 'function');
  assert.equal(typeof modal.isOpen, 'function');
  assert.equal(typeof modal.copyTablePng, 'function');
  assert.equal(typeof modal.copyTableText, 'function');
});

test('open() is a no-op without an active patient (no DOM touched)', () => {
  let historyRequested = false;
  const modal = createTendDynamicTableModal({
    getActiveId: () => null,
    getHistory: () => {
      historyRequested = true;
      return [];
    },
  });
  assert.doesNotThrow(() => modal.open());
  assert.equal(historyRequested, false);
});

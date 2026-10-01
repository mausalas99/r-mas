import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMergedTrendSeriesCatalog } from './tendencias-catalog.mjs';

test('dynamic gas cards survive "<0.01" and comma decimals', () => {
  const hist = [{ fecha: '01/01/26', hora: '08:00', parsedBySection: { GASES: { zzA: '<0.01', zzB: '0,08', zzC: 'texto' } } }];
  const keys = buildMergedTrendSeriesCatalog(hist).map((s) => s.fieldKey);
  assert.ok(keys.includes('zzA'));
  assert.ok(keys.includes('zzB'));
  assert.ok(!keys.includes('zzC'));
});

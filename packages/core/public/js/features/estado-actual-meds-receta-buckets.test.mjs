import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setPatients } from '../app-state.mjs';
import { dayKeyFromIso } from './eventualidades-store.mjs';
import { medInstructionFragmentForSoap, bucketsFromRecetaItems } from './estado-actual-meds-receta-buckets.mjs';

const TODAY = dayKeyFromIso(new Date().toISOString());
const ITEM = { id: 'm1', nombreRaw: 'AMPICILINA 500 MG', viaRaw: 'IV', dosisRaw: '500 mg', frecuenciaRaw: 'CADA 8 HORAS' };

function dummyClassify() {
  return 'abx';
}

test('medInstructionFragmentForSoap leaves the fragment alone when nothing was missed', () => {
  const given = medInstructionFragmentForSoap(ITEM, null);
  assert.ok(!given.includes('administrad'));
});

test('medInstructionFragmentForSoap lists the missed time when only some doses were skipped', () => {
  // ITEM is CADA 8 HORAS -> scheduled at 06:00, 14:00, 22:00
  const given = medInstructionFragmentForSoap(ITEM, null);
  const partial = medInstructionFragmentForSoap(ITEM, { 'm1|06:00': true });
  assert.equal(partial, given + ' (NO ADMINISTRADO, 06:00)');
});

test('medInstructionFragmentForSoap lists every missed time, in schedule order', () => {
  const given = medInstructionFragmentForSoap(ITEM, null);
  const partial = medInstructionFragmentForSoap(ITEM, { 'm1|22:00': true, 'm1|06:00': true });
  assert.equal(partial, given + ' (NO ADMINISTRADO, 06:00, 22:00)');
});

test('medInstructionFragmentForSoap flags a fully missed medication instead of listing all its times', () => {
  const given = medInstructionFragmentForSoap(ITEM, null);
  const allMissed = medInstructionFragmentForSoap(ITEM, {
    'm1|06:00': true,
    'm1|14:00': true,
    'm1|22:00': true,
  });
  assert.equal(allMissed, given + ' (NO ADMINISTRADA)');
});

test('bucketsFromRecetaItems marks a medication not given today', () => {
  setPatients([{ id: 'p1', medAdmin: { day: TODAY, notAdmin: { 'm1|06:00': true } } }]);
  const items = [{ ...ITEM, soapCatOverride: 'abx' }];
  const buckets = bucketsFromRecetaItems(items, { m1: true }, dummyClassify, 'p1');
  assert.ok(buckets.abx.includes('(NO ADMINISTRADO, 06:00)'));
});

test('bucketsFromRecetaItems leaves the medication unmarked when nothing was missed', () => {
  setPatients([{ id: 'p1', medAdmin: { day: TODAY, notAdmin: {} } }]);
  const items = [{ ...ITEM, soapCatOverride: 'abx' }];
  const buckets = bucketsFromRecetaItems(items, { m1: true }, dummyClassify, 'p1');
  assert.ok(!buckets.abx.includes('administrad'));
});

test('bucketsFromRecetaItems ignores a stale medAdmin snapshot from a previous day', () => {
  setPatients([{ id: 'p1', medAdmin: { day: '2000-01-01', notAdmin: { 'm1|06:00': true } } }]);
  const items = [{ ...ITEM, soapCatOverride: 'abx' }];
  const buckets = bucketsFromRecetaItems(items, { m1: true }, dummyClassify, 'p1');
  assert.ok(!buckets.abx.includes('administrad'));
});

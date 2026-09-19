import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  cultivoFechaToIsoDay,
  cultureDateRangeFromItems,
  cultivoRefreshOutcomeMessage,
  pendingAtbCultivoItemsForPatient,
} = await import('./cultivo-queue-refresh.mjs');

test('cultivoFechaToIsoDay parses DD/MM/YYYY', () => {
  assert.equal(cultivoFechaToIsoDay('20/07/2026'), '2026-07-20');
  assert.equal(cultivoFechaToIsoDay('—'), null);
});

test('cultureDateRangeFromItems spans min/max unique days', () => {
  assert.deepEqual(
    cultureDateRangeFromItems([
      { fecha: '22/07/2026' },
      { fecha: '20/07/2026' },
      { fecha: '20/07/2026' },
    ]),
    { desde: '2026-07-20', hasta: '2026-07-22' }
  );
});

test('cultivoRefreshOutcomeMessage maps outcomes', () => {
  assert.match(cultivoRefreshOutcomeMessage({ ok: true, kind: 'empty' }).toast, /Sin resultados/);
  assert.match(cultivoRefreshOutcomeMessage({ ok: false, reason: 'no-pending' }).toast, /ATB pendiente/);
  assert.equal(cultivoRefreshOutcomeMessage({ ok: false, reason: 'no-registro' }).type, 'error');
});

test('pendingAtbCultivoItemsForPatient uses lab history map', () => {
  var history = {
    p1: [
      {
        id: 's1',
        fecha: '20/07/2026',
        hora: '10:00',
        resLabs: ['UROCULTIVO: E. COLI\nCuenta: >100000 UFC/ml'],
      },
    ],
  };
  assert.equal(pendingAtbCultivoItemsForPatient('p1', history).length, 1);
  assert.equal(pendingAtbCultivoItemsForPatient('p2', history).length, 0);
});

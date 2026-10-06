import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLabSetWithinMobileHistoryWindow } from './lab-mobile-history-window.mjs';

const now = new Date(2026, 9, 6, 12);

test('old lab set leaves the mobile window, old culture set stays', () => {
  const labs = { id: 'a', fecha: '20/09/2026', resLabs: ['QS\tCr 1.3*'] };
  const cultivo = { id: 'b', fecha: '20/09/2026', resLabs: ['UROCULTIVO POR SONDA 18/09: ESCHERICHIA COLI\nATB R: CIPRO | S: MEM'] };
  const sitio = { id: 'c', fecha: '20/09/2026', resLabs: ['PUNTA DE CATETER 18/09: SIN CRECIMIENTO'] };
  assert.equal(isLabSetWithinMobileHistoryWindow(labs, now), false);
  assert.equal(isLabSetWithinMobileHistoryWindow(cultivo, now), true);
  assert.equal(isLabSetWithinMobileHistoryWindow(sitio, now), true);
});

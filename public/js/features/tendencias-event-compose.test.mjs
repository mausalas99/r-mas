import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTendEventComposePayload,
  buildTendEventComposeHtml,
  syncTendEventComposeKindFields,
} from './tendencias-event-compose.mjs';

test('validateTendEventComposePayload transfusion requires product', () => {
  const missing = validateTendEventComposePayload({
    kind: 'transfusion',
    dateValue: '2026-08-05',
    detail: '',
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'transfusionProduct');

  const ok = validateTendEventComposePayload({
    kind: 'transfusion',
    dateValue: '2026-08-05',
    transfusionProduct: 'plaquetas',
    detail: '1 pool',
  });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.text, 'PLAQUETAS — 1 POOL');
});

test('validateTendEventComposePayload biopsia and procedimiento require detail', () => {
  assert.equal(
    validateTendEventComposePayload({ kind: 'biopsia', dateValue: '2026-08-05' }).reason,
    'biopsiaSite'
  );
  const biopsia = validateTendEventComposePayload({
    kind: 'biopsia',
    dateValue: '2026-08-05',
    detail: 'Riñón',
  });
  assert.equal(biopsia.ok, true);
  if (biopsia.ok) assert.equal(biopsia.text, 'RIÑÓN');

  assert.equal(
    validateTendEventComposePayload({ kind: 'procedimiento', dateValue: '2026-08-05' }).reason,
    'procedimientoText'
  );
  const proc = validateTendEventComposePayload({
    kind: 'procedimiento',
    dateValue: '2026-08-05',
    detail: 'Toracocentesis',
  });
  assert.equal(proc.ok, true);
  if (proc.ok) assert.equal(proc.text, 'TORACOCENTESIS');
});

test('validateTendEventComposePayload otro allows empty detail', () => {
  const ok = validateTendEventComposePayload({
    kind: 'otro',
    dateValue: '2026-08-05',
    detail: '',
  });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.text, 'OTRO');
});

test('buildTendEventComposeHtml includes transfusion, biopsia and procedimiento fields', () => {
  const html = buildTendEventComposeHtml({ defaultDate: '2026-08-10' });
  assert.match(html, /data-product="eritrocitos"/);
  assert.match(html, /data-product="aferesis"/);
  assert.match(html, /Aféresis plaquetaria/);
  assert.match(html, /tend-event-compose-biopsia-site/);
  assert.match(html, /tend-event-compose-procedimiento-text/);
  assert.match(html, /value="2026-08-10"/);
});

test('buildTendEventComposeHtml prefills fields when editing an existing entry', () => {
  const entry = {
    id: 'ev-plaq',
    at: '2026-08-24T12:00:00.000Z',
    kind: 'transfusion',
    transfusionProduct: 'plaquetas',
    text: 'PLAQUETAS — 6 U',
  };
  const html = buildTendEventComposeHtml({ entry });
  assert.match(html, /Editar eventualidad/);
  assert.match(html, /value="2026-08-24"/);
  assert.match(html, /data-kind="transfusion" aria-pressed="true"/);
  assert.match(html, /data-product="plaquetas" aria-pressed="true"/);
  assert.match(html, /value="6 U"/);
});

test('syncTendEventComposeKindFields toggles visible panel', () => {
  if (typeof document === 'undefined') return;
  const wrap = document.createElement('div');
  wrap.innerHTML = buildTendEventComposeHtml({ defaultDate: '2026-08-10' });
  const backdrop = wrap.firstElementChild;
  assert.ok(backdrop);
  const biopsiaPill = backdrop.querySelector('.tend-event-kind-pill[data-kind="biopsia"]');
  assert.ok(biopsiaPill);
  biopsiaPill.classList.add('is-active');
  backdrop.querySelector('.tend-event-kind-pill[data-kind="transfusion"]')?.classList.remove('is-active');
  syncTendEventComposeKindFields(backdrop);
  const biopsiaPanel = backdrop.querySelector('[data-kind-fields="biopsia"]');
  assert.ok(biopsiaPanel);
  assert.equal(biopsiaPanel.hidden, false);
  const transfusionPanel = backdrop.querySelector('[data-kind-fields="transfusion"]');
  assert.ok(transfusionPanel);
  assert.equal(transfusionPanel.hidden, true);
});

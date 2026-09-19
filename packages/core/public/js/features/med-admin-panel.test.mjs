import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureMedAdmin,
  scheduledMedItems,
  prnMedItems,
  allDoseTimesSorted,
  buildMedAdminGridHtml,
  buildMedAdminHiddenFooterHtml,
  buildMedAdminPrnHtml,
  buildMedAdminPrnModalHtml,
} from './med-admin-panel.mjs';

test('ensureMedAdmin starts empty and keeps marks on repeated calls same day', () => {
  const patient = {};
  const a = ensureMedAdmin(patient);
  assert.deepEqual(a.notAdmin, {});
  assert.deepEqual(a.hidden, {});
  assert.deepEqual(a.prnLog, {});
  a.notAdmin['m1|06:00'] = true;
  const b = ensureMedAdmin(patient);
  assert.equal(b, a);
  assert.deepEqual(b.notAdmin, { 'm1|06:00': true });
});

test('ensureMedAdmin resets the daily checklist when the stored day is stale, but keeps hidden meds hidden', () => {
  const patient = {
    medAdmin: { day: '2000-01-01', notAdmin: { 'm1|06:00': true }, hidden: { m2: true }, prnLog: { m3: ['08:00'] } },
  };
  const store = ensureMedAdmin(patient);
  assert.notEqual(store.day, '2000-01-01');
  assert.deepEqual(store.notAdmin, {});
  assert.deepEqual(store.hidden, { m2: true });
  assert.deepEqual(store.prnLog, {});
});

test('scheduledMedItems / prnMedItems split by schedule kind', () => {
  const items = [
    { id: 'm1', frecuenciaRaw: 'CADA 8 HORAS' },
    { id: 'm2', frecuenciaRaw: 'PRN', dosisRaw: '' },
  ];
  assert.deepEqual(scheduledMedItems(items).map((i) => i.id), ['m1']);
  assert.deepEqual(prnMedItems(items).map((i) => i.id), ['m2']);
});

test('allDoseTimesSorted unions and sorts every scheduled time', () => {
  const items = [
    { id: 'm1', frecuenciaRaw: 'CADA 12 HORAS' },
    { id: 'm2', frecuenciaRaw: 'CADA 24 HORAS' },
  ];
  assert.deepEqual(allDoseTimesSorted(items), ['06:00', '18:00']);
});

test('buildMedAdminGridHtml shows only the active ingredient, escaped, with the full name in the tooltip', () => {
  const items = [
    { id: 'm1', nombreRaw: '<b>Paracetamol</b> 500 MG TABLETA (*)', frecuenciaRaw: 'CADA 24 HORAS' },
  ];
  const html = buildMedAdminGridHtml(items, ['06:00'], { notAdmin: {} });
  assert.ok(!html.includes('<b>Paracetamol</b>'), 'raw HTML from drug name must be escaped');
  assert.ok(html.includes('title="&lt;b&gt;Paracetamol&lt;/b&gt; 500 MG TABLETA (*)"'), 'full name kept in the tooltip');
  assert.ok(
    html.includes('>&lt;B&gt;PARACETAMOL&lt;/B&gt;<'),
    'visible text is just the active ingredient, with dose and presentation dropped'
  );
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes('administrada. Activar para marcar que no se dio.'));
});

test('buildMedAdminGridHtml reflects a marked-not-given cell', () => {
  const items = [{ id: 'm1', nombreRaw: 'Paracetamol', frecuenciaRaw: 'CADA 24 HORAS' }];
  const html = buildMedAdminGridHtml(items, ['06:00'], { notAdmin: { 'm1|06:00': true } });
  assert.ok(html.includes('not-admin'));
  assert.ok(html.includes('aria-pressed="false"'));
});

test('buildMedAdminGridHtml leaves an empty pad where a med has no dose at that time', () => {
  const items = [{ id: 'm1', nombreRaw: 'Paracetamol', frecuenciaRaw: 'CADA 24 HORAS' }];
  const html = buildMedAdminGridHtml(items, ['06:00', '18:00'], { notAdmin: {} });
  assert.ok(html.includes('day-pad day-pad-empty'));
});

test('buildMedAdminGridHtml shows the name, a "Día N" pill, and a hide button on one row', () => {
  const items = [{ id: 'm1', nombreRaw: 'Ampicilina 500 MG SOL INY 2 ML', frecuenciaRaw: 'CADA 24 HORAS', diaTratamiento: 4 }];
  const html = buildMedAdminGridHtml(items, ['06:00'], { notAdmin: {} });
  assert.ok(html.includes('>AMPICILINA<'));
  assert.ok(html.includes('med-admin-dia-pill'));
  assert.ok(html.includes('Día 4'));
  assert.ok(html.includes('data-med-admin-hide="m1"'));
});

test('buildMedAdminGridHtml advances the "Día N" pill by days elapsed since fechaActualizacion, same as Manejo', () => {
  const items = [{ id: 'm1', nombreRaw: 'Ampicilina 500 MG SOL INY 2 ML', frecuenciaRaw: 'CADA 24 HORAS', diaTratamiento: 4 }];
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
  const fechaActualizacion =
    String(twoDaysAgo.getDate()).padStart(2, '0') +
    '/' +
    String(twoDaysAgo.getMonth() + 1).padStart(2, '0') +
    '/' +
    twoDaysAgo.getFullYear();
  const html = buildMedAdminGridHtml(items, ['06:00'], { notAdmin: {} }, fechaActualizacion);
  assert.ok(html.includes('Día 6'), 'day 4 plus 2 elapsed days should read as day 6, matching Manejo');
});

test('buildMedAdminHiddenFooterHtml lists each hidden medication\'s active ingredient only when expanded', () => {
  const items = [{ id: 'm1', nombreRaw: 'Ketoconazol 2 % Shampoo 100 ML' }];
  const collapsed = buildMedAdminHiddenFooterHtml(items, false);
  assert.ok(collapsed.includes('1 medicamento oculto'));
  assert.ok(!collapsed.includes('KETOCONAZOL'));
  const expanded = buildMedAdminHiddenFooterHtml(items, true);
  assert.ok(expanded.includes('KETOCONAZOL'));
  assert.ok(!expanded.includes('SHAMPOO'));
  assert.ok(expanded.includes('data-med-admin-unhide="m1"'));
});

test('buildMedAdminHiddenFooterHtml returns nothing with no hidden medications', () => {
  assert.equal(buildMedAdminHiddenFooterHtml([], false), '');
});

test('buildMedAdminPrnHtml lists the PRN criterion, escapes it, and offers a time to register', () => {
  const html = buildMedAdminPrnHtml([
    { id: 'm1', nombreRaw: 'Ondansetrón', viaRaw: 'IV', dosisRaw: '8 mg // CRITERIO PRN: <script>1</script>' },
  ]);
  assert.ok(html.includes('Ondansetrón'));
  assert.ok(!html.includes('<script>1</script>'));
  assert.ok(html.includes('data-med-admin-prn-register="m1"'));
  assert.ok(html.includes('type="time"'));
});

test('buildMedAdminPrnHtml returns empty string with no PRN items', () => {
  assert.equal(buildMedAdminPrnHtml([]), '');
});

test('buildMedAdminPrnHtml shows logged doses as removable chips', () => {
  const html = buildMedAdminPrnHtml(
    [{ id: 'm1', nombreRaw: 'Ondansetrón', viaRaw: 'IV', dosisRaw: '8 mg // PRN' }],
    { prnLog: { m1: ['08:00', '14:30'] } }
  );
  assert.ok(html.includes('08:00'));
  assert.ok(html.includes('14:30'));
  assert.ok(html.includes('data-med-admin-prn-remove="m1|08:00"'));
});

test('buildMedAdminPrnModalHtml wraps the PRN rows with a title and a close button', () => {
  const html = buildMedAdminPrnModalHtml([{ id: 'm1', nombreRaw: 'Ondansetrón', viaRaw: 'IV', dosisRaw: '8 mg // PRN' }], {});
  assert.ok(html.includes('Registrar PRN'));
  assert.ok(html.includes('data-med-admin-prn-close'));
  assert.ok(html.includes('Ondansetrón'));
});

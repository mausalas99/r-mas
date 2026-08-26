import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderIcPickerHtml, openInterconsultModal, renderServicePickerHtml } from './ic-modal.mjs';

test('IC picker lists the three catalog groups', () => {
  const html = renderIcPickerHtml(['card']);
  assert.match(html, /Médicas/);
  assert.match(html, /Quirúrgicas/);
  assert.match(html, /Soporte/);
  assert.match(html, /Cardiología/);
  assert.match(html, /is-on/);
});

test('openInterconsultModal mounts the panel inside the scrim', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML = '';
  openInterconsultModal({ assignedIds: [] });
  const scrim = document.getElementById('patient-ic-scrim');
  const panel = document.getElementById('patient-ic-panel');
  assert.ok(scrim);
  assert.ok(panel);
  assert.equal(panel.parentElement, scrim);
  assert.equal(scrim.parentElement, document.body);
});

test('renderServicePickerHtml lists only the requesting-service subset, flat (no category groups)', () => {
  const html = renderServicePickerHtml('');
  assert.match(html, /Traumatología/);
  assert.match(html, /Cirugía general/);
  assert.match(html, /Ginecología/);
  assert.match(html, /Torre HU/);
  assert.match(html, /Neurocirugía/);
  assert.doesNotMatch(html, /Cardiología/);
  assert.doesNotMatch(html, /Médicas/);
});

test('renderServicePickerHtml is single-select: only the current service is marked is-on', () => {
  const html = renderServicePickerHtml('Traumatología');
  const onCount = (html.match(/is-on/g) || []).length;
  assert.equal(onCount, 1);
  const tyoBtn = html.match(/<button[^>]*data-svc-pick="tyo"[^>]*>/)[0];
  assert.match(tyoBtn, /is-on/);
});

test('renderServicePickerHtml selects nothing when no service is set', () => {
  const html = renderServicePickerHtml('');
  assert.doesNotMatch(html, /is-on/);
});

test('openInterconsultModal sets overlay origin from trigger', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<button type="button" id="ic-tr" style="position:absolute;left:10px;top:20px;width:40px;height:20px"></button>';
  openInterconsultModal({
    assignedIds: [],
    trigger: document.getElementById('ic-tr'),
  });
  const panel = document.getElementById('patient-ic-panel');
  const origin = panel.style.getPropertyValue('--ui-overlay-origin');
  assert.ok(origin.includes('px'));
});

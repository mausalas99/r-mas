import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderIcPickerHtml, openInterconsultModal } from './ic-modal.mjs';

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

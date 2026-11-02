import test from 'node:test';
import assert from 'node:assert/strict';
import { doctorOptionsHtml } from './profile-modal.mjs';

const people = [{ name: 'Dr. Ana', rank: 'R4' }];

test('nothing saved: pick starts empty, not on a team member', () => {
  const html = doctorOptionsHtml(people, '');
  assert.ok(html.startsWith('<option value="">Elige tu nombre</option>'));
});

test('no team and nothing saved: says so', () => {
  assert.ok(doctorOptionsHtml([], '').startsWith('<option value="">Sin equipo en Nube</option>'));
});

test('saved name stays selectable, no empty option', () => {
  const html = doctorOptionsHtml(people, 'Dra. Vieja');
  assert.ok(html.startsWith('<option value="Dra. Vieja">'));
  assert.ok(!html.includes('value=""'));
});

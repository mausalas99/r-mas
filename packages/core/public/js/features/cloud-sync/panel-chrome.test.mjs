import test from 'node:test';
import assert from 'node:assert/strict';
import { jumpToConexionView } from './panel-chrome.mjs';

test('jumpToConexionView clicks the matching nav-view button', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<button data-cloud-action="nav-view" data-cloud-view="equipo">Equipo</button>' +
    '<button data-cloud-action="nav-view" data-cloud-view="admin">Administración</button>';
  let clicked = '';
  document.querySelectorAll('[data-cloud-action="nav-view"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      clicked = btn.getAttribute('data-cloud-view');
    });
  });
  jumpToConexionView('admin');
  assert.equal(clicked, 'admin');
});

test('jumpToConexionView does nothing for an unknown view', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<button data-cloud-action="nav-view" data-cloud-view="equipo">Equipo</button>';
  let clicked = false;
  document.querySelector('[data-cloud-action="nav-view"]').addEventListener('click', () => {
    clicked = true;
  });
  jumpToConexionView('nope');
  assert.equal(clicked, false);
});

test('jumpToConexionView is a no-op with no view given', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML = '<button data-cloud-action="nav-view" data-cloud-view="equipo"></button>';
  assert.doesNotThrow(() => jumpToConexionView());
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { filterSettingsNav, showSettingsPanel } from './settings-dropdown.mjs';

function buildFixture() {
  document.body.innerHTML =
    '<div class="settings-accordion-grid">' +
    '<details class="settings-accordion" id="settings-accordion-appearance">' +
    '<summary>Apariencia</summary>' +
    '<div class="settings-acc-body"><div class="settings-form-label">Tema</div></div>' +
    '</details>' +
    '<details class="settings-accordion" id="settings-accordion-cuenta-equipo">' +
    '<summary>Cuenta y equipo</summary>' +
    '<div class="settings-acc-body"><p class="settings-card__title">Administración (R+ Cloud)</p></div>' +
    '</details>' +
    '</div>';
}

test('filterSettingsNav finds a setting by name even without accents', () => {
  if (typeof document === 'undefined') return;
  buildFixture();
  filterSettingsNav('administracion');
  const items = Array.from(document.querySelectorAll('.settings-nav-item'));
  assert.equal(items.length, 2);
  const visible = items.filter((btn) => !btn.hidden);
  assert.equal(visible.length, 1);
  assert.match(visible[0].textContent, /Cuenta y equipo/);
});

test('filterSettingsNav jumps to the matching section', () => {
  if (typeof document === 'undefined') return;
  buildFixture();
  filterSettingsNav('administracion');
  const activePanel = document.querySelector('.settings-panel.is-active');
  assert.ok(activePanel);
  assert.equal(activePanel.id, 'settings-accordion-cuenta-equipo');
});

test('clearing the query restores every section', () => {
  if (typeof document === 'undefined') return;
  buildFixture();
  filterSettingsNav('administracion');
  filterSettingsNav('');
  const items = Array.from(document.querySelectorAll('.settings-nav-item'));
  assert.ok(items.every((btn) => !btn.hidden));
});

test('showSettingsPanel still works after a search (regression guard)', () => {
  if (typeof document === 'undefined') return;
  buildFixture();
  filterSettingsNav('tema');
  showSettingsPanel('settings-accordion-cuenta-equipo');
  const activePanel = document.querySelector('.settings-panel.is-active');
  assert.equal(activePanel.id, 'settings-accordion-cuenta-equipo');
});

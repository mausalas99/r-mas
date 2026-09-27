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
  const items = Array.from(document.querySelectorAll('.settings-nav-item[data-settings-target]'));
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
  const items = Array.from(document.querySelectorAll('.settings-nav-item[data-settings-target]'));
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

test('side menu: group labels, «Nube y equipo ↗» link, Zona de peligro pinned last', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<div class="settings-accordion-grid">' +
    '<details class="settings-accordion" id="s-perfil" data-settings-group="Tú" data-settings-icon="perfil"><summary>Perfil</summary><div class="settings-acc-body"><p class="settings-card__title">Firma</p></div></details>' +
    '<details class="settings-accordion" id="s-resp" data-settings-group="Datos"><summary>Respaldos</summary><div class="settings-acc-body"><p class="settings-card__title">Exportar</p></div></details>' +
    '<details class="settings-accordion" id="s-danger" data-settings-pin="bottom" data-settings-icon="peligro"><summary>Zona de peligro</summary><div class="settings-acc-body"><p class="settings-card__title">Borrar</p></div></details>' +
    '</div>';
  showSettingsPanel('s-perfil');
  const nav = document.getElementById('settings-nav');
  const order = [...nav.children].map((el) => el.className.split(' ')[0] + ':' + el.textContent.trim());
  assert.deepEqual(order, [
    'settings-nav-group:Tú',
    'settings-nav-item:Perfil',
    'settings-nav-group:Datos',
    'settings-nav-item:Respaldos',
    'settings-nav-item:Nube y equipo ↗',
    'settings-nav-spacer:',
    'settings-nav-item:Zona de peligro',
  ]);
  assert.ok(nav.querySelector('#settings-nav-s-danger').classList.contains('settings-nav-item--danger'));
  assert.equal(document.querySelector('#s-perfil .settings-panel-title').textContent, 'Perfil');
});

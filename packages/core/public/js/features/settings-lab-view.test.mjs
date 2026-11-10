import test from 'node:test';
import assert from 'node:assert/strict';
import { renderComponent, settingsDropdownHtml } from './preact-view-test-helpers.mjs';

const render = () => renderComponent(import.meta.url, 'SettingsLab', './settings-lab-view.jsx');

// Exact markup the static partial had before the port (whitespace between tags removed).
const OLD = `<div class="settings-card-stack"><div class="settings-card"><div class="settings-card__copy"><p class="settings-card__title">Dirección del portal de laboratorio</p><p class="settings-card__desc settings-acc-hint settings-acc-hint--tight">Se guarda solo en esta computadora. Necesaria para «Actualizar labs», la actualización masiva de equipo y el alta por registro.</p></div><div class="settings-card__action"><input id="settings-lab-portal-url" class="profile-input settings-acc-select" type="url" autocomplete="off" placeholder="https://…/index.aspx" aria-label="Dirección del portal de laboratorio" data-onblur="onLabPortalUrlBlur"></div></div></div>`;

test('Laboratorio HTML equals the old static markup', async () => {
  // Preact writes void tags as <input/>; HTML parses it the same as <input>.
  assert.equal((await render()).replace('"/>', '">'), OLD);
});

test('Laboratorio section frame keeps id, icon and summary', () => {
  const html = settingsDropdownHtml();
  assert.match(html, /<details class="settings-accordion" id="settings-accordion-laboratorio" data-settings-icon="laboratorio">\s*<summary>Laboratorio<\/summary>\s*<div class="settings-acc-body" id="settings-lab-body"><\/div>/);
});

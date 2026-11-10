import test from 'node:test';
import assert from 'node:assert/strict';
import { renderComponent, settingsDropdownHtml } from './preact-view-test-helpers.mjs';

const render = () => renderComponent(import.meta.url, 'SettingsDanger', './settings-danger-view.jsx');

// Exact markup the static partial had before the port (whitespace between tags removed).
const OLD = `<p class="settings-acc-hint settings-acc-hint--danger settings-acc-lead">Estas acciones no se pueden deshacer. Haz un respaldo antes.</p>
<div class="settings-card-stack"><div class="settings-card settings-card--danger"><div class="settings-card__copy"><p class="settings-card__title">Borrar datos de R+ en este equipo</p><p class="settings-card__desc settings-acc-hint settings-acc-hint--tight">Pacientes, notas, labs y ajustes de esta computadora. Nube no cambia.</p></div><div class="settings-card__action"><button type="button" class="wb-btn wb-btn-danger-outline wb-btn-sm" data-onclick="openWipeDataModal">Borrar…</button></div></div></div><button type="button" class="wb-btn wb-btn-secondary wb-btn-sm settings-danger-backup" data-settings-goto="settings-accordion-backup-sync">Ir a Respaldos primero</button>`.replace('</p>\n<div', '</p><div');

test('Zona de peligro HTML equals the old static markup', async () => {
  assert.equal(await render(), OLD);
});

test('Zona de peligro section frame keeps id, pin and icon', () => {
  const html = settingsDropdownHtml();
  assert.match(html, /<details class="settings-accordion" id="settings-accordion-danger" data-settings-pin="bottom" data-settings-icon="peligro">\s*<summary>Zona de peligro<\/summary>\s*<div class="settings-acc-body" id="settings-danger-body"><\/div>/);
});

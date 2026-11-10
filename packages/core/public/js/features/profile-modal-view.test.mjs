import test from 'node:test';
import assert from 'node:assert/strict';
import { renderComponent } from './preact-view-test-helpers.mjs';

const render = () => renderComponent(import.meta.url, 'ProfileModal', './profile-modal-view.jsx');

test('Mi perfil keeps every id and hook other modules read', async () => {
  const html = await render();
  for (const id of ['profile-body', 'profile-nube-session', 'app-mode-sala', 'app-mode-inter', 'settings-default-servicio',
    'default-servicio-warning', 'profile-doctor-pick', 'profile-doctor', 'profile-profesor', 'profile-grado',
    'settings-medico-profesor', 'settings-medico-r4', 'settings-medico-r2', 'settings-medico-r1a', 'settings-medico-r1b']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  for (const hook of ['data-perfil-autosave', 'data-perfil-saved', 'data-perfil-clinical-host', 'data-perfil-sala-host',
    'data-perfil-equipo-host', 'data-perfil-fill-team', 'data-wb-close']) {
    assert.ok(html.includes(hook), hook);
  }
  assert.equal((html.match(/data-onblur="onMedicoTemplateBlur"/g) || []).length, 5);
});

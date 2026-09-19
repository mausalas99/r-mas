import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { copyCensoFromListado } from './profile.mjs';

describe('copyCensoFromListado', () => {
  const ids = [
    'settings-medico-r2',
    'profile-r2',
    'settings-medico-r1a',
    'profile-r1a',
    'settings-medico-r1b',
    'profile-r1b',
    'settings-medico-profesor',
    'profile-maestro',
  ];

  afterEach(() => {
    if (typeof document === 'undefined') return;
    for (const id of ids) document.getElementById(id)?.remove();
  });

  function addInput(id, value = '') {
    const el = document.createElement('input');
    el.id = id;
    el.value = value;
    document.body.appendChild(el);
    return el;
  }

  it('copies listado names into the matching censo fields', () => {
    if (typeof document === 'undefined') return;
    addInput('settings-medico-r2', 'Dra. Sanchez');
    addInput('profile-r2', '');
    addInput('settings-medico-r1a', 'Dr. Salas');
    addInput('profile-r1a', '');
    addInput('settings-medico-r1b', 'Dra. Esquivel');
    addInput('profile-r1b', '');
    addInput('settings-medico-profesor', 'Dra. Aguilar');
    addInput('profile-maestro', 'Nombre viejo');

    copyCensoFromListado();

    assert.equal(document.getElementById('profile-r2').value, 'Dra. Sanchez');
    assert.equal(document.getElementById('profile-r1a').value, 'Dr. Salas');
    assert.equal(document.getElementById('profile-r1b').value, 'Dra. Esquivel');
    assert.equal(document.getElementById('profile-maestro').value, 'Dra. Aguilar');
  });

  it('does not throw when a field is missing from the DOM', () => {
    if (typeof document === 'undefined') return;
    addInput('settings-medico-r2', 'Dra. Sanchez');
    assert.doesNotThrow(() => copyCensoFromListado());
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGuardiaCensusEmptyHtml,
  buildGuardiaSalaPickerHtml,
  resolveGuardiaCensusEmptyCopy,
  renderGuardiaCensusEmpty,
  renderGuardiaCensusLoading,
  renderGuardiaSalaPicker,
} from './guardia-census-empty.mjs';

describe('guardia-census-empty', () => {
  it('filterOn offers Ver censo completo', () => {
    const copy = resolveGuardiaCensusEmptyCopy({ filterOn: true });
    assert.match(copy.title, /alcance/i);
    assert.equal(copy.actionLabel, 'Ver censo completo');
    assert.equal(copy.actionId, 'btn-guardia-census-show-all');
    const html = buildGuardiaCensusEmptyHtml({ filterOn: true });
    assert.match(html, /Censo: todos/);
    assert.match(html, /btn-guardia-census-show-all/);
  });

  it('filter off points to Nube / rotación without action button', () => {
    const copy = resolveGuardiaCensusEmptyCopy({ filterOn: false });
    assert.match(copy.lead, /Nube/);
    assert.equal(copy.actionLabel, null);
    const html = buildGuardiaCensusEmptyHtml({ filterOn: false });
    assert.doesNotMatch(html, /btn-guardia-census-show-all/);
  });

  it('buildGuardiaSalaPickerHtml preselects the given sala', () => {
    const html = buildGuardiaSalaPickerHtml(['Sala 1', 'Sala 2'], 'Sala 2');
    assert.match(html, /Activar guardia/);
    assert.match(html, /<option value="Sala 2" selected>/);
    assert.doesNotMatch(html, /<option value="Sala 1" selected>/);
    assert.match(html, /wb-btn wb-btn-primary/);
    assert.match(html, /profile-input/);
  });

  it('buildGuardiaSalaPickerHtml explains why the picker shows and how to skip it', () => {
    const html = buildGuardiaSalaPickerHtml(['Sala 1'], '');
    assert.match(html, /Tu perfil no tiene sala/);
    assert.match(html, /Mi rotación/);
  });

  it('renderGuardiaSalaPicker calls onStart with the selected sala', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    let picked = null;
    renderGuardiaSalaPicker(host, {
      salas: ['Sala 1', 'Sala 2'],
      selected: 'Sala 2',
      onStart: (sala) => {
        picked = sala;
      },
    });
    host.querySelector('#guardia-sala-picker-start').click();
    assert.equal(picked, 'Sala 2');
  });

  it('renderGuardiaCensusEmpty wires onShowAll', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    let called = false;
    renderGuardiaCensusEmpty(host, {
      filterOn: true,
      onShowAll: () => {
        called = true;
      },
    });
    const btn = host.querySelector('#btn-guardia-census-show-all');
    assert.ok(btn);
    btn.click();
    assert.equal(called, true);
  });

  it('renderGuardiaCensusLoading shows a neutral loading message, not the empty-state copy', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    renderGuardiaCensusLoading(host);
    assert.match(host.textContent, /Cargando censo/);
    assert.doesNotMatch(host.textContent, /No hay pacientes/);
    assert.ok(host.querySelectorAll('.gct-team-group').length > 0);
    assert.ok(host.querySelectorAll('.skel').length > 0);
  });

  it('renderGuardiaCensusLoading is a no-op without a container', () => {
    assert.doesNotThrow(() => renderGuardiaCensusLoading(null));
  });
});

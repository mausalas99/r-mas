import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGuardiaCensusEmptyHtml,
  resolveGuardiaCensusEmptyCopy,
  renderGuardiaCensusEmpty,
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
});

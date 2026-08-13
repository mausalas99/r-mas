import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  digitKeyAppTab,
  nextConsolidatedCompositeTab,
  nextMedSubview,
  nextMedOutputTab,
  resolveExpedienteCompositeCycle,
} from './app-shell-tab-shortcuts.mjs';

const INTER = { appMode: 'interconsulta' };
const SALA = { appMode: 'sala' };

describe('app-shell-tab-shortcuts', () => {
  it('digitKeyAppTab maps 1–4/5 to app tabs', () => {
    assert.equal(digitKeyAppTab('1'), 'lab');
    assert.equal(digitKeyAppTab('2'), 'nota');
    assert.equal(digitKeyAppTab('3'), 'med');
    assert.equal(digitKeyAppTab('4'), 'agenda');
    assert.equal(digitKeyAppTab('5'), 'agenda');
    assert.equal(digitKeyAppTab('9'), null);
  });

  it('nextConsolidatedCompositeTab cycles visible tabs', () => {
    var tabs = ['paciente', 'clinico', 'salida'];
    assert.equal(nextConsolidatedCompositeTab('paciente', tabs), 'clinico');
    assert.equal(nextConsolidatedCompositeTab('clinico', tabs), 'salida');
    assert.equal(nextConsolidatedCompositeTab('salida', tabs), 'paciente');
    assert.equal(nextConsolidatedCompositeTab('unknown', tabs), 'paciente');
  });

  it('resolveExpedienteCompositeCycle en Interconsulta', () => {
    assert.equal(resolveExpedienteCompositeCycle('paciente', INTER), 'clinico');
    assert.equal(resolveExpedienteCompositeCycle('clinico', INTER), 'salida');
    assert.equal(resolveExpedienteCompositeCycle('salida', INTER), 'paciente');
  });

  it('resolveExpedienteCompositeCycle includes salida en Sala', () => {
    assert.equal(resolveExpedienteCompositeCycle('paciente', SALA), 'clinico');
    assert.equal(resolveExpedienteCompositeCycle('clinico', SALA), 'salida');
    assert.equal(resolveExpedienteCompositeCycle('salida', SALA), 'paciente');
  });

  it('nextMedSubview alternates receta and perfil', () => {
    assert.equal(nextMedSubview('receta'), 'perfil');
    assert.equal(nextMedSubview('perfil'), 'receta');
  });

  it('nextMedOutputTab alternates full and simple', () => {
    assert.equal(nextMedOutputTab('full'), 'simple');
    assert.equal(nextMedOutputTab('simple'), 'full');
  });
});

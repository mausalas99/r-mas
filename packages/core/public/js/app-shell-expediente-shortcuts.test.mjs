import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveExpedienteShortcutTarget } from './app-shell-expediente-shortcuts.mjs';

const SALA = { appMode: 'sala' };
const INTER = { appMode: 'interconsulta' };

describe('resolveExpedienteShortcutTarget', () => {
  it('⌘E cicla las 3 pills de Clínico en Sala (ya en nota)', () => {
    assert.equal(resolveExpedienteShortcutTarget('e', 'todo', SALA, true), 'estadoActual');
    assert.equal(resolveExpedienteShortcutTarget('e', 'estadoActual', SALA, true), 'eventualidades');
    assert.equal(resolveExpedienteShortcutTarget('e', 'eventualidades', SALA, true), 'medAdmin');
    assert.equal(resolveExpedienteShortcutTarget('e', 'medAdmin', SALA, true), 'estadoActual');
  });

  it('⌘E en Interconsulta solo abre estado actual (ya en nota)', () => {
    assert.equal(resolveExpedienteShortcutTarget('e', 'notas', INTER, true), 'estadoActual');
    assert.equal(resolveExpedienteShortcutTarget('e', 'estadoActual', INTER, true), 'estadoActual');
  });

  it('⌘E desde otra pestaña (labs, medicamentos) siempre vuelve a estado actual', () => {
    assert.equal(resolveExpedienteShortcutTarget('e', 'estadoActual', SALA, false), 'estadoActual');
    assert.equal(resolveExpedienteShortcutTarget('e', 'eventualidades', SALA, false), 'estadoActual');
    assert.equal(resolveExpedienteShortcutTarget('e', 'medAdmin', SALA, false), 'estadoActual');
  });

  it('⌘T cicla Tendencias → Cultivos → Laboratorio → Tendencias (ya en Laboratorio)', () => {
    // Tendencias/Cultivos viven dentro de la pestaña Laboratorio, no de "nota" —
    // el gate correcto es onLab (5º parámetro), no onNota.
    assert.equal(resolveExpedienteShortcutTarget('t', 'todo', SALA, false, true), 'tend');
    assert.equal(resolveExpedienteShortcutTarget('t', 'tend', SALA, false, true), 'cult');
    assert.equal(resolveExpedienteShortcutTarget('t', 'cult', SALA, false, true), 'labs');
    assert.equal(resolveExpedienteShortcutTarget('t', 'labs', SALA, false, true), 'tend');
  });

  it('⌘T desde otra pestaña (Paciente, Manejo, Agenda) siempre vuelve a tendencias', () => {
    assert.equal(resolveExpedienteShortcutTarget('t', 'cult', SALA, false, false), 'tend');
    assert.equal(resolveExpedienteShortcutTarget('t', 'estadoActual', SALA, true, false), 'tend');
  });

  it('⌘D abre datos de paciente', () => {
    assert.equal(resolveExpedienteShortcutTarget('d', 'todo', SALA), 'datos');
  });
});

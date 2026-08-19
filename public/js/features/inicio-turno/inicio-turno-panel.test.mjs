import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../../storage.js';
import { setPatients } from '../../app-state.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import {
  openInicioTurnoPanel,
  closeInicioTurnoPanel,
  isInicioTurnoPanelOpen,
} from './inicio-turno-panel.mjs';
import { writeInicioTurnoZonesPreference } from './inicio-turno-zones.mjs';

const store = {};

beforeEach(() => {
  globalThis.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };
  clinicalSessionContext.user = { rank: 'R2', clinical_name: 'Vargas' };
});

afterEach(() => {
  if (typeof document !== 'undefined') closeInicioTurnoPanel();
  setPatients([]);
  Object.keys(store).forEach((k) => delete store[k]);
  delete globalThis.localStorage;
  clinicalSessionContext.user = null;
});

describe('openInicioTurnoPanel / closeInicioTurnoPanel', () => {
  it('mounts a dismissable overlay with the mode frame, counters and every panel', () => {
    if (typeof document === 'undefined') return;
    setPatients([
      { id: 'p1', name: 'RAMÍREZ SOTO, ANA', edad: 74, cuarto: '219', cama: '1', area: 'N' },
      { id: 'p2', name: 'PÉREZ GARCÍA, JUAN', edad: 68, cuarto: '214', cama: 'B', area: 'V' },
    ]);
    storage.saveTodos('p1', [
      { id: 't1', text: 'Revalorar carga', completed: false, dueDate: '2020-01-01' },
    ]);

    assert.equal(isInicioTurnoPanelOpen(), false);
    openInicioTurnoPanel();
    assert.equal(isInicioTurnoPanelOpen(), true);

    const scrim = document.querySelector('.wb-it-scrim');
    assert.ok(scrim, 'expected the inicio-turno scrim to be mounted');
    assert.match(scrim.innerHTML, /Inicio de turno/);
    assert.match(scrim.innerHTML, /Recibir 2 pacientes/);
    assert.match(scrim.innerHTML, /Heredas pendientes/);
    assert.match(scrim.innerHTML, /Lo primero/);
    assert.match(scrim.innerHTML, /wb-row--alert/); // the overdue row
    assert.match(scrim.innerHTML, /Tus zonas hoy/);
    assert.match(scrim.innerHTML, /Internos del turno/);
    assert.match(scrim.innerHTML, /Labs de hoy/);
    assert.match(scrim.innerHTML, /Interconsultas/);
    // No fabricated "sin nota de ingreso" copy — see inicio-turno-summary.mjs.
    assert.doesNotMatch(scrim.innerHTML, /sin nota de ingreso/);

    closeInicioTurnoPanel();
    assert.equal(isInicioTurnoPanelOpen(), false);
  });

  it('closes on Escape', () => {
    if (typeof document === 'undefined') return;
    setPatients([{ id: 'p1', name: 'X' }]);
    openInicioTurnoPanel();
    assert.equal(isInicioTurnoPanelOpen(), true);
    document.dispatchEvent(new (globalThis.KeyboardEvent || Event)('keydown', { key: 'Escape' }));
    assert.equal(isInicioTurnoPanelOpen(), false);
  });

  it('restores a previously persisted zone selection as active teal chips', () => {
    if (typeof document === 'undefined') return;
    setPatients([
      { id: 'p1', area: 'N' },
      { id: 'p2', area: 'V' },
    ]);
    writeInicioTurnoZonesPreference(['N']);
    openInicioTurnoPanel();
    const activeChip = document.querySelector('.wb-chip--active-teal');
    assert.ok(activeChip, 'expected one teal-active chip for the persisted zone');
    assert.match(activeChip.textContent, /N/);
  });

  it('shows empty states without fabricated data for internos and the outgoing handoff paragraph', () => {
    if (typeof document === 'undefined') return;
    setPatients([{ id: 'p1', area: 'N' }]);
    openInicioTurnoPanel();
    const scrim = document.querySelector('.wb-it-scrim');
    assert.match(scrim.innerHTML, /wb-empty-state/);
    assert.match(scrim.innerHTML, /no tiene un rol de interno/);
    assert.match(scrim.innerHTML, /todavía no guarda un resumen de texto libre/);
  });
});

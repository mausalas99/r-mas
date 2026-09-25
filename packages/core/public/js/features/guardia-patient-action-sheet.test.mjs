import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  openPatientChart,
  shouldShowGuardiaPatientActionMenu,
  buildGuardiaMarksControlsHtml,
  saveGuardiaMarks,
} from './guardia-patient-action-sheet.mjs';

function memoryStore() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

describe('openPatientChart', () => {
  const originalSelect = globalThis.selectPatient;
  const originalSwitchInnerTab = globalThis.switchInnerTab;
  const originalLocalStorage = globalThis.localStorage;

  afterEach(() => {
    if (originalSelect) globalThis.selectPatient = originalSelect;
    else delete globalThis.selectPatient;
    if (originalSwitchInnerTab) globalThis.switchInnerTab = originalSwitchInnerTab;
    else delete globalThis.switchInnerTab;
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
  });

  it('selects patient and opens expediente notas tab', () => {
    globalThis.localStorage = memoryStore();
    const calls = [];
    globalThis.selectPatient = (id) => calls.push(['select', id]);
    globalThis.switchInnerTab = (tab) => calls.push(['tab', tab]);
    openPatientChart('pat-1');
    assert.deepEqual(calls, [
      ['select', 'pat-1'],
      ['tab', 'notas'],
    ]);
  });
});

describe('shouldShowGuardiaPatientActionMenu', () => {
  it('shows menu during turno activo', () => {
    assert.equal(
      shouldShowGuardiaPatientActionMenu({
        turnoActivo: true,
        entregaActive: false,
        onCallGuardiaReceiver: false,
        gridViewContext: 'GUARDIA',
      }),
      true
    );
  });

  it('hides menu pre-turno so census chips open entrega modal', () => {
    assert.equal(
      shouldShowGuardiaPatientActionMenu({
        turnoActivo: false,
        entregaActive: false,
        onCallGuardiaReceiver: true,
        gridViewContext: 'GUARDIA',
      }),
      false
    );
  });

  it('hides menu during entrega phase before turno activo', () => {
    assert.equal(
      shouldShowGuardiaPatientActionMenu({
        turnoActivo: false,
        entregaActive: true,
        onCallGuardiaReceiver: true,
        gridViewContext: 'HANDOFF',
      }),
      false
    );
  });

  it('shows menu when turno activo even if entrega phase flag still set', () => {
    assert.equal(
      shouldShowGuardiaPatientActionMenu({
        turnoActivo: true,
        entregaActive: true,
        onCallGuardiaReceiver: true,
        gridViewContext: 'GUARDIA',
      }),
      true
    );
  });

  it('hides menu for non-receiver outside turno', () => {
    assert.equal(
      shouldShowGuardiaPatientActionMenu({
        turnoActivo: false,
        entregaActive: false,
        onCallGuardiaReceiver: false,
        gridViewContext: 'GUARDIA',
      }),
      false
    );
  });
});

describe('buildGuardiaMarksControlsHtml', () => {
  it('pre-selects the current esfuerzo, leaves pronóstico unset, and shows dx + nota', () => {
    const html = buildGuardiaMarksControlsHtml(
      { guardiaEsfuerzo: 'show', guardiaPronostico: null, guardiaNota: 'SV c/4h' },
      'NAC + EPOC'
    );
    const pressed = html.match(/aria-pressed="true"/g) || [];
    assert.equal(pressed.length, 1);
    assert.match(html, /data-value="show" aria-pressed="true"/);
    const pronosticoGroup = html.slice(html.indexOf('data-mark="guardiaPronostico"'));
    assert.doesNotMatch(pronosticoGroup, /aria-pressed="true"/);
    assert.match(html, /guardia-patient-action-dx">NAC \+ EPOC</);
    assert.match(html, />SV c\/4h</);
    assert.match(html, /maxlength="200"/);
  });

  it('omits the dx paragraph when dxText is empty', () => {
    const html = buildGuardiaMarksControlsHtml({}, '');
    assert.doesNotMatch(html, /guardia-patient-action-dx/);
  });
});

describe('saveGuardiaMarks', () => {
  let commands;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    commands = [];
    globalThis.localStorage = memoryStore();
    globalThis.window = {
      localStorage: globalThis.localStorage,
      electronAPI: {
        dbClinicalCommand: async (payload) => {
          commands.push(payload);
          return { ok: true, changeId: 'c1' };
        },
      },
    };
  });

  afterEach(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
  });

  it('sends a patient.upsert command carrying the full patient plus normalized marks', async () => {
    const patient = { id: 'p1', nombre: 'Ana' };
    const res = await saveGuardiaMarks(patient, { guardiaEsfuerzo: 'no', guardiaNota: '  SV   c/4h ' });
    assert.equal(res.ok, true);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].command.type, 'patient.upsert');
    assert.equal(commands[0].command.patient.id, 'p1');
    assert.equal(commands[0].command.patient.guardiaEsfuerzo, 'no');
    assert.equal(commands[0].command.patient.guardiaNota, 'SV c/4h');
    assert.equal(commands[0].command.patient.nombre, 'Ana');
    assert.equal(commands[0].meta.echoSnapshot, false);
    assert.equal(patient.guardiaEsfuerzo, 'no');
    assert.equal(patient.guardiaNota, 'SV c/4h');
    assert.ok(patient.lanUpdatedAt);
  });

  it('normalizes an invalid mark value to null before sending', async () => {
    const patient = { id: 'p1', nombre: 'Ana' };
    await saveGuardiaMarks(patient, { guardiaEsfuerzo: 'zzz' });
    assert.equal(commands[0].command.patient.guardiaEsfuerzo, null);
  });

  it('returns ok:false without sending a command for an empty patch', async () => {
    const patient = { id: 'p1', nombre: 'Ana' };
    const res = await saveGuardiaMarks(patient, {});
    assert.deepEqual(res, { ok: false, reason: 'empty' });
    assert.equal(commands.length, 0);
  });

  it('retries via clinical.persistSnapshot when the patient is not yet in the repo', async () => {
    let call = 0;
    globalThis.window.electronAPI.dbClinicalCommand = async (payload) => {
      commands.push(payload);
      call += 1;
      if (call === 1) return { ok: false, error: 'patient_not_found' };
      return { ok: true, changeId: 'c1' };
    };
    const patient = { id: 'p1', nombre: 'Ana' };
    const res = await saveGuardiaMarks(patient, { guardiaEsfuerzo: 'full' });
    assert.equal(res.ok, true);
    assert.deepEqual(
      commands.map((c) => c.command.type),
      ['patient.upsert', 'clinical.persistSnapshot', 'patient.upsert']
    );
  });

  it('reports failure and does not mutate the live patient when the repo command fails', async () => {
    globalThis.window.electronAPI.dbClinicalCommand = async (payload) => {
      commands.push(payload);
      return { ok: false, error: 'boom' };
    };
    const patient = { id: 'p1', nombre: 'Ana' };
    const res = await saveGuardiaMarks(patient, { guardiaEsfuerzo: 'full' });
    assert.equal(res.ok, false);
    assert.equal(patient.guardiaEsfuerzo, undefined);
  });
});

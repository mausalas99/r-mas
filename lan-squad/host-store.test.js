'use strict';
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHostStore } = require('./host-store.js');

describe('host-store', () => {
  let dir;
  let filePath;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-host-'));
    filePath = path.join(dir, 'state.json');
  });

  it('createHostStore inicializa teamCodeHash y listas vacías', () => {
    const { hashTeamCode } = require('./team-code.js');
    const store = createHostStore({ filePath, teamCodePlain: 'abc' });
    const st = store.getState();
    assert.strictEqual(st.patients.length, 0);
    assert.strictEqual(st.rooms.length, 0);
    assert.strictEqual(st.calendarEvents.length, 0);
    assert.strictEqual(st.teamCodeHash, hashTeamCode('abc'));
  });

  it('createPatientAndCalendarEvent persiste ambos o ninguno', () => {
    const store = createHostStore({ filePath, teamCodePlain: 'x' });
    const patient = {
      id: 'client-local-1',
      nombre: 'Test',
      registro: 'R1',
      edad: '40',
      sexo: 'M',
      area: '',
      servicio: '',
      cuarto: '',
      cama: '',
      fromLab: false,
    };
    const ev = {
      start: '2026-05-13T10:00:00.000Z',
      end: '2026-05-13T11:00:00.000Z',
      procedure: 'Cateterismo',
      location: 'Hemodinamia',
      materialReady: false,
    };
    const out = store.createPatientAndCalendarEvent({ patient, event: ev, clientPatientId: 'client-local-1' });
    assert.ok(out.hostPatientId && out.hostPatientId !== 'client-local-1');
    assert.ok(out.event.id);
    const st = store.getState();
    assert.strictEqual(st.patients.length, 1);
    assert.strictEqual(st.calendarEvents.length, 1);
    assert.strictEqual(st.calendarEvents[0].patientId, out.hostPatientId);
  });
});

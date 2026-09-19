import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectPatientsFromBlobs } from './recover-census-export.mjs';

test('collectPatientsFromBlobs pulls patients from census + LAN snapshots + sidecars', () => {
  const map = new Map();
  collectPatientsFromBlobs(map, {
    patients: JSON.stringify([{ id: 'p1', nombre: 'A' }]),
    lanRoomSnapshots: JSON.stringify({
      'sala-2': {
        entries: [{ patient: { id: 'mse7o3e5ki64rzfq1l', nombre: 'CYNTHIA YRASI VILLANUEVA LARA', registro: '2218209-7' } }],
      },
    }),
    notes: JSON.stringify({ orphan1: { fecha: '01/01/2026' } }),
    indicaciones: JSON.stringify({}),
    labHistory: JSON.stringify({}),
  });
  assert.equal(map.size, 3);
  assert.equal(map.get('p1')?.nombre, 'A');
  assert.equal(map.get('mse7o3e5ki64rzfq1l')?.registro, '2218209-7');
  assert.match(String(map.get('orphan1')?.nombre || ''), /^Recuperado /);
});

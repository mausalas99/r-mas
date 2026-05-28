import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEstadoActualText } from './estado-actual-text.mjs';
import { emptyMonitoreo, deriveSnapshot } from './estado-actual-data.mjs';

test('buildEstadoActualText usa placeholders y omite línea S', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.four = '15';
  m.historial.push({
    id: '1',
    recordedAt: '2026-05-26T08:00:00.000Z',
    vitals: { tas: 120, tad: 80, fc: 82 },
    glucometrias: [{ value: 140, time: '08:00' }],
    io: { ing: 500, egr: 300 },
  });
  const textNc = buildEstadoActualText(
    m.estadoClinico,
    { vitals: {}, glucometrias: [], io: { ing: 500, egr: 'NC' } },
    { balanceTurno: NaN },
    {}
  );
  assert.match(textNc, /DIURESIS NC/);

  const text = buildEstadoActualText(m.estadoClinico, deriveSnapshot(m), {
    balanceTurno: 200,
    balanceGlobal: 200,
  });
  assert.doesNotMatch(text, /^S:/m);
  assert.match(text, /FOUR 15\/16/);
  assert.match(text, /TA 120\/80/);
  assert.match(text, /GLUCOMETRÍAS CAPILARES \(140/);
  assert.match(text, /BALANCE \+200 CC/);
  assert.match(text, /INGRESOS 500 CC, DIURESIS 300 CC/);
  // Formato igual a soap-estado: "ANALGESIA CON ___" (no hay subjetivo S:)
  assert.match(text, /ANALGESIA CON ___/);
  assert.doesNotMatch(text, /RESCATES DE INSULINA/);
});

test('buildEstadoActualText calcula kcal total con peso del paciente', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.kcalKg = '25';
  const text = buildEstadoActualText(m.estadoClinico, { vitals: {}, glucometrias: [], io: {} }, {}, {
    patientPeso: 70,
  });
  assert.match(text, /25 KCAL\/KG \(1750 KCAL\) PARA PESO DE 70 KG/);
});

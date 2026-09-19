import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCardioGlanceModel } from './dashboard-cardio-glance.mjs';

describe('buildCardioGlanceModel — identity', () => {
  it('reads fenotipo/etiologia straight off patient.cardio', () => {
    const model = buildCardioGlanceModel({
      cardio: { fenotipo: 'HFrEF', etiologia: 'Isquémica' },
    });
    assert.equal(model.fenotipo, 'HFrEF');
    assert.equal(model.etiologia, 'Isquémica');
  });

  it('defaults to empty strings when patient.cardio is missing', () => {
    const model = buildCardioGlanceModel({ nombre: 'X' });
    assert.equal(model.fenotipo, '');
    assert.equal(model.etiologia, '');
    assert.equal(model.congestion.hasData, false);
    assert.equal(model.diuresis.hoyMl, null);
    assert.equal(model.diuresis.acumuladaMl, null);
    assert.equal(model.gdmt.length, 4);
    assert.ok(model.gdmt.every((f) => f.active === false));
  });
});

describe('buildCardioGlanceModel — congestion', () => {
  it('takes the latest pocusByDay entry (list is kept sorted ascending)', () => {
    const model = buildCardioGlanceModel({
      cardio: {
        pocusByDay: [
          { date: '2026-08-20', congestionScore: 6, vexus: 2, stevenson: 'B' },
          { date: '2026-08-22', congestionScore: 3, vexus: 1, stevenson: 'A' },
        ],
      },
    });
    assert.equal(model.congestion.date, '2026-08-22');
    assert.equal(model.congestion.score, 3);
    assert.equal(model.congestion.vexus, 1);
    assert.equal(model.congestion.stevenson, 'A');
    assert.equal(model.congestion.hasData, true);
  });

  it('falls back to vexusIngreso when there is no POCUS day yet', () => {
    const model = buildCardioGlanceModel({ cardio: { vexusIngreso: 2 } });
    assert.equal(model.congestion.vexus, 2);
    assert.equal(model.congestion.score, null);
    assert.equal(model.congestion.hasData, true);
  });

  it('prefers the latest POCUS vexus over vexusIngreso once one exists', () => {
    const model = buildCardioGlanceModel({
      cardio: {
        vexusIngreso: 3,
        pocusByDay: [{ date: '2026-08-21', vexus: 0 }],
      },
    });
    assert.equal(model.congestion.vexus, 0);
  });
});

describe('buildCardioGlanceModel — diuresis', () => {
  const monitoreo = {
    historial: [
      {
        recordedAt: '2026-08-21T08:00:00.000Z',
        io: { egrParts: [{ kind: 'diuresis', value: 800 }] },
      },
      {
        recordedAt: '2026-08-22T08:00:00.000Z',
        io: { egrParts: [{ kind: 'diuresis', value: 650 }, { kind: 'drain', value: 50 }] },
      },
    ],
  };

  it('sums today vs all days separately from egrParts kind:diuresis', () => {
    const model = buildCardioGlanceModel(
      { monitoreo },
      { todayYmd: '2026-08-22' },
    );
    assert.equal(model.diuresis.hoyMl, 650);
    assert.equal(model.diuresis.acumuladaMl, 1450);
  });

  it('skips non-quantified ("NC") diuresis entries when summing', () => {
    const model = buildCardioGlanceModel(
      {
        monitoreo: {
          historial: [
            { recordedAt: '2026-08-22T08:00:00.000Z', io: { egrParts: [{ kind: 'diuresis', value: 'NC' }] } },
          ],
        },
      },
      { todayYmd: '2026-08-22' },
    );
    assert.equal(model.diuresis.hoyMl, null);
    assert.equal(model.diuresis.acumuladaMl, null);
  });

  it('sums furosemida acumulada from diureticSegments via sumFurosemidaMg', () => {
    const model = buildCardioGlanceModel(
      {
        cardio: {
          diureticSegments: [
            { tipo: 'Furosemida', inicio: '2026-08-20', dosis: '40 mg IV cada 12h', endedAt: null },
          ],
        },
      },
      { asOfDate: '2026-08-22' },
    );
    // 80 mg/día × 3 días (20,21,22)
    assert.equal(model.diuresis.furosemidaAcumuladaMg, 240);
    assert.equal(model.diuresis.activeDiureticCount, 1);
  });
});

describe('buildCardioGlanceModel — Resumen chips (Part C, Phase 7)', () => {
  it('defaults chips to blank/empty when there is no device, score, or lab data', () => {
    const model = buildCardioGlanceModel({ cardio: {} });
    assert.equal(model.chips.dispositivo, '');
    assert.equal(model.chips.nyha, '');
    assert.equal(model.chips.ntProBnp, '');
  });

  it('shows the device tipo when colocado is true', () => {
    const model = buildCardioGlanceModel({
      cardio: { device: { colocado: true, tipo: 'TRC-D' } },
    });
    assert.equal(model.chips.dispositivo, 'TRC-D');
  });

  it('shows "Indicado, no colocado" when there is an indication but nothing implanted', () => {
    const model = buildCardioGlanceModel({
      cardio: { device: { tieneIndicacion: true, colocado: false } },
    });
    assert.equal(model.chips.dispositivo, 'Indicado, no colocado');
  });

  it('reads NYHA actual from the most recent cardio.scores entry', () => {
    const model = buildCardioGlanceModel({
      cardio: {
        scores: [
          { date: '2026-08-01', nyha: 'I' },
          { date: '2026-08-20', nyha: 'III' },
        ],
      },
    });
    assert.equal(model.chips.nyha, 'III');
  });

  it('extracts the most recent NT-proBNP value across labSets (last match wins)', () => {
    const model = buildCardioGlanceModel(
      { cardio: {} },
      {
        labSets: [
          { resLabs: ['CARD: NT-PROBNP 5000'] },
          { resLabs: ['CARD: NT-PROBNP 1200 pg/mL'] },
        ],
      },
    );
    assert.equal(model.chips.ntProBnp, '1200');
  });
});

describe('buildCardioGlanceModel — GDMT', () => {
  it('marks a pillar active only when a drug is set', () => {
    const model = buildCardioGlanceModel({
      cardio: {
        fantasticos: [
          { className: 'IECA/ARA/ARNI', drug: 'Sacubitril/Valsartán', dosis: '97/103 mg c/12h' },
          { className: 'SGLT2i', drug: '', dosis: '' },
          { className: 'Betabloqueador', drug: 'Carvedilol', dosis: '25 mg c/12h' },
          { className: 'MRA', drug: '', dosis: '' },
        ],
      },
    });
    assert.deepEqual(
      model.gdmt.map((f) => f.active),
      [true, false, true, false],
    );
    assert.equal(model.gdmt[0].drug, 'Sacubitril/Valsartán');
  });
});

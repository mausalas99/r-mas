import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLocalTodayKey,
  isSavedAtLocalToday,
  needsHcDraft,
  needsEaSaved,
  countOverdueTodos,
  countDueProcedimientos,
  cultivoNeedsFollowUp,
  countCultivosNeedingFollowUp,
  primaryCtaForGaps,
  entregaPrepStatusLine,
  entregaPrepPrimaryActionLabel,
  buildEntregaPrepRows,
} from './entrega-prep-checklist.mjs';

const NOW = new Date('2026-07-21T18:00:00.000Z');

describe('formatLocalTodayKey / isSavedAtLocalToday', () => {
  it('pads YYYY-MM-DD', () => {
    assert.equal(formatLocalTodayKey(new Date(2026, 6, 21)), '2026-07-21');
    assert.equal(formatLocalTodayKey(new Date(2026, 0, 5)), '2026-01-05');
  });

  it('recognizes savedAt on the same local day', () => {
    var localNoon = new Date(2026, 6, 21, 12, 0, 0);
    assert.equal(isSavedAtLocalToday(localNoon.toISOString(), localNoon), true);
    assert.equal(isSavedAtLocalToday(null, localNoon), false);
    assert.equal(
      isSavedAtLocalToday(new Date(2026, 6, 20, 23, 0, 0).toISOString(), localNoon),
      false
    );
  });
});

describe('needsHcDraft', () => {
  it('true when missing or empty', () => {
    assert.equal(needsHcDraft(null), true);
    assert.equal(needsHcDraft({}), true);
    assert.equal(needsHcDraft({ motivoConsulta: '  ', padecimientoActual: '' }), true);
  });

  it('false when motivo or padecimiento present', () => {
    assert.equal(needsHcDraft({ motivoConsulta: 'Dolor', padecimientoActual: '' }), false);
    assert.equal(needsHcDraft({ motivoConsulta: '', padecimientoActual: 'Inicio hace 2d' }), false);
  });
});

describe('needsEaSaved', () => {
  it('true when never saved or not today', () => {
    assert.equal(needsEaSaved(null, NOW), true);
    assert.equal(needsEaSaved({ text: 'ok', savedAt: null }, NOW), true);
    assert.equal(
      needsEaSaved({ text: 'ok', savedAt: '2026-07-20T12:00:00.000Z' }, NOW),
      true
    );
  });

  it('true when saved today but empty text', () => {
    var local = new Date(2026, 6, 21, 10, 0, 0);
    assert.equal(
      needsEaSaved({ text: '  ', savedAt: local.toISOString() }, local),
      true
    );
  });

  it('false when saved today with text', () => {
    var local = new Date(2026, 6, 21, 10, 0, 0);
    assert.equal(
      needsEaSaved({ text: 'Estable', savedAt: local.toISOString() }, local),
      false
    );
  });
});

describe('countOverdueTodos / countDueProcedimientos', () => {
  it('counts incomplete overdue todos only', () => {
    assert.equal(
      countOverdueTodos(
        [
          { completed: false, dueDate: '2026-07-20T12:00:00.000Z' },
          { completed: true, dueDate: '2026-07-20T12:00:00.000Z' },
          { completed: false, dueDate: '2026-07-22T12:00:00.000Z' },
          { completed: false },
        ],
        NOW
      ),
      1
    );
  });

  it('counts past scheduled procedimientos', () => {
    assert.equal(
      countDueProcedimientos(
        [
          { scheduledAt: '2026-07-21T10:00:00.000Z' },
          { scheduledAt: '2026-07-22T10:00:00.000Z' },
          { scheduledAt: '2026-07-20T10:00:00.000Z', completedAt: 'x' },
          { label: 'sin hora' },
        ],
        NOW
      ),
      1
    );
  });
});

describe('cultivoNeedsFollowUp', () => {
  it('ignores negativos and empty organismo', () => {
    assert.equal(cultivoNeedsFollowUp({ negativo: true, organismo: 'Negativo' }), false);
    assert.equal(cultivoNeedsFollowUp({ organismo: '—' }), false);
  });

  it('flags pendiente or missing antibiograma', () => {
    assert.equal(
      cultivoNeedsFollowUp({ organismo: 'E. COLI PENDIENTE', resistencias: 'S: CIPRO' }),
      true
    );
    assert.equal(
      cultivoNeedsFollowUp({ organismo: 'E. COLI', resistencias: '—' }),
      true
    );
    assert.equal(
      cultivoNeedsFollowUp({ organismo: 'E. COLI', resistencias: 'S: CIPRO' }),
      false
    );
  });

  it('countCultivosNeedingFollowUp', () => {
    assert.equal(
      countCultivosNeedingFollowUp([
        { organismo: 'E. COLI', resistencias: '' },
        { negativo: true, organismo: 'Negativo' },
        { organismo: 'PSEUDOMONAS', resistencias: 'S: MERO' },
      ]),
      1
    );
  });
});

describe('primaryCtaForGaps / labels', () => {
  it('priority pendientes > ea > hc > cultivos', () => {
    assert.equal(primaryCtaForGaps(['hc', 'ea', 'pendientes']), 'pendientes');
    assert.equal(primaryCtaForGaps(['hc', 'ea']), 'ea');
    assert.equal(primaryCtaForGaps(['hc', 'cultivos']), 'hc');
    assert.equal(primaryCtaForGaps(['cultivos']), 'cultivos');
  });

  it('status and action labels in Spanish', () => {
    assert.match(
      entregaPrepStatusLine(['hc', 'ea'], {}),
      /HC incompleta.*EA sin guardar hoy/
    );
    assert.match(
      entregaPrepStatusLine(['pendientes'], { overdueTodoCount: 2, dueProcedimientoCount: 0 }),
      /2 pendientes vencidos/
    );
    assert.equal(entregaPrepPrimaryActionLabel('ea'), 'Abrir estado actual');
    assert.equal(entregaPrepPrimaryActionLabel('cultivos'), 'Abrir cultivos');
  });
});

describe('buildEntregaPrepRows', () => {
  it('includes / excludes and sorts by gap weight', () => {
    var local = new Date(2026, 6, 21, 15, 0, 0);
    var patients = [
      { id: 'p1', nombre: 'Zapata', cuarto: '1', cama: 'A' },
      { id: 'p2', nombre: 'García', cuarto: '2' },
      { id: 'p3', nombre: 'Álvarez' },
      { id: 'p4', nombre: 'Quiet' },
    ];
    var rows = buildEntregaPrepRows(patients, {
      now: local,
      hcByPatient: {
        p1: {},
        p2: { motivoConsulta: 'Cealea' },
        p3: { padecimientoActual: 'Fiebre' },
        p4: { motivoConsulta: 'Control' },
      },
      eaByPatient: {
        p1: { text: 'x', savedAt: local.toISOString() },
        p2: null,
        p3: { text: 'ok', savedAt: local.toISOString() },
        p4: { text: 'ok', savedAt: local.toISOString() },
      },
      todosByPatient: {
        p1: [{ completed: false, dueDate: '2026-07-20T12:00:00.000Z' }],
        p2: [],
        p3: [],
        p4: [],
      },
      procedimientosByPatient: {
        p1: [],
        p2: [],
        p3: [{ scheduledAt: '2026-07-20T08:00:00.000Z' }],
        p4: [],
      },
      cultivosByPatient: {
        p1: [],
        p2: [{ organismo: 'E. COLI', resistencias: '—' }],
        p3: [],
        p4: [{ organismo: 'E. COLI', resistencias: 'S: CIPRO' }],
      },
    });

    var byId = Object.create(null);
    rows.forEach(function (r) {
      byId[r.id] = r;
    });

    assert.ok(byId.p1);
    assert.deepEqual(byId.p1.gaps, ['hc', 'pendientes']);
    assert.equal(byId.p1.primaryCta, 'pendientes');
    assert.equal(byId.p1.hint, '1 · A');
    assert.equal(byId.p1.overdueTodoCount, 1);

    assert.ok(byId.p2);
    assert.ok(byId.p2.gaps.indexOf('ea') !== -1);
    assert.ok(byId.p2.gaps.indexOf('cultivos') !== -1);

    assert.ok(byId.p3);
    assert.deepEqual(byId.p3.gaps, ['pendientes']);
    assert.equal(byId.p3.dueProcedimientoCount, 1);

    assert.equal(byId.p4, undefined, 'complete handoff');

    assert.equal(rows[0].id, 'p1', 'pendientes-weighted first');
  });
});

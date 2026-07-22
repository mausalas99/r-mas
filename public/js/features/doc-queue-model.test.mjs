import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  formatLocalTodayFecha,
  countOpenTodos,
  hasLabSetsOnFecha,
  hasNewLabsNeedingDocs,
  primaryCtaForReasons,
  docQueueReasonLabels,
  docQueueStatusLine,
  docQueuePrimaryActionLabel,
  buildDocQueueRows,
} = await import('./doc-queue-model.mjs');

const TODAY = '21/07/2026';
const identityNorm = function (raw) {
  return String(raw || '').trim();
};

test('formatLocalTodayFecha pads DD/MM/YYYY', () => {
  assert.equal(formatLocalTodayFecha(new Date(2026, 6, 21)), '21/07/2026');
  assert.equal(formatLocalTodayFecha(new Date(2026, 0, 5)), '05/01/2026');
});

test('countOpenTodos ignores completed', () => {
  assert.equal(countOpenTodos([{ completed: false }, { completed: true }, {}]), 2);
  assert.equal(countOpenTodos([]), 0);
});

test('hasLabSetsOnFecha', () => {
  assert.equal(
    hasLabSetsOnFecha([{ fecha: TODAY }], TODAY, identityNorm),
    true
  );
  assert.equal(
    hasLabSetsOnFecha([{ fecha: '20/07/2026' }], TODAY, identityNorm),
    false
  );
});

test('hasNewLabsNeedingDocs — empty estudios or note fecha ≠ today', () => {
  var labs = [{ fecha: TODAY }];
  assert.equal(hasNewLabsNeedingDocs({ estudios: '' }, labs, TODAY, identityNorm), true);
  assert.equal(
    hasNewLabsNeedingDocs({ estudios: 'BH', fecha: '20/07/2026' }, labs, TODAY, identityNorm),
    true
  );
  assert.equal(
    hasNewLabsNeedingDocs({ estudios: 'BH', fecha: TODAY }, labs, TODAY, identityNorm),
    false
  );
  assert.equal(
    hasNewLabsNeedingDocs({ estudios: 'BH', fecha: TODAY }, [{ fecha: '20/07/2026' }], TODAY, identityNorm),
    false
  );
});

test('primaryCtaForReasons', () => {
  assert.equal(primaryCtaForReasons(['labs']), 'labs');
  assert.equal(primaryCtaForReasons(['pendientes']), 'pendientes');
  assert.equal(primaryCtaForReasons(['labs', 'pendientes']), 'nota');
});

test('buildDocQueueRows includes / excludes and sorts', () => {
  var patients = [
    { id: 'p1', nombre: 'Zapata', cuarto: '1', cama: 'A' },
    { id: 'p2', nombre: 'García', cuarto: '2' },
    { id: 'p3', nombre: 'Álvarez' },
    { id: 'p4', nombre: 'Quiet' },
  ];
  var rows = buildDocQueueRows(patients, {
    todayFecha: TODAY,
    normalizeFecha: identityNorm,
    labHistoryByPatient: {
      p1: [{ fecha: TODAY }],
      p2: [{ fecha: TODAY }],
      p3: [],
      p4: [{ fecha: TODAY }],
    },
    notesByPatient: {
      p1: { estudios: '', fecha: TODAY },
      p2: { estudios: 'QS', fecha: TODAY },
      p3: {},
      p4: { estudios: 'BH', fecha: TODAY },
    },
    todosByPatient: {
      p1: [{ completed: false }],
      p2: [],
      p3: [{ completed: false }, { completed: false }],
      p4: [{ completed: true }],
    },
  });

  var byId = Object.create(null);
  rows.forEach(function (r) {
    byId[r.id] = r;
  });

  assert.ok(byId.p1, 'labs + pendientes');
  assert.deepEqual(byId.p1.reasons, ['labs', 'pendientes']);
  assert.equal(byId.p1.primaryCta, 'nota');
  assert.equal(byId.p1.hint, '1 · A');
  assert.equal(byId.p1.openTodoCount, 1);

  assert.equal(byId.p2, undefined, 'labs today but note caught up');

  assert.ok(byId.p3, 'pendientes only');
  assert.deepEqual(byId.p3.reasons, ['pendientes']);
  assert.equal(byId.p3.primaryCta, 'pendientes');
  assert.equal(byId.p3.openTodoCount, 2);

  assert.equal(byId.p4, undefined, 'caught-up labs + no open todos');

  assert.equal(rows[0].id, 'p1', 'both reasons sort first');
  assert.match(docQueueReasonLabels(['labs', 'pendientes']), /Labs hoy/);
  assert.match(docQueueStatusLine(['labs'], 0), /sin nota|nota/i);
  assert.match(docQueueStatusLine(['pendientes'], 2), /2 pendientes/);
  assert.equal(docQueuePrimaryActionLabel('labs'), 'Abrir laboratorio');
  assert.equal(docQueuePrimaryActionLabel('nota'), 'Abrir nota');
});

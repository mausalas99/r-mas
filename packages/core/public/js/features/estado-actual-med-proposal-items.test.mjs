import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmMedProposalItem, discardMedProposalItem } from './estado-actual-med-ui.mjs';

function monitoreo(pending, confirmedText = '') {
  return {
    pendienteReceta: { analgesia: pending },
    estadoClinico: { analgesia: confirmedText },
  };
}

test('confirm moves one drug and keeps the rest pending', () => {
  const m = monitoreo('A | B | C');
  confirmMedProposalItem(m, 'analgesia', 1);
  assert.equal(m.estadoClinico.analgesia, 'B');
  assert.equal(m.pendienteReceta.analgesia, 'A | C');
  assert.equal(m.confirmado.analgesia, true);
});

test('confirm does not duplicate a drug already confirmed', () => {
  const m = monitoreo('A | B', 'A');
  confirmMedProposalItem(m, 'analgesia', 0);
  assert.equal(m.estadoClinico.analgesia, 'A');
  assert.equal(m.pendienteReceta.analgesia, 'B');
});

test('out-of-range index changes nothing', () => {
  const m = monitoreo('A | B');
  confirmMedProposalItem(m, 'analgesia', 5);
  assert.equal(m.pendienteReceta.analgesia, 'A | B');
  assert.equal(m.estadoClinico.analgesia, '');
});

test('discard drops one drug; last drug dismisses the proposal', () => {
  const m = monitoreo('A | B');
  discardMedProposalItem(m, 'analgesia', 0);
  assert.equal(m.pendienteReceta.analgesia, 'B');
  assert.equal(m.recetaProposalDismissed, undefined);
  discardMedProposalItem(m, 'analgesia', 0);
  assert.equal(m.pendienteReceta.analgesia, '');
  assert.equal(m.recetaProposalDismissed.analgesia, true);
});

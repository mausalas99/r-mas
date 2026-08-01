import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backfillDietPendingMacrosFromReceta } from './estado-actual-meds-diet.mjs';
import {
  applyDietProposalFromRecetaBlock,
  confirmDietProposal,
  discardDietProposal,
  hasPendingEaProposals,
  estadoClinicoForDisplay,
} from './estado-actual-meds.mjs';
import { emptyMonitoreo } from './estado-actual-data.mjs';

test('confirmDietProposal copia dieta, kcal y proteinG', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'NORMAL PICADA (2000 kcal, 70 g prot)';
  m.pendienteReceta.kcal = '2000';
  m.pendienteReceta.proteinG = '70';
  confirmDietProposal(m);
  assert.equal(m.estadoClinico.dieta, 'NORMAL PICADA');
  assert.equal(m.estadoClinico.kcal, '2000');
  assert.equal(m.estadoClinico.proteinG, '70');
  assert.equal(m.pendienteReceta.dieta, '');
  assert.equal(m.confirmado.dieta, true);
});

test('confirmDietProposal suplemento descarta kcal y proteína stale', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'SUPLEMENTO';
  m.pendienteReceta.kcal = '2000';
  m.pendienteReceta.proteinG = '70';
  confirmDietProposal(m);
  assert.equal(m.estadoClinico.dieta, 'SUPLEMENTO');
  assert.equal(m.estadoClinico.kcal, '');
  assert.equal(m.estadoClinico.proteinG, '');
  assert.equal(m.pendienteReceta.kcal, '');
  assert.equal(m.pendienteReceta.proteinG, '');
});

test('estadoClinicoForDisplay suplemento omite kcal stale de propuesta', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'SUPLEMENTO';
  m.pendienteReceta.kcal = '2000';
  m.pendienteReceta.proteinG = '70';
  const ec = estadoClinicoForDisplay(m);
  assert.equal(ec.dieta, 'SUPLEMENTO');
  assert.equal(ec.kcal, '');
  assert.equal(ec.proteinG, '');
});

test('hasPendingEaProposals detecta dieta pendiente', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.proteinG = '70';
  assert.equal(hasPendingEaProposals(m.pendienteReceta), true);
});

test('discardDietProposal limpia paquete nutricional pendiente', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'X';
  m.pendienteReceta.kcal = '2000';
  m.pendienteReceta.proteinG = '70';
  discardDietProposal(m);
  assert.equal(m.pendienteReceta.dieta, '');
  assert.equal(m.pendienteReceta.proteinG, '');
});

test('applyDietProposalFromRecetaBlock copia dieta desde block.dietas', () => {
  const m = emptyMonitoreo();
  const block = {
    dietas: [
      {
        descripcionRaw: 'BLANDA PICADA ALTA EN FIBRA',
        kcal: 1500,
        proteinG: 60,
      },
    ],
  };
  assert.equal(applyDietProposalFromRecetaBlock(m, block), true);
  assert.equal(m.pendienteReceta.dieta, 'BLANDA PICADA ALTA EN FIBRA');
  assert.equal(m.pendienteReceta.kcal, '1500');
  assert.equal(m.pendienteReceta.proteinG, '60');
  assert.equal(m.confirmado.dieta, false);
  const ec = estadoClinicoForDisplay(m);
  assert.equal(ec.dieta, 'BLANDA PICADA ALTA EN FIBRA');
  assert.equal(ec.kcal, '1500');
  assert.equal(ec.proteinG, '60');
});

test('applyDietProposalFromRecetaBlock ayuno omite kcal y proteína', () => {
  const m = emptyMonitoreo();
  const block = {
    dietas: [{ descripcionRaw: 'AYUNO', kcal: null, proteinG: null }],
  };
  assert.equal(applyDietProposalFromRecetaBlock(m, block), true);
  assert.equal(m.pendienteReceta.dieta, 'AYUNO');
  assert.equal(m.pendienteReceta.kcal, '');
  assert.equal(m.pendienteReceta.proteinG, '');
});

test('applyDietProposalFromRecetaBlock suplemento omite kcal y proteína', () => {
  const m = emptyMonitoreo();
  const block = {
    dietas: [{ descripcionRaw: 'SUPLEMENTO', kcal: 500, proteinG: 20 }],
  };
  assert.equal(applyDietProposalFromRecetaBlock(m, block), true);
  assert.equal(m.pendienteReceta.dieta, 'SUPLEMENTO');
  assert.equal(m.pendienteReceta.kcal, '');
  assert.equal(m.pendienteReceta.proteinG, '');
});

test('applyDietProposalFromRecetaBlock normal a suplemento limpia calóricos pendientes', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'NORMAL PICADA';
  m.pendienteReceta.kcal = '2000';
  m.pendienteReceta.proteinG = '70';
  m.pendienteReceta.kcalKg = '28';
  const block = {
    dietas: [{ descripcionRaw: 'SUPLEMENTO', kcal: 500, proteinG: 20 }],
  };
  assert.equal(applyDietProposalFromRecetaBlock(m, block, { force: true }), true);
  assert.equal(m.pendienteReceta.dieta, 'SUPLEMENTO');
  assert.equal(m.pendienteReceta.kcal, '');
  assert.equal(m.pendienteReceta.proteinG, '');
  assert.equal(m.pendienteReceta.kcalKg, '');
});

test('applyDietProposalFromRecetaBlock no pisa propuesta pendiente sin force', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'YA PENDIENTE';
  const block = { dietas: [{ descripcionRaw: 'NUEVA', kcal: 1200, proteinG: 50 }] };
  assert.equal(applyDietProposalFromRecetaBlock(m, block), false);
  assert.equal(m.pendienteReceta.dieta, 'YA PENDIENTE');
});

test('applyDietProposalFromRecetaBlock force actualiza propuesta en reimport', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'VIEJA';
  const block = { dietas: [{ descripcionRaw: 'NUEVA', kcal: 1200, proteinG: 50 }] };
  assert.equal(applyDietProposalFromRecetaBlock(m, block, { force: true }), true);
  assert.equal(m.pendienteReceta.dieta, 'NUEVA');
});

test('applyDietProposalFromRecetaBlock no repropone dieta ya confirmada', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = 'BLANDA PICADA ALTA EN FIBRA';
  m.estadoClinico.kcal = '1500';
  m.estadoClinico.proteinG = '60';
  m.confirmado.dieta = true;
  const block = { dietas: [{ descripcionRaw: 'BLANDA PICADA ALTA EN FIBRA', kcal: 1500, proteinG: 60 }] };
  assert.equal(applyDietProposalFromRecetaBlock(m, block), false);
  assert.equal(m.pendienteReceta.dieta, '');
});

test('applyDietProposalFromRecetaBlock auto-confirma dieta SOME ya reflejada en estado clínico', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = 'BLANDA PICADA ALTA EN FIBRA';
  m.estadoClinico.kcal = '1500';
  m.estadoClinico.proteinG = '60';
  m.confirmado.dieta = false;
  const block = { dietas: [{ descripcionRaw: 'BLANDA PICADA ALTA EN FIBRA', kcal: 1500, proteinG: 60 }] };
  assert.equal(applyDietProposalFromRecetaBlock(m, block), true);
  assert.equal(m.confirmado.dieta, true);
  assert.equal(m.pendienteReceta.dieta, '');
});

test('applyDietProposalFromRecetaBlock passive sync no repropone tras auto-confirm', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = 'BLANDA PICADA ALTA EN FIBRA';
  m.estadoClinico.kcal = '1500';
  m.estadoClinico.proteinG = '60';
  m.confirmado.dieta = false;
  const block = { dietas: [{ descripcionRaw: 'BLANDA PICADA ALTA EN FIBRA', kcal: 1500, proteinG: 60 }] };
  assert.equal(applyDietProposalFromRecetaBlock(m, block), true);
  assert.equal(applyDietProposalFromRecetaBlock(m, block), false);
  assert.equal(m.pendienteReceta.dieta, '');
});

test('applyDietProposalFromRecetaBlock propone dieta SOME aunque ec.dieta tenga texto sin confirmar', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = 'SUPLEMENTO';
  const block = { dietas: [{ descripcionRaw: 'NORMAL DIABETICA ALTA EN FIBRA', kcal: 1500, proteinG: 60 }] };
  assert.equal(applyDietProposalFromRecetaBlock(m, block), true);
  assert.equal(m.pendienteReceta.dieta, 'NORMAL DIABETICA ALTA EN FIBRA');
  assert.equal(m.pendienteReceta.kcal, '1500');
});

test('applyDietProposalFromRecetaBlock no repropone suplemento confirmado con kcal SOME', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = 'SUPLEMENTO';
  m.confirmado.dieta = true;
  const block = { dietas: [{ descripcionRaw: 'SUPLEMENTO', kcal: 500, proteinG: 20 }] };
  assert.equal(applyDietProposalFromRecetaBlock(m, block), false);
  assert.equal(m.pendienteReceta.dieta, '');
});

test('applyDietProposalFromRecetaBlock confirmar suplemento y sync pasivo no repropone', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = '*SUPLEMENTO';
  m.pendienteReceta.kcal = '500';
  m.pendienteReceta.proteinG = '20';
  const block = { dietas: [{ descripcionRaw: 'SUPLEMENTO', kcal: 500, proteinG: 20 }] };
  confirmDietProposal(m);
  assert.equal(m.confirmado.dieta, true);
  assert.equal(m.pendienteReceta.dieta, '');
  assert.equal(applyDietProposalFromRecetaBlock(m, block), false);
  assert.equal(m.pendienteReceta.dieta, '');
});

test('applyDietProposalFromRecetaBlock confirmar NORMAL y sync pasivo no repropone', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'NORMAL (1750 kcal, 70 g prot)';
  m.pendienteReceta.kcal = '1750';
  m.pendienteReceta.proteinG = '70';
  const block = { dietas: [{ descripcionRaw: 'NORMAL', kcal: 1750, proteinG: 70 }] };
  confirmDietProposal(m);
  assert.equal(m.estadoClinico.dieta, 'NORMAL');
  assert.equal(m.confirmado.dieta, true);
  assert.equal(m.pendienteReceta.dieta, '');
  assert.equal(applyDietProposalFromRecetaBlock(m, block), false);
  assert.equal(m.pendienteReceta.dieta, '');
});

test('applyDietProposalFromRecetaBlock no repropone NORMAL confirmado con kcal SOME', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = 'NORMAL';
  m.estadoClinico.kcal = '1750';
  m.estadoClinico.proteinG = '70';
  m.confirmado.dieta = true;
  const block = { dietas: [{ descripcionRaw: 'NORMAL', kcal: 1750, proteinG: 70 }] };
  assert.equal(applyDietProposalFromRecetaBlock(m, block), false);
  assert.equal(m.pendienteReceta.dieta, '');
});

test('applyDietProposalFromRecetaBlock no repropone NORMAL confirmado sin macros SOME', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = 'NORMAL';
  m.confirmado.dieta = true;
  const block = { dietas: [{ descripcionRaw: 'NORMAL', kcal: 1750, proteinG: 70 }] };
  assert.equal(applyDietProposalFromRecetaBlock(m, block), false);
  assert.equal(m.pendienteReceta.dieta, '');
  assert.equal(m.confirmado.dieta, true);
});

test('confirmDietProposal + sync pasivo no repropone NORMAL sin macros en ec', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'NORMAL';
  const block = { dietas: [{ descripcionRaw: 'NORMAL', kcal: 1750, proteinG: 70 }] };
  confirmDietProposal(m);
  assert.equal(m.estadoClinico.dieta, 'NORMAL');
  assert.equal(m.confirmado.dieta, true);
  assert.equal(applyDietProposalFromRecetaBlock(m, block), false);
  assert.equal(m.pendienteReceta.dieta, '');
});

test('backfillDietPendingMacrosFromReceta copia kcal SOME antes de confirmar', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'NORMAL';
  const block = { dietas: [{ descripcionRaw: 'NORMAL', kcal: 1750, proteinG: 70 }] };
  backfillDietPendingMacrosFromReceta(m, block);
  assert.equal(m.pendienteReceta.kcal, '1750');
  assert.equal(m.pendienteReceta.proteinG, '70');
  confirmDietProposal(m);
  assert.equal(m.estadoClinico.kcal, '1750');
  assert.equal(m.estadoClinico.proteinG, '70');
  assert.equal(applyDietProposalFromRecetaBlock(m, block), false);
});

test('applyDietProposalFromRecetaBlock force propone cambio sobre dieta confirmada distinta', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = 'SUPLEMENTO';
  m.confirmado.dieta = true;
  const block = { dietas: [{ descripcionRaw: 'NORMAL DIABETICA ALTA EN FIBRA', kcal: 1500, proteinG: 60 }] };
  assert.equal(applyDietProposalFromRecetaBlock(m, block, { force: true }), true);
  assert.equal(m.pendienteReceta.dieta, 'NORMAL DIABETICA ALTA EN FIBRA');
  assert.equal(m.estadoClinico.dieta, 'SUPLEMENTO');
});

test('applyDietProposalFromRecetaBlock propone cambio desde AYUNO confirmado sin force', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = 'AYUNO';
  m.confirmado.dieta = true;
  const block = {
    dietas: [{ descripcionRaw: 'ASTRINGENTE ALTA EN FIBRA', kcal: 1750, proteinG: 90 }],
  };
  assert.equal(applyDietProposalFromRecetaBlock(m, block), true);
  assert.equal(m.pendienteReceta.dieta, 'ASTRINGENTE ALTA EN FIBRA');
  assert.equal(m.pendienteReceta.kcal, '1750');
  assert.equal(m.pendienteReceta.proteinG, '90');
  assert.equal(m.estadoClinico.dieta, 'AYUNO');
  assert.equal(m.confirmado.dieta, false);
});

test('estadoClinicoForDisplay muestra propuesta de dieta pendiente', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.dieta = 'BLANDA';
  m.estadoClinico.proteinG = '';
  m.pendienteReceta.dieta = 'NORMAL ALTA EN FIBRA';
  m.pendienteReceta.kcal = '2000';
  m.pendienteReceta.proteinG = '80';
  const ec = estadoClinicoForDisplay(m);
  assert.equal(ec.dieta, 'NORMAL ALTA EN FIBRA');
  assert.equal(ec.kcal, '2000');
  assert.equal(ec.proteinG, '80');
});

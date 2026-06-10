import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRecetaProposal,
  confirmMedField,
  confirmDietProposal,
  discardDietProposal,
  hasPendingEaProposals,
  discardMedProposal,
  confirmAllMedProposals,
  buildMedDropdownOptions,
  bucketsFromRecetaItems,
  estadoClinicoForDisplay,
  estadoClinicoForText,
  syncRecetaProposalsFromSoapSelection,
} from './estado-actual-meds.mjs';
import { emptyMonitoreo } from './estado-actual-data.mjs';
import { classifyMedicationSoapCategory } from '../med-receta-core.mjs';

test('applyRecetaProposal skips confirmed fields', () => {
  const m = emptyMonitoreo();
  m.confirmado.abx = true;
  m.estadoClinico.abx = 'ERTAPENEM 1G';
  applyRecetaProposal(m, { abx: 'MEROPENEM 1G' });
  assert.equal(m.estadoClinico.abx, 'ERTAPENEM 1G');
  assert.equal(m.pendienteReceta.abx, '');
});

test('applyRecetaProposal sets pendienteReceta for unconfirmed keys', () => {
  const m = emptyMonitoreo();
  applyRecetaProposal(m, { analgesia: 'PARACETAMOL 1G VO', abx: 'CEFTRIAXONA 1G IV' });
  assert.equal(m.pendienteReceta.analgesia, 'PARACETAMOL 1G VO');
  assert.equal(m.pendienteReceta.abx, 'CEFTRIAXONA 1G IV');
});

test('confirmMedField copies pendiente to estadoClinico', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.abx = 'CEFTRIAXONA 1G';
  confirmMedField(m, 'abx');
  assert.equal(m.estadoClinico.abx, 'CEFTRIAXONA 1G');
  assert.equal(m.confirmado.abx, true);
  assert.equal(m.pendienteReceta.abx, '');
});

test('discardMedProposal clears pendiente without touching estadoClinico', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.vasop = 'NORADRENALINA';
  m.pendienteReceta.vasop = 'DOPAMINA 5 MCG/KG/MIN';
  discardMedProposal(m, 'vasop');
  assert.equal(m.pendienteReceta.vasop, '');
  assert.equal(m.estadoClinico.vasop, 'NORADRENALINA');
});

test('confirmDietProposal copia dieta, kcal y proteinG', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'NORMAL PICADA (2000 kcal, 70 g prot)';
  m.pendienteReceta.kcal = '2000';
  m.pendienteReceta.proteinG = '70';
  confirmDietProposal(m);
  assert.equal(m.estadoClinico.dieta, 'NORMAL PICADA (2000 kcal, 70 g prot)');
  assert.equal(m.estadoClinico.kcal, '2000');
  assert.equal(m.estadoClinico.proteinG, '70');
  assert.equal(m.pendienteReceta.dieta, '');
  assert.equal(m.confirmado.dieta, true);
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

test('confirmAllMedProposals confirms every pending field', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.analgesia = 'KETOROLAC 30 MG';
  m.pendienteReceta.antihta = 'LOSARTAN 50 MG';
  confirmAllMedProposals(m);
  assert.equal(m.estadoClinico.analgesia, 'KETOROLAC 30 MG');
  assert.equal(m.estadoClinico.antihta, 'LOSARTAN 50 MG');
  assert.equal(m.confirmado.analgesia, true);
  assert.equal(m.confirmado.antihta, true);
});

test('bucketsFromRecetaItems classifies SOAP selections', () => {
  const items = [
    {
      id: 'a',
      nombreRaw: 'PARACETAMOL 1G TABLETA',
      viaRaw: 'VIA ORAL',
      dosisRaw: '1 G',
      frecuenciaRaw: 'CADA 8 HORAS',
      suspendido: false,
    },
    {
      id: 'b',
      nombreRaw: 'MEROPENEM 1G',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '1 G',
      frecuenciaRaw: 'CADA 24 HORAS',
      suspendido: false,
    },
  ];
  const sel = { a: true, b: true };
  const buckets = bucketsFromRecetaItems(items, sel, classifyMedicationSoapCategory);
  assert.match(buckets.analgesia, /PARACETAMOL.*C\/8H/i);
  assert.match(buckets.abx, /MEROPENEM.*IV.*C\/24H/i);
  assert.equal(buckets.antihta, '');
  assert.equal(buckets.vasop, '');
});

test('bucketsFromRecetaItems — otros sin destino no van a abx', () => {
  const items = [
    {
      id: 'o',
      nombreRaw: 'OMEPRAZOL 40 MG',
      viaRaw: 'VIA ORAL',
      dosisRaw: '40 MG',
      frecuenciaRaw: 'CADA 24 HORAS',
      suspendido: false,
    },
    {
      id: 'a',
      nombreRaw: 'OMEPRAZOL 40 MG',
      viaRaw: 'VIA ORAL',
      dosisRaw: '40 MG',
      frecuenciaRaw: 'CADA 24 HORAS',
      soapCatOverride: 'nm',
      suspendido: false,
    },
  ];
  const sel = { o: true, a: true };
  const buckets = bucketsFromRecetaItems(items, sel, classifyMedicationSoapCategory);
  assert.equal(buckets.abx, '');
  assert.match(buckets.nm, /OMEPRAZOL/i);
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

test('estadoClinicoForText merges unconfirmed pendienteReceta into empty fields', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.analgesia = 'PARACETAMOL 1G VO';
  m.confirmado.analgesia = false;
  const ec = estadoClinicoForText(m);
  assert.equal(ec.analgesia, 'PARACETAMOL 1G VO');
});

test('estadoClinicoForText incluye proteinG pendiente en dieta', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.dieta = 'NORMAL ALTA EN FIBRA';
  m.pendienteReceta.kcal = '2000';
  m.pendienteReceta.proteinG = '80';
  const ec = estadoClinicoForText(m);
  assert.equal(ec.proteinG, '80');
});

test('syncRecetaProposalsFromSoapSelection applies SOAP-marked receta', () => {
  const m = emptyMonitoreo();
  const medRecetaByPatient = {
    p1: {
      items: [
        {
          id: 'a',
          nombreRaw: 'PARACETAMOL 1G TABLETA',
          viaRaw: 'VIA ORAL',
          dosisRaw: '1 G',
          frecuenciaRaw: 'CADA 8 HORAS',
          suspendido: false,
        },
      ],
    },
  };
  const sel = { a: true };
  const ok = syncRecetaProposalsFromSoapSelection(
    'p1',
    m,
    medRecetaByPatient,
    { p1: sel },
    classifyMedicationSoapCategory
  );
  assert.equal(ok, true);
  assert.match(String(m.pendienteReceta.analgesia), /PARACETAMOL/i);
});

test('buildMedDropdownOptions lists active receta items for category', () => {
  const medRecetaByPatient = {
    p1: {
      items: [
        {
          id: '1',
          nombreRaw: 'MEROPENEM 1G',
          viaRaw: 'VIA INTRAVENOSA',
          dosisRaw: '1 G',
          frecuenciaRaw: 'CADA 8 HORAS',
          suspendido: false,
        },
        {
          id: '2',
          nombreRaw: 'PARACETAMOL 1G TABLETA',
          viaRaw: 'VIA ORAL',
          dosisRaw: '1 G',
          frecuenciaRaw: 'CADA 8 HORAS',
          suspendido: true,
        },
      ],
    },
  };
  const abxOpts = buildMedDropdownOptions('p1', 'abx', medRecetaByPatient, classifyMedicationSoapCategory);
  assert.equal(abxOpts.length, 1);
  assert.match(abxOpts[0], /MEROPENEM.*IV/i);
});

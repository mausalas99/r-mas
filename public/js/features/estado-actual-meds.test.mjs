import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRecetaProposal,
  confirmMedField,
  discardMedProposal,
  confirmAllMedProposals,
  buildMedDropdownOptions,
  bucketsFromRecetaItems,
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
      nombreRaw: 'CEFTRIAXONA 1G',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '1 G',
      frecuenciaRaw: 'CADA 24 HORAS',
      suspendido: false,
    },
  ];
  const sel = { a: true, b: true };
  const buckets = bucketsFromRecetaItems(items, sel, classifyMedicationSoapCategory);
  assert.match(buckets.analgesia, /PARACETAMOL.*C\/8H/i);
  assert.match(buckets.abx, /CEFTRIAXONA.*IV.*C\/24H/i);
  assert.equal(buckets.antihta, '');
  assert.equal(buckets.vasop, '');
});

test('estadoClinicoForText merges unconfirmed pendienteReceta into empty fields', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.analgesia = 'PARACETAMOL 1G VO';
  m.confirmado.analgesia = false;
  const ec = estadoClinicoForText(m);
  assert.equal(ec.analgesia, 'PARACETAMOL 1G VO');
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

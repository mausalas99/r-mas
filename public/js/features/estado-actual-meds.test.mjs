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
  pruneEstadoClinicoMedsFromReceta,
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

test('applyRecetaProposal limpia pendiente cuando la categoría queda vacía en SOME', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.abx = 'CEFTRIAXONA 1G IV';
  applyRecetaProposal(m, { abx: '' });
  assert.equal(m.pendienteReceta.abx, '');
});

test('pruneEstadoClinicoMedsFromReceta quita medicamentos ausentes del nuevo manejo', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.abx = 'MEROPENEM 1G IV C/8H | CEFTRIAXONA 1G IV C/24H';
  m.confirmado.abx = true;
  const items = [
    {
      id: '1',
      nombreRaw: 'MEROPENEM 1 G',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '1 G',
      frecuenciaRaw: 'CADA 8 HORAS',
      suspendido: false,
    },
  ];
  const changed = pruneEstadoClinicoMedsFromReceta(m, items, classifyMedicationSoapCategory, '');
  assert.equal(changed, true);
  assert.match(m.estadoClinico.abx, /MEROPENEM/i);
  assert.doesNotMatch(m.estadoClinico.abx, /CEFTRIAXONA/i);
});

test('syncRecetaProposalsFromSoapSelection poda y propone desde nuevo SOME', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.analgesia = 'KETOROLACO 30 MG IV C/8H';
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
  assert.equal(m.estadoClinico.analgesia, '');
  assert.match(String(m.pendienteReceta.analgesia), /PARACETAMOL/i);
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

test('confirm bomba NM + sync pasivo no repropone (igual que dieta)', () => {
  const insulin = {
    id: 'ins-1',
    nombreRaw: 'INSULINA HUMANA RAPIDA',
    viaRaw: 'VIA INTRAVENOSA',
    dosisRaw: '100 UI',
    frecuenciaRaw: '-',
    suspendido: false,
  };
  const carrier = {
    id: 'nacl-1',
    nombreRaw: 'CLORURO DE SODIO 0.9 % SOL INY 100 ML',
    viaRaw: 'VIA INTRAVENOSA',
    dosisRaw: '100 ML / VEL.INF: BOMBA EN ALGORITMO 2',
    frecuenciaRaw: 'CADA 24 HORAS',
    suspendido: false,
  };
  const medRecetaByPatient = { p1: { items: [carrier, insulin] } };
  const sel = { 'ins-1': true };
  const m = emptyMonitoreo();
  assert.equal(
    syncRecetaProposalsFromSoapSelection(
      'p1',
      m,
      medRecetaByPatient,
      { p1: sel },
      classifyMedicationSoapCategory
    ),
    true
  );
  assert.equal(m.pendienteReceta.nm, 'BOMBA DE INSULINA EN ALGORITMO 2');
  confirmMedField(m, 'nm');
  assert.equal(m.estadoClinico.nm, 'BOMBA DE INSULINA EN ALGORITMO 2');
  assert.equal(m.confirmado.nm, true);
  assert.equal(m.pendienteReceta.nm, '');
  syncRecetaProposalsFromSoapSelection(
    'p1',
    m,
    medRecetaByPatient,
    { p1: sel },
    classifyMedicationSoapCategory
  );
  assert.equal(m.confirmado.nm, true);
  assert.equal(m.estadoClinico.nm, 'BOMBA DE INSULINA EN ALGORITMO 2');
  assert.equal(m.pendienteReceta.nm, '');
});

test('estadoClinicoForText avanza DIA de abx según fecha de Manejo', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.abx = 'MEROPENEM 1G IV C/8H DIA 10';
  const ref = new Date(2026, 5, 12);
  const ec = estadoClinicoForText(m, { fechaActualizacion: '10/06/2026', refDate: ref });
  assert.match(ec.abx, /DIA 12/);
});

test('estadoClinicoForText avanza abx pendiente no confirmado', () => {
  const m = emptyMonitoreo();
  m.pendienteReceta.abx = 'CEFTRIAXONA 1G IV DIA 5';
  const ref = new Date(2026, 5, 14);
  const ec = estadoClinicoForText(m, { fechaActualizacion: '10/06/2026', refDate: ref });
  assert.match(ec.abx, /DIA 9/);
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
  assert.match(abxOpts[0].value, /MEROPENEM.*IV/i);
  assert.match(abxOpts[0].label, /MEROPENEM.*IV/i);
});

test('buildMedDropdownOptions abx label avanza DIA, value conserva base', () => {
  const medRecetaByPatient = {
    p1: {
      fechaActualizacion: '10/06/2026',
      items: [
        {
          id: '1',
          nombreRaw: 'MEROPENEM 1 G',
          viaRaw: 'VIA INTRAVENOSA',
          dosisRaw: '1 G // *DIA# 10*',
          frecuenciaRaw: 'CADA 8 HORAS',
          diaTratamiento: 10,
          suspendido: false,
        },
      ],
    },
  };
  const ref = new Date(2026, 5, 12);
  const opts = buildMedDropdownOptions('p1', 'abx', medRecetaByPatient, classifyMedicationSoapCategory, ref);
  assert.match(opts[0].value, /DIA 10/);
  const ec = estadoClinicoForText(
    (() => {
      const m = emptyMonitoreo();
      m.estadoClinico.abx = opts[0].value;
      return m;
    })(),
    { fechaActualizacion: '10/06/2026', refDate: ref }
  );
  assert.match(ec.abx, /DIA 12/);
  assert.match(
    opts[0].label,
    /DIA 12/,
    'label muestra día efectivo para lectura en UI'
  );
});

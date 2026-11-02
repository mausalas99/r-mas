/**
 * Double entry + property checks for IV → oral conversion (receta only).
 * Method A: a hand-written table of answers from public references (prednisone
 * 5 mg = hydrocortisone 20 mg = methylprednisolone 4 mg; ketorolac IV→PO 10 mg;
 * ciprofloxacin 400 IV → 500 PO; 1:1 for the rest). Method B: the code.
 * Synthetic items only.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyIvToOralForEgreso } from './med-receta-iv-oral.mjs';
import { formatMedicationSoapShort } from './med-receta-format.mjs';
import { medInstructionFragmentForSoap } from './features/estado-actual-meds-receta-buckets.mjs';

const IV = 'VIA INTRAVENOSA';
const mk = (nombreRaw, dosisRaw, viaRaw = IV) => ({ nombreRaw, viaRaw, dosisRaw, frecuenciaRaw: 'CADA 8 HORAS' });
const oralMg = (o) => {
  const m = /^(\d+(?:\.\d+)?)\s*(G|MG)\b/.exec(o.dosisRaw);
  return m ? parseFloat(m[1]) * (m[2] === 'G' ? 1000 : 1) : NaN;
};

// [name, IV dose, expected oral stem, expected oral mg, expected units]
const TABLE = [
  ['PARACETAMOL 1 G SOL INY', '1 G //', 'PARACETAMOL', 1000, 2],
  ['OMEPRAZOL 40 MG SOL INY', '40 MG //', 'OMEPRAZOL', 40, 2],
  ['PANTOPRAZOL 40 MG SOL INY', '40 MG //', 'PANTOPRAZOL', 40, 1],
  ['DEXAMETASONA 8 MG SOL INY', '8 MG //', 'DEXAMETASONA', 8, 2],
  ['LEVETIRACETAM 500 MG SOL INY', '500 MG //', 'LEVETIRACETAM', 500, 1],
  ['LEVOFLOXACINO 750 MG SOL INY', '750 MG //', 'LEVOFLOXACINO', 750, 1],
  ['LINEZOLID 600 MG SOL INY', '600 MG //', 'LINEZOLID', 600, 1],
  ['FLUCONAZOL 200 MG SOL INY', '200 MG //', 'FLUCONAZOL', 200, 2],
  ['KETOROLACO 30 MG SOL INY', '30 MG //', 'KETOROLACO', 10, 1],
  ['CIPROFLOXACINO 400 MG SOL INY', '400 MG //', 'CIPROFLOXACINO', 500, 1],
  // hydrocortisone 20 = prednisone 5
  ['HIDROCORTISONA 20 MG SOL INY', '20 MG //', 'PREDNISONA', 5, 1],
  ['HIDROCORTISONA 100 MG SOL INY', '100 MG //', 'PREDNISONA', 25, 1],
  ['HIDROCORTISONA 200 MG SOL INY', '200 MG //', 'PREDNISONA', 50, 1],
  ['HIDROCORTISONA 400 MG SOL INY', '400 MG //', 'PREDNISONA', 100, 2],
  // methylprednisolone 4 = prednisone 5
  ['METILPREDNISOLONA 4 MG SOL INY', '4 MG //', 'PREDNISONA', 5, 1],
  ['METILPREDNISOLONA 16 MG SOL INY', '16 MG //', 'PREDNISONA', 20, 1],
  ['METILPREDNISOLONA 40 MG SOL INY', '40 MG //', 'PREDNISONA', 50, 1],
];

describe('IV→oral double entry (hand table vs code)', () => {
  for (const [name, dose, stem, mg, units] of TABLE) {
    it(name + ' ' + dose, () => {
      const out = applyIvToOralForEgreso(mk(name, dose));
      assert.equal(out.viaRaw, 'VIA ORAL');
      assert.ok(out.nombreRaw.startsWith(stem), out.nombreRaw);
      assert.equal(oralMg(out), mg);
      assert.equal(out.oralEquiv.units, units);
    });
  }
});

describe('IV→oral: stays IV (flagged by being unchanged), never invented', () => {
  const STAY = [
    ['METILPREDNISOLONA 125 MG', '125 MG //'], // pred 156.25 mg: no real tablet
    ['METILPREDNISOLONA 1 G', '1 G //'], // pulse dose
    ['HIDROCORTISONA 300 MG', '300 MG //'], // pred 75 mg: no real tablet
    ['PARACETAMOL 1 G', '1.000 MG //'], // 1.000 = one or one thousand
    ['PARACETAMOL 1 G', '1,000 MG //'],
    ['PARACETAMOL 1 G', '0 MG //'],
    ['PARACETAMOL 1 G', '500 MCG //'],
    ['PARACETAMOL 1 G', '1 G 500 MG //'],
    ['PARACETAMOL 1 G', ''],
  ];
  for (const [n, d] of STAY) {
    it(n + ' | ' + d, () => {
      const item = mk(n, d);
      assert.deepEqual(applyIvToOralForEgreso(item), item);
    });
  }
});

describe('Estado Actual never shows a converted route', () => {
  it('IV paracetamol stays IV in the Estado Actual fragment, VO in receta', () => {
    const item = mk('PARACETAMOL 1 G SOL INY 100 ML', '1 G //');
    assert.equal(medInstructionFragmentForSoap(item), 'PARACETAMOL 1 G IV C/8H');
    assert.equal(formatMedicationSoapShort(item), 'PARACETAMOL 1 G VO C/8H');
  });
});

/**
 * Flagged for the owner: the code keeps the dose 1:1 (or caps it). Public references
 * do not give one clinical answer. These pin today's output so any change is seen.
 */
describe('IV→oral flagged cases (owner decision, pinned)', () => {
  const FLAG = [
    ['FUROSEMIDA 20 MG SOL INY', '20 MG //', 20], // many references: oral = 2 × IV
    ['ONDANSETRON 4 MG SOL INY', '4 MG //', 4], // many references: 4 IV ≈ 8 PO
    ['CLINDAMICINA 900 MG SOL INY', '900 MG //', 300], // IV 900 → PO 300 cuts the dose
    ['ACICLOVIR 500 MG SOL INY', '500 MG //', 500], // IV is mg/kg; no 500 mg tablet
    ['DEXAMETASONA 6 MG SOL INY', '6 MG //', 6], // no 6 mg tablet in the catalog
    ['KETOROLACO 12 MG SOL INY', '12 MG //', 12], // no 12 mg tablet
    ['CIPROFLOXACINO 200 MG SOL INY', '200 MG //', 200], // no 200 mg tablet in catalog
  ];
  for (const [n, d, mg] of FLAG) {
    it(n, () => assert.equal(oralMg(applyIvToOralForEgreso(mk(n, d))), mg));
  }
});

// ---- property test (seeded, repeatable) ----
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const pick = (r, a) => a[Math.floor(r() * a.length)];

const CONVERTIBLE_1TO1 = ['PARACETAMOL', 'OMEPRAZOL', 'PANTOPRAZOL', 'ESOMEPRAZOL', 'ONDANSETRON', 'METOCLOPRAMIDA', 'METRONIDAZOL', 'DEXAMETASONA', 'LEVETIRACETAM', 'LEVOFLOXACINO', 'MOXIFLOXACINO', 'LINEZOLID', 'FLUCONAZOL', 'TRAMADOL', 'HALOPERIDOL', 'FUROSEMIDA'];
const NEVER = ['MEROPENEM', 'VANCOMICINA', 'CEFTRIAXONA', 'HEPARINA', 'INSULINA', 'NORADRENALINA', 'CLORURO DE POTASIO', 'ENOXAPARINA', 'DEXTROSA', 'FENTANILO'];
const STEROIDS = { HIDROCORTISONA: 0.25, METILPREDNISOLONA: 1.25 };
const DOSES = ['0.5', '1', '2', '4', '5', '8', '10', '15', '20', '25', '30', '40', '50', '100', '200', '400', '500', '600', '750', '1000'];
const ROUTES = [IV, IV, 'VIA ORAL', 'VIA SUBCUTANEA', 'VIA INTRAMUSCULAR', 'VIA TOPICA'];

function randomItem(r) {
  const kind = r();
  let name;
  if (kind < 0.5) name = pick(r, CONVERTIBLE_1TO1);
  else if (kind < 0.7) name = pick(r, Object.keys(STEROIDS));
  else name = pick(r, NEVER);
  const unitG = r() < 0.2;
  const dose = unitG ? pick(r, ['0.5', '1', '1.5', '2']) + ' G' : pick(r, DOSES) + ' MG';
  const prn = r() < 0.25 ? ' PRN DOLOR' : '';
  const item = mk(name + ' ' + dose + ' SOL INY', dose + ' //' + prn, pick(r, ROUTES));
  item.suspendido = r() < 0.1;
  return { name, item, mg: parseFloat(dose) * (unitG ? 1000 : 1) };
}

describe('IV→oral property: converted or unchanged, never silently altered', () => {
  it('2000 seeded random items', () => {
  const r = rng(20261016);
  for (let i = 0; i < 2000; i++) {
    const { name, item, mg } = randomItem(r);
    const before = JSON.stringify(item);
    const out = applyIvToOralForEgreso(item);
    if (JSON.stringify(item) !== before) assert.fail('input mutated: ' + before);
    if (out === item || JSON.stringify(out) === before) {
      // unchanged is always allowed; route and dose must be identical
      assert.deepEqual(out, item);
      continue;
    }
    const tag = before + ' => ' + JSON.stringify(out);
    // only a live IV item may change
    assert.equal(item.viaRaw, IV, tag);
    assert.equal(item.suspendido, false, tag);
    assert.ok(!NEVER.includes(name), 'never-convert drug converted: ' + tag);
    assert.equal(out.viaRaw, 'VIA ORAL', tag);
    // PRN tail survives
    if (/PRN/.test(item.dosisRaw)) assert.match(out.dosisRaw, /\/\/\s*PRN DOLOR$/, tag);
    // dose: 1:1, or the documented steroid factor
    const got = oralMg(out);
    if (name in STEROIDS) {
      assert.equal(out.nombreRaw.startsWith('PREDNISONA'), true, tag);
      assert.ok(Math.abs(got - mg * STEROIDS[name]) < 1e-9, 'steroid dose off: ' + tag);
    } else {
      assert.ok(Math.abs(got - mg) < 1e-9, 'dose changed: ' + tag);
    }
    // pack math: units × unit strength = oral dose
    assert.ok(Math.abs(out.oralEquiv.units * out.oralEquiv.unitMg - got) < 1e-9, 'pack != dose: ' + tag);
    // second pass changes nothing (already oral)
    assert.deepEqual(applyIvToOralForEgreso(out), out, tag);
  }
  });
});

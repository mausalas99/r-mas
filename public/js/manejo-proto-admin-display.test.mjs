import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adminNoteOverlapsEntryNotes,
  isMessySomeOrder,
  looksLikeSomeBlock,
  resolveClinicalTextAdminView,
  resolveProtocolAdminView,
  schematizeAdminDose,
} from './manejo-proto-admin-display.mjs';
import { calcAlbuminParacentesis, calcSedationMgPerHour } from './manejo-calculators.mjs';
import { protocolToSomeOrder } from './manejo-some-format.mjs';
import { MANEJO_PATHOLOGIES } from './manejo-pathology-catalog.mjs';
import { MANEJO_PROTOCOLS } from './manejo-protocols-catalog.mjs';

test('looksLikeSomeBlock detecta bloque SOME', () => {
  assert.equal(looksLikeSomeBlock('MEDICAMENTO: NORE\nDOSIS: 16 MG'), true);
  assert.equal(looksLikeSomeBlock('900 mcg en 100 cc'), false);
});

test('isMessySomeOrder marca parsing ruidoso de buprenorfina', () => {
  var entry = MANEJO_PROTOCOLS.find(function (p) {
    return p.id === 'buprenorphine-infusion';
  });
  assert.equal(isMessySomeOrder(protocolToSomeOrder(entry, null)), true);
});

test('resolveProtocolAdminView unifica nitroglicerina SL como grid DOSIS/VÍA', () => {
  var entry = MANEJO_PROTOCOLS.find(function (p) {
    return p.id === 'nitro-sublingual-eap';
  });
  var view = resolveProtocolAdminView(entry, protocolToSomeOrder(entry, null));
  assert.deepEqual(
    view.rows.map(function (row) {
      return row.label;
    }),
    ['Dosis', 'Vía']
  );
  assert.match(
    view.rows[0].lines
      ? view.rows[0].lines.map(function (line) {
          return line.text;
        }).join(' ')
      : view.rows[0].value,
    /0\.4 mg c\/5 min × 3 dosis/i
  );
  assert.equal(view.rows[1].value, 'SL');
  assert.match(view.note, /infusión IV titulada/i);
  assert.doesNotMatch(view.rows[0].value, /×\s*$/);
});

test('todas las infusiones usan solo filas Dosis y Vía', () => {
  MANEJO_PROTOCOLS.forEach(function (entry) {
    var view = resolveProtocolAdminView(entry, protocolToSomeOrder(entry, null));
    view.rows.forEach(function (row) {
      assert.match(row.label, /^(Dosis|Vía)$/);
    });
  });
});

test('resolveProtocolAdminView mantiene layout de morfina', () => {
  var entry = MANEJO_PROTOCOLS.find(function (p) {
    return p.id === 'morphine-eap-bolus';
  });
  var view = resolveProtocolAdminView(entry, protocolToSomeOrder(entry, null));
  assert.deepEqual(
    view.rows.map(function (row) {
      return row.label;
    }),
    ['Dosis', 'Vía']
  );
  assert.equal(view.rows[0].value, '2–4 mg');
  assert.equal(view.rows[1].value, 'IV');
  assert.match(view.note, /hipotensión/i);
});

test('resolveProtocolAdminView colapsa dilución y velocidad en grid Morfina', () => {
  var entry = MANEJO_PROTOCOLS.find(function (p) {
    return p.id === 'nore-standard';
  });
  var view = resolveProtocolAdminView(entry, protocolToSomeOrder(entry, null));
  assert.deepEqual(
    view.rows.map(function (row) {
      return row.label;
    }),
    ['Dosis', 'Vía']
  );
  assert.match(view.rows[0].value, /16 mg/i);
  assert.equal(view.rows[1].value, 'IV');
  assert.match(view.note, /mcg\/min/i);
});

test('resolveClinicalTextAdminView unifica regímenes con flecha', () => {
  var view = resolveClinicalTextAdminView(
    'Omeprazol 80 mg bolo → 8 mg/h × 72 h (200 mg en 250 cc a 10 cc/h) o pantoprazol equivalente.'
  );
  assert.equal(view.drug, 'Omeprazol');
  assert.deepEqual(
    view.rows.map(function (row) {
      return row.label;
    }),
    ['Dosis', 'Vía']
  );
  assert.match(view.rows[0].lines ? view.rows[0].lines[0].text : view.rows[0].value, /80 mg bolo/i);
  assert.equal(view.rows[1].value, 'IV');
  assert.match(view.note, /8 mg\/h/i);
  assert.match(view.note, /pantoprazol/i);
});

test('schematizeAdminDose desglosa propofol con calculadora', () => {
  var entry = MANEJO_PROTOCOLS.find(function (p) {
    return p.id === 'propofol-infusion';
  });
  var calc = calcSedationMgPerHour({ weightKg: 65, drug: 'propofol' });
  var view = resolveProtocolAdminView(entry, protocolToSomeOrder(entry, calc));
  assert.ok(view.rows[0].lines && view.rows[0].lines.length >= 3);
  assert.match(view.rows[0].lines[0].text, /5–20 mcg\/kg\/min/i);
  assert.ok(
    view.rows[0].lines.some(function (line) {
      return /no diluir/i.test(line.text);
    })
  );
  assert.equal(view.note, '');
});

test('schematizeAdminDose separa bundles multi-fármaco', () => {
  var entry = MANEJO_PROTOCOLS.find(function (p) {
    return p.id === 'sedation-iot-bundle';
  });
  var lines = schematizeAdminDose(entry.indicationText, entry.title);
  assert.ok(lines.length >= 3);
  assert.ok(
    lines.some(function (line) {
      return /midazolam/i.test(line.tag);
    })
  );
});

test('schematizeAdminDose desglosa albumina post-paracentesis', () => {
  var entry = MANEJO_PROTOCOLS.find(function (p) {
    return p.id === 'albumin-paracentesis';
  });
  var calc = calcAlbuminParacentesis({ litersRemoved: 12 });
  var view = resolveProtocolAdminView(entry, protocolToSomeOrder(entry, calc));
  assert.ok(view.rows[0].lines.length >= 3);
  assert.ok(
    view.rows[0].lines.some(function (line) {
      return line.tag === 'Regla';
    })
  );
  assert.ok(
    view.rows[0].lines.some(function (line) {
      return line.tag === 'Calculado';
    })
  );
  assert.match(view.note, /ampolla/i);
});

test('todas las infusiones evitan bloque Detalle único largo', () => {
  MANEJO_PROTOCOLS.forEach(function (entry) {
    var view = resolveProtocolAdminView(entry, protocolToSomeOrder(entry, null));
    var dose = view.rows[0];
    if (!dose || !dose.lines) return;
    if (dose.lines.length === 1 && dose.lines[0].tag === 'Detalle') {
      assert.ok(dose.lines[0].text.length <= 40, entry.id + ' sigue con detalle largo');
    }
  });
});

test('resolveClinicalTextAdminView cubre ítems de patologías con dosis', () => {
  var lactulosa = resolveClinicalTextAdminView(
    '30 ml c/1–2 h hasta evacuación → 15–30 ml c/6–8 h. Meta 2–3 evacuaciones blandas/día.',
    { label: 'Lactulosa (primera línea)' }
  );
  assert.ok(lactulosa);
  assert.equal(lactulosa.drug, 'Lactulosa (primera línea)');
  assert.match(lactulosa.note, /Meta 2–3/i);

  var rifaximina = resolveClinicalTextAdminView(
    '550 mg c/12 h en grados 2–4 o encefalopatía recurrente.',
    { label: 'Rifaximina' }
  );
  assert.ok(rifaximina);
  assert.equal(rifaximina.rows[0].value, '550 mg c/12 h');
  assert.ok(!rifaximina.rows[0].lines);
  assert.equal(rifaximina.rows[1].value, 'VO');
  assert.match(rifaximina.note, /grados 2–4/i);

  var dissection = resolveClinicalTextAdminView(
    'Labetalol IV o esmolol + nitroprusiato. Meta PAS 100–120 mmHg en 20 min.'
  );
  assert.ok(dissection);
  assert.ok(dissection.rows[0].lines && dissection.rows[0].lines.length >= 2);

  var nicardipino = resolveClinicalTextAdminView(
    'Alternativa: nicardipino 5 mg/h, titular 2.5 mg/h c/5–15 min (máx 15 mg/h).',
    { title: 'Encefalopatía / ACV' }
  );
  assert.ok(nicardipino);
  assert.equal(nicardipino.drug, 'Nicardipino');
  assert.ok(
    nicardipino.rows.some(function (row) {
      return /nicardipino|5 mg\/h/i.test(row.value || (row.lines && row.lines[0] && row.lines[0].text) || '');
    })
  );
});

test('catálogo de patologías usa grid admin en textos farmacológicos', () => {
  var admin = 0;
  var fallback = 0;
  MANEJO_PATHOLOGIES.forEach(function (pathology) {
    (pathology.sections || []).forEach(function (section) {
      (section.items || []).forEach(function (item) {
        if (!item.text) return;
        if (resolveClinicalTextAdminView(item.text, { label: item.label, title: section.title })) {
          admin++;
        } else {
          fallback++;
        }
      });
    });
  });
  assert.ok(admin >= 45, 'admin=' + admin);
  assert.ok(fallback <= 16, 'fallback=' + fallback);
});

test('adminNoteOverlapsEntryNotes evita duplicar alertas', () => {
  assert.equal(
    adminNoteOverlapsEntryNotes('Riesgo de depresión respiratoria con sedantes', [
      'Riesgo de depresión respiratoria con sedantes',
    ]),
    true
  );
  assert.equal(adminNoteOverlapsEntryNotes('', ['Otra nota']), false);
});

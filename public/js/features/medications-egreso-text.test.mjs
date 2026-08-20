import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMedEgresoFullLine,
  formatMedEgresoNameDiaLine,
  buildMedEgresoListLines,
  buildMedEgresoDietSummaryLine,
  buildMedEgresoPreviewLine,
} from './medications-egreso-text.mjs';

describe('medications-egreso-text', () => {
  var ceftriaxona = {
    nombreRaw: 'CEFTRIAXONA 1 G SOL INY',
    viaRaw: 'VIA INTRAVENOSA',
    dosisRaw: '1 G //',
    frecuenciaRaw: 'CADA 12 HORAS',
    diaTratamiento: 3,
  };
  var enoxaparinaNoDay = {
    nombreRaw: 'ENOXAPARINA 40 MG SOL INY',
    viaRaw: 'VIA SUBCUTANEA',
    dosisRaw: '40 MG //',
    frecuenciaRaw: 'CADA 24 HORAS',
    diaTratamiento: null,
  };

  describe('formatMedEgresoFullLine', () => {
    it('keeps full order line content but drops the raw "||" EMR marker', () => {
      var line = formatMedEgresoFullLine(ceftriaxona);
      assert.ok(!line.includes('||'), 'must not leak the raw clipboard separator');
      assert.match(line, /CEFTRIAXONA/);
      assert.match(line, /DÍA 3/);
    });
  });

  describe('formatMedEgresoNameDiaLine', () => {
    it('drug name + day count when a day is tracked', () => {
      assert.equal(formatMedEgresoNameDiaLine(ceftriaxona), 'CEFTRIAXONA 1 G SOLUCIÓN INYECTABLE (día 3)');
    });

    it('omits the day count gracefully when not tracked', () => {
      var line = formatMedEgresoNameDiaLine(enoxaparinaNoDay);
      assert.ok(!/día/i.test(line), 'must not fabricate a day count');
      assert.match(line, /ENOXAPARINA/);
    });
  });

  describe('buildMedEgresoListLines', () => {
    var items = [ceftriaxona, enoxaparinaNoDay, { ...ceftriaxona, suspendido: true }];

    it('excludes suspended items in both modes', () => {
      var full = buildMedEgresoListLines(items, {}, 'full');
      var simple = buildMedEgresoListLines(items, {}, 'simple');
      assert.equal(full.length, 2);
      assert.equal(simple.length, 2);
    });

    it('simple mode never includes the raw "||" marker either', () => {
      var simple = buildMedEgresoListLines(items, {}, 'simple');
      simple.forEach((line) => assert.ok(!line.includes('||')));
    });
  });

  describe('buildMedEgresoDietSummaryLine', () => {
    it('formats description + kcal + protein when present', () => {
      var block = {
        dietas: [{ id: 'd1', descripcionRaw: 'Dieta blanda diabética', kcal: 1000, proteinG: 72 }],
        items: [],
      };
      assert.equal(
        buildMedEgresoDietSummaryLine(block),
        'Dieta blanda diabética 1000 kcal · 72 g proteína'
      );
    });

    it('returns empty string when there is no confirmed diet', () => {
      assert.equal(buildMedEgresoDietSummaryLine({ dietas: [], items: [] }), '');
    });
  });

  describe('buildMedEgresoPreviewLine', () => {
    var oxigeno = { nombreRaw: 'OXIGENO MASCARILLA RESERVORIO', viaRaw: '', dosisRaw: '', frecuenciaRaw: '' };

    it('summarizes med count only when there is no diet or apoyo', () => {
      var block = { items: [ceftriaxona, enoxaparinaNoDay], dietas: [] };
      assert.equal(buildMedEgresoPreviewLine(block), '2 medicamentos');
    });

    it('uses singular "medicamento" for a single item', () => {
      var block = { items: [ceftriaxona], dietas: [] };
      assert.equal(buildMedEgresoPreviewLine(block), '1 medicamento');
    });

    it('appends diet description and apoyo label when present', () => {
      var block = {
        items: [ceftriaxona, oxigeno],
        dietas: [{ id: 'd1', descripcionRaw: 'Dieta blanda diabética' }],
      };
      assert.equal(buildMedEgresoPreviewLine(block), '1 medicamento · Dieta blanda diabética · O₂');
    });

    it('never fabricates a diet or apoyo segment that is not present', () => {
      assert.equal(buildMedEgresoPreviewLine({ items: [], dietas: [] }), '0 medicamentos');
      assert.equal(buildMedEgresoPreviewLine(null), '0 medicamentos');
    });
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMergedTrendSeriesCatalog } from './tendencias-catalog.mjs';

test('buildMergedTrendSeriesCatalog no resucita la clave retirada QS.BUNCR', () => {
  var history = [
    {
      parsedBySection: {
        QS: { BUN: '16', Cr: '1.6', BUNCR: '10' },
      },
    },
  ];
  var specs = buildMergedTrendSeriesCatalog(history);
  var keys = specs.map(function (s) {
    return s.sectionKey + '|' + s.fieldKey;
  });
  assert.ok(!keys.includes('QS|BUNCR'), 'BUNCR (sin slash) no debe aparecer como serie');
  assert.ok(keys.includes('QS|BUN/CR'), 'BUN/CR sigue en el catálogo estático');
});

test('buildMergedTrendSeriesCatalog sí agrega claves dinámicas nuevas no declaradas', () => {
  var history = [{ parsedBySection: { QS: { NuevoAnalito: '5' } } }];
  var specs = buildMergedTrendSeriesCatalog(history);
  var keys = specs.map(function (s) {
    return s.sectionKey + '|' + s.fieldKey;
  });
  assert.ok(keys.includes('QS|NuevoAnalito'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventTagsRowWidths, measureDataColumnWidths } from './tend-export-render.mjs';

function mockCtx() {
  return {
    font: '',
    measureText: (t) => ({ width: String(t || '').length * 6 }),
  };
}

test('eventTagsRowWidths sums every tag box, not just the widest one', () => {
  const ctx = mockCtx();
  const tags = [{ text: '1 CE' }, { text: '4 Plaq' }, { text: '3 Plas' }];
  const { widths, total } = eventTagsRowWidths(ctx, tags);
  assert.equal(widths.length, 3);
  const expectedTotal = widths.reduce((a, b) => a + b, 0) + 2 * (widths.length - 1);
  assert.equal(total, expectedTotal);
  assert.ok(total > Math.max(...widths), 'total debe ser mayor que la etiqueta más ancha sola');
});

test('measureDataColumnWidths reserva espacio para todas las etiquetas juntas', () => {
  const ctx = mockCtx();
  const theme = { cellPad: 4, colMin: 40, colMax: 200 };
  const fonts = { fontHeader: '700 11px sans-serif', font: '11px sans-serif', fontBold: '600 11px sans-serif' };
  const col = {
    header: '16/08/2026',
    eventTags: [{ text: '1 CE' }, { text: '4 Plaq' }, { text: '3 Plas' }],
  };
  const model = { columns: [col] };
  const rows = [{ cells: [{ text: '5.61*' }] }];
  const [colWidth] = measureDataColumnWidths(ctx, model, theme, [col], rows, fonts, false);
  const { total } = eventTagsRowWidths(ctx, col.eventTags);
  assert.ok(colWidth >= total, 'la columna debe ser al menos tan ancha como la fila de etiquetas');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrendAxisMeta } from '../tend-core.mjs';
import {
  inferEventualidadKind,
  resolveEventualidadKind,
  pickHigherPriorityKind,
  eventualidadDateToIso,
} from './eventualidades-store.mjs';
import {
  dayKeyFromLabSet,
  mapEventMarkersToChartIndices,
  buildTendDetailEventsLegendHtml,
  eventTooltipLinesForChartIndex,
} from './tendencias-event-context.mjs';

test('dayKeyFromLabSet matches eventualidad day key', () => {
  const set = { fecha: '05/08/2026', hora: '08:30' };
  const labDay = dayKeyFromLabSet(set);
  const evDay = '2026-08-05';
  assert.equal(labDay, evDay);
});

test('mapEventMarkersToChartIndices marks first point per day only', () => {
  const setsAsc = [
    { fecha: '01/08/2026', hora: '08:00' },
    { fecha: '01/08/2026', hora: '14:00' },
    { fecha: '03/08/2026', hora: '08:00' },
  ];
  const axisMeta = buildTrendAxisMeta(setsAsc);
  const markers = new Map([
    [
      '2026-08-01',
      {
        kind: 'transfusion',
        entries: [{ id: 'ev1', at: eventualidadDateToIso('2026-08-01'), text: '2 U GR', kind: 'transfusion' }],
      },
    ],
  ]);
  const mapped = mapEventMarkersToChartIndices(axisMeta, markers);
  assert.deepEqual(mapped.indices, [0]);
  assert.equal(mapped.byIndex.get(0).kind, 'transfusion');
});

test('pickHigherPriorityKind and resolveEventualidadKind', () => {
  assert.equal(resolveEventualidadKind({ kind: 'biopsia', text: 'TRANSFUSIÓN' }), 'biopsia');
  assert.equal(inferEventualidadKind('BIOPSIA RENAL'), 'biopsia');
  assert.equal(pickHigherPriorityKind('procedimiento', 'transfusion'), 'transfusion');
});

test('buildTendDetailEventsLegendHtml and tooltip lines', () => {
  const markerMap = {
    indices: [1],
    byIndex: new Map([
      [
        1,
        {
          kind: 'biopsia',
          entries: [{ id: 'ev2', text: 'Biopsia renal', kind: 'biopsia' }],
        },
      ],
    ]),
  };
  const html = buildTendDetailEventsLegendHtml(markerMap, ['01/08', '03/08', '05/08']);
  assert.match(html, /Biopsia/);
  assert.match(html, /03\/08/);
  const lines = eventTooltipLinesForChartIndex(markerMap, 1);
  assert.equal(lines[0], 'Biopsia: Biopsia renal');
});

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
  eventLegendDateLabel,
  eventTooltipLinesForChartIndex,
  eventMarkerTagText,
  eventMarkerTagSpecs,
  buildEventMarkerTagsHtml,
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

test('eventMarkerTagText joins abbreviated labels', () => {
  assert.equal(
    eventMarkerTagText({
      kind: 'transfusion',
      entries: [
        { kind: 'transfusion', transfusionProduct: 'plaquetas', text: 'PLAQUETAS — 6' },
        { kind: 'transfusion', transfusionProduct: 'plasma', text: 'PLASMA — 2' },
      ],
    }),
    '6 Plaq · 2 Plas'
  );
  assert.equal(
    eventMarkerTagText({
      kind: 'transfusion',
      entries: [
        { kind: 'transfusion', transfusionProduct: 'eritrocitos', text: 'ERITROCITOS — 1' },
        { kind: 'transfusion', transfusionProduct: 'plaquetas', text: 'PLAQUETAS — 4' },
        { kind: 'transfusion', transfusionProduct: 'plasma', text: 'PLASMA — 3' },
        { kind: 'biopsia', text: 'Médula' },
      ],
    }),
    '1 CE · 4 Plaq · 3 Plas +1'
  );
});

test('eventMarkerTagSpecs lists short chips for export', () => {
  const specs = eventMarkerTagSpecs({
    kind: 'transfusion',
    entries: [
      { kind: 'transfusion', transfusionProduct: 'plaquetas', text: 'PLAQUETAS — 4' },
      { kind: 'transfusion', transfusionProduct: 'plasma', text: 'PLASMA — 2' },
    ],
  });
  assert.deepEqual(specs, [
    { text: '4 Plaq', kind: 'transfusion' },
    { text: '2 Plas', kind: 'transfusion' },
  ]);
});

test('buildEventMarkerTagsHtml renders display chips', () => {
  const html = buildEventMarkerTagsHtml({
    kind: 'transfusion',
    entries: [
      { id: 'ev-ce', kind: 'transfusion', transfusionProduct: 'eritrocitos', text: 'ERITROCITOS — 2 U' },
    ],
  });
  assert.match(html, /tend-event-tag--transfusion/);
  assert.match(html, />2 CE</);
  assert.doesNotMatch(html, /data-tend-ev-edit/);
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
  assert.match(html, /03\/08/);
  assert.match(html, />Bx</);
  assert.doesNotMatch(html, /tend-event-legend-kind/);
  assert.doesNotMatch(html, /tend-event-legend-entry/);
  const lines = eventTooltipLinesForChartIndex(markerMap, 1);
  assert.equal(lines[0], 'Biopsia: Biopsia renal');
});

test('buildTendDetailEventsLegendHtml is one day block with compact manage', () => {
  const markerMap = {
    indices: [0],
    byIndex: new Map([
      [
        0,
        {
          kind: 'transfusion',
          entries: [
            { id: 'ev-plaq', text: 'PLAQUETAS — 6', kind: 'transfusion', transfusionProduct: 'plaquetas' },
            { id: 'ev-plasma', text: 'PLASMA — 2', kind: 'transfusion', transfusionProduct: 'plasma' },
          ],
        },
      ],
    ]),
  };
  const html = buildTendDetailEventsLegendHtml(markerMap, ['24/08']);
  assert.equal((html.match(/tend-event-legend-item/g) || []).length, 1);
  assert.match(html, /24\/08/);
  assert.match(html, />6 Plaq</);
  assert.match(html, />2 Plas</);
  assert.match(html, /data-tend-ev-edit="ev-plaq"/);
  assert.match(html, /data-tend-ev-delete="ev-plaq"/);
  assert.match(html, /data-tend-ev-edit="ev-plasma"/);
  assert.match(html, /data-tend-ev-delete="ev-plasma"/);
  assert.doesNotMatch(html, /Transfusión:/);
  assert.doesNotMatch(html, /ev-card__edit/);
  assert.doesNotMatch(html, />Editar</);
});

test('event legend date drops lab-draw time', () => {
  assert.equal(eventLegendDateLabel('18/08 05:05'), '18/08');
  assert.equal(eventLegendDateLabel('16/08'), '16/08');
  const markerMap = {
    indices: [0],
    byIndex: new Map([[0, { kind: 'transfusion', entries: [{ id: 'ev1', text: 'PLAQUETAS', kind: 'transfusion' }] }]]),
  };
  const html = buildTendDetailEventsLegendHtml(markerMap, ['18/08 05:05']);
  assert.match(html, />18\/08</);
  assert.doesNotMatch(html, /05:05/);
});

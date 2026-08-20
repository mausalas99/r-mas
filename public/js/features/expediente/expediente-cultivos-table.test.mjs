import { test } from 'node:test';
import assert from 'node:assert/strict';

const { buildCultivosNegStrip, extractCultivoTableRowsFromHistory } = await import(
  './expediente-cultivos-table.mjs'
);
const { registerExpedienteRuntime } = await import('./expediente-runtime.mjs');

test('buildCultivosNegStrip returns empty for no rows', () => {
  assert.equal(buildCultivosNegStrip([]), '');
});

test('buildCultivosNegStrip renders chip list with count', () => {
  var html = buildCultivosNegStrip([
    {
      tipoLabel: 'Hemocultivo',
      fechaMuestra: '22/07/2026',
      sitio: 'HEMOCULTIVO (BRAZO IZQUIERDO)',
      negativo: true,
    },
    {
      tipoLabel: 'Otros cultivos',
      studyDate: '30/07/2026',
      sitio: 'LIQUIDO ARTICULAR (RODILLA IZQUIERDA)',
      negativo: true,
    },
  ]);
  assert.match(html, /cultivos-neg-chips/);
  assert.match(html, /cultivos-neg-count">2</);
  assert.match(html, /Hemocultivo/);
  assert.match(html, /22\/07\/2026/);
  assert.match(html, /RODILLA IZQUIERDA/);
  assert.doesNotMatch(html, /cultivos-neg-sep/);
});

test('extractCultivoTableRowsFromHistory collapses the same cultivo section repeated across envíos', () => {
  var repeatedChunk =
    'RASPADO CORNEAL 14/08: STAPHYLOCOCCUS AUREUS · Preliminar\nATB S: AMP, NITRO, PEN';
  var distinctChunk = 'RASPADO CORNEAL 14/08: SALMONELLA SP. · Preliminar\nATB S: CIPRO';
  var sets = [
    { id: 's1', fecha: '14/08/2026', hora: '10:00', resLabs: ['x1'] },
    // Mismo informe re-pegado dos veces más el mismo día (mismo bloque crudo).
    { id: 's2', fecha: '14/08/2026', hora: '10:05', resLabs: ['x2'] },
    { id: 's3', fecha: '14/08/2026', hora: '10:10', resLabs: ['x3'] },
  ];
  registerExpedienteRuntime({
    getActiveId: function () {
      return 'p1';
    },
    ensureParsedLabHistory: function () {
      return sets;
    },
    splitResLabsByTipo: function () {
      // Cada "envío" repite el mismo organismo (duplicado) más uno distinto
      // solo en el primer set, para confirmar que lo distinto no se pierde.
      return { labs: [], cultivo: [repeatedChunk + '\n\n' + distinctChunk] };
    },
    buildLabSetDateLine: function (set) {
      return set.fecha;
    },
  });

  var rows = extractCultivoTableRowsFromHistory('p1');
  var aureus = rows.filter(function (r) {
    return r.organismo === 'STAPHYLOCOCCUS AUREUS · Preliminar';
  });
  var salmonella = rows.filter(function (r) {
    return r.organismo === 'SALMONELLA SP. · Preliminar';
  });
  assert.equal(aureus.length, 1, 'el mismo organismo repetido en cada envío debe quedar en un solo renglón');
  assert.equal(salmonella.length, 1, 'el organismo distinto tambien debe conservarse');
});

test('extractCultivoTableRowsFromHistory dedupes by organismo+cuenta and keeps the newest set (with sourceText for ATB)', () => {
  // "Actualizar" puede reconsultar el repositorio y crear un set nuevo con
  // hora ligeramente distinta y texto de sitio con formato distinto (con o
  // sin el espacio pegado), en vez de reemplazar el set existente. El
  // microorganismo + cuenta identifican el mismo aislamiento aunque el sitio
  // cambie de formato entre envíos.
  var staleChunk = 'UROCULTIVOPOR SONDA 16/08: ESCHERICHIA COLI\nCuenta: 25,000 UFC/ML';
  var freshChunk = 'UROCULTIVO POR SONDA 16/08: ESCHERICHIA COLI\nCuenta: 25,000 UFC/ML';
  var sets = [
    { id: 'stale', fecha: '16/08/2026', hora: '12:07', resLabs: ['x1'], sourceText: '' },
    { id: 'fresh', fecha: '16/08/2026', hora: '14:12', resLabs: ['x2'], sourceText: 'REPORTE COMPLETO' },
  ];
  var chunkBySetId = { stale: staleChunk, fresh: freshChunk };
  registerExpedienteRuntime({
    getActiveId: function () {
      return 'p1';
    },
    ensureParsedLabHistory: function () {
      return sets;
    },
    splitResLabsByTipo: function (resLabs) {
      var setId = resLabs[0] === 'x1' ? 'stale' : 'fresh';
      return { labs: [], cultivo: [chunkBySetId[setId]] };
    },
    buildLabSetDateLine: function (set) {
      return set.fecha;
    },
  });

  var rows = extractCultivoTableRowsFromHistory('p1');
  var coli = rows.filter(function (r) {
    return r.organismo === 'ESCHERICHIA COLI';
  });
  assert.equal(coli.length, 1, 'el mismo microorganismo+cuenta debe quedar en un solo renglón');
  assert.equal(coli[0].labSetId, 'fresh', 'debe conservar el set más reciente (con sourceText para el chip ATB)');
});

test('extractCultivoTableRowsFromHistory prefers the set with sourceText when the study date+hora tie', () => {
  // "Actualizar" a veces re-crea un set con la misma fecha+hora del estudio
  // (mismo trazado clínico) — sortMs empata entre los dos. El que sí trae
  // sourceText es el que puede resolver el chip de antibiograma, así que debe
  // ganar el desempate aunque no sea el último en el historial.
  var chunk = 'UROCULTIVO POR SONDA 16/08: ESCHERICHIA COLI\nCuenta: 25,000 UFC/ML';
  var sets = [
    { id: 'no-src', fecha: '16/08/2026', hora: '14:12', resLabs: ['x1'], sourceText: '', updatedAt: '2026-08-20T14:18:00.000Z' },
    { id: 'has-src', fecha: '16/08/2026', hora: '14:12', resLabs: ['x2'], sourceText: 'REPORTE COMPLETO', updatedAt: '2026-08-20T14:07:00.000Z' },
  ];
  var chunkBySetId = { 'no-src': chunk, 'has-src': chunk };
  registerExpedienteRuntime({
    getActiveId: function () {
      return 'p1';
    },
    ensureParsedLabHistory: function () {
      return sets;
    },
    splitResLabsByTipo: function (resLabs) {
      var setId = resLabs[0] === 'x1' ? 'no-src' : 'has-src';
      return { labs: [], cultivo: [chunkBySetId[setId]] };
    },
    buildLabSetDateLine: function (set) {
      return set.fecha;
    },
  });

  var rows = extractCultivoTableRowsFromHistory('p1');
  var coli = rows.filter(function (r) {
    return r.organismo === 'ESCHERICHIA COLI';
  });
  assert.equal(coli.length, 1);
  assert.equal(coli[0].labSetId, 'has-src', 'con sortMs empatado, debe ganar el set con sourceText aunque sea más viejo por updatedAt');
});

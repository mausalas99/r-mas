import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAN_MARKS,
  nextPlanMark,
  buildPlanMarkHtml,
  buildObjetivoZoneHtml,
  buildObjetivoSectionHtml,
  buildPlanZoneHtml,
  buildPlanSectionHtml,
  buildInsertarPanelHtml,
  buildCambiosPanelHtml,
  buildNotaHeaderHtml,
  buildNotaEvolucionHtml,
} from './nota-evolucion-html.mjs';

/**
 * These labels are copied verbatim from
 * `design_handoff_workbench_clinico/Paciente Rediseño.dc.html`, screen 9a
 * (L795-...), not paraphrased or inferred from CSS classes:
 *   L823 "S · Subjetivo"          L831 "O · Objetivo"
 *   L875 "A · Análisis"           L883 "P · Plan"
 *   L920 "Sin insertar · 4"       L921 "Insertar todo"
 *   L929/936/943/950 "Insertar"   L957 "Cambió desde ayer"
 */

test('nextPlanMark cycles nuevo -> sin cambio -> pendiente -> suspende -> nuevo', () => {
  assert.equal(nextPlanMark('nuevo'), 'sin cambio');
  assert.equal(nextPlanMark('sin cambio'), 'pendiente');
  assert.equal(nextPlanMark('pendiente'), 'suspende');
  assert.equal(nextPlanMark('suspende'), 'nuevo');
  assert.equal(nextPlanMark('unknown'), PLAN_MARKS[0]);
});

test('buildPlanMarkHtml renders a mono label, not an icon', () => {
  const html = buildPlanMarkHtml('nuevo');
  assert.match(html, /ne-plan-mark--nuevo/);
  assert.match(html, />nuevo</);
});

test('buildObjetivoZoneHtml marks out-of-range items with the alert class', () => {
  const html = buildObjetivoZoneHtml({
    id: 'V',
    label: 'Ventilatorio',
    items: [
      { text: 'FR 22 rpm', altered: true },
      { text: 'SatO2 97 %', altered: false },
    ],
  });
  assert.match(html, /ne-objetivo-item--alert">FR 22 rpm</);
  assert.match(html, /ne-objetivo-item">SatO2 97 %</);
});

test('buildObjetivoZoneHtml renders an editable narrative textarea under the mono line, pre-filled', () => {
  const html = buildObjetivoZoneHtml({
    id: 'NM',
    label: 'Nutricional / Metabólico',
    items: [],
    narrative: 'DIETA ORAL NORMAL || BALANCE +300ML',
  });
  assert.match(html, /data-ne-objetivo-narrative="NM"/);
  assert.match(html, /DIETA ORAL NORMAL \|\| BALANCE \+300ML/);
});

test('buildObjetivoZoneHtml renders an empty editable narrative field when there is no default (never fabricated)', () => {
  const html = buildObjetivoZoneHtml({ id: 'N', label: 'Neurológico', items: [], narrative: '' });
  const match = html.match(/data-ne-objetivo-narrative="N">([^<]*)<\/textarea>/);
  assert.ok(match);
  assert.equal(match[1], '');
});

test('buildObjetivoSectionHtml shows an empty hint when there are no zones', () => {
  const html = buildObjetivoSectionHtml({ zones: [] });
  assert.match(html, /Sin signos vitales ni laboratorio de hoy/);
});

test('buildObjetivoSectionHtml renders zones live, with no per-section confirm control (mockup #9a has none — signing is note-level, see buildNotaHeaderHtml)', () => {
  const html = buildObjetivoSectionHtml({
    zones: [{ id: 'HD', label: 'Hemodinámico', items: [{ text: 'FC 88 lpm', altered: false }] }],
  });
  assert.match(html, /FC 88 lpm/);
  assert.doesNotMatch(html, /data-ne-confirm-objetivo/);
  assert.doesNotMatch(html, /Confirmar/);
});

test('buildNotaHeaderHtml renders the shared mode-frame with one teal primary and at most two secondary actions', () => {
  const html = buildNotaHeaderHtml({ context: 'Pérez García, Juan M. · 214-B · día 3', metadata: 'borrador · guardado 08:11' });
  assert.match(html, /wb-mode-frame/);
  assert.match(html, />Nota de evolución</);
  assert.match(html, /Pérez García, Juan M\. · 214-B · día 3/);
  assert.match(html, /borrador · guardado 08:11/);
  assert.match(html, /Copiar nota de ayer/);
  assert.match(html, /Vista de impresión/);
  assert.match(html, /data-wb-primary[^>]*>Firmar y cerrar</);
});

test('buildNotaHeaderHtml suppresses the generic ⌘/ shortcut badge (mockup #9a has only 3 plain buttons)', () => {
  const html = buildNotaHeaderHtml({});
  assert.doesNotMatch(html, /data-wb-shortcut/);
  assert.doesNotMatch(html, /⌘\//);
});

test('buildPlanZoneHtml renders one row per plan item with its mark and a remove control', () => {
  const html = buildPlanZoneHtml({
    id: 'HD',
    label: 'Hemodinámico',
    items: [{ id: 'p1', text: 'Suspender furosemida', mark: 'suspende' }],
  });
  assert.match(html, /ne-plan-mark--suspende/);
  assert.match(html, /data-ne-plan-remove="p1"/);
  assert.match(html, /Suspender furosemida/);
});

test('buildPlanZoneHtml renders item text as an editable input, not a locked display span', () => {
  const html = buildPlanZoneHtml({
    id: 'HD',
    label: 'Hemodinámico',
    items: [{ id: 'p1', text: 'Suspender furosemida', mark: 'suspende' }],
  });
  assert.match(html, /<input type="text" class="ne-plan-row-text" data-ne-plan-edit="p1" value="Suspender furosemida"/);
  assert.doesNotMatch(html, /<span class="ne-plan-row-text">/);
});

test('buildPlanSectionHtml renders every zone passed in', () => {
  const html = buildPlanSectionHtml([
    { id: 'N', label: 'Neurológico', items: [] },
    { id: 'V', label: 'Ventilatorio', items: [] },
  ]);
  assert.match(html, /data-ne-plan-zone="N"/);
  assert.match(html, /data-ne-plan-zone="V"/);
});

test('buildNotaEvolucionHtml escapes free text and assembles S/O/A/P in order', () => {
  const html = buildNotaEvolucionHtml({
    subjetivo: 'Refiere dolor <script>',
    objetivo: { zones: [] },
    analisis: 'Sospecha de <injection>',
    plan: [],
  });
  const sIdx = html.indexOf('S · Subjetivo');
  const oIdx = html.indexOf('O · Objetivo');
  const aIdx = html.indexOf('A · Análisis');
  const pIdx = html.indexOf('P · Plan');
  assert.ok(sIdx < oIdx && oIdx < aIdx && aIdx < pIdx, 'sections appear in SOAP order');
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<injection>/);
});

test('buildNotaEvolucionHtml renders Análisis as a textarea with more visible rows than Subjetivo', () => {
  const html = buildNotaEvolucionHtml({ subjetivo: '', objetivo: { zones: [] }, analisis: '', plan: [] });
  const sMatch = html.match(/id="ne-subjetivo" rows="(\d+)"/);
  const aMatch = html.match(/class="ne-analisis-textarea" rows="(\d+)"/);
  assert.ok(sMatch && aMatch);
  assert.ok(Number(aMatch[1]) > Number(sMatch[1]), 'Análisis must be the largest field on the screen');
});

test('buildInsertarPanelHtml matches mockup L920-951: header count, "Insertar todo", per-row "Insertar"', () => {
  const html = buildInsertarPanelHtml([
    { id: 'cult', title: 'Cultivo de expectoración', subtitle: 'S. pneumoniae · sensible a ceftriaxona' },
    { id: 'gaso', title: 'Gasometría 06:20' },
  ]);
  assert.match(html, />Sin insertar · 2</);
  assert.match(html, /data-ne-insertar-all[^>]*>Insertar todo</);
  assert.match(html, /data-ne-insertar-row="cult"/);
  assert.match(html, /Cultivo de expectoración/);
  assert.match(html, /data-ne-insertar-item="cult">Insertar</);
  assert.match(html, /data-ne-insertar-item="gaso">Insertar</);
});

test('buildInsertarPanelHtml renders the honest empty state, not a fabricated item, when nothing is pending', () => {
  const html = buildInsertarPanelHtml([]);
  assert.match(html, />Sin insertar · 0</);
  assert.doesNotMatch(html, /data-ne-insertar-all/, '"Insertar todo" only appears when there is something to insert');
  assert.match(html, /Nada pendiente de insertar\./);
});

test('buildCambiosPanelHtml matches mockup L957: header "Cambió desde ayer"', () => {
  const html = buildCambiosPanelHtml([{ id: 'c1', text: 'Se suspendió furosemida' }]);
  assert.match(html, /ne-aside-panel-title">Cambió desde ayer</);
  assert.match(html, /Se suspendió furosemida/);
});

test('buildCambiosPanelHtml renders the honest empty state when nothing changed', () => {
  const html = buildCambiosPanelHtml([]);
  assert.match(html, /Sin cambios registrados desde ayer\./);
});

test('buildNotaEvolucionHtml lays out S/O/A/P in a left main column and the insertar/cambios panels in a right aside column', () => {
  const html = buildNotaEvolucionHtml({
    subjetivo: '',
    objetivo: { zones: [] },
    analisis: '',
    plan: [],
    insertables: [{ id: 'x', title: 'Nota de Nefrología' }],
    cambios: [],
  });
  const layoutIdx = html.indexOf('ne-layout"');
  const mainIdx = html.indexOf('ne-layout-main"');
  const asideIdx = html.indexOf('ne-layout-aside"');
  const sIdx = html.indexOf('S · Subjetivo');
  const insertarIdx = html.indexOf('Sin insertar');
  const cambiosIdx = html.indexOf('Cambió desde ayer');
  assert.ok(layoutIdx > -1 && mainIdx > layoutIdx, 'a two-column layout wrapper exists');
  assert.ok(mainIdx < sIdx, 'S/O/A/P render inside the main column');
  assert.ok(asideIdx > -1 && asideIdx < insertarIdx, '"Sin insertar" renders inside the aside column');
  assert.ok(insertarIdx < cambiosIdx, '"Sin insertar" comes before "Cambió desde ayer", as in the mockup');
});

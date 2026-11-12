import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { PanelToolbarButtons, ChartError, ChartsLoadError } from './tend-group-charts-view.jsx';
  import { GasoExtDialog, GasoEmpty } from './tend-group-gaso-view.jsx';
  export const toolbar = () => renderToString(<PanelToolbarButtons />);
  export const chartError = () => renderToString(<ChartError />);
  export const loadError = () => renderToString(<ChartsLoadError />);
  export const dialog = () => renderToString(<GasoExtDialog />);
  export const empty = (message, isError) => renderToString(<GasoEmpty message={message} isError={isError} />);`);

// The string markup these views replaced, kept verbatim as the expected output.
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const iconAttrs = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const chartIcon = `<svg width="15" height="15" viewBox="0 0 24 24" ${iconAttrs}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17V9M12 17V5M16 17v-4"/></svg>`;
const eyeIcon = `<svg class="tend-eye-svg" width="17" height="17" viewBox="0 0 24 24" ${iconAttrs}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const tagIcon = `<svg width="15" height="15" viewBox="0 0 24 24" ${iconAttrs}><path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3a1 1 0 0 0-1 1l.24 5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83Z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>`;
const oldToolbar =
  '<div class="patient-card-toolbar-left">' +
  '<button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon tend-group-panel-copy-svg" title="Copiar gráfica" aria-label="Copiar gráfica como imagen">' + chartIcon + '</button>' +
  '<button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon tend-group-panel-eye" title="Ocultar panel" aria-label="Ocultar panel">' + eyeIcon + '</button>' +
  '<button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon tend-group-panel-events-toggle" title="Ocultar eventos" aria-label="Ocultar eventos" aria-pressed="false">' + tagIcon + '</button>' +
  '</div>';
const oldChartError = '<p class="tend-empty" style="margin:12px 0;font-size:13px;color:var(--error);">No se pudo dibujar este panel.</p>';
const oldLoadError = '<p class="tend-empty">No se pudieron cargar las gráficas. Recarga la app e intenta de nuevo.</p>';
const oldDialog =
  '<div id="tend-gaso-ext-dialog" class="tend-gaso-ext-dialog" role="dialog" aria-modal="true" aria-labelledby="tend-gaso-ext-title">' +
  '<div class="tend-gaso-ext-header"><div class="tend-gaso-ext-header-text">' +
  '<h2 id="tend-gaso-ext-title">' + esc('Gasometría extendida') + '</h2>' +
  '<p class="tend-gaso-ext-subtitle">' + esc('Último estudio · interpretación ácido-base') + '</p></div>' +
  '<div class="tend-gaso-ext-header-actions"><div class="tend-gaso-fio2-chip" role="group" aria-label="Fracción inspirada de oxígeno">' +
  '<span class="tend-gaso-fio2-chip-label">FiO₂</span>' +
  '<input type="number" class="tend-gaso-fio2-input" step="0.01" min="0.08" max="100" inputmode="decimal" aria-label="FiO₂ (0.21 o 21)" title="Fracción 0.21 o porcentaje 21" />' +
  '<span class="tend-gaso-fio2-chip-hint">0.21 · 21%</span></div></div></div>' +
  '<div class="tend-gaso-extended-inner"></div></div>';
const oldEmpty = (message, isError) =>
  '<p class="tend-empty" style="font-size:13px;color:' + (isError ? 'var(--error)' : 'var(--text-muted)') + ';">' + esc(message) + '</p>';

// Same DOM, spelled differently: `<rect/>` vs `<rect></rect>`, `<input />` vs `<input/>`, `&gt;` vs `>`.
const norm = (h) =>
  h.replace(/<(rect|path|circle)([^>]*?)\s*\/>/g, '<$1$2></$1>').replace(/\s*\/>/g, '/>').replace(/&gt;/g, '>');
const same = (a, b) => assert.equal(norm(a), norm(b));

test('panel toolbar buttons equal the old string markup', () => same(view.toolbar(), oldToolbar));
test('chart error note equals the old string markup', () => same(view.chartError(), oldChartError));
test('charts load error equals the old string markup', () => same(view.loadError(), oldLoadError));
test('gaso dialog frame equals the old string markup', () => same(view.dialog(), oldDialog));
for (const [message, isError] of [
  ['Sin valores recientes disponibles para gasometría.', false],
  ['No se pudo calcular la gasometría extendida.', true],
  ['pH <7.1> & "grave"', true],
]) {
  test(`gaso empty note (${isError ? 'error' : 'muted'}) equals the old string markup`, () => same(view.empty(message, isError), oldEmpty(message, isError)));
}

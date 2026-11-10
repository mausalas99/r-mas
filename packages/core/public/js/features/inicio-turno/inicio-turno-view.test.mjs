import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { escHtml } from '../../dom-escape.mjs';
import { buildModeFrameHtml } from '../workbench/mode-frame.mjs';
import { buildCountersBandHtml } from '../workbench/counters-band.mjs';
import { buildTableCardHeaderHtml, buildColumnHeadHtml, buildRowHtml, buildSummaryLineHtml } from '../workbench/wb-table.mjs';
import { buildFilterChipHtml } from '../workbench/filter-chips.mjs';
import { buildEmptyStateHtml } from '../workbench/empty-state.mjs';
import { zonesFooterNote } from './inicio-turno-zones.mjs';

const GRID = '92px 1fr 128px 96px';
const rows = [
  { id: 'p1', name: 'Ana Pérez', ageLabel: '54 a', stayLabel: 'D3', reasonText: 'Hipotensión', alteredText: 'TA 80/50', urgency: 'vencido', sinceLabel: '2 h', action: { tone: 'primary', label: 'Abrir' }, bedLabel: 'Cama 4' },
  { id: 'p2', name: 'Luis & Co', ageLabel: '', stayLabel: 'D1', reasonText: 'Labs pendientes', alteredText: '', urgency: 'en_espera', sinceLabel: '30 min', action: { tone: 'secondary', label: 'Ver' }, bedLabel: 'Cama 5' },
  { id: 'p3', name: 'Rosa', ageLabel: '70 a', stayLabel: '', reasonText: 'Hereda', alteredText: '', urgency: 'curso', sinceLabel: '1 h', action: { tone: 'secondary', label: 'Ver' }, bedLabel: 'Cama 6' },
];
const base = {
  context: 'lun · 07:02 · R2 Mau', total: 3,
  heredas: { open: 1, overdue: 1 }, signos: { receivedToday: 2, total: 3, percent: 67 }, ingresos: { admittedToday: 2, incompleteChart: 0 },
  lo: { rows, remainingCount: 1, totalCount: 3 },
  zones: [{ id: 'a', label: 'Piso A', count: 2 }, { id: 'b', label: 'Piso B', count: 1 }],
  initialZones: ['b'],
  onZonesChange() {}, onClose() {}, onOpenPatient() {}, onOpenLab() {}, onOpenInterconsulta() {},
};

// The old panel's markup, rebuilt from the same string builders it called.
function oldHtml(p) {
  const rowHtml = (row) => {
    const sinceClass = row.urgency === 'vencido' ? 'wb-it-since--vencido' : row.urgency === 'en_espera' ? 'wb-it-since--espera' : 'wb-it-since--curso';
    const l1 = `${escHtml(row.name)} <span class="wb-it-line-muted">${escHtml([row.ageLabel, row.stayLabel].filter(Boolean).join(' · '))}</span>`;
    const l2 = row.alteredText ? `${escHtml(row.reasonText)} · <span class="wb-it-altered">${escHtml(row.alteredText)}</span>` : escHtml(row.reasonText);
    const btn = row.action.tone === 'primary' ? 'wb-btn wb-btn-primary' : 'wb-btn wb-btn-secondary';
    return buildRowHtml({
      id: row.id, alert: row.urgency === 'vencido', twoLine: true, gridTemplate: GRID,
      cellsHtml: [
        `<span class="wb-it-bed">${escHtml(row.bedLabel)}</span>`,
        `<div class="wb-it-row-lines"><span class="wb-it-row-name">${l1}</span><span class="wb-it-row-reason">${l2}</span></div>`,
        `<span class="wb-it-since ${sinceClass}">${escHtml(row.sinceLabel)}</span>`,
        `<button type="button" class="${btn}" data-it-row-action="${escHtml(row.id)}">${escHtml(row.action.label)}</button>`,
      ],
    });
  };
  const s = (n, one) => (n === 1 ? one : `${one}s`);
  const lo = p.lo;
  const summary = lo.rows.length ? `${lo.remainingCount} ${s(lo.remainingCount, 'paciente')} sin nada urgente al recibir` : `Los ${lo.totalCount} pacientes están sin nada urgente al recibir`;
  const loHtml = '<div class="wb-table-card wb-it-table-card">' +
    buildTableCardHeaderHtml({ title: `Lo primero · ${lo.rows.length} ${s(lo.rows.length, 'cama')}`, actionsHtml: `<span class="wb-it-table-sub">de ${lo.totalCount}</span>` }) +
    buildColumnHeadHtml(['Cama', 'Por qué', 'Desde', 'Acción'], GRID) +
    `<div class="wb-table-body">${lo.rows.map(rowHtml).join('')}</div>` + buildSummaryLineHtml(summary) + '</div>';
  const zonas = p.zones.length
    ? '<div class="wb-table-card wb-it-zonas-card">' + buildTableCardHeaderHtml({ title: 'Tus zonas hoy' }) +
      '<div class="wb-it-zonas-body"><p class="wb-it-zonas-hint">Elige las zonas que revisas tú. Filtran el censo mientras dure el turno.</p>' +
      `<div class="wb-chips">${p.zones.map((z) => buildFilterChipHtml({ id: z.id, label: `${z.label} · ${z.count}` }, p.initialZones.includes(z.id) ? z.id : null, 'teal')).join('')}</div>` +
      `<p class="wb-it-zonas-footer">${escHtml(zonesFooterNote(p.initialZones))}</p></div></div>`
    : buildEmptyStateHtml({ label: 'Tus zonas hoy', missing: 'Ningún paciente del censo tiene un área asignada todavía.', whenArrives: 'Se llenan solas en cuanto se registre el área de cada paciente.' });
  const h = p.heredas, g = p.signos, i = p.ingresos;
  return (
    '<div id="inicio-turno-mode-frame">' + buildModeFrameHtml({ modeName: 'Inicio de turno', context: p.context, secondaryActions: [{ label: 'Censo completo' }], primaryAction: { label: `Recibir ${p.total} ${s(p.total, 'paciente')}` } }) + '</div>' +
    '<div id="inicio-turno-counters">' + buildCountersBandHtml([
      { label: 'Heredas pendientes', figure: `${h.open} ${s(h.open, 'abierto')}`, detail: h.overdue > 0 ? `${h.overdue} ${s(h.overdue, 'vencido')}` : '', tone: 'alert' },
      { label: 'Toma de signos', figure: `${g.receivedToday} de ${g.total} recibidos`, progress: { percent: g.percent } },
      { label: 'Ingresos de la noche', figure: `${i.admittedToday} ${s(i.admittedToday, 'nuevo')}`, detail: i.incompleteChart > 0 ? `${i.incompleteChart} con ficha incompleta` : '' },
    ]) + '</div>' +
    '<div class="wb-it-body"><div class="wb-it-col wb-it-col-left">' +
    `<div id="inicio-turno-lo-primero" class="wb-it-lo-primero">${loHtml}</div>` +
    '<div id="inicio-turno-entrega">' + buildEmptyStateHtml({ label: 'Entrega de la guardia saliente', missing: 'R+ todavía no guarda un resumen de texto libre de la guardia que entrega.', whenArrives: 'Se habilita cuando exista un campo de entrega de turno en R+; mientras tanto, revisa los pendientes heredados arriba.' }) + '</div></div>' +
    '<div class="wb-it-col wb-it-col-right">' +
    `<div id="inicio-turno-zonas">${zonas}</div>` +
    '<div id="inicio-turno-internos">' + buildEmptyStateHtml({ label: 'Internos del turno', missing: 'R+ no tiene un rol de interno ni una asignación de zona/camas por interno todavía.', whenArrives: 'Se habilita cuando exista ese modelo de datos; por ahora, coordina la cobertura fuera de la app.' }) + '</div>' +
    '<div id="inicio-turno-labs-empty">' + buildEmptyStateHtml({ label: 'Labs de hoy', missing: 'Todavía no hay resultados de hoy.', whenArrives: 'Aparecen aquí y en cada paciente en cuanto se registran en R+.', exitLabel: 'Abrir laboratorio' }) + '</div>' +
    '<div id="inicio-turno-ic-empty">' + buildEmptyStateHtml({ label: 'Interconsultas', missing: 'Sin solicitudes nuevas para revisar aquí.', whenArrives: 'Las que ya estén en seguimiento siguen disponibles en el modo Interconsultas.', exitLabel: 'Abrir modo interconsultas' }) + '</div>' +
    '</div></div>'
  );
}

const mod = await loadJsx(import.meta.url, `import { InicioTurnoBody } from './inicio-turno-view.jsx';
  export const html = (p) => renderToString(<InicioTurnoBody {...p} />);`);
// Preact writes empty attributes as bare names and escapes & the same way; HTML parses both alike.
const norm = (s) => s.replace(/ (data-[\w-]+)=""/g, ' $1');

for (const [name, props] of [
  ['with zones', base],
  ['no zones, no rows', { ...base, zones: [], lo: { rows: [], remainingCount: 0, totalCount: 3 }, total: 1, heredas: { open: 2, overdue: 0 }, ingresos: { admittedToday: 1, incompleteChart: 2 } }],
]) {
  test(`Inicio de turno HTML equals the old markup (${name})`, () => {
    assert.equal(norm(mod.html(props)), oldHtml(props));
  });
}

test('Inicio de turno keeps the ids other code reads', () => {
  const html = mod.html(base);
  for (const id of ['mode-frame', 'counters', 'lo-primero', 'entrega', 'zonas', 'internos', 'labs-empty', 'ic-empty']) {
    assert.ok(html.includes(`id="inicio-turno-${id}"`), id);
  }
});

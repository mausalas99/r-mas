import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTableCardHtml, mountTableCard } from './wb-table.mjs';

const COLUMNS = ['Cama', 'Paciente', 'Alterados', 'Pendiente', 'Estado'];
const GRID = '92px 1fr 132px 1fr 84px';

describe('buildTableCardHtml', () => {
  it('renders fixed header, column head, rows and a summary line that is not a row', () => {
    const html = buildTableCardHtml({
      title: 'Censo · 25 pacientes',
      columns: COLUMNS,
      gridTemplate: GRID,
      rows: [
        { id: 'p1', cellsHtml: ['214-B · 2', 'PÉREZ GARCÍA', 'SatO₂ 89', 'Reponer K', 'VENCIDO'], alert: true },
        { id: 'p2', cellsHtml: ['217 · 3', 'DOMÍNGUEZ', 'Glu 312', 'Insulina', 'EN CURSO'] },
      ],
      summaryLine: '16 pacientes sin alterados ni pendientes',
    });
    assert.match(html, /wb-table-card-header/);
    assert.match(html, /Censo · 25 pacientes/);
    assert.match(html, /wb-table-colhead/);
    assert.match(html, /Cama.*Paciente.*Alterados.*Pendiente.*Estado/s);
    assert.match(html, /wb-row--alert/);
    assert.match(html, /data-wb-row-id="p1"/);
    assert.match(html, /wb-table-summary">16 pacientes sin alterados ni pendientes</);
    // Summary line lives outside of .wb-table-body, not as a .wb-row.
    const bodyMatch = html.match(/<div class="wb-table-body">([\s\S]*?)<\/div>\s*<div class="wb-table-summary"/);
    assert.ok(bodyMatch, 'summary line should follow the closed table body');
    assert.doesNotMatch(bodyMatch[1], /wb-table-summary/);
  });

  it('marks two-line rows with the two-line class', () => {
    const html = buildTableCardHtml({
      title: 'Lo primero',
      columns: ['Cama', 'Por qué'],
      rows: [{ id: 'p1', cellsHtml: ['219', 'K 2.9'], twoLine: true }],
    });
    assert.match(html, /wb-row--twoline/);
  });
});

describe('mountTableCard', () => {
  it('opens the patient on row click and stops propagation for in-row buttons', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    let opened = null;
    let buttonClicked = false;
    mountTableCard(host, {
      title: 'Censo',
      columns: ['Cama'],
      rows: [
        {
          id: 'p1',
          cellsHtml: ['214-B', '<button type="button" data-action>Ver</button>'],
        },
      ],
      onRowClick: (id) => (opened = id),
    });
    const btn = host.querySelector('[data-action]');
    btn.addEventListener('click', () => (buttonClicked = true));
    btn.click();
    assert.equal(buttonClicked, true);
    assert.equal(opened, null, 'in-row button click must not bubble to the row handler');

    host.querySelector('.wb-row').click();
    assert.equal(opened, 'p1');
  });

  it('opens the patient on Enter/Space keydown', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    let opened = null;
    mountTableCard(host, {
      title: 'Censo',
      columns: ['Cama'],
      rows: [{ id: 'p1', cellsHtml: ['214-B'] }],
      onRowClick: (id) => (opened = id),
    });
    const row = host.querySelector('.wb-row');
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    assert.equal(opened, 'p1');
  });
});

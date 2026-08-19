import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCountersBandHtml, mountCountersBand } from './counters-band.mjs';

describe('buildCountersBandHtml', () => {
  it('renders up to 3 cells with label + figure', () => {
    const html = buildCountersBandHtml([
      { label: 'Toma de signos · 08:00', figure: '18 de 25 recibidos', detail: '3 fuera de rango' },
      { label: 'Pendientes', figure: '7 abiertos', detail: '2 vencidos', tone: 'alert' },
      { label: 'Ingresos', figure: '3 nuevos' },
    ]);
    assert.match(html, /Toma de signos · 08:00/);
    assert.match(html, /18 de 25 recibidos/);
    assert.match(html, /wb-counter-cell--alert/);
    assert.match(html, /3 fuera de rango/);
    assert.equal((html.match(/wb-counter-cell/g) || []).length >= 3, true);
  });

  it('rejects more than three cells', () => {
    assert.throws(() =>
      buildCountersBandHtml([
        { label: 'a', figure: '1' },
        { label: 'b', figure: '2' },
        { label: 'c', figure: '3' },
        { label: 'd', figure: '4' },
      ])
    );
  });

  it('renders an optional progress bar with the sweep animation class', () => {
    const html = buildCountersBandHtml([
      { label: 'Toma', figure: '18 de 25', progress: { percent: 72 } },
    ]);
    assert.match(html, /wb-counter-progress-fill progress-sweep-fill/);
    assert.match(html, /width:72%/);
  });
});

describe('mountCountersBand', () => {
  it('mounts into a container', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    mountCountersBand(host, [{ label: 'Ingresos', figure: '3 nuevos' }]);
    assert.ok(host.querySelector('.wb-counter-cell'));
  });
});

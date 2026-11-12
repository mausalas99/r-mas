import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { deriveSnapshot, balanceGlobalHistorico } from './estado-actual-data.mjs';
import { eaChartsCanOpen } from './estado-actual-charts.mjs';

// Output of the old string builders (renderSnapshotSection, renderHistorialSection,
// renderEaChartsSummarySection, buildEaActionBarButtons, renderEstadoClinicoBodyHtml) captured before
// the port, with the clock frozen at OLD.now. Synthetic patients only.
const OLD = JSON.parse(fs.readFileSync(new URL('./estado-actual-panel-shell-view-old-html.json', import.meta.url), 'utf8'));
const NOW = new Date(OLD.now);

// Same markup, other spelling: Preact quotes single-quoted attrs, prints empty-valued attributes as
// `name=""`, void/svg shapes with `/>`, and escapes `"` and `>` in text and attributes.
const same = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/='([^']*)'/g, '="$1"')
    .replace(/ ([a-z][a-z-]*)=""/g, ' $1')
    .replace(/<\/path>/g, '')
    .replace(/\s?\/>/g, '>')
    .replace(/ value(?=[ >])/g, ' value=""');

function hist() {
  const out = [];
  for (let d = 0; d < 9; d++) {
    for (const h of [8, 20]) {
      const k = d * 2 + (h === 8 ? 0 : 1);
      out.push({
        id: 'h' + k,
        recordedAt: new Date(2025, 2, 7 - 8 + d, h, 0).toISOString(),
        vitalSeries: {
          tas: [{ value: 110 + ((k * 7) % 45), time: '08:00' }], tad: [{ value: 65 + ((k * 5) % 35) }],
          fc: [{ value: 62 + ((k * 11) % 50) }], fr: [{ value: 14 + ((k * 3) % 14) }],
          sat: [{ value: 88 + ((k * 3) % 11) }], temp: [{ value: 36 + (k % 4) * 0.7 }],
        },
        glucometrias: [
          { time: '07:00', value: 80 + ((k * 23) % 120) },
          { time: '13:30', value: 95 + ((k * 17) % 100), rescueUnits: k % 3 === 0 ? 4 : '', postRescueValue: k % 3 === 0 ? 140 : '', altered: k % 2 === 0 },
        ],
        io: { ing: 1500 + k * 120, egr: 1100 + ((k * 211) % 900), evac: k % 4 === 0 ? 2 : '', eventos: k === 17 ? [{ tipo: 'furosemida', text: 'Reto de furosemida' }] : [] },
      });
    }
  }
  return out;
}
const busy = { historial: hist() };
const MON = {
  empty: {},
  busy,
  pump: { bombaInsulinaAlgoritmo: 2, historial: hist().map((r, i) => ({ ...r, bombaInsulina: [{ value: 130 + i, units: i % 2 ? 3 : 0, time: '09:00' }] })) },
  egrParts: { historial: hist().map((r) => ({ ...r, io: { ing: 'NC', egrParts: [{ label: 'Diuresis', value: 900 }, { label: 'Drenaje', value: 150 }], evac: 1 } })) },
};

let v;
async function view() {
  v ||= await loadJsx(import.meta.url, `import { EaSnapshotSection, EaHistorialSection } from './estado-actual-panel-snapshot-view.jsx';
    import { EaClinicoSection } from './estado-actual-panel-clinico-view.jsx';
    import { ChartsSummaryButton, ActionBarButtons, EaPanelShell } from './estado-actual-panel-render-view.jsx';
    export const snapshot = (p) => renderToString(<EaSnapshotSection {...p} />);
    export const historial = (p) => renderToString(<EaHistorialSection {...p} />);
    export const charts = (p) => renderToString(<ChartsSummaryButton {...p} />);
    export const bar = (p) => renderToString(<ActionBarButtons {...p} />);
    export const clinico = (p) => renderToString(<EaClinicoSection {...p} />);
    export const shell = (p) => renderToString(<EaPanelShell {...p} />);`);
  return v;
}

for (const k of Object.keys(MON)) {
  test(`snapshot ${k}`, async () => {
    const m = MON[k];
    assert.equal(same((await view()).snapshot({ snapshot: deriveSnapshot(m), balGlobal: balanceGlobalHistorico(m), now: NOW })), same(OLD.snapshot[k]));
  });
  test(`historial ${k}`, async () => {
    assert.equal(same((await view()).historial({ historial: m(k).historial || [], now: NOW })), same(OLD.historial[k]));
  });
  test(`charts summary ${k}`, async () => {
    assert.equal(same((await view()).charts({ canOpen: eaChartsCanOpen(m(k)) })), same(OLD.charts[k]));
  });
}
function m(k) { return MON[k]; }

test('action bar, sala and interconsulta', async () => {
  assert.equal(same((await view()).bar({ sala: true })), same(OLD.bar.sala));
  assert.equal(same((await view()).bar({ sala: false })), same(OLD.bar.ic));
});

for (const [k, c] of Object.entries(OLD.clinicoCases)) {
  test(`clinico ${k}`, async () => {
    const [ec, dietPending, dietaSuplemento, kcalDisplay, dietWeight, , dietOptions, dietOptionSelected, dietaParenteral, vitalsCtx] = c;
    const html = (await view()).clinico({
      ec, dietPending, dietaSuplemento, kcalDisplay, dietWeight, dietOptions, dietOptionSelected, dietaParenteral, vitalsCtx,
      snapshot: deriveSnapshot(busy), balGlobal: balanceGlobalHistorico(busy), now: NOW,
    });
    // The med grid frame is empty here (the caller fills it); the old output had a marker in its place.
    const old = `<details class="ea-estado-clinico" open><summary>Estado clínico general</summary>${OLD.clinico[k]}</details>`
      .replace('<!--med-->', '<div class="ea-clinico-med-grid" data-ea-med-revealed="[]"></div>');
    assert.equal(same(html), same(old));
  });
}

test('shell composes bar, clinico and historial', async () => {
  const c = OLD.clinicoCases.default;
  const clinico = {
    ec: c[0], dietPending: false, dietaSuplemento: false, kcalDisplay: c[3], dietWeight: c[4], dietOptions: [], dietOptionSelected: 0,
    dietaParenteral: false, vitalsCtx: c[9], snapshot: deriveSnapshot(busy), balGlobal: balanceGlobalHistorico(busy),
  };
  const html = (await view()).shell({ savedLabel: 'Guardado 07/03 09:15', chartsCanOpen: true, sala: false, clinico, historial: busy.historial, now: NOW });
  const old =
    '<div class="estado-actual-panel"><div class="ea-action-bar"><h3 class="fit-title">Estado actual</h3>' +
    '<span id="ea-meta-guardado" class="ea-meta-guardado">Guardado 07/03 09:15</span>' +
    '<div class="ea-action-bar__cluster" role="group" aria-label="Acciones de monitoreo">' +
    OLD.charts.busy + OLD.bar.ic + '</div></div><div class="ea-main">' +
    `<details class="ea-estado-clinico" open><summary>Estado clínico general</summary>${OLD.clinico.default}</details>`.replace('<!--med-->', '<div class="ea-clinico-med-grid" data-ea-med-revealed="[]"></div>') +
    OLD.historial.busy + '</div></div>';
  assert.equal(same(html), same(old));
});

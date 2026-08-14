import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../partials/layout/app-body.html'),
  'utf8'
);

function buttonBlock(id) {
  const re = new RegExp('<button[^>]*\\sid="' + id + '"[\\s\\S]*?</button>');
  const m = html.match(re);
  assert.ok(m, 'missing #' + id + ' in app-body.html');
  return m[0];
}

test('#apptab-nota visible label includes Paciente, not Expediente', () => {
  const block = buttonBlock('apptab-nota');
  assert.match(block, /<span class="app-tab-label"[^>]*>Paciente<\/span>/);
  assert.doesNotMatch(block, /<span class="app-tab-label"[^>]*>Expediente<\/span>/);
});

test('#itab-paciente aria-label or text is Resumen', () => {
  const block = buttonBlock('itab-paciente');
  assert.match(block, /aria-label="Resumen"|Resumen/);
});

test('#itab-resultados has display:none', () => {
  const block = buttonBlock('itab-resultados');
  assert.match(block, /style="[^"]*display:\s*none/);
});

test('top tabs: apptab-nota appears before apptab-lab', () => {
  const nota = html.indexOf('id="apptab-nota"');
  const lab = html.indexOf('id="apptab-lab"');
  assert.ok(nota >= 0, 'apptab-nota missing');
  assert.ok(lab > nota, 'apptab-nota must appear before apptab-lab');
});

test('#patient-ronda-dashboard-host exists; old labs/todos mounts are absent', () => {
  assert.match(html, /id="patient-ronda-dashboard-host"/);
  assert.doesNotMatch(html, /id="patient-ronda-labs-body"/);
  assert.doesNotMatch(html, /id="patient-ronda-todos-mount"/);
});

test('lab-inner-nav uses folder inner-tab-bar, not boxed rpc-subtab', () => {
  assert.match(html, /id="lab-inner-nav"[^>]*class="[^"]*inner-tab-bar/);
  assert.doesNotMatch(html, /id="lab-inner-nav"[^>]*rpc-subtab-bar/);
  assert.match(html, /class="[^"]*inner-tab[^"]*"[^>]*id="lab-inner-labs-btn"/);
});

test('lab-inner-nav lives inside lab-active-shell with the lab panels', () => {
  const shell = html.indexOf('class="lab-active-shell"');
  const nav = html.indexOf('id="lab-inner-nav"');
  const labs = html.indexOf('id="lab-inner-labs"');
  assert.ok(shell >= 0 && nav > shell && labs > nav);
});

test('#apptab-lab icon shares Paciente optical bounds (grid from y=5, not table y=3)', () => {
  const block = buttonBlock('apptab-lab');
  assert.match(block, /<rect x="5" y="5"/);
  assert.doesNotMatch(block, /M9 3H5a2 2 0 00-2 2v4/);
});

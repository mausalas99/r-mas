import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { IcBar, BoardFrame, Archived } from './interconsulta-mode-chrome-view.jsx';
  export const bar = () => renderToString(<IcBar />);
  export const frame = (p) => renderToString(<BoardFrame {...p} />);
  export const arch = (patients, collapsed) => renderToString(<Archived patients={patients} collapsed={collapsed} canDelete={(p) => p.id !== 'a2'} />);`);

// Exact markup the string builders (buildInterconsultaBarHtml, icHeaderHtml, IC_KEYS_*, renderIcArchivedSectionHtml,
// icTimerStatsHtml) made before the port, captured on the same fixtures below.
const OLD = JSON.parse(fs.readFileSync(new URL('./interconsulta-mode-chrome-old-html.json', import.meta.url), 'utf8'));

// Preact SSR writes `>` and `'` unescaped in text and empty attrs without `=""`; HTML parses both the same.
const norm = (s) => s
  .replace(/data-onclick-args='([^']*)'/g, 'data-onclick-args="$1"')
  .replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/ ([a-z-]+)=""/g, ' $1');
const same = (a, b, name) => {
  a = norm(a); b = norm(b);
  if (a !== b) { let i = 0; while (a[i] === b[i]) i++; assert.fail(name + ' differs at ' + i + '\nnew: ...' + a.slice(Math.max(0, i - 60), i + 120) + '\nold: ...' + b.slice(Math.max(0, i - 60), i + 120)); }
};

const opts = [{ id: 'ic-a', label: 'Interconsultas A' }, { id: 'ic-b', label: 'B <x> & "y"' }];
const arch = [
  { id: 'a1', nombre: 'ANA <ARCH> & "X"', cuarto: '4', cama: '1' },
  { id: 'a2', nombre: '', cuarto: '', cama: '' },
  { id: "a3", nombre: "O'BRIEN", cuarto: '9', cama: '' },
];
// Stats pills as icTimerStats gives them for the fixture used to capture OLD.stats.
const pills = [['Promedio 7 días', '40 min'], ['VPO', '20 min'], ['IC', '1 h 0 min']];

test('top bar equals the old HTML', () => same(view.bar(), OLD.bar, 'bar'));

test('stats pills equal the old icTimerStatsHtml', () => {
  const html = view.frame({ mode: 'asignar', options: [], teamId: '', count: 0, pills, guardiaName: '' });
  same(html.match(/<span class="ic-stats">.*?<\/span><\/span>/)[0], OLD.stats, 'stats');
});

test('header + keys equal the old HTML in every mode', () => {
  const H = (name, mode, options, teamId, count, p, guardiaName, keys) =>
    same(view.frame({ mode, options, teamId, count, pills: p, guardiaName }),
      OLD.hdr[name] + '<div id="ic-team-board-mount"></div><div id="ic-archived-mount"></div>' + keys, name);
  H('asignar', 'asignar', opts, 'ic-a', 7, [], '', OLD.keysAsignar);
  H('asignar-stats', 'asignar', opts, 'ic-a', 1, pills, 'Interconsultas A', OLD.keysAsignar);
  H('equipo', 'equipo', opts, 'ic-b', 3, pills, 'Interconsultas A', OLD.keys);
  H('equipo-noguardia', 'equipo', opts, 'ic-a', 0, [], '', OLD.keys);
  H('equipo-noopts', 'equipo', [], '', 2, [], 'G <1>', OLD.keys);
});

test('Archivados equals the old HTML (open, collapsed, empty, one chip)', () => {
  for (const c of [false, true]) {
    same(view.arch(arch, c), OLD.arch[c + ':3'], c + ':3');
    same(view.arch([], c), OLD.arch[c + ':0'], c + ':0');
    same(view.arch(arch.slice(0, 1), c), OLD.arch[c + ':1'], c + ':1');
  }
});

test('delete button only for patients the rule allows', () => {
  const html = view.arch(arch, false);
  assert.ok(html.includes('data-ic-arch-del="a1"'));
  assert.ok(!html.includes('data-ic-arch-del="a2"'));
});

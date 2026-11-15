import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { AvailablePrimary, AvailableSecondary, ReadyPrimary } from './platform/updater/update-actions-view.jsx';
  import { ReleaseNotesList } from './settings-help/release-notes-view.jsx';
  export const availP = (isDowngrade) => renderToString(<AvailablePrimary isDowngrade={isDowngrade} />);
  export const availS = (isDowngrade) => renderToString(<AvailableSecondary isDowngrade={isDowngrade} />);
  export const ready = (isDowngrade) => renderToString(<ReadyPrimary isDowngrade={isDowngrade} />);
  export const notes = (n) => renderToString(<ReleaseNotesList notes={n} />);`);

// Markup of the createElement code in electron-handlers.mjs and release-notes.mjs before the port, same inputs.
const OLD = createRequire(import.meta.url)('./platform-updater-release-notes-old-html.json');

test('update-available buttons equal the old DOM, and are empty for a downgrade', () => {
  sameHtml(view.availP(false), OLD.availablePrimary, 'primary');
  sameHtml(view.availS(false), OLD.availableSecondary, 'secondary');
  assert.equal(view.availP(true), '');
  assert.equal(view.availS(true), '');
});

test('update-ready buttons equal the old DOM for upgrade and downgrade', () => {
  sameHtml(view.ready(false), OLD.readyUpgrade, 'upgrade');
  sameHtml(view.ready(true), OLD.readyDowngrade, 'downgrade');
});

const NOTES_855 = [
  {
    title: 'Labs de 3 días',
    body: 'El censo PDF y la tabla de Guardia muestran los <strong>labs de 3 días</strong>.',
  },
  {
    title: 'Negativo y positivo',
    body: 'Los resultados <strong>NEGATIVO</strong>, <strong>POSITIVO</strong> y <strong>TRAZAS</strong> se ven tal cual, no como «---».',
  },
  {
    title: 'Medicamentos propuestos',
    body: 'En Estado actual confirmas o descartas <strong>un medicamento a la vez</strong>. Los demás siguen pendientes.',
  },
  {
    title: 'Datos en Excel',
    body: 'En Respaldos, <strong>Datos para análisis</strong> crea un Excel con una hoja por tipo de dato.',
  },
  {
    title: 'Cajas que avanzan solas',
    body: 'Cuarto, cama y registro pasan a la siguiente caja al completar el valor.',
  },
  {
    title: 'Pacientes en una línea',
    body: 'En el tablero del paciente, las zonas marcadas muestran solo su primera línea.',
  },
];

// Fixed to 8.5.5: the old-DOM snapshot is for that release, so later bumps must not break it.
test('release notes list equals the old DOM for the curated 8.5.5 notes', () => {
  sameHtml(view.notes(NOTES_855), OLD.notesDefault, 'default');
});

test('release notes list equals the old DOM for escaped titles, strong runs and missing fields', () => {
  const odd = [
    { title: 'A <b> & "x"', body: 'Hola <strong>mundo</strong> y <strong>más</strong> fin.' },
    { body: 'sin título' },
    { title: 'sin cuerpo' },
  ];
  sameHtml(view.notes(odd), OLD.notesOdd, 'odd');
});

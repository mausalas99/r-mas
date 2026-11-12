import test from 'node:test';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { HtmlNodes } from './simple-html-nodes.jsx';
  export const html = (s) => renderToString(<HtmlNodes html={s} />);`);

// tour-mini.mjs and tour-lab-hint.mjs wrote these strings with innerHTML; the nodes must read the same.
const COPY = [
  'En el cuadro <strong>ya están cargados</strong> dos días de <strong>DEMO PÉREZ</strong> y, tras el separador, el reporte de <strong>DEMO GARCÍA</strong>. R+ los distingue por paciente y por fecha al procesar.',
  'Arriba del panel está el acceso directo al <strong>centro de ayuda</strong>. En <strong>Aplicación</strong> (sección inferior) ves la versión y puedes <strong>buscar actualizaciones</strong>.',
  'En <strong>Laboratorio → Labs</strong>, el menú <strong>⋯</strong> permite copiar varios días.',
];
test('copy strings draw the same markup as innerHTML did', () => {
  COPY.forEach((c, i) => sameHtml(view.html(c), c, 'copy ' + i));
});

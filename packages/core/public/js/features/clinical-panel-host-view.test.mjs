import test from 'node:test';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';
import { buildTextSkeletonPanel } from '../ui-skeleton.mjs';
import { escapeHtml } from '../dom-escape.mjs';

const view = await loadJsx(import.meta.url, `import { PanelSkeleton, PanelError } from './clinical-panel-host-view.jsx';
  export const skeleton = (p) => renderToString(<PanelSkeleton {...p} />);
  export const error = (p) => renderToString(<PanelError {...p} />);`);

// Template setClinicalTeamsPanelError wrote before the port.
const oldError = (message) => `
    <p class="clinical-registration-error">${escapeHtml(message)}</p>
    <p class="clinical-teams-lead">Cierra este diálogo y vuelve a abrir <strong>Mi rotación</strong>. Si sigue vacío, reinicia R+ por completo (Cmd+Q).</p>`;

test('skeleton equals the old HTML', () => {
  for (const n of [1, 3, 5]) {
    sameHtml(view.skeleton({ className: 'clinical-teams-skeleton skel-panel', lines: n }),
      buildTextSkeletonPanel('clinical-teams-skeleton skel-panel', n), `lines ${n}`);
  }
});

test('error equals the old HTML, message escaped', () => {
  for (const m of ['Error al cargar Mi rotación.', 'x <b>&"y"</b>']) sameHtml(view.error({ message: m }), oldError(m), m);
});

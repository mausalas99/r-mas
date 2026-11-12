import test from 'node:test';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { DowngradePrimary, ErrorPrimary, RecoveryPrimary, RecoverySecondary } from './platform/updater/update-actions-view.jsx';
  export const down = () => renderToString(<DowngradePrimary />);
  export const err = () => renderToString(<ErrorPrimary />);
  export const recP = () => renderToString(<RecoveryPrimary />);
  export const recS = () => renderToString(<RecoverySecondary />);`);

// Markup the createElement code in modal-ui.mjs and native-recovery.mjs made before the port.
test('error and native-recovery buttons equal the old DOM', () => {
  sameHtml(view.err(), '<button class="btn-primary">Reintentar</button>', 'error');
  sameHtml(view.recP(), '<button class="btn-primary">Abrir restaurar versión estable…</button><button class="btn-secondary">Ver releases en GitHub</button>', 'recovery primary');
  sameHtml(view.recS(), '<button class="btn-secondary">Continuar de todos modos</button>', 'recovery secondary');
});

// downgrade.mjs built this button by hand before the port.
test('downgrade installer button equals the old DOM', () => {
  sameHtml(view.down(), '<button class="btn-primary">Abrir instalador en GitHub</button>', 'downgrade');
});

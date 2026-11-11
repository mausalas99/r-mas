import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { BootLoading, SessionBlock, LocalOnlyConfirm, LoadError } from './clinical-onboarding-view.jsx';
  export const boot = (p) => renderToString(<BootLoading {...p} />);
  export const session = (p) => renderToString(<SessionBlock {...p} />);
  export const local = () => renderToString(<LocalOnlyConfirm />);
  export const error = (message) => renderToString(<LoadError message={message} />);`);

// Markup of buildOnboardingBootLoadingHtml, buildOnboardingSessionBlockHtml, renderLocalOnlyConfirmPanel and the
// load-error line before the port, captured on the same inputs as below.
const OLD = createRequire(import.meta.url)('./clinical-onboarding-view-old-html.json');

test('boot loader equals the old HTML (no stepper, steps 1-3, escaped text)', () => {
  sameHtml(view.boot({}), OLD.bootDefault, 'default');
  sameHtml(view.boot({ title: 'Preparando R+', message: 'Cargando formulario…', stepperIndex: 2 }), OLD.bootStep2, 'step2');
  sameHtml(view.boot({ title: 'T <1> & "x"', message: "M <b> & 'c'", stepperIndex: 1 }), OLD.bootStep1, 'step1');
  sameHtml(view.boot({ stepperIndex: 3 }), OLD.bootStep3, 'step3');
});

test('session block equals the old HTML with and without Reintentar', () => {
  sameHtml(view.session({ lead: 'La base local ya está abierta, pero la sesión clínica no inició. Pulsa Reintentar abajo.', retry: true }), OLD.sessionRetry, 'retry');
  sameHtml(view.session({ lead: 'Reinstala desde GitHub o usa Ajustes → Aplicación → Reinstalar <versión> & "actual".', retry: false }), OLD.sessionBlocked, 'blocked');
  assert.doesNotMatch(view.session({ lead: 'x', retry: false }), /retry-session/);
});

test('local-only confirm equals the old HTML and keeps the ids the handlers use', () => {
  sameHtml(view.local(), OLD.localOnly, 'local');
  for (const id of ['clinical-onboard-local-confirm-btn', 'clinical-onboard-mode-back-btn', 'onboard-local-only-error']) {
    assert.ok(view.local().includes(`id="${id}"`), id);
  }
});

test('load error equals the old HTML', () => {
  sameHtml(view.error('Fallo <x> & "y" \'z\''), OLD.error, 'error');
  sameHtml(view.error('Error al cargar.'), OLD.errorDefault, 'default');
});

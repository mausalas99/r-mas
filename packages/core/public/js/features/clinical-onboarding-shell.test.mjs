import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClinicalOnboardingStepperHtml,
  wireOnboardingSubsteps,
} from './clinical-onboarding-shell.mjs';

function fakeEl(extra = {}) {
  return { hidden: false, textContent: '', focus() {}, querySelector: () => null, ...extra };
}

/** Just enough of a <form> for wireOnboardingSubsteps. */
function fakeForm(stepCount) {
  const steps = Array.from({ length: stepCount }, () => fakeEl());
  const submitBtn = fakeEl({ textContent: 'Guardar perfil' });
  const errEl = fakeEl({ hidden: true });
  const backListeners = [];
  const backBtn = fakeEl({ addEventListener: (_t, fn) => backListeners.push(fn) });
  const submitListeners = [];
  const form = {
    querySelectorAll: () => steps,
    querySelector: (sel) =>
      ({ '[type="submit"]': submitBtn, '[data-substep-back]': backBtn, '.clinical-registration-error': errEl })[sel] ||
      null,
    closest: () => null,
    addEventListener: (_t, fn) => submitListeners.push(fn),
    submit() {
      const ev = {
        prevented: false,
        stopped: false,
        preventDefault() { this.prevented = true; },
        stopImmediatePropagation() { this.stopped = true; },
      };
      submitListeners.forEach((fn) => fn(ev));
      return ev;
    },
    back: () => backListeners.forEach((fn) => fn()),
  };
  return { form, steps, submitBtn, errEl, backBtn };
}

const visible = (steps) => steps.findIndex((s) => !s.hidden);

describe('clinical-onboarding-shell', () => {
  it('stepper says which step of how many', () => {
    const html = buildClinicalOnboardingStepperHtml(2);
    assert.match(html, /Paso 2 de 3 · Perfil/);
    assert.match(html, /aria-valuenow="2"/);
    assert.equal((html.match(/is-done/g) || []).length, 1);
  });

  it('shows one question at a time and only lets the last one submit', () => {
    const { form, steps, submitBtn, backBtn } = fakeForm(3);
    wireOnboardingSubsteps(form);
    assert.equal(visible(steps), 0);
    assert.equal(submitBtn.textContent, 'Siguiente');
    assert.equal(backBtn.hidden, true);

    assert.equal(form.submit().stopped, true);
    assert.equal(visible(steps), 1);
    assert.equal(backBtn.hidden, false);

    form.back();
    assert.equal(visible(steps), 0);

    form.submit();
    form.submit();
    assert.equal(visible(steps), 2);
    assert.equal(submitBtn.textContent, 'Guardar perfil');
    assert.equal(form.submit().stopped, false, 'last question reaches the real submit handler');
  });

  it('stays on a question that fails its check and shows why', () => {
    const { form, steps, errEl } = fakeForm(2);
    wireOnboardingSubsteps(form, (i) => (i === 0 ? 'Usuario inválido.' : ''));
    form.submit();
    assert.equal(visible(steps), 0);
    assert.equal(errEl.hidden, false);
    assert.equal(errEl.textContent, 'Usuario inválido.');
  });
});

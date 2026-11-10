import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRegistroTabKeydown } from './estado-actual-panel-registro-tab.mjs';

/** Fake form: only #ea-recorded-at and #ea-io-evac exist, so the spine is [recorded, evac]. */
function setup(shellButtons) {
  const focused = [];
  const mk = (id) => ({
    id,
    closest: () => null,
    getAttribute: () => null,
    matches: () => false,
    focus() {
      focused.push(id);
    },
  });
  const recorded = mk('recorded');
  const evac = mk('evac');
  const byId = { '#ea-recorded-at': recorded, '#ea-io-evac': evac };
  const shell = {
    querySelector: (sel) => shellButtons[sel] || null,
  };
  const form = {
    contains: () => true,
    closest: (sel) => (sel === '.ea-registro-shell' ? shell : null),
    querySelector: (sel) => byId[sel] || null,
  };
  return { form, recorded, evac, focused };
}

function press(form, target, shiftKey) {
  let prevented = false;
  handleRegistroTabKeydown(form, { key: 'Tab', target, shiftKey, preventDefault: () => (prevented = true) });
  return prevented;
}

test('Tab inside the spine moves to the next spine field and prevents default', () => {
  const t = setup({});
  assert.equal(press(t.form, t.recorded, false), true);
  assert.deepEqual(t.focused, ['evac']);
});

test('Tab on the last spine field focuses Siguiente', () => {
  const btns = {};
  const t = setup(btns);
  btns['[data-ea-step-next]:not([hidden])'] = { focus: () => t.focused.push('next') };
  assert.equal(press(t.form, t.evac, false), true);
  assert.deepEqual(t.focused, ['next']);
});

test('Tab on the last spine field of the last step focuses Registrar', () => {
  const btns = {};
  const t = setup(btns);
  btns['.ea-registro-submit:not([hidden])'] = { focus: () => t.focused.push('submit') };
  assert.equal(press(t.form, t.evac, false), true);
  assert.deepEqual(t.focused, ['submit']);
});

test('Shift+Tab on the first spine field is left to the browser', () => {
  const t = setup({});
  assert.equal(press(t.form, t.recorded, true), false);
  assert.deepEqual(t.focused, []);
});

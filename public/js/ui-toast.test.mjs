
import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import {
  showToast,
  shouldDismissToastSwipe,
  TOAST_SWIPE_DISMISS_VELOCITY,
} from './ui-toast.mjs';
import { getReleaseVelocity } from './ui-motion.mjs';

function setupDom() {
  if (typeof document === 'undefined') return false;
  document.body.innerHTML = '';
  return true;
}

test('stack cap keeps at most 3 toasts', () => {
  if (!setupDom()) return;
  showToast('uno');
  showToast('dos');
  showToast('tres');
  showToast('cuatro');
  const stack = document.getElementById('toast-stack');
  assert.equal(stack.children.length, 3);
  const texts = Array.from(stack.children).map(function (el) {
    return el.querySelector('.toast-text').textContent;
  });
  assert.deepEqual(texts, ['dos', 'tres', 'cuatro']);
});

test('document.hidden pauses dismiss timer', () => {
  if (!setupDom()) return;
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get() {
        return this.__hidden === true;
      },
    });
    document.__hidden = false;

    showToast('pausa');
    const stack = document.getElementById('toast-stack');
    const el = stack.lastElementChild;
    assert.ok(el);

    mock.timers.tick(2000);
    document.__hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    mock.timers.tick(5000);

    assert.ok(el.isConnected, 'toast should remain while hidden');

    document.__hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    mock.timers.tick(2000);
    assert.ok(!el.isConnected, 'toast should dismiss after resumed remaining time');
  } finally {
    mock.timers.reset();
    delete document.__hidden;
  }
});

test('optional action button renders and invokes onClick', () => {
  if (!setupDom()) return;
  let clicked = false;
  showToast('con acción', 'info', {
    action: {
      label: 'Deshacer',
      onClick() {
        clicked = true;
      },
    },
  });
  const stack = document.getElementById('toast-stack');
  const btn = stack.querySelector('.toast-action');
  assert.ok(btn);
  assert.equal(btn.textContent, 'Deshacer');
  btn.click();
  assert.equal(clicked, true);
  assert.equal(stack.children.length, 0);
});

test('swipe dismiss uses getReleaseVelocity threshold 0.11', () => {
  const history = [
    { t: 0, x: 0, y: 0 },
    { t: 50, x: 8, y: 0 },
  ];
  const velocity = getReleaseVelocity(history, { axis: 'x', now: 50 });
  assert.ok(velocity >= TOAST_SWIPE_DISMISS_VELOCITY);
  assert.equal(shouldDismissToastSwipe(velocity), true);
  assert.equal(shouldDismissToastSwipe(0.05), false);
});

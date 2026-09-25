/**
 * Smooth onboarding boot progress (app bundle).
 */

const BOOT_ROTATE_MESSAGES = [
  'Iniciando R+…',
  'Cargando interfaz…',
  'Preparando almacenamiento local…',
  'Un momento más…',
];
const BOOT_FINAL_MESSAGE = 'Casi listo…';
const BOOT_ROTATE_MS = 4200;

function resolveBootProgressScope(root) {
  if (!root) return null;
  if (root instanceof Element && root.classList.contains('clinical-onboard-boot-loader')) return root;
  if (root instanceof Element || root instanceof DocumentFragment) {
    const found = root.querySelector('.clinical-onboard-boot-loader');
    if (found) return found;
  }
  return null;
}

function readBootProgress(bar) {
  const raw = parseFloat(String(bar.style.width || '0').replace('%', ''));
  return Number.isFinite(raw) ? raw : 3;
}

function pickRotatingMessage(elapsedMs) {
  const elapsed = Math.max(0, elapsedMs);
  const idx = Math.floor(elapsed / BOOT_ROTATE_MS) % BOOT_ROTATE_MESSAGES.length;
  return BOOT_ROTATE_MESSAGES[idx];
}

/** @param {Element} scope @param {HTMLElement} label @param {number} elapsedMs */
function syncRotatingLabel(scope, label, elapsedMs) {
  if (!label || scope._rpcBootMessageLocked) return;
  const next = pickRotatingMessage(elapsedMs);
  if (label.textContent !== next) label.textContent = next;
}

/** @param {Element} scope @param {HTMLElement|null} label */
function lockBootFinalMessage(scope, label) {
  scope._rpcBootMessageLocked = true;
  if (label) label.textContent = BOOT_FINAL_MESSAGE;
}

/** @param {ParentNode|null|undefined} root */
export function stopOnboardingBootProgress(root) {
  const scope = resolveBootProgressScope(root);
  if (!scope) return;
  scope._rpcBootMessageLocked = true;
  if (scope._rpcBootProgressRaf) {
    cancelAnimationFrame(scope._rpcBootProgressRaf);
    scope._rpcBootProgressRaf = null;
  }
}

/** @param {ParentNode|null|undefined} root */
export function startOnboardingBootProgress(root) {
  const scope = resolveBootProgressScope(root);
  if (!scope) return () => {};

  const bar = scope.querySelector('.clinical-onboard-boot-progress-bar');
  const label = scope.querySelector('.clinical-onboard-boot-progress-label');
  if (!bar || !label) return () => {};

  if (scope._rpcBootProgressRaf) {
    return () => stopOnboardingBootProgress(scope);
  }

  scope._rpcBootMessageLocked = false;
  if (!scope._rpcBootStartedAt) scope._rpcBootStartedAt = performance.now();

  bar.classList.remove('is-indeterminate');
  let progress = readBootProgress(bar);
  if (progress < 3) progress = 3;
  bar.style.width = `${progress.toFixed(2)}%`;
  syncRotatingLabel(scope, label, performance.now() - scope._rpcBootStartedAt);

  let lastTs = 0;
  function tick(ts) {
    if (!scope.isConnected) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(48, ts - lastTs);
    lastTs = ts;
    const cap = 94;
    const remaining = Math.max(0, cap - progress);
    const speed = 0.008 + (remaining / cap) * 0.045;
    progress = Math.min(cap, progress + speed * dt);
    bar.style.width = `${progress.toFixed(2)}%`;
    syncRotatingLabel(scope, label, performance.now() - scope._rpcBootStartedAt);
    scope._rpcBootProgressRaf = requestAnimationFrame(tick);
  }
  scope._rpcBootProgressRaf = requestAnimationFrame(tick);
  return () => stopOnboardingBootProgress(scope);
}

/** @param {ParentNode|null|undefined} root @param {string} [message] */
export function finishOnboardingBootProgress(root, message = 'Listo') {
  const scope = resolveBootProgressScope(root);
  if (!scope) return;
  stopOnboardingBootProgress(scope);
  const bar = scope.querySelector('.clinical-onboard-boot-progress-bar');
  const label = scope.querySelector('.clinical-onboard-boot-progress-label');
  if (bar) {
    bar.classList.remove('is-indeterminate');
    bar.style.width = '100%';
  }
  if (label) label.textContent = message;
}

/**
 * Animate bar to 100% before swapping onboarding content.
 * @param {ParentNode|null|undefined} root
 * @param {string} [message]
 * @returns {Promise<void>}
 */
export function animateOnboardingBootComplete(root, message = 'Listo') {
  const scope = resolveBootProgressScope(root);
  if (!scope) return Promise.resolve();

  const bar = scope.querySelector('.clinical-onboard-boot-progress-bar');
  const label = scope.querySelector('.clinical-onboard-boot-progress-label');
  if (!bar) return Promise.resolve();

  lockBootFinalMessage(scope, label);
  if (scope._rpcBootProgressRaf) {
    cancelAnimationFrame(scope._rpcBootProgressRaf);
    scope._rpcBootProgressRaf = null;
  }
  bar.classList.remove('is-indeterminate');
  const from = readBootProgress(bar);
  const duration = Math.max(380, Math.min(720, 520 + (100 - from) * 4));
  const doneText = message;

  return new Promise((resolve) => {
    const t0 = performance.now();
    function frame(now) {
      if (!scope.isConnected) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - t) ** 2.4;
      const value = from + (100 - from) * eased;
      bar.style.width = `${value.toFixed(2)}%`;
      if (label) label.textContent = t < 0.82 ? BOOT_FINAL_MESSAGE : doneText;
      if (t < 1) {
        requestAnimationFrame(frame);
        return;
      }
      bar.style.width = '100%';
      if (label) label.textContent = doneText;
      window.setTimeout(resolve, 140);
    }
    requestAnimationFrame(frame);
  });
}

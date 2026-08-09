/**
 * Smooth onboarding boot progress (plain JS — runs before app.bundle).
 */
(function () {
  'use strict';

  var BOOT_ROTATE_MESSAGES = [
    'Iniciando R+…',
    'Cargando interfaz…',
    'Preparando almacenamiento local…',
    'Un momento más…',
  ];
  var BOOT_FINAL_MESSAGE = 'Casi listo…';
  var BOOT_ROTATE_MS = 4200;

  function resolveScope(root) {
    if (!root) return null;
    if (root.classList && root.classList.contains('clinical-onboard-boot-loader')) return root;
    if (root.querySelector) {
      var found = root.querySelector('.clinical-onboard-boot-loader');
      if (found) return found;
    }
    return null;
  }

  function pickRotatingMessage(elapsedMs) {
    if (elapsedMs < 0) elapsedMs = 0;
    var idx = Math.floor(elapsedMs / BOOT_ROTATE_MS) % BOOT_ROTATE_MESSAGES.length;
    return BOOT_ROTATE_MESSAGES[idx];
  }

  function syncRotatingLabel(scope, label, elapsedMs) {
    if (!label || scope._rpcBootMessageLocked) return;
    var next = pickRotatingMessage(elapsedMs);
    if (label.textContent !== next) label.textContent = next;
  }

  function lockFinalMessage(scope, label) {
    scope._rpcBootMessageLocked = true;
    if (label) label.textContent = BOOT_FINAL_MESSAGE;
  }

  function stop(scope) {
    if (!scope) return;
    scope._rpcBootMessageLocked = true;
    if (scope._rpcBootProgressRaf) {
      cancelAnimationFrame(scope._rpcBootProgressRaf);
      scope._rpcBootProgressRaf = null;
    }
  }

  function readProgress(bar) {
    var raw = parseFloat(String(bar.style.width || '0').replace('%', ''));
    return Number.isFinite(raw) ? raw : 3;
  }

  function start(root) {
    var scope = resolveScope(root);
    if (!scope) return function () {};

    var bar = scope.querySelector('.clinical-onboard-boot-progress-bar');
    var label = scope.querySelector('.clinical-onboard-boot-progress-label');
    if (!bar || !label) return function () {};

    if (scope._rpcBootProgressRaf) {
      return function () {
        stop(scope);
      };
    }

    scope._rpcBootMessageLocked = false;
    if (!scope._rpcBootStartedAt) scope._rpcBootStartedAt = performance.now();

    bar.classList.remove('is-indeterminate');
    var progress = readProgress(bar);
    if (progress < 3) progress = 3;
    bar.style.width = progress.toFixed(2) + '%';
    syncRotatingLabel(scope, label, performance.now() - scope._rpcBootStartedAt);

    var lastTs = 0;
    function tick(ts) {
      if (!scope.isConnected) return;
      if (!lastTs) lastTs = ts;
      var dt = Math.min(48, ts - lastTs);
      lastTs = ts;
      var cap = 94;
      var remaining = Math.max(0, cap - progress);
      var speed = 0.008 + (remaining / cap) * 0.045;
      progress = Math.min(cap, progress + speed * dt);
      bar.style.width = progress.toFixed(2) + '%';
      syncRotatingLabel(scope, label, performance.now() - scope._rpcBootStartedAt);
      scope._rpcBootProgressRaf = requestAnimationFrame(tick);
    }
    scope._rpcBootProgressRaf = requestAnimationFrame(tick);
    return function () {
      stop(scope);
    };
  }

  function finishAsync(root, message) {
    var scope = resolveScope(root);
    if (!scope) return Promise.resolve();
    var bar = scope.querySelector('.clinical-onboard-boot-progress-bar');
    var label = scope.querySelector('.clinical-onboard-boot-progress-label');
    if (!bar) return Promise.resolve();

    lockFinalMessage(scope, label);
    if (scope._rpcBootProgressRaf) {
      cancelAnimationFrame(scope._rpcBootProgressRaf);
      scope._rpcBootProgressRaf = null;
    }
    bar.classList.remove('is-indeterminate');
    var from = readProgress(bar);
    var duration = Math.max(380, Math.min(720, 520 + (100 - from) * 4));
    var doneText = message || 'Listo';

    return new Promise(function (resolve) {
      var t0 = performance.now();
      function frame(now) {
        if (!scope.isConnected) {
          resolve();
          return;
        }
        var t = Math.min(1, (now - t0) / duration);
        var eased = 1 - Math.pow(1 - t, 2.4);
        var value = from + (100 - from) * eased;
        bar.style.width = value.toFixed(2) + '%';
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

  window.__rpcOnboardingBootProgress = {
    start: start,
    stop: stop,
    finishAsync: finishAsync,
    finalMessage: BOOT_FINAL_MESSAGE,
  };
})();

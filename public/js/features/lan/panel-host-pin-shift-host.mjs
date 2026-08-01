/**
 * LAN shift PIN host display (show/copy/regenerate ward PIN).
 */
import { copyToClipboardSafe } from '../soap-estado.mjs';
import {
  isLanElectronDesktop,
  isLanRemoteJoinMode,
  isLanSessionConfiguredForRest,
  resolveLanShareBaseUrl,
  resolveHostBearerToken,
  lanFetchAuthed,
  shouldShowLanShiftPinHostDisplay,
} from './transport.mjs';

function formatShiftPinDisplay(pin) {
  var s = String(pin || '').replace(/\D/g, '');
  if (s.length === 6) return s.slice(0, 3) + ' ' + s.slice(3);
  return s;
}

/** @param {import('./panel-host-pin.mjs').PanelHostPinDeps} deps */
async function fetchValidLanShiftPin(deps, gen) {
  if (!shouldShowLanShiftPinHostDisplay() || deps.lanPanelRenderStale(gen)) return null;
  var bearer = await resolveHostBearerToken();
  if (!bearer || deps.lanPanelRenderStale(gen)) return null;
  try {
    var resp = await lanFetchAuthed('/api/lan/v1/auth/shift-pin');
    if (!resp.ok || deps.lanPanelRenderStale(gen)) return null;
    var body = await resp.json();
    var pin = String(body.pin || '').trim();
    if (!/^\d{6}$/.test(pin) || deps.lanPanelRenderStale(gen)) return null;
    return { pin, body };
  } catch {
    return null;
  }
}

function buildLanShiftPinExpiryLine(expiresAt) {
  var exp = document.createElement('p');
  exp.className = 'lan-pin-meta';
  try {
    exp.textContent =
      'Válido hasta ' +
      new Date(expiresAt).toLocaleString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
      });
  } catch {
    exp.textContent = 'Válido hasta ' + String(expiresAt);
  }
  return exp;
}

/** @param {import('./panel-host-pin.mjs').PanelHostPinDeps} deps */
function buildLanShiftPinHostActions(deps, pin) {
  var actions = document.createElement('div');
  actions.className = 'lan-connection-hero__pin-actions';

  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn-settings-row';
  copyBtn.id = 'lan-copy-shift-pin';
  copyBtn.textContent = 'Copiar';
  copyBtn.addEventListener('click', function () {
    void copyToClipboardSafe(pin).then(function (ok) {
      deps.runtime().showToast(
        ok ? 'PIN del turno copiado.' : 'No se pudo copiar al portapapeles.',
        ok ? 'success' : 'error'
      );
    });
  });
  actions.appendChild(copyBtn);

  var regenBtn = document.createElement('button');
  regenBtn.type = 'button';
  regenBtn.className = 'btn-settings-row';
  regenBtn.id = 'lan-regen-shift-pin';
  regenBtn.textContent = 'Nuevo';
  regenBtn.addEventListener('click', function () {
    void lanFetchAuthed('/api/lan/v1/auth/shift-pin/regenerate', { method: 'POST' }).then(
      function (r) {
        if (r && r.ok) {
          deps.runtime().showToast('PIN del turno renovado.', 'success');
          deps.renderLanPanel({ force: true });
        } else {
          deps.runtime().showToast('No se pudo renovar el PIN.', 'error');
        }
      }
    );
  });
  actions.appendChild(regenBtn);

  return actions;
}

function ensureLanHeroPinSlot(root) {
  var hero = root.classList.contains('lan-connection-hero')
    ? root
    : root.querySelector('.lan-connection-hero') || root;
  var pin = hero.querySelector('.lan-connection-hero__pin');
  if (!pin) {
    pin = document.createElement('div');
    pin.className = 'lan-connection-hero__pin';
    pin.setAttribute('data-lan-shift-pin', '1');
    pin.setAttribute('aria-label', 'PIN del turno');
    hero.appendChild(pin);
  }
  return pin;
}

function buildLanShiftPinHostPinContent(_deps, pinValue, body) {
  var pin = document.createElement('div');
  pin.className = 'lan-connection-hero__pin-main';
  var code = document.createElement('code');
  code.id = 'lan-shift-pin-code';
  code.className = 'lan-pin-code';
  code.textContent = formatShiftPinDisplay(pinValue);
  pin.appendChild(code);
  if (body.expiresAt) {
    pin.appendChild(buildLanShiftPinExpiryLine(body.expiresAt));
  }
  return pin;
}

/** @param {import('./panel-host-pin.mjs').PanelHostPinDeps} deps */
function renderLanShiftPinIntoHero(deps, root, pinValue, body) {
  var slot = ensureLanHeroPinSlot(root);
  slot.innerHTML = '';
  slot.setAttribute('data-lan-shift-pin', '1');
  slot.appendChild(buildLanShiftPinHostPinContent(deps, pinValue, body));
  slot.appendChild(buildLanShiftPinHostActions(deps, pinValue));
}

/** @param {import('./panel-host-pin.mjs').PanelHostPinDeps} deps */
export async function appendLanShiftPinSection(deps, root, gen) {
  if (!root || !isLanElectronDesktop() || deps.lanPanelRenderStale(gen)) return;
  var fetched = await fetchValidLanShiftPin(deps, gen);
  if (!fetched || deps.lanPanelRenderStale(gen)) return;

  root.querySelectorAll('[data-lan-shift-pin]').forEach(function (el) {
    if (el.classList.contains('lan-connection-hero__pin')) return;
    el.remove();
  });

  renderLanShiftPinIntoHero(deps, root, fetched.pin, fetched.body);
}

/** @param {import('./panel-host-pin.mjs').PanelHostPinDeps} deps */
export function appendLanHostAddressCopyButton(deps, root, gen) {
  if (!root || !isLanElectronDesktop() || isLanRemoteJoinMode()) return;
  if (deps.lanPanelRenderStale(gen)) return;
  if (!isLanSessionConfiguredForRest() && !deps.getLanClient().connected) return;
  if (root.querySelector('[data-lan-host-address-copy]')) return;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-settings-row';
  btn.setAttribute('data-lan-host-address-copy', '1');
  btn.textContent = 'Copiar dirección';
  btn.addEventListener('click', function () {
    void resolveLanShareBaseUrl().then(function (shareUrl) {
      if (!shareUrl) {
        deps.runtime().showToast('No hay dirección del anfitrión disponible.', 'error');
        return;
      }
      void copyToClipboardSafe(shareUrl).then(function (ok) {
        if (ok) {
          deps.runtime().showToast(
            'Dirección copiada — en la otra Mac pégala en ⇄ (Unirse) junto con el PIN del turno.',
            'success'
          );
          return;
        }
        deps.runtime().showToast('No se pudo copiar al portapapeles.', 'error');
      });
    });
  });

  var anchor =
    root.querySelector('.lan-connection-hero__pin-actions') ||
    root.querySelector('[data-lan-shift-pin]') ||
    root.querySelector('.lan-connection-hero');
  if (anchor) {
    if (anchor.classList.contains('lan-connection-hero__pin-actions')) {
      anchor.appendChild(btn);
    } else {
      var actions = anchor.querySelector('.lan-connection-hero__pin-actions');
      if (actions) actions.appendChild(btn);
      else anchor.appendChild(btn);
    }
  } else {
    root.appendChild(btn);
  }
}

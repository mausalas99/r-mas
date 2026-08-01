/**
 * LAN turn reset alert strip + client reset flow.
 */
import {
  isClinicalLocalOnlyMode,
  readRpcSettings,
} from '../../clinical-settings.mjs';
import { isLanSkipShiftPin } from '../../lan-shift-pin-bypass.mjs';
import {
  hasPinnedHostOverride,
  isPinnedHostLocal,
} from '../../lan-host-pin.mjs';
import {
  isLanElectronDesktop,
  isLanRestHostOwnMachine,
  resolveOwnLanBaseForPin,
} from './transport.mjs';

function buildLanTurnResetAlertStrip(deps, ownHost) {
  var strip = document.createElement('div');
  strip.className = 'lan-alert-strip lan-turn-reset-alert';

  var copy = document.createElement('div');
  copy.className = 'lan-alert-strip__copy';
  var title = document.createElement('strong');
  title.textContent = ownHost ? 'Dos servidores en la misma sala' : 'Restablecer conexión ⇄';
  var hint = document.createElement('div');
  hint.className = 'lan-alert-strip__hint';
  hint.textContent = ownHost
    ? 'Esta Mac usa su propio servidor. Restablece y conéctate al anfitrión del turno (PIN o enlace ⇄).'
    : 'Si el directorio no coincide entre Macs, restablece y vuelve a conectar.';
  copy.appendChild(title);
  copy.appendChild(hint);
  strip.appendChild(copy);

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = ownHost ? 'btn-settings-row btn-settings-row--warn' : 'btn-settings-row';
  btn.textContent = 'Restablecer';
  btn.onclick = function () {
    void resetLanTurnConnectionFromUi(deps);
  };
  strip.appendChild(btn);

  return strip;
}

/** @param {import('./panel-host-pin.mjs').PanelHostPinDeps} deps */
export async function appendLanTurnResetAlertStrip(deps, root, gen) {
  if (!isLanElectronDesktop()) return;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return;

  var ownHost = false;
  var ownUrl = '';
  try {
    ownUrl = await resolveOwnLanBaseForPin();
    ownHost = await isLanRestHostOwnMachine();
  } catch (_e) { void _e; }

  if (deps.lanPanelRenderStale(gen)) return;

  if (hasPinnedHostOverride() && isPinnedHostLocal(ownUrl)) {
    root.querySelectorAll('.lan-turn-reset-alert, .lan-turn-reset-card').forEach(function (el) {
      el.remove();
    });
    return;
  }

  root.querySelectorAll('.lan-turn-reset-alert, .lan-turn-reset-card').forEach(function (el) {
    el.remove();
  });

  root.appendChild(buildLanTurnResetAlertStrip(deps, ownHost));
}

/** @param {import('./panel-host-pin.mjs').PanelHostPinDeps} deps */
export async function resetLanTurnConnectionFromUi(deps) {
  if (!isLanElectronDesktop()) {
    deps.runtime().showToast('Solo disponible en la app de escritorio.', 'error');
    return;
  }
  var resetMod = await import('../../lan-turn-reset.mjs');
  if (!confirm(resetMod.LAN_TURN_RESET_CLIENT_CONFIRM)) return;

  await resetMod.performLanTurnClientReset({
    leaveLiveSyncRoom: deps.leaveLiveSyncRoom,
    lanClient: deps.getLanClient(),
  });
  try {
    const profileLan = await import('../../clinical-profile-lan-sync.mjs');
    if (typeof profileLan.seedDevPeerLanConfigIfNeeded === 'function') {
      await profileLan.seedDevPeerLanConfigIfNeeded();
    }
  } catch (_e) { void _e; }
  deps.resumeAutoHostDetectAndReconnect();

  var connected = false;
  try {
    const pinMod = await import('../../lan-shift-pin-connect.mjs');
    if (typeof pinMod.tryEasyLanShiftPinConnect === 'function') {
      const result = await pinMod.tryEasyLanShiftPinConnect({
        force: true,
        skipCooldown: true,
      });
      connected = !!(result && result.ok);
    }
  } catch (_e) { void _e; }

  try {
    const panel = await import('./panel.mjs');
    if (typeof panel.scanLanHosts === 'function') {
      void panel.scanLanHosts();
    }
  } catch (_e) { void _e; }

  deps.runtime().showToast(
    connected
      ? 'Conexión restablecida — conectado al anfitrión del turno.'
      : 'Conexión restablecida. Buscando anfitrión en la Wi‑Fi del hospital…',
    connected ? 'success' : 'info'
  );
  deps.renderLanPanel({ force: true });
  if (!isLanSkipShiftPin()) {
    window.setTimeout(function () {
      deps.focusLanShiftPinInput();
    }, 120);
  }
}

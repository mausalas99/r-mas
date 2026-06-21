/**
 * LAN panel host pin + shift PIN sections — extracted from panel.mjs.
 */
import { storage } from '../../storage.js';
import { copyToClipboardSafe } from '../soap-estado.mjs';
import {
  isClinicalLocalOnlyMode,
  readRpcSettings,
  bundledWardShiftPin,
  bundledWardHostUrl,
} from '../../clinical-settings.mjs';
import {
  getPinnedHostUrl,
  setPinnedHostUrl,
  clearPinnedHostUrl,
  isPinnedHostLocal,
} from '../../lan-host-pin.mjs';
import { normalizeLanHostBase } from '../../lan-host-subnet-discovery.mjs';
import { listWardHostUrlsForProbe } from '../../lan-ward-host-registry.mjs';
import { canLocalMacBeLanHost } from '../../lan-host-rank-policy.mjs';
import {
  isLanSessionConfiguredForRest,
  isLanElectronDesktop,
  isLanRemoteJoinMode,
  resolveLanShareBaseUrl,
  resolveHostBearerToken,
  getLanTeamCodeFromConfig,
  lanFetchAuthed,
  shouldShowLanShiftPinClientConnect,
  shouldShowLanShiftPinHostDisplay,
  isLanRestHostOwnMachine,
  applyPinnedHostOverride,
  resolveOwnLanBaseForPin,
} from './transport.mjs';

/** @typedef {ReturnType<typeof createPanelHostPin>} PanelHostPinApi */

function createLanHostPinCheckboxLabel() {
  var label = document.createElement('label');
  label.className = 'lan-host-pin-label';
  label.setAttribute('for', 'lan-pin-host-checkbox');
  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = 'lan-pin-host-checkbox';
  label.appendChild(cb);
  label.appendChild(
    document.createTextNode(' Fijar anfitrión del turno (solo en la Mac servidor)')
  );
  return { label, cb };
}

function buildLanHostPinModeHint() {
  var hint = document.createElement('p');
  hint.className = 'lan-connect-card-hint';
  hint.style.marginTop = '6px';
  hint.textContent = isLanRemoteJoinMode()
    ? 'Marca la casilla para forzar esta Mac como anfitrión (anula modo cliente y elección automática).'
    : 'Override del turno: esta Mac será el servidor aunque haya otros en la red. Desmarca para volver a elección automática.';
  return hint;
}

function wireLanHostPinCheckbox(deps, cb, hostUrl, resolvedOwn) {
  var ownForPin = resolvedOwn || hostUrl || '';
  var pinned = getPinnedHostUrl();
  cb.checked =
    !!pinned &&
    (pinned === String(hostUrl || '').replace(/\/+$/, '') ||
      isPinnedHostLocal(ownForPin) ||
      (ownForPin && pinned === ownForPin));
  cb.disabled = false;
  cb.onchange = function () {
    if (cb.checked) {
      void resolveLanShareBaseUrl().then(function (shareUrl) {
        var pinUrl = shareUrl || hostUrl || resolvedOwn;
        setPinnedHostUrl(pinUrl);
        void applyPinnedHostOverride(getLanTeamCodeFromConfig(), {}).then(function (ok) {
          if (ok) {
            deps.runtime().showToast(
              'Anfitrión fijado: esta Mac asume el servidor del turno.',
              'success'
            );
          }
          deps.renderLanPanel({ force: true });
        });
      });
    } else {
      clearPinnedHostUrl();
      deps.runtime().showToast(
        'Anfitrión ya no está fijado; la red puede sugerir otro servidor.',
        'info'
      );
      deps.renderLanPanel({ force: true });
    }
  };
}

function appendLanHostPinPinnedHints(wrap, ownBase, pinned) {
  if (!pinned) return;
  void resolveOwnLanBaseForPin().then(function (resolvedOwn) {
    var ownResolved = resolvedOwn || ownBase;
    if (!isPinnedHostLocal(ownResolved) && isLanRemoteJoinMode()) {
      var remoteHint = document.createElement('p');
      remoteHint.className = 'lan-connect-card-hint';
      remoteHint.style.marginTop = '4px';
      remoteHint.textContent = 'Conectando al anfitrión fijado: ' + pinned;
      wrap.appendChild(remoteHint);
    } else if (isPinnedHostLocal(ownResolved) && isLanRemoteJoinMode()) {
      var localHint = document.createElement('p');
      localHint.className = 'lan-connect-card-hint';
      localHint.style.marginTop = '4px';
      localHint.textContent =
        'Fijado en esta Mac (' + pinned + '). La casilla fuerza servidor local (override).';
      wrap.appendChild(localHint);
    }
  });
}

/** @param {Parameters<typeof createPanelHostPin>[0]} deps */
function appendLanHostPinSection(deps, root) {
  if (!root || !isLanElectronDesktop() || !canLocalMacBeLanHost()) return;
  var hostUrl = deps.lanHostUrl();
  if (!hostUrl && !getPinnedHostUrl()) return;

  var wrap = document.createElement('div');
  wrap.className = 'lan-connect-card lan-host-pin-card';
  var pinParts = createLanHostPinCheckboxLabel();
  var ownBase = hostUrl || '';
  var pinned = getPinnedHostUrl();

  void resolveOwnLanBaseForPin().then(function (resolvedOwn) {
    wireLanHostPinCheckbox(deps, pinParts.cb, hostUrl, resolvedOwn);
  });

  wrap.appendChild(pinParts.label);
  wrap.appendChild(buildLanHostPinModeHint());
  appendLanHostPinPinnedHints(wrap, ownBase, pinned);
  root.appendChild(wrap);
}

function buildLanTurnResetCard(ownHost) {
  var card = document.createElement('div');
  card.className = 'lan-connect-card lan-turn-reset-card';
  if (ownHost) card.classList.add('lan-turn-reset-card--warn');

  var title = document.createElement('div');
  title.className = 'lan-connect-card-title';
  title.textContent = ownHost ? 'Dos servidores en la misma sala' : 'Restablecer conexión ⇄';
  card.appendChild(title);

  var hint = document.createElement('p');
  hint.className = 'lan-connect-card-hint';
  hint.textContent = ownHost
    ? 'Esta Mac está usando su propio servidor. Para ver el mismo directorio que el turno, restablece y conéctate al anfitrión con el PIN o el enlace ⇄.'
    : 'Si el directorio no coincide entre Macs, sal de la sala, quita el anfitrión fijado y vuelve a conectar.';
  card.appendChild(hint);

  return card;
}

/** @param {Parameters<typeof createPanelHostPin>[0]} deps */
async function appendLanTurnResetSection(deps, root, gen) {
  if (!isLanElectronDesktop()) return;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return;

  var ownHost = false;
  try {
    ownHost = await isLanRestHostOwnMachine();
  } catch {
    /* ignore */
  }

  if (deps.lanPanelRenderStale(gen)) return;

  var existing = root.querySelector('.lan-turn-reset-card');
  if (existing) existing.remove();

  var card = buildLanTurnResetCard(ownHost);
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = ownHost ? 'btn-lan-primary' : 'btn-lan-secondary';
  btn.style.width = '100%';
  btn.textContent = 'Restablecer conexión al turno';
  btn.onclick = function () {
    void resetLanTurnConnectionFromUi(deps);
  };
  card.appendChild(btn);

  if (canLocalMacBeLanHost()) {
    var hostHint = document.createElement('p');
    hostHint.className = 'lan-connect-card-hint';
    hostHint.style.marginTop = '8px';
    hostHint.innerHTML =
      'Si <strong>tú</strong> eres el único R4 anfitrión, en Ajustes usa «LAN · servidor en esta computadora» → Restablecer estado del host.';
    card.appendChild(hostHint);
  }

  root.appendChild(card);
}

/** @param {Parameters<typeof createPanelHostPin>[0]} deps */
async function resetLanTurnConnectionFromUi(deps) {
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
  } catch {
    /* ignore */
  }
  deps.resumeAutoHostDetectAndReconnect();

  deps.runtime().showToast(
    'Conexión restablecida. Ingresa el PIN del turno o pega el enlace del anfitrión.',
    'success'
  );
  deps.renderLanPanel({ force: true });
  window.setTimeout(function () {
    deps.focusLanShiftPinInput();
  }, 120);
}

function resolveLanShiftPinHostPrefill() {
  var cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  var devHost =
    typeof window !== 'undefined' &&
    window.electronAPI &&
    typeof window.electronAPI.isLanDevPeer === 'function' &&
    window.electronAPI.isLanDevPeer()
      ? 'http://127.0.0.1:3738'
      : '';
  return (
    normalizeLanHostBase(cfg.hostUrl) ||
    normalizeLanHostBase(devHost) ||
    listWardHostUrlsForProbe()[0] ||
    ''
  );
}

function createLanShiftPinClientInput() {
  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'lan-input-shift-pin';
  input.className = 'profile-input';
  input.inputMode = 'numeric';
  input.maxLength = 6;
  input.autocomplete = 'off';
  input.placeholder = '123456';
  var saved = typeof storage.getLanShiftPin === 'function' ? storage.getLanShiftPin() : '';
  var bundled = bundledWardShiftPin();
  if (saved) input.value = saved;
  else if (bundled) input.value = bundled;
  return input;
}

function createLanShiftPinHostUrlField(wardPrefill) {
  var hostUrlLabel = document.createElement('label');
  hostUrlLabel.className = 'lan-connect-card-hint';
  hostUrlLabel.style.display = 'block';
  hostUrlLabel.style.marginTop = '8px';
  hostUrlLabel.style.marginBottom = '4px';
  hostUrlLabel.setAttribute('for', 'lan-input-host-url-ward');
  hostUrlLabel.textContent = 'Dirección del anfitrión (opcional)';

  var hostUrlInput = document.createElement('input');
  hostUrlInput.type = 'text';
  hostUrlInput.id = 'lan-input-host-url-ward';
  hostUrlInput.className = 'profile-input lan-shift-pin-host-url';
  hostUrlInput.autocomplete = 'off';
  hostUrlInput.placeholder =
    bundledWardHostUrl() || 'http://127.0.0.1:3738 o IP del anfitrión';
  if (wardPrefill) hostUrlInput.value = wardPrefill;

  var hostUrlHint = document.createElement('p');
  hostUrlHint.className = 'lan-connect-card-hint';
  hostUrlHint.style.marginTop = '4px';
  hostUrlHint.textContent =
    'Si el Wi‑Fi del hospital cambia de red, pide la dirección al R4 o pégala aquí.';

  return { hostUrlLabel, hostUrlInput, hostUrlHint };
}

function wireLanShiftPinClientConnect(deps, input, hostUrlInput, btn) {
  btn.addEventListener('click', function () {
    var pin = String(input.value || '').trim();
    if (!/^\d{6}$/.test(pin)) {
      deps.runtime().showToast('Ingresa los 6 dígitos del PIN.', 'error');
      return;
    }
    btn.disabled = true;
    var manualHost = String(hostUrlInput.value || '').trim();
    void import('../../lan-shift-pin-connect.mjs')
      .then(function (m) {
        return m.tryEasyLanShiftPinConnect({
          shiftPin: pin,
          hostUrl: manualHost,
          force: true,
        });
      })
      .then(function (result) {
        if (result && result.ok) {
          deps.renderLanPanel({ force: true });
          return;
        }
        deps.runtime().showToast(
          'No encontramos el turno con ese PIN. Revisa el Wi‑Fi clínico o pide otro PIN.',
          'error'
        );
      })
      .finally(function () {
        btn.disabled = false;
      });
  });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') btn.click();
  });
}

function buildLanShiftPinClientConnectCard(deps) {
  var wrap = document.createElement('div');
  wrap.className = 'lan-connect-card lan-shift-pin-client-card';
  wrap.setAttribute('data-lan-shift-pin-client', '1');

  var title = document.createElement('p');
  title.className = 'lan-connect-card-title';
  title.textContent = 'PIN del turno';
  wrap.appendChild(title);

  var lead = document.createElement('p');
  lead.className = 'lan-connect-card-hint';
  lead.textContent = 'Pide los 6 dígitos al anfitrión (R4 en ⇄).';
  wrap.appendChild(lead);

  var input = createLanShiftPinClientInput();
  wrap.appendChild(input);

  var hostFields = createLanShiftPinHostUrlField(resolveLanShiftPinHostPrefill());
  wrap.appendChild(hostFields.hostUrlLabel);
  wrap.appendChild(hostFields.hostUrlInput);
  wrap.appendChild(hostFields.hostUrlHint);

  var row = document.createElement('div');
  row.className = 'lan-connect-actions-row';
  row.style.marginTop = '8px';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-lan-primary';
  btn.style.flex = '1';
  btn.textContent = 'Conectar';
  wireLanShiftPinClientConnect(deps, input, hostFields.hostUrlInput, btn);
  row.appendChild(btn);
  wrap.appendChild(row);

  return wrap;
}

/** Client: enter shift PIN to find host across hospital Wi‑Fi / VLANs. */
/** @param {Parameters<typeof createPanelHostPin>[0]} deps */
async function appendLanShiftPinClientConnectSection(deps, root, gen) {
  if (!root || !isLanElectronDesktop() || deps.lanPanelRenderStale(gen)) return;
  var offer = await shouldShowLanShiftPinClientConnect();
  if (deps.lanPanelRenderStale(gen) || !offer) return;
  if (root.querySelector('[data-lan-shift-pin-client]')) return;

  root.insertBefore(buildLanShiftPinClientConnectCard(deps), root.firstChild);
}

/** @param {Parameters<typeof createPanelHostPin>[0]} deps */
function appendLanHostAddressCopyButton(deps, root, gen) {
  if (!root || !isLanElectronDesktop() || isLanRemoteJoinMode()) return;
  if (deps.lanPanelRenderStale(gen)) return;
  if (!isLanSessionConfiguredForRest() && !deps.getLanClient().connected) return;
  if (root.querySelector('[data-lan-host-address-copy]')) return;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-lan-secondary';
  btn.setAttribute('data-lan-host-address-copy', '1');
  btn.style.width = '100%';
  btn.style.marginTop = '6px';
  btn.textContent = 'Copiar dirección';
  btn.addEventListener('click', function () {
    void resolveLanShareBaseUrl().then(function (shareUrl) {
      if (!shareUrl) {
        deps.runtime().showToast('No hay dirección del anfitrión disponible.', 'error');
        return;
      }
      copyToClipboardSafe(shareUrl);
      deps.runtime().showToast(
        'Dirección copiada — en la otra Mac pégala en ⇄ (Unirse) junto con el PIN del turno.',
        'success'
      );
    });
  });

  var anchor =
    root.querySelector('.lan-shift-pin-card') || root.querySelector('.lan-hub-status-card');
  if (anchor) {
    anchor.appendChild(btn);
  } else {
    root.appendChild(btn);
  }
}

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
  exp.className = 'lan-shift-pin-expiry';
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

function buildLanShiftPinHostActions(deps, pin) {
  var actions = document.createElement('div');
  actions.className = 'lan-shift-pin-actions';

  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn-med-secondary';
  copyBtn.id = 'lan-copy-shift-pin';
  copyBtn.textContent = 'Copiar PIN';
  copyBtn.addEventListener('click', function () {
    copyToClipboardSafe(pin);
    deps.runtime().showToast('PIN del turno copiado.', 'success');
  });
  actions.appendChild(copyBtn);

  var regenBtn = document.createElement('button');
  regenBtn.type = 'button';
  regenBtn.className = 'btn-med-secondary';
  regenBtn.id = 'lan-regen-shift-pin';
  regenBtn.textContent = 'Nuevo PIN';
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

function buildLanShiftPinHostCard(deps, pin, body) {
  var wrap = document.createElement('div');
  wrap.className = 'lan-connect-card lan-shift-pin-card';
  wrap.setAttribute('data-lan-shift-pin', '1');

  var title = document.createElement('p');
  title.className = 'lan-connect-card-title';
  title.textContent = 'PIN del turno';
  wrap.appendChild(title);

  var lead = document.createElement('p');
  lead.className = 'lan-shift-pin-lead';
  lead.textContent =
    'Dilo en voz alta al equipo (6 dígitos). Sirve al registrar @usuario o si cambian de Wi‑Fi.';
  wrap.appendChild(lead);

  var display = document.createElement('p');
  display.className = 'lan-shift-pin-display';
  var code = document.createElement('code');
  code.id = 'lan-shift-pin-code';
  code.textContent = pin;
  display.appendChild(code);
  wrap.appendChild(display);

  wrap.appendChild(buildLanShiftPinHostActions(deps, pin));

  if (body.expiresAt) {
    wrap.appendChild(buildLanShiftPinExpiryLine(body.expiresAt));
  }

  return wrap;
}

function insertLanShiftPinHostCard(root, wrap) {
  var anchor = root.querySelector('.lan-hub-status-card');
  if (anchor && anchor.nextSibling) {
    root.insertBefore(wrap, anchor.nextSibling);
  } else if (anchor) {
    anchor.insertAdjacentElement('afterend', wrap);
  } else {
    root.prepend(wrap);
  }
}

/** Shared ward PIN for registration (reusable until shift TTL). */
/** @param {Parameters<typeof createPanelHostPin>[0]} deps */
async function appendLanShiftPinSection(deps, root, gen) {
  if (!root || !isLanElectronDesktop() || deps.lanPanelRenderStale(gen)) return;
  var fetched = await fetchValidLanShiftPin(deps, gen);
  if (!fetched || deps.lanPanelRenderStale(gen)) return;

  root.querySelectorAll('.lan-shift-pin-card').forEach(function (el) {
    el.remove();
  });

  insertLanShiftPinHostCard(root, buildLanShiftPinHostCard(deps, fetched.pin, fetched.body));
}

/** Host: copy base URL for cross-VLAN clients (no new card). */

/** @param {{
 *   runtime: () => object,
 *   renderLanPanel: (opts?: object) => void,
 *   lanHostUrl: () => string,
 *   lanPanelRenderStale: (gen: number) => boolean,
 *   getLanClient: () => object,
 *   leaveLiveSyncRoom: (...args: unknown[]) => unknown,
 *   resumeAutoHostDetectAndReconnect: () => void,
 *   focusLanShiftPinInput: () => boolean,
 * }} deps */
export function createPanelHostPin(deps) {
  return {
    appendLanHostPinSection: function (root) {
      return appendLanHostPinSection(deps, root);
    },
    appendLanTurnResetSection: function (root, gen) {
      return appendLanTurnResetSection(deps, root, gen);
    },
    appendLanShiftPinClientConnectSection: function (root, gen) {
      return appendLanShiftPinClientConnectSection(deps, root, gen);
    },
    appendLanHostAddressCopyButton: function (root, gen) {
      return appendLanHostAddressCopyButton(deps, root, gen);
    },
    appendLanShiftPinSection: function (root, gen) {
      return appendLanShiftPinSection(deps, root, gen);
    },
    resetLanTurnConnectionFromUi: function () {
      return resetLanTurnConnectionFromUi(deps);
    },
  };
}

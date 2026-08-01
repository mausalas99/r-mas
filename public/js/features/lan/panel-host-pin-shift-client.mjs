/**
 * LAN shift PIN client connect card (enter PIN / host URL).
 */
import { storage } from '../../storage.js';
import { isLanSkipShiftPin } from '../../lan-shift-pin-bypass.mjs';
import {
  bundledWardShiftPin,
  bundledWardHostUrl,
} from '../../clinical-settings.mjs';
import { normalizeLanHostBase } from '../../lan-host-subnet-discovery.mjs';
import { listWardHostUrlsForProbe } from '../../lan-ward-host-registry.mjs';
import {
  isLanElectronDesktop,
  shouldShowLanShiftPinClientConnect,
} from './transport.mjs';

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
  hostUrlLabel.textContent = isLanSkipShiftPin()
    ? 'Dirección del anfitrión'
    : 'Dirección del anfitrión (opcional)';

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

/** @param {import('./panel-host-pin.mjs').PanelHostPinDeps} deps */
function wireLanShiftPinClientConnect(deps, input, hostUrlInput, btn, bypass) {
  btn.addEventListener('click', function () {
    var pin = input ? String(input.value || '').trim() : '';
    if (!bypass && !/^\d{6}$/.test(pin)) {
      deps.runtime().showToast('Ingresa los 6 dígitos del PIN.', 'error');
      return;
    }
    btn.disabled = true;
    var manualHost = String(hostUrlInput.value || '').trim();
    void import('../../lan-shift-pin-connect.mjs')
      .then(function (m) {
        return m.tryEasyLanShiftPinConnect({
          shiftPin: bypass ? undefined : pin,
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
          bypass
            ? 'No encontramos el anfitrión en esa dirección. Revisa el Wi‑Fi o pide la URL al R4.'
            : 'No encontramos el turno con ese PIN. Revisa el Wi‑Fi clínico o pide otro PIN.',
          'error'
        );
      })
      .finally(function () {
        btn.disabled = false;
      });
  });
  if (input) {
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') btn.click();
    });
  }
  hostUrlInput.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') btn.click();
  });
}

/** @param {import('./panel-host-pin.mjs').PanelHostPinDeps} deps */
function buildLanShiftPinClientConnectCard(deps) {
  var bypass = isLanSkipShiftPin();
  var wrap = document.createElement('div');
  wrap.className = 'lan-connect-card lan-shift-pin-client-card';
  wrap.setAttribute('data-lan-shift-pin-client', '1');

  var title = document.createElement('p');
  title.className = 'lan-connect-card-title';
  title.textContent = bypass ? 'Conectar al anfitrión del turno' : 'PIN del turno';
  wrap.appendChild(title);

  var lead = document.createElement('p');
  lead.className = 'lan-connect-card-hint';
  lead.textContent = bypass
    ? 'Buscamos al R4 en la Wi‑Fi del hospital. Si no conecta, pega su dirección abajo (p. ej. http://10.0.57.65:3738).'
    : 'Pide los 6 dígitos al anfitrión (R4 en ⇄).';
  wrap.appendChild(lead);

  var input = bypass ? null : createLanShiftPinClientInput();
  if (input) wrap.appendChild(input);

  var hostFields = createLanShiftPinHostUrlField(resolveLanShiftPinHostPrefill());
  if (bypass) {
    hostFields.hostUrlLabel.textContent = 'Dirección del anfitrión';
  }
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
  wireLanShiftPinClientConnect(deps, input, hostFields.hostUrlInput, btn, bypass);
  row.appendChild(btn);
  wrap.appendChild(row);

  return wrap;
}

/** @param {import('./panel-host-pin.mjs').PanelHostPinDeps} deps */
export async function appendLanShiftPinClientConnectSection(deps, root, gen) {
  if (!root || !isLanElectronDesktop() || deps.lanPanelRenderStale(gen)) return;
  var offer = await shouldShowLanShiftPinClientConnect();
  if (deps.lanPanelRenderStale(gen) || !offer) return;
  if (root.querySelector('[data-lan-shift-pin-client]')) return;

  root.insertBefore(buildLanShiftPinClientConnectCard(deps), root.firstChild);
}

/**
 * LAN panel "Fijar anfitrión del turno" checkbox section.
 */
import {
  getPinnedHostUrl,
  setPinnedHostUrl,
  clearPinnedHostUrl,
  isPinnedHostLocal,
} from '../../lan-host-pin.mjs';
import { canLocalMacBeLanHost } from '../../lan-host-rank-policy.mjs';
import {
  isLanElectronDesktop,
  resolveLanShareBaseUrl,
  getLanTeamCodeFromConfig,
  applyPinnedHostOverride,
  resolveOwnLanBaseForPin,
} from './transport.mjs';

function createLanHostPinCheckboxParts() {
  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = 'lan-pin-host-checkbox';
  cb.className = 'settings-card__toggle';
  return { cb };
}

/** @param {import('./panel-host-pin.mjs').PanelHostPinDeps} deps */
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
          } else {
            deps.runtime().showToast(
              'No se pudo activar el servidor en esta Mac. Revisa «Configura tu rotación» o pulsa Convertirse en host.',
              'error'
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

/** @param {import('./panel-host-pin.mjs').PanelHostPinDeps} deps */
export function appendLanHostPinSection(deps, root) {
  if (!root || !isLanElectronDesktop() || !canLocalMacBeLanHost()) return;
  var hostUrl = deps.lanHostUrl();
  if (!hostUrl && !getPinnedHostUrl()) return;
  if (root.querySelector('#lan-pin-host-checkbox')) return;

  var row = document.createElement('div');
  row.className = 'settings-card settings-card--toggle';
  var copy = document.createElement('div');
  copy.className = 'settings-card__copy';
  var title = document.createElement('p');
  title.className = 'settings-card__title';
  title.textContent = 'Fijar anfitrión del turno';
  var desc = document.createElement('p');
  desc.className = 'settings-card__desc';
  desc.textContent = 'Solo en Mac servidor';
  copy.appendChild(title);
  copy.appendChild(desc);

  var pinParts = createLanHostPinCheckboxParts();
  var action = document.createElement('label');
  action.className = 'settings-card__action settings-card__toggle-label';
  action.setAttribute('for', 'lan-pin-host-checkbox');
  action.appendChild(pinParts.cb);

  row.appendChild(copy);
  row.appendChild(action);
  root.appendChild(row);

  var ownBase = hostUrl || '';
  var pinned = getPinnedHostUrl();

  void resolveOwnLanBaseForPin().then(function (resolvedOwn) {
    wireLanHostPinCheckbox(deps, pinParts.cb, hostUrl, resolvedOwn);
    if (pinned) {
      var pinnedNote = copy.querySelector('[data-lan-pin-pinned-note]');
      if (!pinnedNote) {
        pinnedNote = document.createElement('p');
        pinnedNote.className = 'settings-card__desc';
        pinnedNote.setAttribute('data-lan-pin-pinned-note', '1');
        copy.appendChild(pinnedNote);
      }
      pinnedNote.textContent = isPinnedHostLocal(resolvedOwn || ownBase)
        ? 'Anfitrión fijado en esta Mac.'
        : 'Anfitrión fijado: ' + pinned;
    }
  });
}

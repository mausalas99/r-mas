/** Stable downgrade confirmation and fallback UI. */
import { sanitizeUpdaterUserMessage } from '../../../update-helpers.mjs';
import { updaterState } from './state.mjs';
import {
  resetUpdateCheckButtons,
  resetUpdateModalPanels,
  showUpdateModal,
  renderUpdateError,
} from './modal-ui.mjs';
import { openConfirm } from '../../workbench/confirm.mjs';

async function confirmDowngrade(version, entry) {
  var summary = entry && entry.summary ? entry.summary : '';
  var result = await openConfirm({
    weight: 'destructive',
    title: 'Restaurar R+ a v' + version + '?',
    message: summary + '\n\nLa app se reiniciará. Tus pacientes y ajustes locales se conservan.',
    confirmLabel: 'Restaurar',
  });
  if (result !== 'confirm') return;
  updaterState.pendingDowngradeVersion = version;
  updaterState.updateModalMode = 'downgrade';
  resetUpdateModalPanels();
  showUpdateModal();
  var title = document.getElementById('update-modal-title');
  if (title && title.firstChild) title.firstChild.textContent = 'Restaurando versión estable';
  if (window.electronAPI && window.electronAPI.downgradeToStable) {
    window.electronAPI.downgradeToStable(version);
  }
}

function renderDowngradeFallback(payload) {
  updaterState.updateModalMode = 'upgrade';
  updaterState.pendingDowngradeVersion = null;
  resetUpdateCheckButtons();
  var raw = payload && payload.message ? payload.message : 'No se pudo descargar la versión.';
  var safe = sanitizeUpdaterUserMessage(
    raw,
    'No se pudo descargar esa versión. Abre el instalador en GitHub.'
  );
  if (safe.indexOf('GitHub') === -1) {
    safe += ' Puedes abrir el instalador en GitHub.';
  }
  renderUpdateError(safe);
  var actions = document.getElementById('update-modal-actions-primary');
  if (actions && payload && (payload.manualUrl || payload.version)) {
    var openBtn = document.createElement('button');
    openBtn.className = 'btn-primary';
    openBtn.textContent = 'Abrir instalador en GitHub';
    openBtn.onclick = function () {
      if (window.electronAPI && window.electronAPI.openDowngradeInstaller) {
        window.electronAPI.openDowngradeInstaller(payload.version);
      } else if (window.electronAPI && window.electronAPI.openExternal && payload.manualUrl) {
        window.electronAPI.openExternal(payload.manualUrl);
      }
    };
    actions.innerHTML = '';
    actions.appendChild(openBtn);
  }
  if (window.electronAPI && window.electronAPI.resetUpdateFeed) {
    window.electronAPI.resetUpdateFeed();
  }
}

export { confirmDowngrade, renderDowngradeFallback };

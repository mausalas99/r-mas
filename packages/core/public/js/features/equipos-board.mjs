/**
 * Desktop equipos queue board — lives in ⇄ LAN dropdown (R+ Lista de espera card).
 */
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { canManageInternoQr } from '../clinical-privileges.mjs';
import { equiposCloudFetch, getEquiposCloudConfig } from '../equipos-cloud-config.mjs';
import { loadEquiposHistoryPanel } from './equipos-history.mjs';
import { showToast } from '../ui-toast.mjs';

import { drawEquiposBoard } from './equipos-board-view.jsx';
import { openConfirm } from './workbench/confirm.mjs';

async function fetchBoard(opts = {}) {
  const cloud = getEquiposCloudConfig();
  const programToken = String(opts.programToken || '').trim();
  if (!cloud.adminKey && !programToken) {
    const err = new Error('Guarda URL y clave admin, luego pulsa Guardar (o Generar enlace y QR).');
    err.code = 'admin_required';
    throw err;
  }
  return equiposCloudFetch('/board', {
    useAdminKey: !!cloud.adminKey,
    programToken,
  });
}

async function purgeQueue(deviceType) {
  const user = clinicalSessionContext.user || {};
  await equiposCloudFetch('/admin/purge-queue', {
    method: 'POST',
    body: {
      deviceType,
      adminUserId: user.user_id,
      adminName: user.clinical_name || user.username || 'Admin',
    },
  });
}

/** @param {string} [detail] */
function renderLoadFailure(host, detail) {
  const msg =
    detail ||
    'No se pudo conectar al servicio cloud. Revisa URL y clave admin en ⇄ → R+ Lista de espera.';
  drawEquiposBoard(host, { message: msg });
}

function wireEquiposBoardActions(host) {
  host.querySelectorAll('[data-purge]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const result = await openConfirm({
        weight: 'consequence',
        title: '¿Liberar este dispositivo y vaciar la cola?',
        confirmLabel: 'Liberar',
      });
      if (result !== 'confirm') return;
      await purgeQueue(btn.getAttribute('data-purge'));
      showToast('Cola purgada.', 'success');
      await renderEquiposBoardPanel(host);
    });
  });
  host.querySelector('#btn-equipos-purge-all')?.addEventListener('click', async () => {
    const result = await openConfirm({
      weight: 'consequence',
      title: '¿Purgar cola de los tres dispositivos?',
      confirmLabel: 'Purgar',
    });
    if (result !== 'confirm') return;
    await purgeQueue('all');
    showToast('Colas purgadas.', 'success');
    await renderEquiposBoardPanel(host);
  });
  host.querySelector('#btn-equipos-history')?.addEventListener('click', () => {
    const historyHost = host.querySelector('#equipos-history-host');
    void loadEquiposHistoryPanel(historyHost, showToast);
  });
}

/** @param {HTMLElement | null} [hostEl] @param {{ programToken?: string }} [opts] */
export async function renderEquiposBoardPanel(hostEl, opts = {}) {
  const host = hostEl || document.getElementById('equipos-queue-board-host');
  if (!host) return;

  const cloud = getEquiposCloudConfig();
  drawEquiposBoard(host, { message: 'Cargando cola de equipos…' });

  try {
    const board = await fetchBoard(opts);
    if (!board) {
      renderLoadFailure(host);
      return;
    }
    const isAdmin = canManageInternoQr(clinicalSessionContext.user);
    drawEquiposBoard(host, { board, cloud, isAdmin });
    wireEquiposBoardActions(host);
  } catch (e) {
    renderLoadFailure(host, e?.message);
  }
}

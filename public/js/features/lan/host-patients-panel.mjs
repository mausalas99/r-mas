/**
 * LAN host patient census — list rows on the anfitrión and purge ghosts.
 */

import { patients } from '../../app-state.mjs';
import { isLanSessionConfiguredForRest, lanFetchAuthed } from './transport.mjs';
import { purgeLanPatientFromHost } from './orchestrator.mjs';
import { activeLiveSyncRoomId } from './runtime.mjs';
import { annotateLanHostPatientRows } from './host-patients-annotate.mjs';

export { annotateLanHostPatientRows } from './host-patients-annotate.mjs';

const LAN_HOST_PATIENTS_OPEN_KEY = 'rpc-lan-host-patients-open';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function patientLabel(row) {
  const nombre = String(row?.nombre || '').trim() || 'Sin nombre';
  const reg = String(row?.registro || '').trim();
  return reg ? nombre + ' · ' + reg : nombre;
}

function locationLabel(row) {
  const parts = [];
  const sala = String(row?.sala || '').trim();
  const cama = String(row?.cama || '').trim();
  const cuarto = String(row?.cuarto || '').trim();
  if (sala) parts.push(sala);
  if (cuarto || cama) parts.push([cuarto, cama].filter(Boolean).join('-'));
  return parts.join(' · ');
}

/** @param {string} [roomId] */
export async function fetchLanHostCensusSnapshot(roomId) {
  if (!isLanSessionConfiguredForRest()) {
    return { ok: false, error: 'not_configured' };
  }
  let hostRows = [];
  try {
    const resp = await lanFetchAuthed('/api/lan/v1/patients');
    if (!resp.ok) return { ok: false, error: 'patients_fetch_failed', status: resp.status };
    const body = await resp.json().catch(function () {
      return {};
    });
    hostRows = Array.isArray(body.patients) ? body.patients : [];
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : 'patients_fetch_failed' };
  }

  const byId = new Map();
  for (const row of hostRows) {
    if (!row?.id || row._deleted) continue;
    byId.set(String(row.id), row);
  }

  const rid = String(roomId || activeLiveSyncRoomId || '').trim();
  if (rid) {
    try {
      const bundleResp = await lanFetchAuthed(
        '/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/sync-bundle',
        { cache: 'no-store' }
      );
      if (bundleResp.ok) {
        const bundleBody = await bundleResp.json().catch(function () {
          return {};
        });
        const entries = bundleBody?.bundle?.entries;
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            const p = entry?.patient;
            if (!p?.id || String(p.id).indexOf('demo-') === 0) continue;
            const id = String(p.id);
            if (!byId.has(id)) {
              byId.set(id, Object.assign({ _bundleOnly: true }, p));
            }
          }
        }
      }
    } catch (_bundleErr) {}
  }

  return { ok: true, patients: Array.from(byId.values()) };
}

function renderHostPatientRows(listEl, annotated, showToast, onChanged) {
  if (!listEl) return;
  if (!annotated.length) {
    listEl.innerHTML = '<p class="lan-connect-card-hint">No hay pacientes en el anfitrión.</p>';
    return;
  }
  const ghostCount = annotated.filter(function (x) {
    return x.status === 'ghost';
  }).length;
  let html =
    '<p class="lan-connect-card-hint">' +
    esc(String(annotated.length)) +
    ' en anfitrión' +
    (ghostCount ? ' · ' + esc(String(ghostCount)) + ' sin copia local (fantasma)' : '') +
    '.</p>';
  html += '<ul class="lan-host-patients-list">';
  for (const item of annotated) {
    const loc = locationLabel(item.row);
    const badge =
      item.status === 'ghost'
        ? '<span class="lan-host-patients-badge lan-host-patients-badge--ghost">fantasma</span>'
        : '';
    const bundleHint = item.row._bundleOnly
      ? '<span class="lan-host-patients-badge">solo bundle</span>'
      : '';
    html +=
      '<li class="lan-host-patients-row" data-patient-id="' +
      esc(String(item.row.id)) +
      '">' +
      '<div class="lan-host-patients-row-main">' +
      '<span class="lan-host-patients-name">' +
      esc(patientLabel(item.row)) +
      '</span>' +
      badge +
      bundleHint +
      (loc ? '<span class="lan-host-patients-meta">' + esc(loc) + '</span>' : '') +
      '</div>' +
      '<button type="button" class="btn-lan-secondary lan-host-patients-delete" data-patient-id="' +
      esc(String(item.row.id)) +
      '">Eliminar de LAN</button>' +
      '</li>';
  }
  html += '</ul>';
  listEl.innerHTML = html;

  listEl.querySelectorAll('.lan-host-patients-delete').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const pid = String(btn.getAttribute('data-patient-id') || '').trim();
      if (!pid) return;
      const row = annotated.find(function (x) {
        return String(x.row.id) === pid;
      });
      const label = row ? patientLabel(row.row) : pid;
      if (!confirm('¿Eliminar «' + label + '» del anfitrión LAN?\n\nSe quitará de la red local para todos los equipos.')) {
        return;
      }
      btn.disabled = true;
      void purgeLanPatientFromHost(pid).then(function (res) {
        if (res?.ok) {
          showToast('Paciente eliminado del anfitrión LAN.', 'success');
          if (typeof onChanged === 'function') onChanged();
        } else {
          showToast(res?.error || 'No se pudo eliminar del anfitrión.', 'error');
          btn.disabled = false;
        }
      });
    });
  });
}

async function refreshLanHostPatientsPanel(bodyEl, showToast, onChanged) {
  const listEl = bodyEl?.querySelector('.lan-host-patients-list-wrap');
  const statusEl = bodyEl?.querySelector('.lan-host-patients-status');
  if (!listEl) return;
  if (statusEl) statusEl.textContent = 'Cargando pacientes del anfitrión…';
  listEl.innerHTML = '';
  const snap = await fetchLanHostCensusSnapshot();
  if (!snap.ok) {
    if (statusEl) {
      statusEl.textContent =
        snap.error === 'not_configured'
          ? 'Conecta al turno LAN (⇄) para ver el censo del anfitrión.'
          : 'No se pudo cargar el censo del anfitrión.';
    }
    return;
  }
  const annotated = annotateLanHostPatientRows(snap.patients, patients);
  if (statusEl) statusEl.textContent = '';
  renderHostPatientRows(listEl, annotated, showToast, onChanged);
}

/**
 * @param {HTMLElement} root
 * @param {{ showToast?: Function, onChanged?: Function }} [opts]
 */
export async function appendLanHostPatientsSection(root, opts) {
  if (!root || !isLanSessionConfiguredForRest()) return;
  const showToast =
    typeof opts?.showToast === 'function'
      ? opts.showToast
      : function () {};
  const onChanged = opts?.onChanged;

  let panel = root.querySelector('.lan-host-patients-panel');
  if (!panel) {
    panel = document.createElement('details');
    panel.className = 'rpc-disclosure lan-connect-card lan-host-patients-panel';
    try {
      panel.open = sessionStorage.getItem(LAN_HOST_PATIENTS_OPEN_KEY) === '1';
    } catch (_open) {}
    panel.addEventListener('toggle', function () {
      try {
        sessionStorage.setItem(LAN_HOST_PATIENTS_OPEN_KEY, panel.open ? '1' : '0');
      } catch (_t) {}
      if (panel.open) {
        void refreshLanHostPatientsPanel(panel.querySelector('.rpc-disclosure__body'), showToast, onChanged);
      }
    });

    const sum = document.createElement('summary');
    sum.className = 'rpc-disclosure__summary';
    sum.textContent = 'Pacientes en anfitrión LAN';
    panel.appendChild(sum);

    const body = document.createElement('div');
    body.className = 'rpc-disclosure__body';
    body.innerHTML =
      '<p class="lan-connect-card-hint lan-host-patients-status"></p>' +
      '<p class="lan-connect-card-hint">Lista del servidor LAN (incluye fantasmas que ya no están en tu lista local). ' +
      'Usa «Eliminar de LAN» para quitarlos de la red.</p>' +
      '<div class="lan-host-patients-list-wrap"></div>' +
      '<button type="button" class="btn-lan-secondary lan-host-patients-refresh" style="width:100%;margin-top:8px;">Actualizar lista</button>';

    const refreshBtn = body.querySelector('.lan-host-patients-refresh');
    refreshBtn?.addEventListener('click', function () {
      void refreshLanHostPatientsPanel(body, showToast, onChanged);
    });

    const purgeGhostsBtn = document.createElement('button');
    purgeGhostsBtn.type = 'button';
    purgeGhostsBtn.className = 'btn-lan-secondary';
    purgeGhostsBtn.style.width = '100%';
    purgeGhostsBtn.style.marginTop = '6px';
    purgeGhostsBtn.textContent = 'Eliminar todos los fantasmas';
    purgeGhostsBtn.addEventListener('click', function () {
      void (async function () {
        const snap = await fetchLanHostCensusSnapshot();
        if (!snap.ok) {
          showToast('No se pudo cargar el censo del anfitrión.', 'error');
          return;
        }
        const ghosts = annotateLanHostPatientRows(snap.patients, patients).filter(function (x) {
          return x.status === 'ghost';
        });
        if (!ghosts.length) {
          showToast('No hay pacientes fantasma en el anfitrión.', 'info');
          return;
        }
        if (
          !confirm(
            '¿Eliminar ' +
              ghosts.length +
              ' paciente(s) fantasma del anfitrión LAN?\n\nEsta acción no se puede deshacer.'
          )
        ) {
          return;
        }
        purgeGhostsBtn.disabled = true;
        let ok = 0;
        for (const g of ghosts) {
          const res = await purgeLanPatientFromHost(String(g.row.id));
          if (res?.ok) ok += 1;
        }
        purgeGhostsBtn.disabled = false;
        showToast(ok + ' de ' + ghosts.length + ' fantasmas eliminados del anfitrión.', ok ? 'success' : 'warn');
        void refreshLanHostPatientsPanel(body, showToast, onChanged);
        if (typeof onChanged === 'function') onChanged();
      })();
    });
    body.appendChild(purgeGhostsBtn);
    panel.appendChild(body);
    root.appendChild(panel);
  }

  if (panel.open) {
    await refreshLanHostPatientsPanel(panel.querySelector('.rpc-disclosure__body'), showToast, onChanged);
  }
}

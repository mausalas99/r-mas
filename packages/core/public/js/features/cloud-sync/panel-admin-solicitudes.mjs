import { esc } from '../../dom-escape.mjs';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { publishClinicalTeamsAfterChange } from '../clinical-teams/teams-guardia-bridge.mjs';
import { CLOUD_SALAS } from './sala-allowlist.mjs';
import { adminTableHtml } from './panel-admin-helpers.mjs';
import { equiposDbApi } from './panel-admin-equipos-row-persist.mjs';

const WHEN = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' });

/** @param {string} requested */
function salaSelectHtml(requested) {
  return (
    '<select class="cloud-sync-select" data-sol-sala aria-label="Sala asignada">' +
    CLOUD_SALAS.map(
      (s) => '<option' + (s === requested ? ' selected' : '') + '>' + esc(s) + '</option>'
    ).join('') +
    '</select>'
  );
}

/** @param {{ status: string, assignedSala?: string|null }} r */
function statusText(r) {
  return r.status === 'approved' ? 'Aprobada · ' + (r.assignedSala || '') : 'Rechazada';
}

/** @param {object[]} rows @param {boolean} pending */
function listHtml(rows, pending) {
  return adminTableHtml(
    rows,
    [
      {
        label: 'Persona',
        cell: (r) =>
          '<b>' + esc(r.displayName || r.username) + '</b><br><span class="cloud-sync-hint">@' + esc(r.username) + ' · ' +
          esc(WHEN.format(new Date(r.createdAt))) + '</span>',
      },
      { label: 'Pidió', cell: (r) => esc(r.requestedSala) },
      pending
        ? { label: 'Asignar', cell: (r) => salaSelectHtml(r.requestedSala) }
        : { label: 'Estado', cell: (r) => esc(statusText(r)) },
      {
        label: '',
        cell: () =>
          pending
            ? '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-sol-reject>Rechazar</button> ' +
              '<button type="button" class="cloud-sync-btn" data-sol-approve>Aprobar</button>'
            : '',
      },
    ],
    {
      rowAttrs: (r) => 'data-sol-id="' + esc(r.id) + '"',
      emptyHtml: '<p class="cloud-sync-hint">' + (pending ? 'No hay solicitudes pendientes.' : 'Sin solicitudes resueltas.') + '</p>',
    }
  );
}

/**
 * Admin tab «Solicitudes»: iPad users who asked for a sala wait here for approval.
 * @param {HTMLElement} root
 * @param {{ getApi: () => ReturnType<import('./api-client.mjs').createCloudSyncApi>, toast: (msg: string, kind?: string) => void }} deps
 */
export function wireSolicitudesPanel(root, { getApi, toast }) {
  /** @type {Map<string, object>} */
  const byId = new Map();
  let filter = 'pending';

  function setCount(n) {
    const el = root.querySelector('[data-admin-count="solicitudes"]');
    if (el) el.textContent = n ? String(n) : '';
  }

  async function refresh() {
    const host = root.querySelector('[data-sol-list]');
    if (!host) return;
    try {
      const api = getApi();
      const pending = (await api.adminSalaRequests('pending')).requests || [];
      setCount(pending.length);
      let rows = pending;
      if (filter === 'resolved') {
        const [ok, no] = await Promise.all([api.adminSalaRequests('approved'), api.adminSalaRequests('rejected')]);
        rows = [...(ok.requests || []), ...(no.requests || [])].sort((a, b) =>
          String(b.decidedAt).localeCompare(String(a.decidedAt))
        );
      }
      byId.clear();
      rows.forEach((r) => byId.set(r.id, r));
      host.innerHTML = listHtml(rows, filter === 'pending');
    } catch (err) {
      host.innerHTML = '<p class="cloud-sync-hint">' + esc(err?.message || 'No se pudieron cargar las solicitudes.') + '</p>';
    }
  }

  /** Worker approval, then the clinical profile (rank R1) the iPad needs to see the user. */
  async function approve(req, sala) {
    await getApi().adminApproveSalaRequest(req.id, sala);
    const db = equiposDbApi();
    const res = await db?.dbClinicalUserAdminProfile?.({
      callerUserId: String(clinicalSessionContext.user?.user_id || ''),
      username: req.username,
      displayName: req.displayName,
      rank: 'R1',
      sala,
    });
    if (!res?.ok) {
      toast('Aprobada en la nube, pero falló el perfil clínico: ' + String(res?.error || 'sin base clínica').replace(/\.$/, '') + '. Guárdalo en Usuarios.', 'error');
      return;
    }
    await publishClinicalTeamsAfterChange({ sala });
    toast('@' + req.username + ' aprobado en ' + sala + '.', 'success');
  }

  root.addEventListener('click', async (ev) => {
    const t = ev.target instanceof Element ? ev.target : null;
    const pill = t?.closest('[data-sol-filter]');
    if (pill) {
      filter = pill.getAttribute('data-sol-filter') || 'pending';
      root.querySelectorAll('[data-sol-filter]').forEach((b) => {
        const on = b === pill;
        b.classList.toggle('is-active', on);
        b.classList.toggle('cloud-sync-btn--ghost', !on);
      });
      await refresh();
      return;
    }
    const btn = t?.closest('[data-sol-approve], [data-sol-reject]');
    const row = btn?.closest('[data-sol-id]');
    const req = row ? byId.get(row.getAttribute('data-sol-id') || '') : null;
    if (!btn || !req) return;
    btn.setAttribute('disabled', '');
    await resolve(btn, row, req);
    await refresh();
  });

  /** @param {Element} btn @param {Element} row @param {{ id: string, username: string, requestedSala: string }} req */
  async function resolve(btn, row, req) {
    try {
      if (btn.hasAttribute('data-sol-approve')) {
        const sel = row.querySelector('[data-sol-sala]');
        await approve(req, sel instanceof HTMLSelectElement ? sel.value : req.requestedSala);
      } else {
        await getApi().adminRejectSalaRequest(req.id);
        toast('Solicitud de @' + req.username + ' rechazada.', 'success');
      }
    } catch (err) {
      toast(err?.message || 'No se pudo resolver la solicitud.', 'error');
    }
  }

  return { refresh };
}

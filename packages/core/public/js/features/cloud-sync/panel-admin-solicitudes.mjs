import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { publishClinicalTeamsAfterChange } from '../clinical-teams/teams-guardia-bridge.mjs';
import { drawAdminHint } from './panel-admin-view.jsx';
import { drawSolicitudesList, solicitudesModel } from './panel-admin-solicitudes-view.jsx';
import { equiposDbApi } from './panel-admin-equipos-row-persist.mjs';

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
      drawSolicitudesList(host, solicitudesModel(rows, filter === 'pending'));
    } catch (err) {
      drawAdminHint(host, err?.message || 'No se pudieron cargar las solicitudes.');
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

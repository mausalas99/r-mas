#!/usr/bin/env node
/**
 * Live check: admin mass delete from the Red tab, real Electron app against the
 * STAGING Worker (never the real one). Synthetic DEMO patients only.
 *   STAGING_URL=https://rplus-sync-staging.<acct>.workers.dev \
 *   STAGING_ADMIN_KEY=<staging-only key> node scripts/e2e/nube-staging-admin.e2e.mjs [patients]
 * A seeder (API, plain fields) fills a fresh sala room with N patients. A
 * throwaway R4 promotes itself with the staging key, opens Administración →
 * Pacientes, picks every seeded patient and presses «Eliminar…». Then the room
 * is pulled from 0 to see that every patient is gone.
 */
import { createRun, dismissLearnHub } from './harness.mjs';
import { nubeDevices, onboardNube, openNubePanel, until } from './nube-worker.mjs';

const STAGING = String(process.env.STAGING_URL || '').replace(/\/$/, '');
const ADMIN_KEY = String(process.env.STAGING_ADMIN_KEY || '');
if (!/staging/i.test(STAGING) || !ADMIN_KEY) { console.error('Set STAGING_URL (host with "staging") and STAGING_ADMIN_KEY.'); process.exit(1); }
process.env.R_PLUS_CLOUD_SYNC_URL = STAGING; // nube-worker.mjs pointed it at a local Worker on import

const N = Number(process.argv[2] || 74);
const SEED_SALA = process.env.STAGING_SEED_SALA || 'Eme';
const tag = Date.now().toString(36).slice(-6);
const R4 = { username: `demo_admin_${tag}`, name: 'Dra. Demo Admin', rank: 'R4', sala: process.env.STAGING_SALA || 'Torre HU' };
const API = `${STAGING}/api/sync/v1`;
const nowIso = () => new Date().toISOString();
async function api(pathname, { method = 'GET', body, token } = {}) {
  const res = await fetch(API + pathname, {
    method, headers: { 'content-type': 'application/json', 'x-app-version': '9.9.9', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${pathname} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const r = createRun('nube-staging-admin');
const { check } = r;
const launchDevice = nubeDevices(r);
const ADMIN = '#connection-dropdown .cloud-sync-admin';

await r.finish('Admin mass delete on staging (Red tab)', async () => {
  // Seeder: plain synthetic patients in a fresh sala room.
  const seed = await api('/auth/register', { method: 'POST', body: { username: `seed_${tag}`, password: 'Demo-e2e-Pass-2026!', displayName: 'Demo Seed', appVersion: '9.9.9' } });
  const { room } = await api('/rooms', { method: 'POST', token: seed.token, body: { name: `${SEED_SALA} seed`, sala: SEED_SALA } });
  let rev = 0;
  const ids = Array.from({ length: N }, (_, i) => `demo-adm-${tag}-${String(i).padStart(3, '0')}`);
  for (let i = 0; i < ids.length; i += 8) {
    const ops = ids.slice(i, i + 8).flatMap((id, k) => [
      { path: `entries/${id}/fields`, value: { nombre: `DEMO BORRAR ${tag} ${i + k}`, registro: `88${String(i + k).padStart(5, '0')}-1`, cama: String(i + k) }, updatedAt: nowIso(), actorId: 'seed' },
    ]);
    const res = await api(`/rooms/${room.id}/mutations`, { method: 'POST', token: seed.token, body: { clientMutationId: `seed-${tag}-${i}`, ops, baseRevision: rev } });
    rev = res.revision;
  }
  // The census keeps the highest-revision room per sala: outrank rooms from earlier runs.
  for (let n = 0; rev < Number(process.env.STAGING_PAD_REV || 0); n++) {
    const res = await api(`/rooms/${room.id}/mutations`, { method: 'POST', token: seed.token, body: { clientMutationId: `pad-${tag}-${n}`, ops: [{ path: `entries/${ids[0]}/fields`, value: { nombre: `DEMO BORRAR ${tag} 0`, registro: '8800000-1', cama: '0', pad: n }, updatedAt: nowIso(), actorId: 'seed' }], baseRevision: rev } });
    rev = res.revision;
  }
  check(`seeded ${N} patients in ${SEED_SALA}`, true, { room: room.id, revision: rev });

  const A = await launchDevice('a', 3791);
  await onboardNube(A.page, R4);
  await dismissLearnHub(A.page);
  await A.page.waitForTimeout(1500);
  await dismissLearnHub(A.page);
  // All Nube HTTP runs in the main process: record every push answer there.
  await A.app.evaluate(({ ipcMain }) => {
    const g = (globalThis.__e2e ||= {});
    g.pushes = [];
    const orig = ipcMain._invokeHandlers.get('cloud-sync-fetch');
    ipcMain.removeHandler('cloud-sync-fetch');
    ipcMain.handle('cloud-sync-fetch', async (e, payload) => {
      const res = await orig(e, payload);
      if (/\/mutations$/.test(new URL(String(payload?.url || ''), 'http://x').pathname) && payload?.method === 'POST') {
        let cm = ''; try { const b = typeof payload.body === 'string' ? JSON.parse(payload.body) : payload.body; cm = String(b?.clientMutationId || '').replace(/[0-9a-f-]{8,}|\d{6,}/g, '#').slice(0, 40) + ' ops=' + (b?.ops?.length ?? '?') + ' base=' + b?.baseRevision; } catch { /* best-effort detail */ }
      g.pushes.push({ cm, at: Date.now(), status: res?.status, msg: String(res?.data?.message || res?.data?.error || res?.statusText || '').slice(0, 200) });
      }
      return res;
    });
  });
  await openNubePanel(A.page);
  await A.page.locator('[data-cloud-action="nav-options"]').click();
  await A.page.locator('.cloud-sync-view[data-cloud-view="options"] [data-cloud-view="admin"]').click();
  await A.page.locator('[data-admin-key-input]').fill(ADMIN_KEY);
  await A.page.locator('[data-admin-action="save-key"]').click();
  await A.page.locator('[data-admin-action="promote-self"]').click();
  await A.page.locator('#cloud-sync-admin-confirm [data-approval-confirm]').click();
  check('self-promote on staging', await until(() => A.page.locator('.toast', { hasText: /promovida a admin/i }).isVisible(), 15000));
  await A.page.waitForTimeout(1500);

  const t0 = Date.now();
  await A.page.locator(`${ADMIN} [role="tab"][data-admin-tab="red"]`).click();
  const red = A.page.locator(`${ADMIN} [data-admin-section="red"]`);
  // The census walk re-renders the whole tab when it ends: filter again until it stays put.
  let shown = false;
  for (let i = 0; i < 4 && !shown; i++) {
    await red.locator('[data-network-filter="q"]').fill(`BORRAR ${tag}`);
    await until(async () => (await red.locator('tbody tr:not([hidden])').count()) >= N, 60000);
    await A.page.waitForTimeout(4000);
    shown = (await red.locator('[data-network-filter="q"]').inputValue().catch(() => '')) === `BORRAR ${tag}` && (await red.locator('tbody tr:not([hidden])').count()) >= N;
  }
  const loadMs = Date.now() - t0;
  check(`Red tab lists the ${N} seeded patients`, !!shown, { loadMs, rows: await red.locator('tbody tr:not([hidden])').count() });
  await red.locator('input[data-network-select-all]').check();
  const bar = red.locator('[data-admin-red-bulk-actions]');
  check('bar shows the selection count', await until(async () => new RegExp(`${N} seleccionado`).test(await bar.innerText().catch(() => '')), 5000), await bar.innerText().catch(() => ''));
  await r.shot(A.page, 'before-delete');
  const t1 = Date.now();
  await bar.locator('[data-admin-action="bulk-delete-network"]').click();
  await A.page.locator('#cloud-sync-admin-confirm [data-approval-confirm]').click();
  const done = A.page.locator('.toast', { hasText: /eliminado\(s\)|No se pudo eliminar/i }).last();
  await until(() => done.isVisible(), 240000);
  const text = await done.innerText().catch(() => '');
  check(`app reports ${N} of ${N} deleted`, new RegExp(`${N} de ${N} eliminado`).test(text), { text, deleteMs: Date.now() - t1 });
  await r.shot(A.page, 'after-delete');
  const pushes = await A.app.evaluate(() => globalThis.__e2e.pushes);
  const byStatus = {}; for (const p of pushes) { const k = `${p.status} ${p.cm} ${p.status === 200 ? '' : p.msg}`; byStatus[k] = (byStatus[k] || 0) + 1; }
  console.log('pushes seen by the app:', JSON.stringify(byStatus));

  // A small room comes back as ops, a big one as a snapshot: count deleted ids either way.
  const pull = await api(`/rooms/${room.id}/pull?since=0`, { token: seed.token });
  const gone = new Set(pull.state ? Object.keys(pull.state.tombstones || {}) : (pull.ops || []).map((o) => /^tombstones\/(.+)$/.exec(String(o.path))?.[1]).filter(Boolean));
  const deleted = ids.filter((id) => gone.has(id)).length;
  check(`room shows ${N} patients deleted when pulled from 0`, deleted === N, { deleted, of: N });
});

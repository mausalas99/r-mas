/**
 * Datos modal: click a medication to cross it out, click again to bring it back.
 *
 * Medium-hard path: three meds are typed in, two are crossed out (both drop to
 * the bottom, out of the saved census text), then the first crossed one is
 * restored while the other stays crossed. A click must never open an editor.
 * The modal is closed and reopened, then the app restarts; the state must hold. Synthetic DEMO patient only.
 *
 * Artifact: e2e-artifacts/datos-meds-strike/<run-id>/ (report.json, screenshots).
 */
import { createRun, onboardLocalOnly, pasteAndSave, closeToasts, openPatient, dismissLearnHub, goArea } from './harness.mjs';
import { header, TABLE } from './some-fixtures.mjs';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const d = new Date();
const WHEN = `${MON[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} 3:05AM`;
const P = { exp: '7410001-1', name: 'DEMO TACHAR MED', room: '830' };
const MEDS = ['MED ALFA', 'MED BETA', 'MED GAMA'];

const r = createRun('datos-meds-strike');
const { check, shot } = r;

await r.finish('Datos modal: cross out and restore medications', async () => {
  let { app, page, pageErrors } = await r.launch({ lanPort: 3799 });
  await onboardLocalOnly(page);
  await pasteAndSave(page, header(P, WHEN) + 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + 'HGB\t\tA\t10.2\tg/dL\t12.20 - 18.10\n');
  await closeToasts(page);
  await openPatient(page, P);

  let list = page.locator('#patient-censo-meds');
  const openModal = async () => {
    await goArea(page, 'nota');
    await page.locator('#btn-exp-datos-open:visible, #patient-dashboard-mount .dash-name:visible').first().click();
    await list.waitFor({ state: 'visible' });
  };
  const rows = async () =>
    list.locator('li').evaluateAll((lis) =>
      lis.map((li) => {
        const b = li.querySelector('button');
        return { t: li.innerText.trim(), struck: !!b && b.classList.contains('exp-datos-line--struck') };
      })
    );
  const count = () => page.locator('#patient-censo-meds-count').innerText();

  await openModal();
  await list.locator('button').first().click();
  for (const m of MEDS) {
    await list.locator('input').fill(m);
    await list.locator('input').press('Enter');
  }
  await list.locator('input').press('Escape');
  check('three meds typed in', JSON.stringify((await rows()).map((x) => x.t)) === JSON.stringify(MEDS), await rows());
  check('count shows 3', (await count()).includes('3'), await count());

  await list.getByRole('button', { name: /MED ALFA/ }).click();
  check('click opens no editor', (await list.locator('input').count()) === 0);
  await list.getByRole('button', { name: /MED BETA/ }).click();
  let now = await rows();
  check('live med stays on top', now[0].t === 'MED GAMA' && !now[0].struck, now);
  check('crossed meds go to the bottom, in click order', now[1].t === 'MED ALFA' && now[1].struck && now[2].t === 'MED BETA' && now[2].struck, now);
  check('count shows only live meds (1)', (await count()).includes('1'), await count());
  await shot(page, 'two-crossed');

  await list.getByRole('button', { name: /Restaurar MED ALFA/ }).click();
  now = await rows();
  check('restored med is live again', now.some((x) => x.t === 'MED ALFA' && !x.struck), now);
  check('other med stays crossed at the bottom', now[now.length - 1].t === 'MED BETA' && now[now.length - 1].struck, now);
  check('count shows 2', (await count()).includes('2'), await count());

  await page.locator('.exp-datos-modal-close').click();
  await openModal();
  now = await rows();
  check('after reopen: 2 live, BETA still crossed', now.filter((x) => !x.struck).length === 2 && now.at(-1).t === 'MED BETA' && now.at(-1).struck, now);
  await shot(page, 'after-reopen');
  const errors = [...pageErrors];

  // ── Restart: crossed-out state must survive ──────────────────────────
  await page.waitForTimeout(1500); // let the debounced save land
  await app.close();
  const again = await r.launch({ lanPort: 3799 });
  page = again.page;
  list = page.locator('#patient-censo-meds');
  await page.locator('#apptab-lab').waitFor({ state: 'visible', timeout: 30000 });
  await dismissLearnHub(page);
  await openPatient(page, P);
  await openModal();
  now = await rows();
  check('after restart: 2 live, BETA still crossed', now.filter((x) => !x.struck).length === 2 && now.at(-1).t === 'MED BETA' && now.at(-1).struck, now);
  await list.getByRole('button', { name: /Restaurar MED BETA/ }).click();
  now = await rows();
  check('after restart: crossed med can still be restored', now.length === 3 && now.every((x) => !x.struck), now);
  await shot(page, 'after-restart');

  check('no page errors', errors.length + again.pageErrors.length === 0, [...errors, ...again.pageErrors].slice(0, 3));
});

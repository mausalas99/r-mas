import { _electron as electron } from 'playwright-core';
import * as path from 'node:path';
import { setupDemo } from './scripts/verify/goto-demo.mjs';

const APP_DIR = process.cwd();
const SHOT_DIR = '/private/tmp/claude-501/-Users-mauriciosalas-R--HF/b51dbedc-5578-4ec3-9a42-56f7a43a4dc2/scratchpad/shots';
const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');

async function clickText(page, text) {
  return page.evaluate((t) => {
    const els = [...document.querySelectorAll('button, a, [role="button"], [role="tab"]')];
    const el = els.find(e => e.textContent && e.textContent.trim() === t)
            || els.find(e => e.textContent && e.textContent.trim().includes(t));
    if (!el) return 'NOT_FOUND';
    el.click();
    return 'OK';
  }, text);
}

const app = await electron.launch({ executablePath: electronBin, args: [APP_DIR], timeout: 30000 });
await new Promise(r => setTimeout(r, 9000));
const page = app.windows().find(w => !w.url().startsWith('devtools://')) ?? await app.firstWindow();
const errors = [];
page.on('pageerror', err => errors.push(err.message));
await page.waitForTimeout(1500);
await setupDemo(page);
await clickText(page, 'Paciente');
await page.waitForTimeout(500);
await clickText(page, 'Resumen');
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(SHOT_DIR, 'v3-resumen-cardio.png'), fullPage: true });

await clickText(page, 'Clínico');
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(SHOT_DIR, 'v3-clinico-cardio.png'), fullPage: true });

console.log('ERRORS', JSON.stringify(errors));
await app.close();
console.log('DONE');

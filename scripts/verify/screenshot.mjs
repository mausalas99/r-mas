#!/usr/bin/env node
/**
 * Launches R+ in an isolated Electron profile (via Playwright) so a screenshot
 * can be taken without touching the user's real running instance or screen.
 * Usage: node scripts/verify/screenshot.mjs <output.png> [--tab=<name>] [--wait=<ms>]
 */
import { _electron as electron } from 'playwright';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const args = process.argv.slice(2);
const outPath = args.find((a) => !a.startsWith('--')) || 'scripts/verify/out.png';
const getArg = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const waitMs = Number(getArg('wait', '2500'));
const script = getArg('eval', null); // path to a .mjs file exporting default async (page) => {}

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-verify-'));

const app = await electron.launch({
  args: ['.', `--user-data-dir=${profileDir}`, '--disable-gpu'],
  cwd: process.cwd(),
  env: { ...process.env, R_PLUS_VERIFY_MODE: '1' },
});

try {
  const page = await app.firstWindow();

  // Move every window far off-screen so it never appears on the user's display or steals focus,
  // and size it to the real primary display's work area (not the 1280x900 dev default) so layout
  // checks reflect what the user actually sees on a full-size window, not a cramped one.
  await app.evaluate(({ BrowserWindow, screen }) => {
    const work = screen.getPrimaryDisplay().workAreaSize;
    for (const win of BrowserWindow.getAllWindows()) {
      try {
        win.setSize(work.width, work.height);
        win.setPosition(-32000, -32000);
        win.blur();
        win.setSkipTaskbar(true);
      } catch {
        /* best effort */
      }
    }
  }).catch(() => {});

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(waitMs);

  if (script) {
    const mod = await import(path.resolve(script));
    await mod.default(page);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('wrote', outPath);
} finally {
  await app.close();
  fs.rmSync(profileDir, { recursive: true, force: true });
}

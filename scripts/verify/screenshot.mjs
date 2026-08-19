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
  // and size it to the real primary display's work area — floored to a normal desktop size
  // (1440x900) because sandboxed/headless verify runs can report a tiny virtual display
  // (e.g. 960x700), which would silently shrink layout checks below any real user's window
  // and hide things like two-column breakpoints. Never shrink below the floor, only grow past it.
  //
  // main.js's `ready-to-show` handler calls mainWindow.maximize(), which fires *after* this
  // script's first resize (Playwright's firstWindow() resolves before ready-to-show) and
  // re-maximizes onto the sandbox's real tiny display, silently undoing the floor. Applying
  // the floor again right before the screenshot (after unmaximizing) wins that race.
  const FLOOR_WIDTH = 1440;
  const FLOOR_HEIGHT = 900;
  const applyFloorSize = () =>
    app.evaluate(({ BrowserWindow, screen }, floor) => {
      const work = screen.getPrimaryDisplay().workAreaSize;
      const width = Math.max(work.width, floor.width);
      const height = Math.max(work.height, floor.height);
      for (const win of BrowserWindow.getAllWindows()) {
        try {
          if (win.isMaximized()) win.unmaximize();
          win.setSize(width, height);
          win.setPosition(-32000, -32000);
          win.blur();
          win.setSkipTaskbar(true);
        } catch {
          /* best effort */
        }
      }
    }, { width: FLOOR_WIDTH, height: FLOOR_HEIGHT }).catch(() => {});

  await applyFloorSize();

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(waitMs);

  if (script) {
    const mod = await import(path.resolve(script));
    await mod.default(page);
  }

  // Re-apply right before capture: main.js's ready-to-show maximize() can land any time
  // during the waits/script above, so this floor must win last.
  await applyFloorSize();
  await page.waitForTimeout(150);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('wrote', outPath);
} finally {
  await app.close();
  fs.rmSync(profileDir, { recursive: true, force: true });
}

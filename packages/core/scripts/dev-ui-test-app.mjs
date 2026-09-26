#!/usr/bin/env node
/**
 * Launch a fully isolated R+ Electron window for adversarial UI click-through
 * testing: synthetic patients, a mock Nube server (never the real Worker),
 * fresh userData by default — pass --keep to reuse the last run's profile
 * (skips the local "create your account" setup screen on restart).
 *
 *   npm run build:ui   # once, if public/js changed
 *   npm run dev:ui-test [-- --scenarios=path/to/scenarios.json] [--keep]
 *
 * Safety: lib/ui-test-mode-guard.js refuses to boot the app if the resolved
 * cloud sync URL isn't this local mock, or the userData path is the app's
 * real default — see main.js.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const userDataDir = path.join(os.tmpdir(), 'rplus-ui-test');
const MOCK_PORT = String(process.env.R_PLUS_UI_TEST_MOCK_PORT || '8787');
const MOCK_URL = `http://localhost:${MOCK_PORT}`;
const DEBUG_PORT = String(process.env.R_PLUS_UI_TEST_DEBUG_PORT || '9223');

export function parseArgs(argv) {
  const opts = { help: false, scenarios: null, keep: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--keep') opts.keep = true;
    else if (arg.startsWith('--scenarios=')) opts.scenarios = arg.slice('--scenarios='.length);
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: npm run dev:ui-test [-- --scenarios=<path>] [--keep]

Isolated R+ window for adversarial UI testing:
  - fresh userData every run (${userDataDir}), unless --keep is passed
  - synthetic patient roster, seeded automatically on first boot
  - mock Nube server on ${MOCK_URL} (never the real Worker)

Options:
  --scenarios=<path>   Fault-injection config (default: scripts/ui-test-fault-scenarios.json)
  --keep                Reuse the last run's userData instead of wiping it —
                        skips local account setup and keeps the seeded roster
`);
}

async function waitForMockServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(`${url}/api/sync/v1/ping`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error(`Mock Nube server did not come up on ${url} in time`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

// Guard so this file can be imported (e.g. from tests, for parseArgs) without
// launching Electron and the mock server as a side effect.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (!opts.keep && fs.existsSync(userDataDir)) {
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 25 });
  }
  fs.mkdirSync(userDataDir, { recursive: true });

  const electronBin = path.join(repoRoot, 'node_modules', '.bin', 'electron');
  if (!fs.existsSync(electronBin)) {
    console.error('Missing electron binary. Run npm install in the worktree first.');
    process.exit(1);
  }

  console.log('R+ UI test mode — isolated window');
  console.log('==================================');
  console.log(`Checkout:   ${repoRoot}`);
  console.log(`userData:   ${userDataDir} (${opts.keep ? 'kept from last run' : 'always fresh'})`);
  console.log(`Mock Nube:  ${MOCK_URL}`);
  console.log('');

  const mockServerArgs = [path.join(repoRoot, 'scripts', 'ui-test-mock-nube-server.mjs'), `--port=${MOCK_PORT}`];
  if (opts.scenarios) mockServerArgs.push(`--scenarios=${opts.scenarios}`);
  const mockServer = spawn(process.execPath, mockServerArgs, { cwd: repoRoot, stdio: 'inherit' });

  let electron = null;
  const shutdown = (code) => {
    if (electron && !electron.killed) electron.kill();
    if (mockServer && !mockServer.killed) mockServer.kill();
    process.exit(code == null ? 0 : code);
  };
  mockServer.on('exit', (code) => {
    if (!electron) shutdown(code);
  });
  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  try {
    await waitForMockServer(MOCK_URL, 5000);
  } catch (err) {
    console.error(String(err && err.message ? err.message : err));
    shutdown(1);
  }

  electron = spawn(electronBin, ['.', `--user-data-dir=${userDataDir}`, `--remote-debugging-port=${DEBUG_PORT}`], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      R_PLUS_UI_TEST_MODE: '1',
      R_PLUS_CLOUD_SYNC_URL: MOCK_URL,
      R_PLUS_USER_DATA: userDataDir,
    },
  });

  electron.on('exit', (code) => shutdown(code));
}

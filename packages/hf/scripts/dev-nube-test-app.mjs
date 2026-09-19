#!/usr/bin/env node
/**
 * Launch a separate R+ window from this checkout for Nube (7.9) testing.
 * Uses its own userData + HTTP port (default 3739) so a host on :3738 can stay up.
 *
 * The renderer is served by THIS instance — not the host — so you get cloud-sync UI.
 *
 *   npm run build:ui   # once after pulling cloud-sync changes
 *   npm run dev:nube-test-fresh
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const peerDir = path.join(os.tmpdir(), 'rplus-nube-test');
const PORT = String(process.env.R_PLUS_LAN_HTTP_PORT || '3739');

function parseArgs(argv) {
  const opts = { fresh: true, help: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--fresh') opts.fresh = true;
    else if (arg === '--keep') opts.fresh = false;
  }
  return opts;
}

function printHelp() {
  console.log(`Usage: npm run dev:nube-test [-- --fresh|--keep]

Second R+ window for Nube pilot testing (separate userData + port ${PORT}).
Keeps your ward host on :3738 untouched.

Options:
  --fresh   Wipe nube-test userData (default)
  --keep    Reuse ${peerDir}
`);
}

function resetDir() {
  if (fs.existsSync(peerDir)) {
    fs.rmSync(peerDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 25 });
  }
  fs.mkdirSync(peerDir, { recursive: true });
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  printHelp();
  process.exit(0);
}

if (opts.fresh) resetDir();
else fs.mkdirSync(peerDir, { recursive: true });

const electronBin = path.join(repoRoot, 'node_modules', '.bin', 'electron');
if (!fs.existsSync(electronBin)) {
  console.error('Missing electron binary. Run npm install in the worktree first.');
  process.exit(1);
}

console.log('R+ Nube test — separate window');
console.log('==============================');
console.log(`Checkout:  ${repoRoot}`);
console.log(`userData:  ${peerDir}${opts.fresh ? ' (fresh)' : ' (kept)'}`);
console.log(`UI/LAN:    http://localhost:${PORT}`);
console.log(`Cloud:     https://rplus-sync.rmas-workersdev.workers.dev`);
console.log('');
console.log('In this window:');
console.log('  1. Unlock / onboarding (fresh DB)');
console.log('  2. Profile sala = Sala or Torre HU');
console.log('  3. ⇄ → Conexión → Crear cuenta (@usuario + nombre + contraseña)');
console.log('  4. Mi rotación → join/create team → auto turn room');
console.log('  5. Edit a patient — should sync via Nube (no LAN host needed)');
console.log('');
console.log('Reuse without wipe: npm run dev:nube-test -- --keep');
console.log('');

const child = spawn(electronBin, ['.', `--user-data-dir=${peerDir}`], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    R_PLUS_LAN_HTTP_PORT: PORT,
    R_PLUS_USER_DATA: peerDir,
    // Do NOT set R_PLUS_LAN_PEER — this instance must serve its own UI
  },
});

child.on('exit', (code) => process.exit(code == null ? 0 : code));

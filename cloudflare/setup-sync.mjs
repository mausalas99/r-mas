#!/usr/bin/env node
/**
 * One-time Cloudflare setup for R+ 7.9 Nube sync worker.
 * Run from repo root: node cloudflare/setup-sync.mjs
 *
 * Creates D1 (rplus-sync), patches wrangler.toml, migrates schema,
 * sets WORKER_DATA_KEY secret, deploys. No R2 required for V1.
 */
import { execSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_DIR = path.resolve(__dirname, '../cloud/sync-worker');
const WRANGLER_TOML = path.join(WORKER_DIR, 'wrangler.toml');
const D1_NAME = 'rplus-sync';
const PLACEHOLDERS = new Set(['REPLACE_WITH_D1_DATABASE_ID', 'REPLACE_AFTER_CREATE']);

function log(msg) {
  console.log(`\n▸ ${msg}`);
}

function run(cmd, opts = {}) {
  const cwd = opts.cwd || WORKER_DIR;
  console.log(`  $ ${cmd}`);
  return execSync(cmd, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...opts.env },
  });
}

function runCapture(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: opts.cwd || WORKER_DIR,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function readToml() {
  return fs.readFileSync(WRANGLER_TOML, 'utf8');
}

function writeToml(content) {
  fs.writeFileSync(WRANGLER_TOML, content);
}

function getDatabaseId(toml) {
  const m = /database_id\s*=\s*"([^"]+)"/.exec(toml);
  return m ? m[1] : '';
}

function setDatabaseId(toml, id) {
  return toml.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${id}"`);
}

function isPlaceholder(id) {
  return !id || PLACEHOLDERS.has(id);
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function ensureLoggedIn() {
  log('Checking Cloudflare login…');
  try {
    const out = runCapture('npx wrangler whoami', { cwd: WORKER_DIR });
    if (/You are not authenticated|Not logged in/i.test(out)) throw new Error('not logged in');
    console.log(out);
  } catch {
    console.error(
      '\n✘ Not logged in to Cloudflare.\n\n' +
        '  Run in your terminal:\n\n' +
        '    cd cloud/sync-worker && npx wrangler login\n\n' +
        '  Or set CLOUDFLARE_API_TOKEN (Workers + D1 edit).\n'
    );
    process.exit(1);
  }
}

function ensureDependencies() {
  log('Installing sync-worker dependencies…');
  if (!fs.existsSync(path.join(WORKER_DIR, 'node_modules'))) {
    run('npm install', { cwd: WORKER_DIR });
  }
}

function parseDatabaseId(text) {
  const idMatch =
    /database_id\s*=\s*"([a-f0-9-]+)"/i.exec(text) ||
    /Created database[^\n]*\n[^\n]*id:\s*([a-f0-9-]+)/i.exec(text) ||
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i.exec(text);
  return idMatch ? idMatch[1] : '';
}

function ensureD1() {
  let toml = readToml();
  let dbId = getDatabaseId(toml);
  if (!isPlaceholder(dbId)) {
    log(`D1 already configured: ${dbId}`);
    return dbId;
  }

  log(`Creating D1 database "${D1_NAME}"…`);
  let out;
  try {
    out = runCapture(`npx wrangler d1 create ${D1_NAME}`);
  } catch (e) {
    const msg = String(e.stderr || e.stdout || e.message || e);
    if (/already exists|A database with that name already exists/i.test(msg)) {
      log('D1 name exists — listing to recover database_id…');
      out = runCapture('npx wrangler d1 list');
      const line = out
        .split('\n')
        .find((l) => l.includes(D1_NAME) || new RegExp(`\\b${D1_NAME}\\b`).test(l));
      dbId = parseDatabaseId(line || '');
      if (dbId) {
        writeToml(setDatabaseId(readToml(), dbId));
        log(`Updated wrangler.toml → database_id = "${dbId}"`);
        return dbId;
      }
    }
    console.error(
      '\n✘ Could not create D1 automatically.\n\n' +
        '  Dashboard: Workers & Pages → D1 → Create → name: rplus-sync\n' +
        '  Or terminal: cd cloud/sync-worker && npx wrangler d1 create rplus-sync\n' +
        '  Then paste database_id into cloud/sync-worker/wrangler.toml\n'
    );
    console.error(msg);
    process.exit(1);
  }
  console.log(out);

  dbId = parseDatabaseId(out);
  if (!dbId) {
    console.error(
      '\n✘ Could not parse database_id from wrangler output.\n' +
        '  Create manually: npx wrangler d1 create rplus-sync\n' +
        '  Then paste database_id into cloud/sync-worker/wrangler.toml\n'
    );
    process.exit(1);
  }

  writeToml(setDatabaseId(readToml(), dbId));
  log(`Updated wrangler.toml → database_id = "${dbId}"`);
  return dbId;
}

function migrateRemote() {
  log('Applying D1 schema (remote)…');
  try {
    run('npm run db:migrate:remote');
  } catch (e) {
    console.error(
      '\n✘ Remote migration failed. Apply manually:\n\n' +
        '    cd cloud/sync-worker && npm run db:migrate:remote\n'
    );
    throw e;
  }
}

async function ensureDataKeySecret() {
  log('Secret WORKER_DATA_KEY (AES-256 at-rest)');
  console.log(
    '  64 hex chars (32 bytes). Encrypts room_state ciphertext in D1.\n' +
      '  Generate: openssl rand -hex 32\n' +
      '  Rotating it makes existing ciphertext unreadable — keep a backup.\n'
  );

  const nonInteractive = !process.stdin.isTTY || process.env.CI === '1';
  let key;
  if (nonInteractive) {
    key = crypto.randomBytes(32).toString('hex');
    console.log('  (non-interactive) auto-generated WORKER_DATA_KEY');
  } else {
    const choice = await prompt(
      'Press Enter to auto-generate, or paste a 64-char hex key: '
    );
    key = choice || crypto.randomBytes(32).toString('hex');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    console.error('✘ WORKER_DATA_KEY must be exactly 64 hexadecimal characters.');
    process.exit(1);
  }

  try {
    runCapture('npx wrangler deployments list', { cwd: WORKER_DIR });
  } catch {
    log('Worker not deployed yet — creating shell for secrets…');
    run('npx wrangler deploy --outdir=/tmp/rplus-sync-deploy-out', {
      cwd: WORKER_DIR,
    });
  }

  const child = spawnSync('npx', ['wrangler', 'secret', 'put', 'WORKER_DATA_KEY'], {
    cwd: WORKER_DIR,
    input: key,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  if (child.status !== 0) process.exit(child.status || 1);

  let saveLocal = 'y';
  if (!nonInteractive) {
    saveLocal = await prompt(
      'Also write key to cloud/sync-worker/.dev.vars for local `npm run dev`? [Y/n] '
    );
  }
  if (!saveLocal || /^y/i.test(saveLocal)) {
    fs.writeFileSync(
      path.join(WORKER_DIR, '.dev.vars'),
      `# local only — gitignored\nWORKER_DATA_KEY=${key}\n`
    );
    log('Wrote .dev.vars (gitignored).');
  }

  if (!nonInteractive) {
    console.log(
      '\n  ⚠ Save this key somewhere safe (password manager). It will not be shown again.\n' +
        `  WORKER_DATA_KEY=${key}\n`
    );
  } else {
    console.log(
      '\n  ⚠ WORKER_DATA_KEY written to cloud/sync-worker/.dev.vars (gitignored). Back it up.\n'
    );
  }
}

function deploy() {
  log('Deploying rplus-sync worker…');
  run('npm run deploy');
}

function printNextSteps() {
  log('Done.');
  console.log(
    '\nNext steps:\n' +
      '  1. Note Worker URL from deploy output (e.g. https://rplus-sync.<account>.workers.dev).\n' +
      '  2. Optional: custom domain → sync.tudominio.org (see cloud/sync-worker/README.md).\n' +
      '  3. R+ desktop (Sala or Torre HU profile): ⇄ panel → Nube → paste Worker URL.\n' +
      '     When Nube is connected, it overrides LAN for that room.\n' +
      '  4. Verify: curl -s https://YOUR-URL/api/sync/v1/ping\n' +
      '  5. Free-tier sizing: cd cloud/sync-worker && npm run estimate:free\n' +
      '  6. Equipos queue is separate: node cloudflare/setup.mjs\n'
  );
}

async function main() {
  console.log('R+ Nube sync (7.9) — Cloudflare setup\n');
  if (!fs.existsSync(WORKER_DIR)) {
    console.error(`Missing worker dir: ${WORKER_DIR}`);
    process.exit(1);
  }

  ensureDependencies();
  ensureLoggedIn();
  ensureD1();
  migrateRemote();
  await ensureDataKeySecret();
  deploy();
  printNextSteps();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

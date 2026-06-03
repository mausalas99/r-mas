#!/usr/bin/env node
/**
 * Verifica que los .node de argon2 y sqlcipher existan antes de publicar.
 * Uso: node scripts/verify-release-natives.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const ARGON2_NODES = [
  'node_modules/@node-rs/argon2/argon2.darwin-arm64.node',
  'node_modules/@node-rs/argon2/argon2.darwin-x64.node',
  'node_modules/@node-rs/argon2/argon2.win32-x64-msvc.node',
];

const SQLCIPHER_GLOB_HINT =
  'node_modules/better-sqlite3-multiple-ciphers/build/Release/better_sqlite3.node';

function checkFile(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    return { rel, ok: false, reason: 'missing' };
  }
  const st = fs.statSync(abs);
  if (st.size < 1000) {
    return { rel, ok: false, reason: 'too small' };
  }
  return { rel, ok: true };
}

function ensurePackNatives() {
  const { spawnSync } = require('node:child_process');
  const script = path.join(root, 'scripts', 'ensure-argon2-pack-natives.mjs');
  console.log('→ node scripts/ensure-argon2-pack-natives.mjs');
  const r = spawnSync(process.execPath, [script], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) {
    process.exit(r.status === null ? 1 : r.status);
  }
}

function main() {
  ensurePackNatives();
  const missing = [];
  for (const rel of ARGON2_NODES) {
    const r = checkFile(rel);
    if (!r.ok) missing.push(r);
  }
  const sql = checkFile(SQLCIPHER_GLOB_HINT);
  if (!sql.ok) missing.push(sql);

  let runtimeOk = true;
  try {
    const { probeNativeRuntime } = require('../lib/native-runtime-probe.js');
    const probe = probeNativeRuntime();
    if (!probe.ok) {
      runtimeOk = false;
      console.error('probeNativeRuntime failed:', JSON.stringify(probe.failures, null, 2));
    }
  } catch (e) {
    runtimeOk = false;
    console.error('probeNativeRuntime threw:', e.message);
  }

  if (missing.length) {
    console.error('verify-release-natives: archivos .node faltantes o inválidos:');
    for (const m of missing) {
      console.error(`  - ${m.rel} (${m.reason})`);
    }
    console.error('\nEjecuta: node scripts/ensure-argon2-pack-natives.mjs');
    console.error('Luego: npm run rebuild:db-native');
    console.error('O deja que prebuild:mac / release:publish lo hagan automáticamente.');
    process.exit(1);
  }

  if (!runtimeOk) {
    process.exit(1);
  }

  console.log('verify-release-natives: OK (argon2 arm64/x64/win + sqlcipher + runtime probe)');
}

main();

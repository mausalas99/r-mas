'use strict';
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const {
  readEffectiveLanTeamCode,
  ensureLanTeamCodeFile,
  migratePlugAndPlayTeamCode,
  DEFAULT_LAN_TEAM_CODE,
} = require('./effective-team-code.js');

test('readEffectiveLanTeamCode usa default sin archivo ni env forzado', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-lan-code-'));
  const prev = process.env.R_PLUS_LAN_TEAM_CODE;
  delete process.env.R_PLUS_LAN_TEAM_CODE;
  try {
    const r = readEffectiveLanTeamCode({ userDataPath: dir });
    assert.strictEqual(r.source, 'default');
    assert.strictEqual(r.code, DEFAULT_LAN_TEAM_CODE);
  } finally {
    if (prev !== undefined) process.env.R_PLUS_LAN_TEAM_CODE = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readEffectiveLanTeamCode lee primera línea de lan-team-code.txt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-lan-code-'));
  fs.writeFileSync(path.join(dir, 'lan-team-code.txt'), 'mi-codigo-secreto\n', 'utf8');
  const r = readEffectiveLanTeamCode({ userDataPath: dir });
  assert.strictEqual(r.source, 'file');
  assert.strictEqual(r.code, 'mi-codigo-secreto');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ensureLanTeamCodeFile escribe 1234 en instalación nueva', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-lan-ensure-'));
  const prev = process.env.R_PLUS_LAN_TEAM_CODE;
  delete process.env.R_PLUS_LAN_TEAM_CODE;
  try {
    const out = ensureLanTeamCodeFile({ userDataPath: dir });
    assert.strictEqual(out.created, true);
    assert.strictEqual(out.source, 'default-file');
    assert.strictEqual(out.code, DEFAULT_LAN_TEAM_CODE);
    const r = readEffectiveLanTeamCode({ userDataPath: dir });
    assert.strictEqual(r.source, 'file');
    assert.strictEqual(r.code, DEFAULT_LAN_TEAM_CODE);
  } finally {
    if (prev !== undefined) process.env.R_PLUS_LAN_TEAM_CODE = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('migratePlugAndPlayTeamCode reemplaza token legacy por 1234 y borra host-state', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-lan-migrate-'));
  const legacy = 'a'.repeat(32);
  fs.writeFileSync(path.join(dir, 'lan-team-code.txt'), legacy + '\n', 'utf8');
  fs.writeFileSync(
    path.join(dir, 'lan-squad-host-state.json'),
    JSON.stringify({ version: 1, teamCodeHash: 'x', patients: [], rooms: [] }),
    'utf8'
  );
  const out = migratePlugAndPlayTeamCode({ userDataPath: dir });
  assert.strictEqual(out.migrated, true);
  assert.strictEqual(out.from, legacy);
  assert.strictEqual(out.to, DEFAULT_LAN_TEAM_CODE);
  assert.strictEqual(readEffectiveLanTeamCode({ userDataPath: dir }).code, DEFAULT_LAN_TEAM_CODE);
  assert.strictEqual(fs.existsSync(path.join(dir, 'lan-squad-host-state.json')), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ensureLanTeamCodeFile escribe 1234 si ya existe host-state legacy', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-lan-legacy-'));
  const prev = process.env.R_PLUS_LAN_TEAM_CODE;
  delete process.env.R_PLUS_LAN_TEAM_CODE;
  try {
    fs.writeFileSync(
      path.join(dir, 'lan-squad-host-state.json'),
      JSON.stringify({ version: 1, teamCodeHash: 'x', patients: [], rooms: [] }),
      'utf8'
    );
    const out = ensureLanTeamCodeFile({ userDataPath: dir });
    assert.strictEqual(out.created, true);
    assert.strictEqual(out.source, 'default-file');
    assert.strictEqual(out.code, DEFAULT_LAN_TEAM_CODE);
    assert.strictEqual(readEffectiveLanTeamCode({ userDataPath: dir }).code, DEFAULT_LAN_TEAM_CODE);
  } finally {
    if (prev !== undefined) process.env.R_PLUS_LAN_TEAM_CODE = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('ensureLanTeamCodeFile no sobrescribe archivo existente', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-lan-noop-'));
  fs.writeFileSync(path.join(dir, 'lan-team-code.txt'), 'ya-fijo\n', 'utf8');
  const out = ensureLanTeamCodeFile({ userDataPath: dir });
  assert.strictEqual(out.created, false);
  assert.strictEqual(readEffectiveLanTeamCode({ userDataPath: dir }).code, 'ya-fijo');
  fs.rmSync(dir, { recursive: true, force: true });
});

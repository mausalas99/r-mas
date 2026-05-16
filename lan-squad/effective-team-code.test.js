'use strict';
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const { readEffectiveLanTeamCode } = require('./effective-team-code.js');

test('readEffectiveLanTeamCode usa default sin archivo ni env forzado', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-lan-code-'));
  const prev = process.env.R_PLUS_LAN_TEAM_CODE;
  delete process.env.R_PLUS_LAN_TEAM_CODE;
  try {
    const r = readEffectiveLanTeamCode({ userDataPath: dir });
    assert.strictEqual(r.source, 'default');
    assert.strictEqual(r.code, 'change-me-in-profile');
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

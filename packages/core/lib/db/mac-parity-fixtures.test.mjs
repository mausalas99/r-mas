// Fails when Node's schema moves and the Mac (Swift) fixtures were not remade.
// See docs/core/21-mac-swift-parity.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { SCHEMA_VERSION } from './schema-primitives.mjs';

const fixtures = new URL('../../../../mac/Tests/RPlusCoreTests/Fixtures/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, fixtures), 'utf8'));

test('Mac schema fixtures match SCHEMA_VERSION', () => {
  const row = read('expected-fresh.json').data.app_meta.find(([k]) => k === 'schema_version');
  assert.equal(
    Number(row?.[1]),
    SCHEMA_VERSION,
    `SCHEMA_VERSION is ${SCHEMA_VERSION} but mac fixtures are older. Remake them: docs/core/21-mac-swift-parity.md`,
  );
});

// CI (.github/workflows/mac.yml) copies the committed fixtures, remakes them, then sets
// MAC_FIXTURES_COMMITTED to the copy. Remaking stamps wall-clock times, so those are masked.
const committed = process.env.MAC_FIXTURES_COMMITTED;
test('Mac fixtures remade from Node equal the committed ones', { skip: !committed }, () => {
  const mask = (f, dir) => readFileSync(new URL(f, dir), 'utf8')
    .replace(/\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(\.\d+)?Z?/g, '<time>');
  const dir = new URL(`file://${committed.replace(/\/?$/, '/')}`);
  for (const f of readdirSync(fixtures).filter((n) => /^expected-.*\.json$/.test(n))) {
    assert.equal(mask(f, fixtures), mask(f, dir), `${f} is stale. Remake and commit: docs/core/21-mac-swift-parity.md`);
  }
});

test('Nube fixture opens with the desktop cloud-sync crypto', async () => {
  const c = await import('../../public/js/features/cloud-sync/crypto.mjs');
  const f = read('nube-fixtures.json');
  const dek = await c.unwrapDek(f.wrapped, await c.deriveWrapKey(f.password, f.saltB64));
  assert.equal(await c.exportDekRaw(dek), f.dekB64);
  for (const [name, v] of Object.entries(f.values)) {
    assert.deepEqual(await c.decryptValue(dek, v.envelope), v.plain, name);
  }
});

test('Nube fixture remade from Node equals the committed one', { skip: !committed }, () => {
  const file = (dir) => readFileSync(new URL('nube-fixtures.json', dir), 'utf8');
  assert.equal(file(fixtures), file(new URL(`file://${committed.replace(/\/?$/, '/')}`)),
    'nube-fixtures.json is stale. Remake and commit: docs/core/21-mac-swift-parity.md');
});

/**
 * Evita omitir módulos que main.js carga al arrancar.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  PACK_FILES_BASELINE,
  NATIVE_MODULE_PACK_PATTERNS,
  ASAR_UNPACK_BASELINE,
  filePatternCovers,
  collectRendererExternalImports,
  canonicalBuildFiles,
  canonicalAsarUnpack,
  assertRuntimeCoveredByPatterns,
  assertNativeModulesPacked,
  ensureElectronPackFiles,
} = require('./electron-pack-files');

const ROOT = path.join(__dirname, '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('lista canónica incluye lib/**/*.js / lib/**/*.cjs', () => {
  assert.ok(PACK_FILES_BASELINE.includes('lib/**/*.js'));
  assert.ok(PACK_FILES_BASELINE.includes('lib/**/*.cjs'));
});

test('main.js y dependencias de arranque están cubiertos por la lista canónica', () => {
  assertRuntimeCoveredByPatterns(ROOT);
});

test('package.json build.files coincide con la lista canónica (mismos patrones)', () => {
  const canonical = canonicalBuildFiles(ROOT);
  assert.deepEqual([...pkg.build.files].sort(), [...canonical].sort());
});

test('package.json build.asarUnpack coincide con la lista canónica', () => {
  const canonical = canonicalAsarUnpack();
  assert.deepEqual([...pkg.build.asarUnpack].sort(), [...canonical].sort());
});

test('módulos nativos SQLCipher están en files y asarUnpack', () => {
  assertNativeModulesPacked(ROOT);
  for (const pattern of NATIVE_MODULE_PACK_PATTERNS) {
    assert.ok(ASAR_UNPACK_BASELINE.includes(pattern));
    assert.ok(canonicalBuildFiles(ROOT).includes(pattern));
  }
});

test('ensureElectronPackFiles sin --write no modifica si ya está sincronizado', () => {
  const before = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
  const result = ensureElectronPackFiles(ROOT, { write: false });
  assert.equal(result.changed, false);
  assert.equal(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'), before);
});

test('lista canónica no incluye server.js (ward server removed)', () => {
  assert.ok(!PACK_FILES_BASELINE.includes('server.js'));
  assert.ok(!canonicalBuildFiles(ROOT).includes('server.js'));
});

test('release-notes highlights data está en build.files', () => {
  const patterns = canonicalBuildFiles(ROOT);
  assert.ok(
    filePatternCovers('data/release-notes-highlights.mjs', patterns),
    'Falta data/release-notes-highlights.mjs en build.files (lazy settings-help lo importa en runtime)'
  );
});

test('imports del renderer fuera de public/ quedan en build.files (anti crash asar)', () => {
  const external = collectRendererExternalImports(ROOT);
  assert.ok(
    external.includes('data/release-notes-highlights.mjs'),
    'settings-help → data/release-notes-highlights.mjs debe detectarse'
  );
  const patterns = canonicalBuildFiles(ROOT);
  for (const rel of external) {
    assert.ok(
      filePatternCovers(rel, patterns),
      `Falta "${rel}" en build.files (import renderer fuera de public/ — crash en app.asar)`
    );
  }
});

test('main.js require("./…") directo está en build.files (excepto server dev-only)', () => {
  const patterns = pkg.build.files || [];
  const mainSrc = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
  const relRequires = [...mainSrc.matchAll(/require\('\.\/([^']+)'\)/g)].map((m) => m[1]);
  for (const rel of relRequires) {
    if (rel === 'server') continue;
    const abs = path.join(ROOT, rel);
    const resolved = fs.existsSync(abs)
      ? rel
      : fs.existsSync(`${abs}.js`)
        ? `${rel}.js`
        : fs.existsSync(`${abs}.cjs`)
          ? `${rel}.cjs`
          : rel;
    assert.ok(
      filePatternCovers(resolved, patterns),
      `Falta "${resolved}" en package.json → build.files (main.js lo requiere al iniciar)`
    );
  }
});

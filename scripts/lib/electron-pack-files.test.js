/**
 * Evita omitir módulos que server.js (y lan-squad) cargan al arrancar.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const files = pkg.build.files || [];

function filePatternCovers(rel) {
  const normalized = rel.replace(/\\/g, '/');
  return files.some((pattern) => {
    if (pattern === normalized) return true;
    const globIdx = pattern.indexOf('/**/*');
    if (globIdx === -1) return false;
    const dir = pattern.slice(0, globIdx);
    const afterGlob = pattern.slice(globIdx + 5);
    if (normalized !== dir && !normalized.startsWith(`${dir}/`)) return false;
    if (!afterGlob || afterGlob === '*') return true;
    if (afterGlob.startsWith('.')) return normalized.endsWith(afterGlob);
    return normalized.includes(afterGlob);
  });
}

/** @param {string} src */
function localRequiresFromSource(src) {
  const out = [];
  for (const m of src.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)) {
    out.push(m[1]);
  }
  return out;
}

/**
 * @param {string} fromFile absolute path to the requiring file
 * @param {string} reqPath require argument (./foo.js or ../lib/bar.js)
 */
function resolveLocalRequire(fromFile, reqPath) {
  if (!reqPath.startsWith('.')) return null;
  const resolved = path.normalize(path.join(path.dirname(fromFile), reqPath));
  if (!resolved.startsWith(ROOT)) return null;
  if (!fs.existsSync(resolved)) {
    if (fs.existsSync(`${resolved}.js`)) return `${resolved}.js`;
    return null;
  }
  return resolved;
}

/** @param {string} entryAbs */
function collectRuntimeRequires(entryAbs) {
  const seen = new Set();
  const queue = [entryAbs];

  while (queue.length) {
    const abs = queue.shift();
    if (!abs || seen.has(abs)) continue;
    seen.add(abs);
    if (!fs.existsSync(abs)) continue;

    const src = fs.readFileSync(abs, 'utf8');
    for (const req of localRequiresFromSource(src)) {
      const target = resolveLocalRequire(abs, req);
      if (target && !seen.has(target)) queue.push(target);
    }
  }

  return [...seen].map((abs) => path.relative(ROOT, abs).replace(/\\/g, '/'));
}

test('server.js require("./…") está en build.files de electron-builder', () => {
  const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const relRequires = [...serverSrc.matchAll(/require\('\.\/([^']+)'\)/g)].map((m) => m[1]);
  for (const rel of relRequires) {
    assert.ok(
      filePatternCovers(rel),
      `Falta "${rel}" en package.json → build.files (server.js lo requiere al iniciar)`
    );
  }
});

test('dependencias locales de server.js y lan-squad están en build.files', () => {
  const entry = path.join(ROOT, 'server.js');
  const relPaths = collectRuntimeRequires(entry);

  const missing = relPaths.filter((rel) => !filePatternCovers(rel));
  assert.deepEqual(
    missing,
    [],
    `Faltan en build.files:\n${missing.map((r) => `  - ${r}`).join('\n')}`
  );
});

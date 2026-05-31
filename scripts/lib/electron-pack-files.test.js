/**
 * Evita omitir módulos que server.js carga al arrancar (p. ej. generate-censo.js en 6.4.1).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const files = pkg.build.files || [];
const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

function filePatternCovers(rel) {
  return files.some((pattern) => {
    if (pattern === rel) return true;
    if (pattern.endsWith('/**/*')) {
      const dir = pattern.slice(0, -5);
      return rel === dir || rel.startsWith(`${dir}/`);
    }
    return false;
  });
}

test('server.js require("./…") está en build.files de electron-builder', () => {
  const relRequires = [...serverSrc.matchAll(/require\('\.\/([^']+)'\)/g)].map((m) => m[1]);
  for (const rel of relRequires) {
    assert.ok(
      filePatternCovers(rel),
      `Falta "${rel}" en package.json → build.files (server.js lo requiere al iniciar)`
    );
  }
});

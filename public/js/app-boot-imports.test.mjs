import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseNamedImports(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const out = [];
  const re = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const from = m[2];
    const names = m[1]
      .split(',')
      .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    out.push({ from, names });
  }
  return out;
}

function collectExportedNames(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    m[1].split(',').forEach((part) => {
      const chunk = part.trim();
      if (!chunk) return;
      const alias = chunk.split(/\s+as\s+/);
      names.add(alias[alias.length - 1].trim());
    });
  }
  return names;
}

function resolveImport(baseDir, from) {
  if (!from.startsWith('.')) return null;
  const rel = from.endsWith('.mjs') || from.endsWith('.js') ? from : from + '.mjs';
  return path.resolve(baseDir, rel);
}

for (const bootFile of ['app-shell.mjs', 'app-runtimes.mjs']) {
  test(bootFile + ' — imports nombrados existen en el módulo destino', () => {
    const baseDir = __dirname;
    const bootPath = path.join(baseDir, bootFile);
    const imports = parseNamedImports(bootPath);
    const missing = [];

    for (const { from, names } of imports) {
      const target = resolveImport(baseDir, from);
      if (!target || !fs.existsSync(target)) continue;
      const exports = collectExportedNames(target);
      for (const name of names) {
        if (!exports.has(name)) missing.push({ from, name });
      }
    }

    assert.equal(
      missing.length,
      0,
      missing.map((x) => `${bootFile}: ${x.name} no exportado en ${x.from}`).join('\n')
    );
  });
}

test('app-shell.mjs no corrompe literales settings-* ni rpc-settings', () => {
  const src = fs.readFileSync(path.join(__dirname, 'app-shell.mjs'), 'utf8');
  assert.doesNotMatch(src, /rpc-shellCtx|shellCtx\.getSettings\(\)-/);
});

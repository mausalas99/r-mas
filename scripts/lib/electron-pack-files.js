/**
 * Lista canónica de electron-builder `build.files` y comprobación del grafo
 * de require desde server.js (arranque del backend embebido).
 *
 *   node scripts/lib/electron-pack-files.js          # validar
 *   node scripts/lib/electron-pack-files.js --write  # actualizar package.json
 */

const fs = require('fs');
const path = require('path');

const PACK_FILES_BASELINE = [
  'main.js',
  'scripts/lib/release-notes-body.js',
  'preload.js',
  'server.js',
  'lan-squad/**/*',
  'lib/**/*.js',
  'generate-receta-hu.js',
  'generate-censo.js',
  'template.docx',
  'template_indicaciones.docx',
  'template_listado.docx',
  'templates/receta-hu-000-061-R-06-12.pdf',
  'public/**/*',
  'build/AppIcon.icns',
  'build/icon.ico',
];

/** @param {string} rel */
function filePatternCovers(rel, patterns) {
  const normalized = rel.replace(/\\/g, '/');
  return patterns.some((pattern) => {
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
 * @param {string} fromFile
 * @param {string} reqPath
 * @param {string} root
 */
function resolveLocalRequire(fromFile, reqPath, root) {
  if (!reqPath.startsWith('.')) return null;
  const resolved = path.normalize(path.join(path.dirname(fromFile), reqPath));
  if (!resolved.startsWith(root)) return null;
  if (!fs.existsSync(resolved)) {
    if (fs.existsSync(`${resolved}.js`)) return `${resolved}.js`;
    if (fs.existsSync(`${resolved}.cjs`)) return `${resolved}.cjs`;
    return null;
  }
  return resolved;
}

/**
 * @param {string} entryAbs
 * @param {string} root
 */
function collectRuntimeRequires(entryAbs, root) {
  const seen = new Set();
  const queue = [entryAbs];

  while (queue.length) {
    const abs = queue.shift();
    if (!abs || seen.has(abs)) continue;
    seen.add(abs);
    if (!fs.existsSync(abs)) continue;

    const src = fs.readFileSync(abs, 'utf8');
    for (const req of localRequiresFromSource(src)) {
      const target = resolveLocalRequire(abs, req, root);
      if (target && !seen.has(target)) queue.push(target);
    }
  }

  return [...seen].map((abs) => path.relative(root, abs).replace(/\\/g, '/'));
}

/** @param {string} rel */
function extraPatternForUncoveredFile(rel) {
  const parts = rel.split('/');
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}/**/*`;
  return rel;
}

/**
 * @param {string} root
 * @returns {string[]}
 */
function canonicalBuildFiles(root) {
  const patterns = [...PACK_FILES_BASELINE];
  const serverEntry = path.join(root, 'server.js');
  if (!fs.existsSync(serverEntry)) {
    throw new Error(`No existe ${path.relative(root, serverEntry)}`);
  }

  const runtime = collectRuntimeRequires(serverEntry, root);
  for (const rel of runtime) {
    if (filePatternCovers(rel, patterns)) continue;
    const extra = extraPatternForUncoveredFile(rel);
    if (!patterns.includes(extra)) patterns.push(extra);
    if (!filePatternCovers(rel, patterns)) {
      if (!patterns.includes(rel)) patterns.push(rel);
    }
  }

  return patterns;
}

/**
 * @param {string} root
 * @param {{ write?: boolean }} opts
 */
function ensureElectronPackFiles(root, opts = {}) {
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const next = canonicalBuildFiles(root);
  const current = pkg.build?.files || [];

  const missing = next.filter((p) => !current.includes(p));
  const extra = current.filter((p) => !next.includes(p));
  const changed = missing.length > 0 || extra.length > 0 || current.length !== next.length;

  if (!changed) {
    return { changed: false, files: next, missing: [], extra: [] };
  }

  if (!opts.write) {
    const lines = [];
    if (missing.length) lines.push(`Patrones a añadir:\n${missing.map((p) => `  + ${p}`).join('\n')}`);
    if (extra.length) lines.push(`Patrones obsoletos:\n${extra.map((p) => `  - ${p}`).join('\n')}`);
    throw new Error(
      `package.json → build.files no coincide con la lista canónica del release.\n${lines.join('\n')}\n` +
        'Ejecuta: node scripts/lib/electron-pack-files.js --write'
    );
  }

  pkg.build = pkg.build || {};
  pkg.build.files = next;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  return { changed: true, files: next, missing, extra };
}

/**
 * @param {string} root
 */
function assertRuntimeCoveredByPatterns(root) {
  const patterns = canonicalBuildFiles(root);
  const serverEntry = path.join(root, 'server.js');
  const runtime = collectRuntimeRequires(serverEntry, root);
  const uncovered = runtime.filter((rel) => !filePatternCovers(rel, patterns));
  if (uncovered.length) {
    throw new Error(
      `Módulos de arranque sin cobertura en build.files:\n${uncovered.map((r) => `  - ${r}`).join('\n')}`
    );
  }
  return { patterns, runtime };
}

module.exports = {
  PACK_FILES_BASELINE,
  filePatternCovers,
  collectRuntimeRequires,
  canonicalBuildFiles,
  ensureElectronPackFiles,
  assertRuntimeCoveredByPatterns,
};

if (require.main === module) {
  const root = path.join(__dirname, '../..');
  const write = process.argv.includes('--write');
  try {
    if (write) {
      const result = ensureElectronPackFiles(root, { write: true });
      if (result.changed) {
        console.log('Actualizado package.json → build.files');
        if (result.missing.length) {
          console.log('Añadidos:', result.missing.join(', '));
        }
        if (result.extra.length) {
          console.log('Quitados:', result.extra.join(', '));
        }
      } else {
        console.log('build.files ya estaba al día.');
      }
    } else {
      ensureElectronPackFiles(root, { write: false });
      assertRuntimeCoveredByPatterns(root);
      console.log('build.files cubre el grafo de server.js.');
    }
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

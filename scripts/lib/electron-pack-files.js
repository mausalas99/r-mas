/**
 * Lista canónica de electron-builder `build.files` y comprobación del grafo
 * de require desde main.js (arranque Electron).
 * Also gates renderer imports that escape `public/` (e.g. data/release-notes).
 *
 *   node scripts/lib/electron-pack-files.js          # validar
 *   node scripts/lib/electron-pack-files.js --write  # actualizar package.json
 */

const fs = require('fs');
const path = require('path');

const PACK_FILES_BASELINE = [
  'main.js',
  'data/release-notes-highlights.mjs',
  'scripts/lib/release-notes-body.js',
  'preload.js',
  'lib/**/*.js',
  'lib/**/*.mjs',
  'lib/**/*.cjs',
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

/** Native addons: must ship in the app bundle and stay outside asar (.node load). */
const NATIVE_MODULE_PACK_PATTERNS = [
  'node_modules/better-sqlite3-multiple-ciphers/**/*',
  'node_modules/@node-rs/argon2*/**/*.node',
];

const ASAR_UNPACK_BASELINE = [
  'lib/doc-generators/**/*',
  'generate-receta-hu.js',
  'generate-censo.js',
  'template.docx',
  'template_indicaciones.docx',
  'template_listado.docx',
  'templates/receta-hu-000-061-R-06-12.pdf',
  ...NATIVE_MODULE_PACK_PATTERNS,
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

/** Dev-only entry points: referenced from main.js but not shipped in release builds. */
const DEV_ONLY_RUNTIME_FILES = new Set(['server-python.js']);

/**
 * @param {string} entryAbs
 * @param {string} root
 * @param {{ skipFiles?: Set<string> }} [opts]
 */
function collectRuntimeRequires(entryAbs, root, opts = {}) {
  const skipFiles = opts.skipFiles || DEV_ONLY_RUNTIME_FILES;
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
      if (!target || seen.has(target)) continue;
      const rel = path.relative(root, target).replace(/\\/g, '/');
      if (skipFiles.has(rel)) continue;
      queue.push(target);
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
 * Walk production renderer sources under public/js (skip *.test.*).
 * @param {string} dir
 * @param {string[]} out
 */
function walkRendererSourceFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkRendererSourceFiles(abs, out);
      continue;
    }
    if (!/\.(mjs|js|cjs)$/.test(ent.name)) continue;
    if (/\.test\.(mjs|js|cjs)$/.test(ent.name)) continue;
    out.push(abs);
  }
  return out;
}

/** @param {string} src */
function localEsmImportsFromSource(src) {
  const out = [];
  // Single-line import/export … from '…'
  for (const m of src.matchAll(/(?:import|export)\s+(?:[^'"\n;]+?\s+from\s+)['"](\.[^'"]+)['"]/g)) {
    out.push(m[1]);
  }
  // Multi-line: export { … } from '…' / import { … } from '…'
  for (const m of src.matchAll(/(?:import|export)\s*\{[\s\S]*?\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
    out.push(m[1]);
  }
  // Side-effect: import './x.mjs'
  for (const m of src.matchAll(/import\s*['"](\.[^'"]+)['"]/g)) {
    out.push(m[1]);
  }
  for (const m of src.matchAll(/import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
    out.push(m[1]);
  }
  return out;
}

/**
 * Renderer modules under public/js that import paths outside public/
 * (e.g. data/release-notes-highlights.mjs). Those files must ship in asar.
 * @param {string} root
 * @returns {string[]} relative paths from repo root
 */
function collectRendererExternalImports(root) {
  const publicRoot = path.join(root, 'public');
  const jsRoot = path.join(publicRoot, 'js');
  const found = new Set();
  for (const abs of walkRendererSourceFiles(jsRoot)) {
    const src = fs.readFileSync(abs, 'utf8');
    for (const spec of localEsmImportsFromSource(src)) {
      const target = resolveLocalRequire(abs, spec, root);
      if (!target) continue;
      if (target.startsWith(publicRoot + path.sep) || target === publicRoot) continue;
      found.add(path.relative(root, target).replace(/\\/g, '/'));
    }
  }
  return [...found].sort();
}

/**
 * @param {string} root
 * @returns {string[]}
 */
function canonicalBuildFiles(root) {
  const patterns = [...PACK_FILES_BASELINE];
  const entryPoints = ['main.js'];
  const runtime = [];
  for (const entry of entryPoints) {
    const entryAbs = path.join(root, entry);
    if (!fs.existsSync(entryAbs)) {
      throw new Error(`No existe ${path.relative(root, entryAbs)}`);
    }
    runtime.push(...collectRuntimeRequires(entryAbs, root));
  }
  runtime.push(...collectRendererExternalImports(root));
  for (const rel of runtime) {
    if (filePatternCovers(rel, patterns)) continue;
    const extra = extraPatternForUncoveredFile(rel);
    if (!patterns.includes(extra)) patterns.push(extra);
    if (!filePatternCovers(rel, patterns)) {
      if (!patterns.includes(rel)) patterns.push(rel);
    }
  }

  for (const pattern of NATIVE_MODULE_PACK_PATTERNS) {
    if (!patterns.includes(pattern)) patterns.push(pattern);
  }

  return patterns;
}

/**
 * @returns {string[]}
 */
function canonicalAsarUnpack() {
  return [...ASAR_UNPACK_BASELINE];
}

/**
 * @param {string} root
 * @param {{ write?: boolean }} opts
 */
function ensureElectronPackFiles(root, opts = {}) {
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const nextFiles = canonicalBuildFiles(root);
  const nextAsarUnpack = canonicalAsarUnpack();
  const currentFiles = pkg.build?.files || [];
  const currentAsarUnpack = pkg.build?.asarUnpack || [];

  const filesMissing = nextFiles.filter((p) => !currentFiles.includes(p));
  const filesExtra = currentFiles.filter((p) => !nextFiles.includes(p));
  const filesChanged =
    filesMissing.length > 0 || filesExtra.length > 0 || currentFiles.length !== nextFiles.length;

  const asarMissing = nextAsarUnpack.filter((p) => !currentAsarUnpack.includes(p));
  const asarExtra = currentAsarUnpack.filter((p) => !nextAsarUnpack.includes(p));
  const asarChanged =
    asarMissing.length > 0 || asarExtra.length > 0 || currentAsarUnpack.length !== nextAsarUnpack.length;

  const changed = filesChanged || asarChanged;

  if (!changed) {
    return {
      changed: false,
      files: nextFiles,
      asarUnpack: nextAsarUnpack,
      missing: [],
      extra: [],
      asarMissing: [],
      asarExtra: [],
    };
  }

  if (!opts.write) {
    const lines = [];
    if (filesMissing.length) {
      lines.push(`build.files — añadir:\n${filesMissing.map((p) => `  + ${p}`).join('\n')}`);
    }
    if (filesExtra.length) {
      lines.push(`build.files — obsoletos:\n${filesExtra.map((p) => `  - ${p}`).join('\n')}`);
    }
    if (asarMissing.length) {
      lines.push(`build.asarUnpack — añadir:\n${asarMissing.map((p) => `  + ${p}`).join('\n')}`);
    }
    if (asarExtra.length) {
      lines.push(`build.asarUnpack — obsoletos:\n${asarExtra.map((p) => `  - ${p}`).join('\n')}`);
    }
    throw new Error(
      `package.json → build no coincide con la lista canónica del release.\n${lines.join('\n')}\n` +
        'Ejecuta: node scripts/lib/electron-pack-files.js --write'
    );
  }

  pkg.build = pkg.build || {};
  pkg.build.files = nextFiles;
  pkg.build.asarUnpack = nextAsarUnpack;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  return {
    changed: true,
    files: nextFiles,
    asarUnpack: nextAsarUnpack,
    missing: filesMissing,
    extra: filesExtra,
    asarMissing,
    asarExtra,
  };
}

/**
 * @param {string} root
 */
function assertRuntimeCoveredByPatterns(root) {
  const patterns = canonicalBuildFiles(root);
  const runtime = [];
  runtime.push(...collectRuntimeRequires(path.join(root, 'main.js'), root));
  runtime.push(...collectRendererExternalImports(root));
  const uncovered = runtime.filter((rel) => !filePatternCovers(rel, patterns));
  if (uncovered.length) {
    throw new Error(
      `Módulos de arranque/renderer sin cobertura en build.files:\n${uncovered.map((r) => `  - ${r}`).join('\n')}`
    );
  }
  return { patterns, runtime };
}

/**
 * @param {string} root
 */
function assertNativeModulesPacked(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const files = pkg.build?.files || [];
  const asarUnpack = pkg.build?.asarUnpack || [];
  const problems = [];

  for (const pattern of NATIVE_MODULE_PACK_PATTERNS) {
    if (!files.includes(pattern)) {
      problems.push(`build.files falta patrón nativo: ${pattern}`);
    }
    if (!asarUnpack.includes(pattern)) {
      problems.push(`build.asarUnpack falta patrón nativo: ${pattern}`);
    }
  }

  if (problems.length) {
    throw new Error(problems.join('\n'));
  }

  return { files, asarUnpack };
}

module.exports = {
  PACK_FILES_BASELINE,
  NATIVE_MODULE_PACK_PATTERNS,
  ASAR_UNPACK_BASELINE,
  DEV_ONLY_RUNTIME_FILES,
  filePatternCovers,
  collectRuntimeRequires,
  collectRendererExternalImports,
  canonicalBuildFiles,
  canonicalAsarUnpack,
  ensureElectronPackFiles,
  assertRuntimeCoveredByPatterns,
  assertNativeModulesPacked,
};

if (require.main === module) {
  const root = path.join(__dirname, '../..');
  const write = process.argv.includes('--write');
  try {
    if (write) {
      const result = ensureElectronPackFiles(root, { write: true });
      if (result.changed) {
        console.log('Actualizado package.json → build.files / build.asarUnpack');
        if (result.missing.length) {
          console.log('build.files añadidos:', result.missing.join(', '));
        }
        if (result.extra.length) {
          console.log('build.files quitados:', result.extra.join(', '));
        }
        if (result.asarMissing.length) {
          console.log('build.asarUnpack añadidos:', result.asarMissing.join(', '));
        }
        if (result.asarExtra.length) {
          console.log('build.asarUnpack quitados:', result.asarExtra.join(', '));
        }
      } else {
        console.log('build.files y build.asarUnpack ya estaban al día.');
      }
    } else {
      ensureElectronPackFiles(root, { write: false });
      assertRuntimeCoveredByPatterns(root);
      assertNativeModulesPacked(root);
      console.log('build.files cubre el grafo de main.js y módulos nativos.');
    }
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

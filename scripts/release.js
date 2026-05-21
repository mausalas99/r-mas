#!/usr/bin/env node
/**
 * Release en dos pasos para R+ (mausalas99/r-mas).
 *
 *   npm run release:bump -- 3.4.3
 *   npm run release:bump -- patch|minor|major
 *   npm run release:bump -- 3.5 --title "estable — título corto"
 *
 *   npm run release:publish
 *   npm run release:publish -- --yes
 *   npm run release:publish -- --mac-only
 *   npm run release:publish -- --skip-build
 *
 * Parte 1 (bump): versión, RELEASE_NOTES, README, stub in-app highlights.
 * Parte 2 (publish): test → commit → push → build mac+win → tag → gh release.
 *
 * Tras bump, edita docs/RELEASE_NOTES_X.Y.Z.txt, README y RELEASE_NOTES_HIGHLIGHTS en app.js.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const REPO = 'mausalas99/r-mas';
const { allReleaseArtifactNames } = require('./lib/artifact-names');
const APP_JS = path.join(ROOT, 'public/js/app.js');
const SETTINGS_HELP_JS = path.join(ROOT, 'public/js/features/settings-help.mjs');
const README = path.join(ROOT, 'README.md');

function run(cmd, opts = {}) {
  console.log('\n→', cmd);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
}

function gitCommit(message) {
  console.log('\n→ git commit -m', JSON.stringify(message));
  const r = spawnSync('git', ['commit', '-m', message], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}

function gitTag(tag, message) {
  console.log('\n→ git tag -a', tag);
  const r = spawnSync('git', ['tag', '-a', tag, '-m', message], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function parseSemver(v) {
  const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function bumpSemver(current, kind) {
  const p = parseSemver(current);
  if (!p) throw new Error(`Versión actual inválida: ${current}`);
  if (kind === 'patch') return `${p.major}.${p.minor}.${p.patch + 1}`;
  if (kind === 'minor') return `${p.major}.${p.minor + 1}.0`;
  if (kind === 'major') return `${p.major + 1}.0.0`;
  throw new Error(`Incremento desconocido: ${kind}`);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function resolveTargetVersion(argv) {
  const pkg = readJson('package.json');
  const current = pkg.version;
  const positional = argv.filter((a) => !a.startsWith('-'));

  if (positional.length === 0) {
    return promptVersion(current);
  }

  const arg = positional[0];
  if (['patch', 'minor', 'major'].includes(arg)) {
    return Promise.resolve(bumpSemver(current, arg));
  }
  if (!parseSemver(arg)) {
    throw new Error(`Versión inválida: ${arg} (usa X.Y.Z o patch|minor|major)`);
  }
  return Promise.resolve(arg);
}

function promptVersion(current) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    console.log(`Versión actual: ${current}`);
    rl.question('Nueva versión (X.Y.Z) o patch / minor / major: ', (answer) => {
      rl.close();
      const t = String(answer).trim();
      if (['patch', 'minor', 'major'].includes(t)) {
        resolve(bumpSemver(current, t));
        return;
      }
      if (!parseSemver(t)) {
        console.error('Entrada inválida.');
        process.exit(1);
      }
      resolve(t);
    });
  });
}

function getArg(argv, name, fallback = '') {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  return argv[i + 1] || fallback;
}

function hasFlag(argv, name) {
  return argv.includes(name);
}

function writeReleaseNotes(version, title) {
  const file = path.join(ROOT, 'docs', `RELEASE_NOTES_${version}.txt`);
  if (fs.existsSync(file)) {
    console.log(`Ya existe ${path.relative(ROOT, file)} — no se sobrescribe.`);
    return;
  }
  const body = `R+ ${version} (${title})
${'='.repeat(Math.min(60, 10 + version.length + title.length))}

Fecha: ${todayIso()}

## Resumen

TODO: resumen en una o dos frases.

## Nuevo / mejorado

- **TODO:** punto 1
- **TODO:** punto 2

## Instalación

Descarga desde: https://github.com/${REPO}/releases/tag/v${version}

- Mac: \`R+-${version}-arm64.dmg\`, \`R+-${version}-x64.dmg\` (y zip para auto-update).
- Windows: \`R+-${version}-x64.exe\`.

Tras el build local: \`npm run build:mac\` / \`npm run build:win\` (incluye write-release-yml.js).
`;
  fs.writeFileSync(file, body, 'utf8');
  console.log('Creado', path.relative(ROOT, file));
}

function updateReadme(version, title) {
  let text = fs.readFileSync(README, 'utf8');
  const stableRe = /\*\*Versión estable actual:\*\* \[[^\]]+\]\([^)]+\)[^\n]*/;
  if (!stableRe.test(text)) {
    throw new Error('README.md: no se encontró la línea «Versión estable actual».');
  }
  text = text.replace(
    stableRe,
    `**Versión estable actual:** [${version}](https://github.com/${REPO}/releases/tag/v${version}) — en *Releases* verás siempre el instalador más reciente con el número de versión en el nombre del archivo.`
  );

  const section = `## R+ ${version} (${title})`;
  if (!text.includes(section)) {
    const block = [
      '',
      section,
      '',
      '- **TODO:** completar bullets en README.',
      '',
      `Notas: \`docs/RELEASE_NOTES_${version}.txt\`.`,
      '',
    ].join('\n');
    const insertRe = /(---\n\n)(## R\+ )/;
    if (!insertRe.test(text)) {
      throw new Error('README.md: no se encontró el bloque de versiones (--- / ## R+).');
    }
    text = text.replace(insertRe, `$1${block}$2`);
  }
  fs.writeFileSync(README, text, 'utf8');
  console.log('Actualizado README.md');
}

function updateHighlightsStub(version) {
  let text = fs.readFileSync(SETTINGS_HELP_JS, 'utf8');
  const key = `'${version}':`;
  if (text.includes(key)) {
    console.log('settings-help.mjs ya tiene RELEASE_NOTES_HIGHLIGHTS para', version);
    return;
  }
  const stub = `  '${version}': [
    {
      title: 'TODO',
      body: 'Completar antes de publicar.',
    },
    {
      title: 'TODO',
      body: 'Completar antes de publicar.',
    },
  ],
`;
  const marker = 'var RELEASE_NOTES_HIGHLIGHTS = {\n';
  if (!text.includes(marker)) {
    throw new Error('settings-help.mjs: no se encontró RELEASE_NOTES_HIGHLIGHTS.');
  }
  text = text.replace(marker, marker + stub);
  fs.writeFileSync(SETTINGS_HELP_JS, text, 'utf8');
  console.log('Añadido stub RELEASE_NOTES_HIGHLIGHTS en settings-help.mjs');
}

function readReleaseTitle(version) {
  const file = path.join(ROOT, 'docs', `RELEASE_NOTES_${version}.txt`);
  if (!fs.existsSync(file)) return `estable — release ${version}`;
  const first = fs.readFileSync(file, 'utf8').split('\n')[0].trim();
  const m = first.match(/^R\+\s+[\d.]+\s+\((.+)\)\s*$/);
  return m ? m[1] : `estable — release ${version}`;
}

async function cmdBump(argv) {
  const version = await resolveTargetVersion(argv);
  const title =
    getArg(argv, '--title') ||
    getArg(argv, '-t') ||
    `estable — release ${version}`;

  const pkg = readJson('package.json');
  if (pkg.version === version) {
    console.log('package.json ya está en', version);
  } else {
    run(`npm version ${version} --no-git-tag-version`);
  }

  writeReleaseNotes(version, title);
  updateReadme(version, title);
  updateHighlightsStub(version);

  console.log(`
── Parte 1 lista: ${version} ──
Edita antes de publish:
  • docs/RELEASE_NOTES_${version}.txt
  • README.md (bullets de ## R+ ${version})
  • public/js/features/settings-help.mjs (RELEASE_NOTES_HIGHLIGHTS['${version}'])

Luego:
  npm run release:publish
`);
}

function confirm(question, yesFlag) {
  if (yesFlag) return Promise.resolve(true);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (a) => {
      rl.close();
      resolve(/^y(es)?$/i.test(String(a).trim()));
    });
  });
}

function distFiles(version, { macOnly, winOnly }) {
  const pkg = readJson('package.json');
  const { mac, win } = allReleaseArtifactNames(pkg);
  const names = [];
  if (!winOnly) {
    for (const base of mac) {
      names.push(base, `${base}.blockmap`);
    }
    names.push('latest-mac.yml');
  }
  if (!macOnly) {
    names.push(win, `${win}.blockmap`, 'latest.yml');
  }
  return names.map((n) => path.join(ROOT, 'dist', n));
}

function assertDist(version, opts) {
  const missing = distFiles(version, opts).filter((f) => !fs.existsSync(f));
  if (missing.length) {
    console.error('Faltan artefactos en dist/:');
    missing.forEach((f) => console.error(' ', path.relative(ROOT, f)));
    process.exit(1);
  }
}

function verifyYmlNames(version) {
  const pkg = readJson('package.json');
  const { mac, win } = allReleaseArtifactNames(pkg);
  const expectZip = mac.find((n) => n.endsWith('-arm64.zip'));
  const macYml = path.join(ROOT, 'dist', 'latest-mac.yml');
  const winYml = path.join(ROOT, 'dist', 'latest.yml');
  if (fs.existsSync(macYml)) {
    const t = fs.readFileSync(macYml, 'utf8');
    if (t.includes('r-plus-') || (expectZip && !t.includes(expectZip))) {
      console.warn('⚠ latest-mac.yml incorrecto. Ejecuta: node scripts/write-release-yml.js --auto');
    }
  }
  if (fs.existsSync(winYml)) {
    const t = fs.readFileSync(winYml, 'utf8');
    if (t.includes('r-plus-') || !t.includes(win)) {
      console.warn('⚠ latest.yml incorrecto. Ejecuta: node scripts/write-release-yml.js --auto');
    }
  }
}

function commitMessage(version) {
  const title = readReleaseTitle(version);
  const short = title.replace(/^estable\s*—\s*/i, '').trim() || title;
  return `release: R+ ${version} — ${short}`;
}

async function cmdPublish(argv) {
  const yes = hasFlag(argv, '--yes') || hasFlag(argv, '-y');
  const skipTests = hasFlag(argv, '--skip-tests');
  const skipBuild = hasFlag(argv, '--skip-build');
  const skipPush = hasFlag(argv, '--skip-push');
  const skipGh = hasFlag(argv, '--no-gh');
  const macOnly = hasFlag(argv, '--mac-only');
  const winOnly = hasFlag(argv, '--win-only');
  const noManifestCommit = hasFlag(argv, '--no-manifest-commit');
  const skipCommit = hasFlag(argv, '--skip-commit');

  if (macOnly && winOnly) {
    console.error('Usa solo uno de --mac-only o --win-only');
    process.exit(1);
  }

  const version = readJson('package.json').version;
  const notesFile = path.join(ROOT, 'docs', `RELEASE_NOTES_${version}.txt`);
  if (!fs.existsSync(notesFile)) {
    console.error(`Falta ${path.relative(ROOT, notesFile)}. Ejecuta primero: npm run release:bump -- ${version}`);
    process.exit(1);
  }

  const notesText = fs.readFileSync(notesFile, 'utf8');
  if (/TODO/i.test(notesText)) {
    console.warn('⚠ RELEASE_NOTES contiene TODO — revisa antes de continuar.');
  }
  const highlightsText = fs.readFileSync(SETTINGS_HELP_JS, 'utf8');
  if (new RegExp(`'${version}':[\\s\\S]*?title: 'TODO'`).test(highlightsText)) {
    console.warn('⚠ RELEASE_NOTES_HIGHLIGHTS aún tiene TODO — revisa settings-help.mjs.');
  }

  console.log(`\nPublicar R+ ${version} (${readReleaseTitle(version)})\n`);

  if (!(await confirm('¿Continuar con tests, commit, builds y GitHub release?', yes))) {
    console.log('Cancelado.');
    process.exit(0);
  }

  if (!skipTests) run('npm test');

  if (!skipCommit) {
    run(
      'git add package.json package-lock.json README.md docs/ preload.js public/index.html public/index.src.html public/js/ public/partials/ public/styles/ lan-squad/'
    );
    const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
    if (status.trim()) {
      gitCommit(commitMessage(version));
    } else {
      console.log('Nada que commitear (working tree limpio para paths de release).');
    }
  }

  if (!skipPush) run('git push origin main');

  if (!skipBuild) {
    if (!winOnly) run('npm run build:mac');
    if (!macOnly) run('npm run build:win');
  } else {
    console.log('--skip-build: se asume dist/ ya generado.');
  }

  assertDist(version, { macOnly, winOnly });
  verifyYmlNames(version);

  const tag = `v${version}`;
  try {
    execSync(`git rev-parse ${tag}`, { cwd: ROOT, stdio: 'pipe' });
    console.log(`Tag ${tag} ya existe — no se recrea.`);
  } catch {
    gitTag(tag, commitMessage(version));
    if (!skipPush) run(`git push origin ${tag}`);
  }

  if (!skipGh) {
    const assets = distFiles(version, { macOnly, winOnly }).map((f) =>
      path.relative(ROOT, f)
    );
    const ghArgs = [
      'release',
      'create',
      tag,
      '--repo',
      REPO,
      '--title',
      `R+ ${version}`,
      '--notes-file',
      `docs/RELEASE_NOTES_${version}.txt`,
      ...assets,
    ];
    console.log('\n→ gh', ghArgs.join(' '));
    const created = spawnSync('gh', ghArgs, { cwd: ROOT, stdio: 'inherit' });
    if (created.status !== 0) {
      console.log('\nSi el release ya existe, sube assets con:');
      console.log(`  gh release upload ${tag} --repo ${REPO} ${assets.join(' ')} --clobber`);
      process.exit(created.status || 1);
    }
  }

  if (!noManifestCommit && !skipPush) {
    const hasYml =
      fs.existsSync(path.join(ROOT, 'dist', 'latest-mac.yml')) ||
      fs.existsSync(path.join(ROOT, 'dist', 'latest.yml'));
    if (hasYml && (await confirm('¿Commitear latest*.yml en main (-f dist/)?', yes))) {
      run('git add -f dist/latest-mac.yml dist/latest.yml');
      run(`git commit -m "chore(release): publish ${version} update manifests"`);
      run('git push origin main');
    }
  }

  console.log(`
── Parte 2 lista: ${version} ──
Verificar:
  gh release view ${tag} --repo ${REPO} --json assets --jq '.assets[].name'
  curl -sL "https://github.com/${REPO}/releases/download/${tag}/latest-mac.yml" | head -8
`);
}

function main() {
  const [,, sub, ...rest] = process.argv;
  if (!sub || sub === '--help' || sub === '-h') {
    console.log(`Uso:
  node scripts/release.js bump [VERSION|patch|minor|major] [--title "estable — …"]
  node scripts/release.js publish [--yes] [--mac-only|--win-only] [--skip-build] [--skip-push] [--no-gh]

npm:
  npm run release:bump -- 3.4.3
  npm run release:publish -- --yes
`);
    process.exit(sub ? 0 : 1);
  }
  if (sub === 'bump') {
    cmdBump(rest).catch((e) => {
      console.error(e.message || e);
      process.exit(1);
    });
    return;
  }
  if (sub === 'publish') {
    cmdPublish(rest).catch((e) => {
      console.error(e.message || e);
      process.exit(1);
    });
    return;
  }
  console.error('Subcomando desconocido:', sub);
  process.exit(1);
}

main();

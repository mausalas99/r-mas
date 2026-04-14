#!/usr/bin/env node
/**
 * Downloads standalone Python 3.12 for macOS (arm64 + x64).
 * Uses python-build-standalone — self-contained, no system deps required.
 * Run via: npm run prebuild:mac
 * Output:
 *   python-runtime/mac-arm64/bin/python3
 *   python-runtime/mac-x64/bin/python3
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RELEASE  = '20260408';
const VERSION  = '3.12.13';
const BASE_URL = `https://github.com/astral-sh/python-build-standalone/releases/download/${RELEASE}`;
const RUNTIME  = path.join(__dirname, '..', 'python-runtime');

const BUILDS = [
  { arch: 'mac-arm64', triple: 'aarch64-apple-darwin' },
  { arch: 'mac-x64',   triple: 'x86_64-apple-darwin'  },
];

// Dirs to strip from the extracted Python to reduce bundle size (~60 → ~35 MB)
const STRIP_DIRS = [
  'lib/python3.12/test',
  'lib/python3.12/idlelib',
  'lib/python3.12/tkinter',
  'lib/python3.12/turtledemo',
  'lib/python3.12/ensurepip',
  'include',
  'share',
];

/** Static archives (.a) are unused at runtime; electron-builder codesign can fail on some of them. */
function pruneStaticArchives(rootDir) {
  if (!fs.existsSync(rootDir)) return;
  try {
    execSync(`find "${rootDir}" -name '*.a' -type f -delete`);
  } catch (e) {
    console.warn(`[${path.basename(rootDir)}] prune *.a: ${e.message}`);
  }
}

function download(url, dest, redirects = 10) {
  return new Promise((resolve, reject) => {
    if (redirects === 0) return reject(new Error('Too many redirects'));
    const tmp = dest + '.part';
    const file = fs.createWriteStream(tmp);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        file.close(); try { fs.unlinkSync(tmp); } catch {}
        return resolve(download(res.headers.location, dest, redirects - 1));
      }
      if (res.statusCode !== 200) {
        file.close(); return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => { fs.renameSync(tmp, dest); resolve(); }));
    }).on('error', (err) => { try { fs.unlinkSync(tmp); } catch {} reject(err); });
  });
}

async function fetchBuild({ arch, triple }) {
  const outDir = path.join(RUNTIME, arch);
  const marker = path.join(outDir, 'bin', 'python3');
  if (fs.existsSync(marker)) {
    console.log(`[${arch}] Already present, skipping.`);
    pruneStaticArchives(outDir);
    return;
  }

  const tarName = `cpython-${VERSION}+${RELEASE}-${triple}-install_only_stripped.tar.gz`;
  const url     = `${BASE_URL}/${tarName}`;
  const tarPath = path.join(RUNTIME, tarName);

  fs.mkdirSync(RUNTIME, { recursive: true });

  console.log(`[${arch}] Downloading ${tarName}...`);
  await download(url, tarPath);

  console.log(`[${arch}] Extracting...`);
  const tmpDir = path.join(RUNTIME, `_tmp_${arch}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  execSync(`tar xzf "${tarPath}" -C "${tmpDir}"`, { stdio: 'inherit' });

  // Detect extraction layout:
  //   old: tmpDir/python/install/bin/...
  //   mid: tmpDir/python/bin/...
  //   new: tmpDir/bin/...
  let installSrc;
  if (fs.existsSync(path.join(tmpDir, 'python', 'install', 'bin'))) {
    installSrc = path.join(tmpDir, 'python', 'install');
  } else if (fs.existsSync(path.join(tmpDir, 'python', 'bin'))) {
    installSrc = path.join(tmpDir, 'python');
  } else {
    installSrc = tmpDir;
  }

  // Strip unnecessary dirs before moving
  for (const rel of STRIP_DIRS) {
    const target = path.join(installSrc, rel);
    if (fs.existsSync(target)) {
      execSync(`rm -rf "${target}"`);
    }
  }

  pruneStaticArchives(installSrc);

  // Move to final location
  if (fs.existsSync(outDir)) execSync(`rm -rf "${outDir}"`);
  fs.renameSync(installSrc, outDir);
  execSync(`rm -rf "${tmpDir}"`);  // clean leftover tmp

  // Ensure python3 symlink is executable
  try { fs.chmodSync(path.join(outDir, 'bin', 'python3'), 0o755); } catch {}
  try { fs.chmodSync(path.join(outDir, 'bin', `python${VERSION.slice(0,4)}`), 0o755); } catch {}
  try { fs.chmodSync(path.join(outDir, 'bin', `python${VERSION.slice(0,3)}`), 0o755); } catch {}

  // Cleanup
  execSync(`rm -rf "${tmpDir}" "${tarPath}"`);
  console.log(`[${arch}] Ready at: ${outDir}`);
}

(async () => {
  for (const build of BUILDS) {
    await fetchBuild(build);
  }
  console.log('Mac Python runtimes ready.');
})().catch((err) => {
  console.error('Failed to fetch Mac Python:', err.message);
  process.exit(1);
});

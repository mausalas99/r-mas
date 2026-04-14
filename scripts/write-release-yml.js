#!/usr/bin/env node
/**
 * Regenera dist/latest-mac.yml y dist/latest.yml a partir de los binarios en dist/.
 * Uso:
 *   node scripts/write-release-yml.js           → Mac + Windows (todos los archivos deben existir)
 *   node scripts/write-release-yml.js --mac-only → solo latest-mac.yml
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const macOnly = process.argv.includes('--mac-only');

const root = path.join(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const ver = pkg.version;
const dist = path.join(root, 'dist');

function sha512b64(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha512').update(buf).digest('base64');
}

function need(rel) {
  const abs = path.join(dist, rel);
  if (!fs.existsSync(abs)) {
    console.error('Falta el archivo:', abs);
    process.exit(1);
  }
  return abs;
}

function isoDate() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

const macNames = [
  `R+-${ver}-arm64.zip`,
  `R+-${ver}-x64.zip`,
  `R+-${ver}-arm64.dmg`,
  `R+-${ver}-x64.dmg`,
];

const lines = [];
lines.push(`version: ${ver}`);
lines.push('files:');
for (const url of macNames) {
  const abs = need(url);
  lines.push(`  - url: ${url}`);
  lines.push(`    sha512: ${sha512b64(abs)}`);
  lines.push(`    size: ${fs.statSync(abs).size}`);
}
const zipArm = need(`R+-${ver}-arm64.zip`);
lines.push(`path: R+-${ver}-arm64.zip`);
lines.push(`sha512: ${sha512b64(zipArm)}`);
lines.push(`releaseDate: '${isoDate()}'`);
lines.push('');

fs.writeFileSync(path.join(dist, 'latest-mac.yml'), lines.join('\n'), 'utf8');
console.log('Escrito dist/latest-mac.yml');

if (!macOnly) {
  const winName = `R+-${ver}-x64.exe`;
  const winAbs = need(winName);
  const winSha = sha512b64(winAbs);
  const winSize = fs.statSync(winAbs).size;
  const winYml = [
    `version: ${ver}`,
    'files:',
    `  - url: ${winName}`,
    `    sha512: ${winSha}`,
    `    size: ${winSize}`,
    `path: ${winName}`,
    `sha512: ${winSha}`,
    `releaseDate: '${isoDate()}'`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dist, 'latest.yml'), winYml, 'utf8');
  console.log('Escrito dist/latest.yml');
}

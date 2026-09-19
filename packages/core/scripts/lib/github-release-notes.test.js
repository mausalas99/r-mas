'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  githubDownloadBanner,
  composeGithubReleaseNotes,
} = require('./github-release-notes');

test('githubDownloadBanner leads with a giant Descargar heading and three installers', () => {
  const md = githubDownloadBanner('8.1.3', { repo: 'mausalas99/r-mas' });
  assert.match(md, /^# Descargar R\+ 8\.1\.3/m);
  assert.match(md, /R\+-8\.1\.3-Mac-Apple-Silicon\.dmg/);
  assert.match(md, /R\+-8\.1\.3-Mac-Intel\.dmg/);
  assert.match(md, /R\+-8\.1\.3-Windows\.exe/);
  assert.ok(md.indexOf('# Descargar') < md.indexOf('Apple Silicon'));
});

test('composeGithubReleaseNotes puts the download banner above the changelog', () => {
  const out = composeGithubReleaseNotes('## Resumen\nHola.', '9.0.0');
  assert.ok(out.startsWith('# Descargar R+ 9.0.0'));
  assert.match(out, /## Resumen\nHola\./);
  assert.ok(out.indexOf('# Descargar') < out.indexOf('## Resumen'));
});

test('release.js injects the GitHub download banner on every publish', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../release.js'), 'utf8');
  assert.match(src, /composeGithubReleaseNotes/);
  assert.match(src, /copyHumanInstallers/);
  assert.match(src, /copyUpdaterPublishAliases/);
  assert.match(src, /writeGithubReleaseNotesFile/);
  assert.match(src, /humanInstallAliases/);
  assert.match(src, /updaterPublishAliases/);
});

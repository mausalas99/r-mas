const { test } = require('node:test');
const assert = require('node:assert/strict');
const { allReleaseArtifactNames, expandArtifactPattern } = require('./artifact-names');

const pkg = {
  name: 'r-plus',
  version: '3.4.3',
  build: {
    productName: 'R+',
    artifactName: '${productName}-${version}-${arch}.${ext}',
  },
};

test('expande R+- con productName', () => {
  const p = pkg.build.artifactName;
  assert.equal(expandArtifactPattern(p, '3.4.3', 'arm64', 'zip', pkg), 'R+-3.4.3-arm64.zip');
  assert.equal(expandArtifactPattern(p, '3.4.3', 'x64', 'exe', pkg), 'R+-3.4.3-x64.exe');
});

test('humanInstallAliases names DMGs so users can pick Silicon vs Intel', () => {
  const { humanInstallAliases } = require('./artifact-names');
  const aliases = humanInstallAliases('8.1.2', pkg);
  const byFrom = Object.fromEntries(aliases.map((a) => [a.from, a.to]));
  assert.equal(byFrom['R+-8.1.2-arm64.dmg'], 'R+-8.1.2-Mac-Apple-Silicon.dmg');
  assert.equal(byFrom['R+-8.1.2-x64.dmg'], 'R+-8.1.2-Mac-Intel.dmg');
  assert.equal(byFrom['R+-8.1.2-x64.exe'], 'R+-8.1.2-Windows.exe');
});

test('updaterPublishAliases renames zip and zip.blockmap so GitHub Assets are not installers', () => {
  const { updaterPublishAliases, githubAssetName } = require('./artifact-names');
  const aliases = updaterPublishAliases('8.1.3', pkg);
  const byFrom = Object.fromEntries(aliases.map((a) => [a.from, a.to]));
  assert.equal(byFrom['R+-8.1.3-arm64.zip'], 'R+-8.1.3-autoupdate-mac-arm64.zip');
  assert.equal(byFrom['R+-8.1.3-arm64.zip.blockmap'], 'R+-8.1.3-autoupdate-mac-arm64.zip.blockmap');
  assert.equal(byFrom['R+-8.1.3-x64.zip'], 'R+-8.1.3-autoupdate-mac-x64.zip');
  assert.equal(byFrom['R+-8.1.3-x64.zip.blockmap'], 'R+-8.1.3-autoupdate-mac-x64.zip.blockmap');
  assert.equal(githubAssetName('R+-8.1.3-arm64.zip', '8.1.3', pkg), 'R+-8.1.3-autoupdate-mac-arm64.zip');
  assert.equal(githubAssetName('R+-8.1.3-arm64.dmg', '8.1.3', pkg), 'R+-8.1.3-arm64.dmg');
  assert.equal(githubAssetName('R+-8.1.3-x64.exe', '8.1.3', pkg), 'R+-8.1.3-x64.exe');
});

test('allReleaseArtifactNames incluye mac y win', () => {
  const a = allReleaseArtifactNames(pkg);
  assert.ok(a.mac.includes('R+-3.4.3-arm64.dmg'));
  assert.equal(a.win, 'R+-3.4.3-x64.exe');
});

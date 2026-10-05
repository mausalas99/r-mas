#!/usr/bin/env node
// Sparkle helper: Ed25519 keys, signed update archive, appcast-mac.xml.
//   sparkle.mjs keygen <keyfile>                  new key; file mode 600; prints PUBLIC key only
//   sparkle.mjs pubkey                            prints the public key of the env key
//   sparkle.mjs appcast <zip> <version> <build>   writes <zip dir>/appcast-mac.xml (local, no upload)
// Private key, from env only (never printed):
//   SPARKLE_ED_KEY_FILE   path of the key file, or
//   SPARKLE_ED_PRIVATE_KEY  base64 of the 32-byte seed
// Optional: APPCAST_BASE_URL  folder URL that will hold the zip
//   (default: the GitHub release for v<version>).
// Exit 3 = no key in env (step skipped). The appcast is Swift-only. Electron
// Mac apps never read it, so they are not moved into the Swift app by it.
import {
  createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify,
} from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const PKCS8 = Buffer.from('302e020100300506032b657004220420', 'hex'); // Ed25519 seed wrapper
const priv = (seed) => createPrivateKey({ key: Buffer.concat([PKCS8, seed]), format: 'der', type: 'pkcs8' });
const rawPub = (k) => createPublicKey(k).export({ format: 'der', type: 'spki' }).subarray(-32);

function envKey() {
  const file = process.env.SPARKLE_ED_KEY_FILE;
  const b64 = file ? readFileSync(file, 'utf8').trim() : (process.env.SPARKLE_ED_PRIVATE_KEY || '').trim();
  if (!b64) return null;
  const seed = Buffer.from(b64, 'base64');
  if (seed.length !== 32) { console.error('Sparkle key must be base64 of 32 bytes.'); process.exit(1); }
  return priv(seed);
}
function needKey() {
  const k = envKey();
  if (!k) {
    console.log('SKIP sparkle\n  No Sparkle key in env. Owner: run once in your own shell\n' +
      '    node scripts/mac/sparkle.mjs keygen ~/.rplus-sparkle.key\n' +
      '  then export SPARKLE_ED_KEY_FILE=~/.rplus-sparkle.key and keep that file in your backup.');
    process.exit(3);
  }
  return k;
}

const [cmd, ...a] = process.argv.slice(2);
if (cmd === 'keygen') {
  if (!a[0]) { console.error('usage: sparkle.mjs keygen <keyfile>'); process.exit(1); }
  const { privateKey } = generateKeyPairSync('ed25519');
  const seed = privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(-32);
  writeFileSync(a[0], seed.toString('base64') + '\n', { mode: 0o600, flag: 'wx' });
  console.log(`Key file written: ${a[0]}\nSUPublicEDKey (public, safe to share): ${rawPub(privateKey).toString('base64')}`);
} else if (cmd === 'pubkey') {
  console.log(rawPub(needKey()).toString('base64'));
} else if (cmd === 'appcast') {
  const [zip, version, build] = a;
  if (!zip || !version || !build) { console.error('usage: sparkle.mjs appcast <zip> <version> <build>'); process.exit(1); }
  const key = needKey();
  const data = readFileSync(zip);
  const edSig = sign(null, data, key).toString('base64');
  if (!verify(null, data, createPublicKey(key), Buffer.from(edSig, 'base64'))) process.exit(1);
  const base = (process.env.APPCAST_BASE_URL || `https://github.com/mausalas99/r-mas/releases/download/v${version}`).replace(/\/$/, '');
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
  <channel>
    <title>R+ Mac</title>
    <item>
      <title>Version ${version}</title>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <sparkle:version>${build}</sparkle:version>
      <sparkle:shortVersionString>${version}</sparkle:shortVersionString>
      <sparkle:minimumSystemVersion>14.0</sparkle:minimumSystemVersion>
      <enclosure url="${base}/${encodeURIComponent(basename(zip))}" length="${statSync(zip).size}" type="application/octet-stream" sparkle:edSignature="${edSig}"/>
    </item>
  </channel>
</rss>
`;
  const out = join(dirname(zip), 'appcast-mac.xml');
  writeFileSync(out, xml);
  console.log(`Wrote ${out}`);
} else {
  console.error('usage: sparkle.mjs keygen|pubkey|appcast ...');
  process.exit(1);
}

#!/usr/bin/env node
// Writes latest-mac.yml (electron-updater format) for one universal zip.
// Usage: write-feed-yml.mjs <zip> <version>   -> <zip dir>/latest-mac.yml
// Local file only. Does not upload. The zip name must be GitHub-safe (no "+")
// and must not hold "arm64": electron-updater then installs it on Intel and
// Apple Silicon.
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const [zip, version] = process.argv.slice(2);
if (!zip || !version) {
  console.error('usage: write-feed-yml.mjs <zip> <version>');
  process.exit(1);
}
const name = basename(zip);
if (/arm64|x64|[+ ]/.test(name)) {
  console.error(`bad zip name for the universal feed: ${name}`);
  process.exit(1);
}
const sha512 = createHash('sha512').update(readFileSync(zip)).digest('base64');
const yml = [
  `version: ${version}`,
  'files:',
  `  - url: ${name}`,
  `    sha512: ${sha512}`,
  `    size: ${statSync(zip).size}`,
  `path: ${name}`,
  `sha512: ${sha512}`,
  `releaseDate: '${new Date().toISOString()}'`,
  '',
].join('\n');
const out = join(dirname(zip), 'latest-mac.yml');
writeFileSync(out, yml);
console.log(`Wrote ${out}`);

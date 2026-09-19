/**
 * Fetches the Spanish "best" Tesseract trained-data file so OCR works fully
 * offline (locked-down hospital wifi), bundled outside asar like the native
 * better-sqlite3/argon2 binaries. Mirrors scripts/fetch-argon2-win.mjs's shape.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TESSDATA_URL =
  'https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/spa.traineddata';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const destDir = path.join(root, 'resources', 'tessdata');
const destFile = path.join(destDir, 'spa.traineddata');

try {
  await fs.access(destFile);
  console.log('[fetch-tessdata] spa.traineddata already present, skipping download');
  process.exit(0);
} catch {
  // Not present, continue
}

console.log(`[fetch-tessdata] Downloading ${TESSDATA_URL}...`);

try {
  const resp = await fetch(TESSDATA_URL);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
  }
  const buffer = Buffer.from(await resp.arrayBuffer());
  await fs.mkdir(destDir, { recursive: true });
  await fs.writeFile(destFile, buffer);
  console.log(`[fetch-tessdata] Wrote ${destFile} (${buffer.length} bytes)`);
} catch (e) {
  console.error(`[fetch-tessdata] Failed: ${e.message}`);
  process.exit(1);
}

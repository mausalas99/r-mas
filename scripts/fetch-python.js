#!/usr/bin/env node
/**
 * Downloads and extracts the Python embeddable package for Windows x64.
 * Run via: npm run prebuild:win
 * Output: python-runtime/win-x64/python.exe (+ stdlib)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PYTHON_VERSION = '3.12.10';
const ZIP_NAME = `python-${PYTHON_VERSION}-embed-amd64.zip`;
const DOWNLOAD_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/${ZIP_NAME}`;
const OUT_DIR = path.join(__dirname, '..', 'python-runtime', 'win-x64');
const ZIP_PATH = path.join(__dirname, '..', 'python-runtime', ZIP_NAME);

if (fs.existsSync(path.join(OUT_DIR, 'python.exe'))) {
  console.log('Python embeddable already present, skipping download.');
  process.exit(0);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

console.log(`Downloading ${ZIP_NAME}...`);

function download(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    if (redirects === 0) return reject(new Error('Too many redirects'));
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return resolve(download(res.headers.location, dest, redirects - 1));
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

download(DOWNLOAD_URL, ZIP_PATH)
  .then(() => {
    console.log('Extracting...');
    // Use Node's built-in zlib isn't enough for zip; use system unzip or PowerShell
    if (process.platform === 'win32') {
      execSync(
        `powershell -Command "Expand-Archive -Path '${ZIP_PATH}' -DestinationPath '${OUT_DIR}' -Force"`,
        { stdio: 'inherit' }
      );
    } else {
      // On Mac/Linux CI building for Windows
      execSync(`unzip -o "${ZIP_PATH}" -d "${OUT_DIR}"`, { stdio: 'inherit' });
    }
    fs.unlinkSync(ZIP_PATH);
    console.log(`Python embeddable ready at: ${OUT_DIR}`);
  })
  .catch((err) => {
    console.error('Failed to fetch Python embeddable:', err.message);
    process.exit(1);
  });

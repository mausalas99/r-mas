'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Plain-text bullets for auto-updater (latest-mac.yml releaseNotes).
 * @param {string} root
 * @param {string} version
 */
function releaseNotesPlainFromDoc(root, version) {
  const notesPath = path.join(root, 'docs', `RELEASE_NOTES_${version}.txt`);
  if (!fs.existsSync(notesPath)) return '';
  const text = fs.readFileSync(notesPath, 'utf8');
  const m = text.match(/## Nuevo \/ mejorado\s*\n([\s\S]*?)(?:\n## |\s*$)/);
  if (!m) return '';
  return m[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-'))
    .map((line) =>
      line
        .replace(/^- \*\*([^*]+)\*\* — /, '$1 — ')
        .replace(/^- /, '')
        .replace(/\*\*/g, '')
        .trim()
    )
    .join('\n\n');
}

module.exports = { releaseNotesPlainFromDoc };

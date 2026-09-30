#!/usr/bin/env node
/**
 * Builds the public landing site (GitHub Pages) into dist/landing/.
 *
 * - Every page in cloud/landing/*.html gets the shared header, download block
 *   and footer (<!--header--> / <!--cta--> / <!--footer-->), with its own nav
 *   link marked current. Files starting with _ are partials, not copied.
 * - novedades.html gets the newest release notes from docs/RELEASE_NOTES_*.txt
 *   (<!--notes-->), so a push that adds notes updates the page.
 *
 *   node scripts/build-landing.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SRC = path.join(root, 'packages/core/cloud/landing');
const OUT = path.join(root, 'dist/landing');
const NOTES_DIR = path.join(root, 'docs');
const NOTES_SHOWN = 6;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
const verKey = (v) => v.split('.').map(Number).reduce((a, n) => a * 1000 + n, 0);

/**
 * One RELEASE_NOTES_x.y.z.txt → { version, date, summary, items }.
 * Sentences naming the hospital lab system are left out (the site never names
 * it), and so is the install section (build commands, not user news).
 */
export function parseNotes(text, version) {
  const date = (/^Fecha:\s*(\S+)/m.exec(text) || [])[1] || '';
  const section = (name) => {
    const m = new RegExp(`^## ${name}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm').exec(text);
    return m ? m[1] : '';
  };
  const clean = (t) => t.split(/(?<=\.)\s+/).filter((x) => !/\bSOME\b/.test(x)).join(' ');
  const summary = section('Resumen').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)[0] || '';
  const items = section('Nuevo')
    .split('\n')
    .filter((l) => /^- /.test(l))
    .map((l) => clean(l.slice(2).trim()))
    // a bullet left with only its «**Nuevo (x):**» label says nothing
    .filter((l) => l.replace(/^\*\*[^*]*\*\*/, '').trim());
  return { version, date, summary: clean(summary), items };
}

export function renderNotes(list) {
  return list
    .map(
      (n) => `<article class="release" id="v${n.version}">
  <header><h2>R+ ${n.version}</h2>${n.date ? `<time datetime="${n.date}">${n.date}</time>` : ''}</header>
  ${n.summary ? `<p class="lead">${inline(n.summary)}</p>` : ''}
  <ul>${n.items.map((i) => `\n    <li>${inline(i)}</li>`).join('')}
  </ul>
</article>`
    )
    .join('\n');
}

function latestNotes() {
  return fs
    .readdirSync(NOTES_DIR)
    .map((f) => /^RELEASE_NOTES_(\d+\.\d+\.\d+)\.txt$/.exec(f))
    .filter(Boolean)
    .sort((a, b) => verKey(b[1]) - verKey(a[1]))
    .slice(0, NOTES_SHOWN)
    .map((m) => parseNotes(fs.readFileSync(path.join(NOTES_DIR, m[0]), 'utf8'), m[1]));
}

function build() {
  const header = fs.readFileSync(path.join(SRC, '_header.html'), 'utf8');
  const footer = fs.readFileSync(path.join(SRC, '_footer.html'), 'utf8');
  const cta = fs.readFileSync(path.join(SRC, '_cta.html'), 'utf8');
  const notes = latestNotes();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.cpSync(SRC, OUT, { recursive: true, filter: (p) => !path.basename(p).startsWith('_') });
  for (const f of fs.readdirSync(OUT).filter((n) => n.endsWith('.html'))) {
    const nav = header.replace(`href="${f}"`, `href="${f}" aria-current="page"`);
    let html = fs.readFileSync(path.join(OUT, f), 'utf8').replace('<!--header-->', nav).replace('<!--footer-->', footer).replace('<!--cta-->', cta);
    if (f === 'novedades.html') html = html.replace('<!--notes-->', renderNotes(notes));
    fs.writeFileSync(path.join(OUT, f), html);
  }
  // The site uses the app's own icons; copied, never duplicated in the repo.
  for (const icon of ['favicon-32.png', 'apple-touch-icon.png']) {
    fs.copyFileSync(path.join(root, 'packages/core/public/icons', icon), path.join(OUT, 'img', icon));
  }
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  console.log(`landing → ${path.relative(root, OUT)} (${notes.length} releases, newest ${notes[0] && notes[0].version})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) build();

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const UPDATE = process.env.UPDATE_GOLDEN === '1';

/** Compare `actual` with the golden file (or rewrite it under UPDATE_GOLDEN=1). */
export function matchGolden(corpus, goldenFile, actual) {
  if (UPDATE || !fs.existsSync(goldenFile)) {
    if (!UPDATE) assert.fail(`missing ${path.relative(corpus, goldenFile)} — run with UPDATE_GOLDEN=1 to create it`);
    fs.writeFileSync(goldenFile, actual);
    return;
  }
  assert.equal(actual, fs.readFileSync(goldenFile, 'utf8'), `${path.relative(corpus, goldenFile)} differs — if intended, run with UPDATE_GOLDEN=1`);
}

/** Visible text of a .docx, one paragraph per line, empty runs of paragraphs collapsed. */
export async function docxText(buf) {
  const raw = await (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');
  // Text boxes are stored twice (DrawingML + a VML fallback): keep one copy.
  const xml = raw.replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '');
  const decode = (s) =>
    s
      .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const paras = xml.split('</w:p>').map((p) =>
    [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)]
      .map((m) => (m[1] !== undefined ? decode(m[1]) : m[0] === '<w:tab/>' ? '\t' : '\n'))
      .join('')
      .trimEnd(),
  );
  return paras.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}


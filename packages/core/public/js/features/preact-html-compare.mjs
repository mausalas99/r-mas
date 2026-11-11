/**
 * Compare Preact SSR output with the string-builder markup it replaced.
 * Preact writes `>` and `'` unescaped in text, empty attrs without `=""`, and no indentation;
 * layout whitespace (a newline between tags) is dropped on both sides. HTML parses the rest the same.
 */
import assert from 'node:assert/strict';

export const normHtml = (s) => s
  .replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/ ([a-z-]+)=""/g, ' $1')
  .replace(/>\s*\n\s*</g, '><')
  .trim();

export function sameHtml(a, b, name) {
  a = normHtml(a); b = normHtml(b);
  if (a === b) return;
  let i = 0; while (a[i] === b[i]) i++;
  assert.fail(`${name} differs at ${i}\nnew: ...${a.slice(Math.max(0, i - 60), i + 120)}\nold: ...${b.slice(Math.max(0, i - 60), i + 120)}`);
}

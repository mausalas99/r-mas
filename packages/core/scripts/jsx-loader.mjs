import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.jsx')) return nextLoad(url, context);
  const source = await readFile(fileURLToPath(url), 'utf8');
  const { code } = await esbuild.transform(source, {
    loader: 'jsx',
    jsx: 'automatic',
    jsxImportSource: 'preact',
    format: 'esm',
    sourcefile: fileURLToPath(url),
  });
  return { format: 'module', source: code, shortCircuit: true };
}

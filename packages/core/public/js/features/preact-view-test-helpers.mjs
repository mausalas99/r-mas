import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

/**
 * Node cannot import .jsx: bundle `source` like the renderer does and import the result.
 * `source` may use JSX and `renderToString` (imported here); it resolves imports next to `metaUrl`.
 */
export async function loadJsx(metaUrl, source) {
  const built = await esbuild.build({
    stdin: {
      contents: `import { renderToString } from 'preact-render-to-string';\n${source}`,
      resolveDir: path.dirname(fileURLToPath(metaUrl)),
      loader: 'jsx',
    },
    bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', jsxImportSource: 'preact',
  });
  return import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
}

/** Render a prop-less component from `./<file>` to an HTML string. */
export async function renderComponent(metaUrl, name, file) {
  const mod = await loadJsx(metaUrl, `import { ${name} } from '${file}';
    export const html = () => renderToString(<${name} />);`);
  return mod.html();
}

/** The settings dropdown partial, to check each accordion section's frame. */
export const settingsDropdownHtml = () =>
  fs.readFileSync(fileURLToPath(new URL('../../partials/modals/settings-dropdown.html', import.meta.url)), 'utf8');

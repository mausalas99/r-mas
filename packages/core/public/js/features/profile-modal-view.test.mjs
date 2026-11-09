import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const dir = path.dirname(fileURLToPath(import.meta.url));

/** Node cannot import .jsx: bundle the component like the renderer does, render it to a string. */
async function render() {
  const built = await esbuild.build({
    stdin: {
      contents: `import { renderToString } from 'preact-render-to-string';
        import { ProfileModal } from './profile-modal-view.jsx';
        export const html = () => renderToString(<ProfileModal />);`,
      resolveDir: dir,
      loader: 'jsx',
    },
    bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', jsxImportSource: 'preact',
  });
  const mod = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
  return mod.html();
}

test('Mi perfil keeps every id and hook other modules read', async () => {
  const html = await render();
  for (const id of ['profile-body', 'profile-nube-session', 'app-mode-sala', 'app-mode-inter', 'settings-default-servicio',
    'default-servicio-warning', 'profile-doctor-pick', 'profile-doctor', 'profile-profesor', 'profile-grado',
    'settings-medico-profesor', 'settings-medico-r4', 'settings-medico-r2', 'settings-medico-r1a', 'settings-medico-r1b']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  for (const hook of ['data-perfil-autosave', 'data-perfil-saved', 'data-perfil-clinical-host', 'data-perfil-sala-host',
    'data-perfil-equipo-host', 'data-perfil-fill-team', 'data-wb-close']) {
    assert.ok(html.includes(hook), hook);
  }
  assert.equal((html.match(/data-onblur="onMedicoTemplateBlur"/g) || []).length, 5);
});

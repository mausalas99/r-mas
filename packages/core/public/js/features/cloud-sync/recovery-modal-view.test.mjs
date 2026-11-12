import test from 'node:test';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';
import OLD from './recovery-modal-view.old.json' with { type: 'json' };

const view = await loadJsx(import.meta.url, `import { RecoveryModal } from './recovery-modal-view.jsx';
  export const modal = (code, title) => renderToString(<RecoveryModal code={code} title={title} />);`);

// Preact writes void tags as <input ...>, where the old string had ` />`; HTML parses both the same.
const same = (got, old, name) => sameHtml(got.replace(/ ?\/>/g, '>'), old.replace(/ ?\/>/g, '>'), name);

test('recovery overlay equals the old string', () => {
  same(view.modal('ABCD-EFGH-1234'), OLD.plain, 'plain');
  same(view.modal('A<B>&"C', 'Código <nuevo> & "listo"'), OLD.titled, 'titled');
});

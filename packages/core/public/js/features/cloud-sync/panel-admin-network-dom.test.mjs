import test from 'node:test';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';
import OLD from './panel-admin-network-dom.old.json' with { type: 'json' };

const view = await loadJsx(import.meta.url, `import { NetworkEmpty, LabsVerifiedCell } from './panel-admin-view.jsx';
  export const empty = () => renderToString(<NetworkEmpty />);
  export const cell = (kind, ago) => renderToString(<LabsVerifiedCell kind={kind} ago={ago} />);`);

test('the empty-filter note equals the old markup', () => sameHtml(view.empty(), OLD.empty_hint, 'empty'));

test('the verified labs cell equals the old markup', () => {
  sameHtml(view.cell('none'), OLD.none, 'none');
  sameHtml(view.cell('ago', '3 días'), OLD.ago, 'ago');
  sameHtml(view.cell('has'), OLD.has, 'has');
});

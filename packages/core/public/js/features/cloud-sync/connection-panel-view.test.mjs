import test from 'node:test';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';
import OLD from './connection-panel-view.old.json' with { type: 'json' };

const view = await loadJsx(import.meta.url, `import { ConnectionFallback } from './connection-panel-view.jsx';
  import { NextStep, EquipoEmbedHost } from './connection-panel-view.jsx';
  export const fallback = (kind) => renderToString(<ConnectionFallback kind={kind} />);
  export const next = () => renderToString(<NextStep />);
  export const host = () => renderToString(<EquipoEmbedHost />);`);

test('fallback cards equal the old HTML', () => {
  sameHtml(view.fallback('local-only'), OLD.fallbackLocal, 'local-only');
  sameHtml(view.fallback('unsupported-sala'), OLD.fallbackUnsupported, 'unsupported');
});

test('next step and Equipo host equal the old HTML', () => {
  sameHtml(view.next(), OLD.nextStep, 'next');
  sameHtml(view.host(), OLD.equipoHost, 'host');
});

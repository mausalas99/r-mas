import test from 'node:test';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { RotationRejoinLead, SalaOptions } from './clinical-rotation-rejoin-view.jsx';
  export const lead = (p) => renderToString(<RotationRejoinLead {...p} />);
  export const options = (p) => renderToString(<SalaOptions {...p} />);`);

// Markup the string templates wrote before the port.
const OLD = createRequire(import.meta.url)('./clinical-rotation-rejoin-view-old-html.json');

test('lead equals the old HTML (R4 and resident, with and without sala)', () => {
  sameHtml(view.lead({ elevated: true, sala: 'Sala <A>' }), OLD.lead.elevatedSala, 'elevatedSala');
  sameHtml(view.lead({ elevated: true, sala: '' }), OLD.lead.elevatedNone, 'elevatedNone');
  sameHtml(view.lead({ elevated: false, sala: 'Sala B & "C"' }), OLD.lead.residentSala, 'residentSala');
  sameHtml(view.lead({ elevated: false, sala: '' }), OLD.lead.residentNone, 'residentNone');
});

test('sala options equal the old HTML (none picked, one picked)', () => {
  sameHtml(view.options({ salas: OLD.salas, current: '' }), OLD.options.none, 'none');
  sameHtml(view.options({ salas: OLD.salas, current: 'Sala B & "C"' }), OLD.options.picked, 'picked');
});

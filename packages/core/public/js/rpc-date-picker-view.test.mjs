import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './features/preact-view-test-helpers.mjs';
import { sameHtml } from './features/preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { DatePopover, CalendarIcon } from './rpc-date-picker-view.jsx';
  const noop = () => {};
  export const pop = (p) => renderToString(<DatePopover {...p} onNav={noop} onPick={noop} onClear={noop} onToday={noop} />);
  export const icon = () => renderToString(<CalendarIcon />);`);

// Markup of the string builders (paint / renderCalendarBody / CALENDAR_SVG) before the port, with `today` fixed.
const OLD = createRequire(import.meta.url)('./rpc-date-picker-view-old-html.json');

test('popover equals the old HTML for every captured month', () => {
  for (const c of OLD.cases) {
    sameHtml(view.pop({ year: c.year, month: c.month, selectedIso: c.selectedIso, today: c.today }), c.html, `${c.year}-${c.month}`);
  }
});

test('calendar icon equals the old SVG', () => {
  // Preact writes <rect></rect> where the old string had <rect/>; same SVG.
  sameHtml(view.icon().replace(/<(rect|line)([^>]*)><\/\1>/g, '<$1$2/>'), OLD.calendarIcon, 'icon');
});

test('selected and today days carry their classes', () => {
  const html = view.pop({ year: 2026, month: 1, selectedIso: '2026-02-14', today: '2026-02-10' });
  assert.match(html, /is-selected[^>]*data-iso="2026-02-14"/);
  assert.match(html, /is-today[^>]*data-iso="2026-02-10"/);
});

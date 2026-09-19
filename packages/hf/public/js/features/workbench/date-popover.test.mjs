import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCalendarGridDays,
  buildDatePopoverHtml,
  buildDatePopoverQuickFilters,
  openDatePopover,
  closeDatePopover,
} from './date-popover.mjs';

describe('buildCalendarGridDays', () => {
  it('returns 42 cells (6 weeks) covering the target month, Monday-first', () => {
    const days = buildCalendarGridDays(new Date(2026, 7, 17)); // Aug 17 2026
    assert.equal(days.length, 42);
    const inMonth = days.filter((d) => d.inMonth);
    assert.equal(inMonth.length, 31); // August has 31 days
    // Aug 1 2026 is a Saturday -> grid should start on Monday July 27.
    assert.equal(days[0].date.getDate(), 27);
    assert.equal(days[0].date.getMonth(), 6);
  });
});

describe('buildDatePopoverQuickFilters', () => {
  it('disables Último pase when there is no last-pase date', () => {
    const filters = buildDatePopoverQuickFilters({});
    const ultimo = filters.find((f) => f.id === 'ultimo-pase');
    assert.equal(ultimo.disabled, true);
  });

  it('enables Último pase and resolves it when a last-pase date is supplied', () => {
    const lastPaseDate = new Date(2026, 7, 10);
    const filters = buildDatePopoverQuickFilters({ lastPaseDate });
    const ultimo = filters.find((f) => f.id === 'ultimo-pase');
    assert.equal(ultimo.disabled, false);
    assert.equal(ultimo.resolve(new Date()), lastPaseDate);
  });
});

describe('buildDatePopoverHtml', () => {
  it('286px popover with the 7-column grid, teal-selected and today-ringed days', () => {
    const today = new Date(2026, 7, 17);
    const selected = new Date(2026, 7, 18);
    const html = buildDatePopoverHtml({
      monthDate: today,
      selectedDate: selected,
      today,
      hasData: () => true,
    });
    assert.match(html, /wb-date-popover"/);
    assert.match(html, /wb-date-popover-day--today/);
    assert.match(html, /wb-date-popover-day--selected/);
  });

  it('marks days with no data as ink-3 and unclickable (disabled, no data-wb-date-day)', () => {
    const today = new Date(2026, 7, 17);
    const html = buildDatePopoverHtml({
      monthDate: today,
      today,
      hasData: (key) => key === '2026-08-17',
    });
    assert.match(html, /data-wb-date-day="2026-08-17"/);
    const day5 = html.match(/<button[^>]*>5<\/button>/)[0];
    assert.match(day5, /wb-date-popover-day--nodata/);
    assert.match(day5, /disabled/);
    assert.doesNotMatch(day5, /data-wb-date-day/);
  });

  it('renders the quick-filter chips and the loaded-range mono text', () => {
    const html = buildDatePopoverHtml({
      monthDate: new Date(2026, 7, 17),
      quickFilters: buildDatePopoverQuickFilters({}),
      loadedRangeLabel: 'mar 18 ago · 14:00',
    });
    assert.match(html, /data-wb-date-quick="hoy">Hoy/);
    assert.match(html, /data-wb-date-quick="ayer">Ayer/);
    assert.match(html, /disabled data-wb-date-quick="ultimo-pase">Último pase/);
    assert.match(html, /data-wb-date-quick="7-dias">7 días/);
    assert.match(html, /wb-date-popover-range">mar 18 ago · 14:00/);
  });

  it('renders the "Días con labs" quick-nav panel when labDays are supplied', () => {
    const html = buildDatePopoverHtml({
      monthDate: new Date(2026, 7, 17),
      selectedDate: new Date(2026, 7, 17),
      labDays: [
        { dayKey: '2026-8-17', label: 'Hoy · 17 ago', meta: '11 alterados' },
        { dayKey: '2026-8-16', label: '16 ago', meta: '9 alterados' },
        { dayKey: '2026-8-14', label: '14 ago', meta: 'sin datos', disabled: true },
      ],
    });
    assert.match(html, /wb-date-popover-labdays-head">Días con labs/);
    assert.match(html, /data-wb-date-labday="2026-8-17"/);
    const activeRow = html.match(/<button[^>]*data-wb-date-labday="2026-8-17"[^>]*>[\s\S]*?<\/button>/)[0];
    assert.match(activeRow, /wb-date-popover-labday--active/);
    assert.match(activeRow, /Hoy · 17 ago/);
    assert.match(activeRow, /11 alterados/);
    const nodataRow = html.match(/<button[^>]*wb-date-popover-labday--nodata[^>]*>[\s\S]*?14 ago[\s\S]*?<\/button>/)[0];
    assert.match(nodataRow, /disabled/);
    assert.doesNotMatch(nodataRow, /data-wb-date-labday/);
  });

  it('omits the "Días con labs" panel entirely when no labDays are supplied', () => {
    const html = buildDatePopoverHtml({ monthDate: new Date(2026, 7, 17) });
    assert.doesNotMatch(html, /wb-date-popover-labdays/);
  });
});

describe('openDatePopover', () => {
  it('mounts anchored below the anchor element and closes on Esc', () => {
    if (typeof document === 'undefined') return;
    const anchor = document.createElement('span');
    anchor.getBoundingClientRect = () => ({ top: 10, bottom: 30, left: 40, right: 100 });
    document.body.appendChild(anchor);

    openDatePopover(anchor, { today: new Date(2026, 7, 17) });
    const popover = document.querySelector('.wb-date-popover');
    assert.ok(popover, 'popover should be in the DOM');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(document.querySelector('.wb-date-popover'), null);
    anchor.remove();
  });

  it('selecting a day calls onSelectDay and closes the popover', () => {
    if (typeof document === 'undefined') return;
    const anchor = document.createElement('span');
    anchor.getBoundingClientRect = () => ({ top: 10, bottom: 30, left: 40, right: 100 });
    document.body.appendChild(anchor);

    let picked = null;
    openDatePopover(anchor, {
      today: new Date(2026, 7, 17),
      onSelectDay: (key) => (picked = key),
    });
    document.querySelector('[data-wb-date-day="2026-08-17"]').click();
    assert.equal(picked, '2026-08-17');
    assert.equal(document.querySelector('.wb-date-popover'), null);
    anchor.remove();
    closeDatePopover();
  });

  it('a quick-filter click resolves the date and closes the popover', () => {
    if (typeof document === 'undefined') return;
    const anchor = document.createElement('span');
    anchor.getBoundingClientRect = () => ({ top: 10, bottom: 30, left: 40, right: 100 });
    document.body.appendChild(anchor);

    let quick = null;
    openDatePopover(anchor, {
      today: new Date(2026, 7, 17),
      quickFilters: buildDatePopoverQuickFilters({}),
      onQuickFilter: (id, resolved) => (quick = { id, resolved }),
    });
    document.querySelector('[data-wb-date-quick="ayer"]').click();
    assert.equal(quick.id, 'ayer');
    assert.equal(quick.resolved.getDate(), 16);
    assert.equal(document.querySelector('.wb-date-popover'), null);
    anchor.remove();
    closeDatePopover();
  });

  it('selecting a "Días con labs" row calls onSelectLabDay and closes the popover', () => {
    if (typeof document === 'undefined') return;
    const anchor = document.createElement('span');
    anchor.getBoundingClientRect = () => ({ top: 10, bottom: 30, left: 40, right: 100 });
    document.body.appendChild(anchor);

    let picked = null;
    openDatePopover(anchor, {
      today: new Date(2026, 7, 17),
      labDays: [{ dayKey: '2026-8-16', label: '16 ago', meta: '9 alterados' }],
      onSelectLabDay: (key) => (picked = key),
    });
    document.querySelector('[data-wb-date-labday="2026-8-16"]').click();
    assert.equal(picked, '2026-8-16');
    assert.equal(document.querySelector('.wb-date-popover'), null);
    anchor.remove();
    closeDatePopover();
  });
});

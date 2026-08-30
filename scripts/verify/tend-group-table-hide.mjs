/**
 * Reproduce: Tendencias group table hide checkbox under event tags.
 * Usage: node scripts/verify/screenshot.mjs /tmp/tend-hide.png --eval=scripts/verify/tend-group-table-hide.mjs --wait=2000
 */
import { setupDemo, clickTopTab } from './goto-demo.mjs';

export default async function (page) {
  await setupDemo(page);
  await clickTopTab(page, 'Laboratorio');
  await page.waitForTimeout(800);

  const probe = await page.evaluate(async () => {
    const out = { steps: [] };
    const log = (k, v) => {
      out.steps.push({ [k]: v });
    };

    // Prefer calling the public opener if present.
    if (typeof window.openTendGroupModal === 'function') {
      window.openTendGroupModal('BH');
      log('openedVia', 'window.openTendGroupModal');
    } else {
      const btn = document.querySelector('[data-section-key="BH"] .tend-section-chart-btn, button.tend-section-chart-btn');
      if (btn) {
        btn.click();
        log('openedVia', 'chart-btn');
      } else {
        log('openedVia', 'missing');
        out.error = 'no openTendGroupModal / chart button';
        return out;
      }
    }

    await new Promise((r) => setTimeout(r, 600));
    if (typeof window.setTendGroupTab === 'function') window.setTendGroupTab('table');
    else {
      const tab = document.querySelector('#tend-group-backdrop .tend-group-tab[data-tab="table"]');
      if (tab) tab.click();
    }
    await new Promise((r) => setTimeout(r, 400));

    const wrap = document.getElementById('tend-group-table-wrap');
    const table = document.getElementById('tend-group-table');
    out.wrapExists = !!wrap;
    out.tableExists = !!table;
    if (!table) return out;

    // Seed an eventualidad on the first visible column's day so tags appear.
    const firstToggle = table.querySelector('thead input[data-col-key]');
    out.firstColKey = firstToggle && firstToggle.getAttribute('data-col-key');
    out.colToggleCount = table.querySelectorAll('thead input[data-col-key]').length;
    out.tagCountBefore = table.querySelectorAll('.tend-event-tag').length;

    // Find a column that already has tags, else inject markers into DOM for hit-test.
    let taggedTh = null;
    table.querySelectorAll('thead th').forEach((th) => {
      if (th.querySelector('.tend-event-col-tags') && !taggedTh) taggedTh = th;
    });
    out.hasTaggedTh = !!taggedTh;

    if (!taggedTh) {
      // Force-inject tags on first date th to test hit-testing regardless of patient events.
      const th = table.querySelector('thead th:nth-child(2)');
      if (th) {
        const head = th.querySelector('.tend-group-col-head') || th;
        const tags = document.createElement('div');
        tags.className = 'tend-event-col-tags';
        tags.innerHTML =
          '<span class="tend-event-tag tend-event-tag--transfusion">1 CE</span>' +
          '<span class="tend-event-tag tend-event-tag--transfusion">2 Plas</span>';
        head.insertBefore(tags, head.firstChild);
        taggedTh = th;
        out.injectedTags = true;
      }
    }

    const inp = taggedTh && taggedTh.querySelector('input[data-col-key]');
    out.targetColKey = inp && inp.getAttribute('data-col-key');
    out.checkedBefore = !!(inp && inp.checked);

    if (!inp) {
      out.error = 'no input in tagged th';
      return out;
    }

    const rect = inp.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    out.inputRect = { x: cx, y: cy, w: rect.width, h: rect.height };

    const stack = [];
    let el = document.elementFromPoint(cx, cy);
    let i = 0;
    while (el && i < 8) {
      const pe = getComputedStyle(el).pointerEvents;
      stack.push({
        tag: el.tagName,
        cls: String(el.className || '').slice(0, 80),
        pe,
        id: el.id || '',
      });
      // pierce through by temporarily disabling
      const prev = el.style.pointerEvents;
      el.style.pointerEvents = 'none';
      const next = document.elementFromPoint(cx, cy);
      el.style.pointerEvents = prev;
      if (!next || next === el) break;
      el = next;
      i++;
    }
    out.hitStack = stack;

    const tagPe = [];
    taggedTh.querySelectorAll('.tend-event-col-tags, .tend-event-col-tags *').forEach((node) => {
      tagPe.push({
        cls: String(node.className || node.tagName).slice(0, 60),
        pe: getComputedStyle(node).pointerEvents,
      });
    });
    out.tagPointerEvents = tagPe;

    const togglePe = inp.closest('label') && getComputedStyle(inp.closest('label')).pointerEvents;
    const headPe = taggedTh.querySelector('.tend-group-col-head')
      ? getComputedStyle(taggedTh.querySelector('.tend-group-col-head')).pointerEvents
      : null;
    out.togglePointerEvents = togglePe;
    out.headPointerEvents = headPe;
    out.hiddenStorageBefore = localStorage.getItem('rpc-tend-group-table-hidden');

    return out;
  });

  // Real pointer click via CDP — a JS-level inp.click() bypasses hit-testing and
  // proves nothing about whether a real mouse click reaches the checkbox.
  if (probe.inputRect) {
    await page.mouse.click(probe.inputRect.x, probe.inputRect.y);
  }
  await page.waitForTimeout(300);

  const after = await page.evaluate((targetColKey) => {
    const afterInp = document.querySelector(
      '#tend-group-table input[data-col-key="' + CSS.escape(targetColKey) + '"]'
    );
    return {
      inputStillInDom: !!afterInp,
      inputCheckedAfterRender: afterInp ? afterInp.checked : null,
      thHiddenClass: afterInp ? afterInp.closest('th')?.classList.contains('is-hidden') : null,
      hiddenBarText: document.querySelector('.tend-group-hidden-label')?.textContent || null,
      tagCountAfter: document.querySelectorAll('#tend-group-table .tend-event-tag').length,
      hiddenStorageAfter: localStorage.getItem('rpc-tend-group-table-hidden'),
    };
  }, probe.targetColKey);

  console.log(JSON.stringify({ ...probe, ...after }, null, 2));
}

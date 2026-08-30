import { setupDemo, clickTopTab } from './goto-demo.mjs';

export default async function (page) {
  await setupDemo(page);
  await clickTopTab(page, 'Laboratorio');
  await page.waitForTimeout(800);

  const probe = await page.evaluate(async () => {
    const out = {};
    window.openTendGroupModal('BH');
    await new Promise((r) => setTimeout(r, 700));
    window.setTendGroupTab('table');
    await new Promise((r) => setTimeout(r, 400));

    const table = document.getElementById('tend-group-table');
    const style = document.createElement('style');
    style.textContent = `
      #tend-group-table th, #tend-group-table td { max-width: 52px !important; width: 52px !important; padding: 4px !important; }
      .tend-group-col-head { overflow: visible !important; }
    `;
    document.head.appendChild(style);

    const th = table.querySelector('thead th:nth-child(2)');
    const head = th.querySelector('.tend-group-col-head');
    const tags = document.createElement('div');
    tags.className = 'tend-event-col-tags';
    tags.innerHTML =
      '<span class="tend-event-tag tend-event-tag--transfusion">1 CE</span>' +
      '<span class="tend-event-tag tend-event-tag--transfusion">2 Plas</span>' +
      '<span class="tend-event-tag">Transf</span>';
    head.insertBefore(tags, head.firstChild);

    const inp = th.querySelector('input[data-col-key]');
    const key = inp.getAttribute('data-col-key');
    const ir = inp.getBoundingClientRect();
    const tr = tags.getBoundingClientRect();
    out.overlap = !(tr.bottom < ir.top || tr.top > ir.bottom || tr.right < ir.left || tr.left > ir.right);
    out.tagBottom = tr.bottom;
    out.inputTop = ir.top;
    out.inputCenter = { x: ir.left + ir.width / 2, y: ir.top + ir.height / 2 };
    out.cssOverflowForced = getComputedStyle(head).overflow;
    out.tagPe = [...head.querySelectorAll('.tend-event-col-tags, .tend-event-tag')].map((n) =>
      getComputedStyle(n).pointerEvents
    );

    const coverEl = document.elementFromPoint(out.inputCenter.x, out.inputCenter.y);
    out.coverAtInput = coverEl && {
      tag: coverEl.tagName,
      cls: String(coverEl.className).slice(0, 80),
      pe: getComputedStyle(coverEl).pointerEvents,
    };
    out.key = key;

    return out;
  });

  // Real pointer click via CDP — coverEl.click() is still a JS-level dispatch,
  // not a real mouse event, so it can't prove a real click reaches the checkbox.
  await page.mouse.click(probe.inputCenter.x, probe.inputCenter.y);
  await page.waitForTimeout(350);

  const after = await page.evaluate((key) => {
    const el = document.querySelector(`#tend-group-table input[data-col-key="${CSS.escape(key)}"]`);
    return {
      checked: el?.checked ?? null,
      thHidden: el?.closest('th')?.classList.contains('is-hidden') ?? null,
      bar: document.querySelector('.tend-group-hidden-label')?.textContent || null,
    };
  }, probe.key);

  console.log(JSON.stringify({ ...probe, after }, null, 2));
}

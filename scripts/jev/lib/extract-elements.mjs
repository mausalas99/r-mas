// PHI guard: only allowlisted action controls go in — never input/select/textarea/
// generic [role] or [tabindex], since those can hold patient data (a name field, a
// table row, free text). Never read el.value except on fixed-label inputs
// (button/submit/checkbox/radio), where the value is a static UI label, not data.
const EXTRACT_JS = `(() => {
  const sel = [
    'button', 'a[href]', 'summary',
    '[role="button"]', '[role="link"]', '[role="menuitem"]', '[role="tab"]',
    '[role="switch"]', '[role="checkbox"]', '[role="option"]',
    'input[type="button"]', 'input[type="submit"]', 'input[type="checkbox"]', 'input[type="radio"]'
  ].join(', ');
  const staticValue = new Set(['button', 'submit', 'checkbox', 'radio']);
  const seen = new Set();
  const out = [];
  document.querySelectorAll(sel).forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    const value = el.tagName === 'INPUT' && staticValue.has(el.type) ? el.value : '';
    const text = (el.innerText || value || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 120);
    const role = el.getAttribute('role') || el.tagName.toLowerCase();
    const key = Math.round(r.x)+','+Math.round(r.y)+','+Math.round(r.width)+','+Math.round(r.height);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({role, title: text || null, frame: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]});
  });
  return JSON.stringify(out);
})()`;

export async function extractElements(cdp) {
  const raw = await cdp.evaluate(EXTRACT_JS);
  const list = JSON.parse(raw);
  return Object.fromEntries(list.map((el, i) => [i, el]));
}

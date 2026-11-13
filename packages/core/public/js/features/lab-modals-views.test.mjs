import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

// Old string builders (deleted from the modules) kept as the oracle; synthetic data only.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const v = await loadJsx(import.meta.url, `
  import { BatchCopyModal } from './lab-history-batch-copy-view.jsx';
  import { LabConsolidateModal } from './lab-panel-history-consolidate-view.jsx';
  import { LabConflictModal } from './lab-conflict-modal-view.jsx';
  import { AguaInyModal } from './agua-inyectable-review-view.jsx';
  export const batch = (groups) => renderToString(<BatchCopyModal groups={groups} />);
  export const consolidate = (candidates, groups) => renderToString(<LabConsolidateModal candidates={candidates} groups={groups} />);
  export const conflict = (d) => renderToString(<LabConflictModal existingDate={d} />);
  export const agua = (alerts) => renderToString(<AguaInyModal alerts={alerts} />);`);

// Preact closes empty svg tags and escapes ' and quotes in text; HTML parses both the same.
const norm = (s) => s
  .replace(/<(polyline|line)([^>]*?)\s*\/>/g, '<$1$2></$1>')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/ ?\/>/g, '>')
  .replace(/ (value|placeholder)=""/g, '').replace(/ value(?=[ >])/g, '')
  .replace(/style="([^"]*)"/g, (_m, x) => 'style="' + x.replace(/:\s+/g, ':').replace(/;\s*$/, '') + '"');

// Same markup, or fail with the spot where they first differ.
function same(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  assert.ok(a === b, 'differs at ' + i + '\n new: ' + a.slice(Math.max(0, i - 50), i + 90) + '\n old: ' + b.slice(Math.max(0, i - 50), i + 90));
}

// ---- batch copy
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function oldBatch(groups) {
  const list = groups.map((group) => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(group.dayKey);
    const parts = m
      ? { date: ('0' + m[3]).slice(-2) + '/' + ('0' + m[2]).slice(-2), weekday: WEEKDAYS[new Date(+m[1], +m[2] - 1, +m[3]).getDay()] }
      : { date: group.label, weekday: '' };
    const n = group.sets.length;
    return '<label class="lab-copydays-row"><input type="checkbox" class="lab-batch-copy-cb" data-day-key="' + esc(group.dayKey) + '" data-sends="' + n + '" />' +
      '<span class="lab-copydays-box" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' +
      '<span class="lab-copydays-date">' + esc(parts.date) + '</span><span class="lab-copydays-wd">' + esc(parts.weekday) + '</span><span class="lab-copydays-sends">' + (n > 1 ? n + ' envíos' : '') + '</span></label>';
  }).join('');
  return '<div class="lab-conflict-modal lab-copydays" role="dialog" aria-modal="true" aria-labelledby="lab-batch-copy-title"><div class="lab-copydays-head"><h3 id="lab-batch-copy-title">Copiar varios días</h3>' +
    '<button type="button" id="lab-batch-copy-close" class="lab-copydays-close" aria-label="Cerrar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button></div>' +
    '<p class="lab-copydays-sub">Marca los días. Se copia el bloque Estudios de cada día, con laboratorio y cultivos.</p><div class="lab-copydays-chips">' +
    '<button type="button" class="lab-copydays-chip" data-pick="3">Últimos 3</button><button type="button" class="lab-copydays-chip" data-pick="7">Últimos 7</button><button type="button" class="lab-copydays-chip" data-pick="all">Todos</button><button type="button" class="lab-copydays-chip" data-pick="none">Ninguno</button></div>' +
    '<div class="lab-copydays-list">' + list + '</div><div class="lab-copydays-h">Vista previa</div>' +
    '<textarea id="lab-batch-copy-preview" class="lab-copydays-preview" readonly rows="4" aria-label="Vista previa"></textarea>' +
    '<div class="lab-copydays-foot"><span id="lab-batch-copy-count" class="lab-copydays-count" aria-live="polite"></span><button type="button" id="lab-batch-copy-ok" class="wb-btn wb-btn-primary" disabled aria-disabled="true">Copiar al portapapeles</button></div></div>';
}
test('Copiar varios días HTML equals the old builder', () => {
  const groups = [
    { dayKey: '2026-11-9', label: '9 nov', sets: [{}, {}] },
    { dayKey: '2026-11-8', label: '8 nov', sets: [{}] },
    { dayKey: 'raro <x>', label: 'Sin fecha', sets: [{}] },
  ];
  same(norm(v.batch(groups)), norm(oldBatch(groups)));
});

// ---- consolidate
const BTN = 'background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);';
function oldConsolidate(candidates, groups) {
  const used = {};
  groups.forEach((g) => g.setIds.forEach((id) => { used[String(id)] = true; }));
  const byId = {};
  candidates.forEach((c) => { byId[String(c.id)] = c; });
  const byDay = {};
  candidates.forEach((c) => { (byDay[c.dayKey || 'unknown'] = byDay[c.dayKey || 'unknown'] || []).push(c); });
  const days = Object.keys(byDay).sort((a, b) => String(b).localeCompare(String(a))).map((dk) => ({ dayKey: dk, dayLabel: byDay[dk][0].dayLabel || dk, sets: byDay[dk] }));
  const row = (c) => {
    const sid = String(c.id); const taken = !!used[sid];
    return '<label class="lab-consolidate-set-row' + (taken ? ' lab-consolidate-set-row--taken' : '') + '" style="display:flex;gap:10px;align-items:flex-start;margin:6px 0;padding:8px 10px;border:1px solid var(--border);border-radius:8px;cursor:' + (taken ? 'default' : 'pointer') + ';background:var(--surface);opacity:' + (taken ? '0.55' : '1') + ';">' +
      '<input type="checkbox" class="lab-consolidate-set-cb" data-sid="' + esc(sid) + '"' + (taken ? ' disabled' : '') + ' style="margin-top:3px;flex-shrink:0;" />' +
      '<span style="font-size:13px;line-height:1.4;"><strong>' + esc(c.label || sid) + '</strong>' +
      (c.sections ? '<br><span style="color:var(--text-muted);font-size:12px;">' + esc(c.sections) + '</span>' : '') +
      (taken ? '<br><span style="color:var(--text-muted);font-size:11px;">Ya está en un grupo</span>' : '') + '</span></label>';
  };
  const dayHtml = days.map((d) => '<div class="lab-consolidate-day" style="margin:0 0 14px;"><p style="margin:0 0 6px;font-size:12px;font-weight:600;color:var(--text-muted);">' + esc(d.dayLabel || d.dayKey) + '</p>' + d.sets.map(row).join('') + '</div>').join('');
  const groupsHtml = groups.length
    ? groups.map((g, i) => '<div class="lab-consolidate-group-card" data-gi="' + i + '" style="display:flex;gap:8px;align-items:flex-start;justify-content:space-between;margin:6px 0;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);"><span style="font-size:13px;line-height:1.4;"><strong>Grupo ' + (i + 1) + '</strong><br><span style="color:var(--text-muted);font-size:12px;">' + esc(g.setIds.map((id) => (byId[String(id)] ? byId[String(id)].label : String(id))).join(' + ')) + '</span></span><button type="button" class="lab-consolidate-group-remove" data-gi="' + i + '" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);flex-shrink:0;">Quitar</button></div>').join('')
    : '<p style="margin:0;font-size:12px;color:var(--text-muted);">Ningún grupo aún. Marca ≥2 conjuntos del mismo día y pulsa «Añadir grupo».</p>';
  const body = '<div style="margin:0 0 12px;"><p style="margin:0 0 8px;font-size:12px;font-weight:600;color:var(--text-muted);">Conjuntos</p>' + dayHtml + '</div>' +
    '<div style="margin:0 0 4px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><button type="button" id="lab-consolidate-add-group" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:7px 12px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Añadir grupo</button><span id="lab-consolidate-hint" style="font-size:12px;color:var(--text-muted);"></span></div>' +
    '<div style="margin:14px 0 0;"><p style="margin:0 0 8px;font-size:12px;font-weight:600;color:var(--text-muted);">Grupos a fusionar</p><div id="lab-consolidate-groups">' + groupsHtml + '</div></div>';
  return '<div class="lab-conflict-modal" style="max-width:560px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;"><h3 style="margin:0 0 8px;">Consolidar historial</h3>' +
    '<p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Elige qué conjuntos unir. Arma uno o más grupos (mismo día; no mezcles labs con cultivos). Solo se fusionan los grupos que crees.</p>' +
    '<div id="lab-consolidate-body" style="overflow-y:auto;flex:1;min-height:0;padding-right:4px;">' + body + '</div>' +
    '<div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;"><button type="button" id="lab-consolidate-cancel" style="' + BTN + '">Cancelar</button>' +
    '<button type="button" id="lab-consolidate-ok" disabled style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;">Consolidar</button></div></div>';
}
const CANDS = [
  { id: 'a1', label: 'Labs 08:00', dayKey: '2026-11-9', dayLabel: '9 nov', sections: 'BH, QS' },
  { id: 'a2', label: 'Labs 14:00 <x>', dayKey: '2026-11-9', dayLabel: '9 nov', sections: '' },
  { id: 'b1', label: 'Cultivo', dayKey: '2026-11-8', dayLabel: '8 nov', sections: 'Urocultivo' },
];
for (const [name, groups] of [['no groups', []], ['one group', [{ setIds: ['a1', 'a2'] }]]]) {
  test(`Consolidar historial HTML equals the old builder: ${name}`, () => {
    same(norm(v.consolidate(CANDS, groups)), norm(oldConsolidate(CANDS, groups)));
  });
}

// ---- conflict modal (the one-line builder, copied)
test('Conflicto de labs HTML equals the old builder', () => {
  const old = '<div class="lab-conflict-modal"><h3>Los estudios ya tienen datos</h3><p>El bloque reciente ya tiene labs del <strong>' + esc('09/11 08:00') + '</strong>. ¿Qué hago con los nuevos labs?</p><div class="lab-conflict-actions">' +
    '<button class="wb-btn wb-btn-primary wb-btn-block" id="btn-conflict-move">Mover anterior + agregar reciente<br><span class="conflict-hint">Los labs actuales pasan al bloque anterior y los nuevos quedan como recientes</span></button>' +
    '<button class="wb-btn wb-btn-secondary wb-btn-block" id="btn-conflict-replace">Reemplazar fecha reciente<br><span class="conflict-hint">Los labs actuales se borran, se escriben los nuevos</span></button>' +
    '<button class="wb-btn wb-btn-ghost" id="btn-conflict-cancel">Cancelar</button></div></div>';
  same(norm(v.conflict('09/11 08:00')), norm(old));
});

// ---- agua inyectable
const VIAS = ['VIA ORAL', 'VIA SUBCUTANEA', 'VIA INTRAVENOSA', 'VIA INTRAMUSCULAR', 'VIA SUBLINGUAL', 'VIA TOPICA', 'VIA RECTAL'];
function oldAgua(alerts) {
  const sentence = (t) => { const s = String(t || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
  const opts = (sel) => (sel && VIAS.indexOf(sel) === -1 ? [sel].concat(VIAS) : VIAS).map((x) => '<option value="' + esc(x) + '"' + (x === sel ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  const row = (a, i) => {
    const via = a.viaRaw || a.item.viaRaw; const id = 'agua-iny-name-' + i;
    return '<li class="wb-row agua-iny-row" data-row="' + i + '"><label class="rpc-switch"><input type="checkbox" class="rpc-switch-input" role="switch" data-f="add" checked aria-labelledby="' + id + '">' +
      '<span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label>' +
      '<input class="agua-iny-in agua-iny-in--name" id="' + id + '" data-f="nombre" aria-label="Medicamento" value="' + esc(a.farmaco) + '">' +
      '<input class="agua-iny-in agua-iny-in--dose" data-f="dosis" aria-label="Dosis" placeholder="Falta dosis" value="' + esc(a.dosis) + '">' +
      '<select class="agua-iny-in" data-f="via" aria-label="Vía">' + opts(via) + '</select><p class="agua-iny-some">SOME: ' + esc(sentence(a.texto)) + '</p></li>';
  };
  return '<div class="wb-confirm-modal agua-iny-modal" role="dialog" aria-modal="true" aria-labelledby="agua-iny-title"><div class="wb-confirm-body"><span class="wb-confirm-title" id="agua-iny-title">Medicamentos dentro de agua inyectable</span>' +
    '<span class="wb-confirm-message">SOME no los tiene en catálogo. Revisa nombre, dosis y vía de cada uno.</span></div><div class="agua-iny-table">' +
    '<div class="wb-table-colhead agua-iny-grid" aria-hidden="true"><span>Agregar</span><span>Medicamento</span><span>Dosis</span><span>Vía</span></div>' +
    '<ul class="agua-iny-list">' + alerts.map(row).join('') + '</ul></div><div class="wb-confirm-footer wb-confirm-footer--rail"><span class="agua-iny-count" data-count></span>' +
    '<div class="wb-confirm-footer-actions"><button type="button" class="wb-btn wb-btn-secondary" data-cancel>Omitir todos</button><button type="button" class="wb-btn wb-btn-primary" data-save>Agregar</button></div></div></div>';
}
test('Agua inyectable HTML equals the old builder', () => {
  const alerts = [
    { farmaco: 'FARMACOX', dosis: '5 MG', viaRaw: 'VIA ORAL', texto: 'FARMACOX 5 MG AGUA INYECTABLE', item: {} },
    { farmaco: '', dosis: '', viaRaw: '', texto: 'OTRO <b>', item: { viaRaw: 'VIA RARA' } },
  ];
  same(norm(v.agua(alerts)), norm(oldAgua(alerts)));
});

import { esc } from '../dom-escape.mjs';
import { notes, saveState } from '../app-state.mjs';
import { labPanelBridge } from './lab-panel-bridge.mjs';
import { rt } from './lab-panel-runtime-state.mjs';

function tipoLabel(tipo) {
  if (tipo === 'cultivo') return 'Cultivo';
  if (tipo === 'gaso') return 'Gasometría';
  return 'Labs';
}

function groupSetsByDay(candidates) {
  var byDay = Object.create(null);
  (candidates || []).forEach(function (c) {
    var dk = c.dayKey || 'unknown';
    if (!byDay[dk]) byDay[dk] = [];
    byDay[dk].push(c);
  });
  return Object.keys(byDay)
    .sort(function (a, b) {
      return String(b).localeCompare(String(a));
    })
    .map(function (dk) {
      return { dayKey: dk, dayLabel: byDay[dk][0].dayLabel || dk, sets: byDay[dk] };
    });
}

function assignedSetIds(groups) {
  var used = Object.create(null);
  (groups || []).forEach(function (g) {
    (g.setIds || []).forEach(function (id) {
      used[String(id)] = true;
    });
  });
  return used;
}

function renderSetRow(c, used) {
  var sid = String(c.id);
  var taken = !!used[sid];
  return (
    '<label class="lab-consolidate-set-row' +
    (taken ? ' lab-consolidate-set-row--taken' : '') +
    '" style="display:flex;gap:10px;align-items:flex-start;margin:6px 0;padding:8px 10px;border:1px solid var(--border);border-radius:8px;cursor:' +
    (taken ? 'default' : 'pointer') +
    ';background:var(--surface);opacity:' +
    (taken ? '0.55' : '1') +
    ';">' +
    '<input type="checkbox" class="lab-consolidate-set-cb" data-sid="' +
    esc(sid) +
    '"' +
    (taken ? ' disabled' : '') +
    ' style="margin-top:3px;flex-shrink:0;" />' +
    '<span style="font-size:13px;line-height:1.4;">' +
    '<strong>' +
    esc(c.label || sid) +
    '</strong>' +
    (c.sections
      ? '<br><span style="color:var(--text-muted);font-size:12px;">' + esc(c.sections) + '</span>'
      : '') +
    (taken
      ? '<br><span style="color:var(--text-muted);font-size:11px;">Ya está en un grupo</span>'
      : '') +
    '</span></label>'
  );
}

function renderDayBlock(day, used) {
  return (
    '<div class="lab-consolidate-day" style="margin:0 0 14px;">' +
    '<p style="margin:0 0 6px;font-size:12px;font-weight:600;color:var(--text-muted);">' +
    esc(day.dayLabel || day.dayKey) +
    '</p>' +
    day.sets.map(function (c) {
      return renderSetRow(c, used);
    }).join('') +
    '</div>'
  );
}

function renderGroupCard(group, idx, candidatesById) {
  var labels = (group.setIds || [])
    .map(function (id) {
      var c = candidatesById[String(id)];
      return c ? c.label : String(id);
    })
    .join(' + ');
  return (
    '<div class="lab-consolidate-group-card" data-gi="' +
    esc(String(idx)) +
    '" style="display:flex;gap:8px;align-items:flex-start;justify-content:space-between;margin:6px 0;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);">' +
    '<span style="font-size:13px;line-height:1.4;">' +
    '<strong>Grupo ' +
    esc(String(idx + 1)) +
    '</strong><br>' +
    '<span style="color:var(--text-muted);font-size:12px;">' +
    esc(labels) +
    '</span></span>' +
    '<button type="button" class="lab-consolidate-group-remove" data-gi="' +
    esc(String(idx)) +
    '" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);flex-shrink:0;">Quitar</button>' +
    '</div>'
  );
}

function renderBodyHtml(candidates, groups) {
  var used = assignedSetIds(groups);
  var byId = Object.create(null);
  (candidates || []).forEach(function (c) {
    byId[String(c.id)] = c;
  });
  var days = groupSetsByDay(candidates);
  var setsHtml = days.map(function (d) {
    return renderDayBlock(d, used);
  }).join('');
  var groupsHtml =
    groups.length > 0
      ? groups
          .map(function (g, i) {
            return renderGroupCard(g, i, byId);
          })
          .join('')
      : '<p style="margin:0;font-size:12px;color:var(--text-muted);">Ningún grupo aún. Marca ≥2 conjuntos del mismo día y pulsa «Añadir grupo».</p>';
  return (
    '<div style="margin:0 0 12px;">' +
    '<p style="margin:0 0 8px;font-size:12px;font-weight:600;color:var(--text-muted);">Conjuntos</p>' +
    setsHtml +
    '</div>' +
    '<div style="margin:0 0 4px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
    '<button type="button" id="lab-consolidate-add-group" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:7px 12px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Añadir grupo</button>' +
    '<span id="lab-consolidate-hint" style="font-size:12px;color:var(--text-muted);"></span>' +
    '</div>' +
    '<div style="margin:14px 0 0;">' +
    '<p style="margin:0 0 8px;font-size:12px;font-weight:600;color:var(--text-muted);">Grupos a fusionar</p>' +
    '<div id="lab-consolidate-groups">' +
    groupsHtml +
    '</div></div>'
  );
}

/**
 * @param {{ candidates: object[] }} opts
 *   candidates: { id, label, dayKey, dayLabel, tipo, sections }[]
 */
export function buildLabConsolidateModalHtml(opts) {
  var candidates = opts.candidates || [];
  return (
    '<div class="lab-conflict-modal" style="max-width:560px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;">' +
    '<h3 style="margin:0 0 8px;">Consolidar historial</h3>' +
    '<p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Elige qué conjuntos unir. Arma uno o más grupos (mismo día; no mezcles labs con cultivos). Solo se fusionan los grupos que crees.</p>' +
    '<div id="lab-consolidate-body" style="overflow-y:auto;flex:1;min-height:0;padding-right:4px;">' +
    renderBodyHtml(candidates, []) +
    '</div>' +
    '<div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;">' +
    '<button type="button" id="lab-consolidate-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button>' +
    '<button type="button" id="lab-consolidate-ok" disabled style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;">Consolidar</button>' +
    '</div></div>'
  );
}

function selectedSetIds(backdrop) {
  var ids = [];
  backdrop.querySelectorAll('.lab-consolidate-set-cb:checked:not(:disabled)').forEach(function (cb) {
    var sid = cb.getAttribute('data-sid');
    if (sid) ids.push(sid);
  });
  return ids;
}

function setOkEnabled(backdrop, groups) {
  var ok = document.getElementById('lab-consolidate-ok');
  if (!ok) return;
  var enabled = groups.length > 0;
  ok.disabled = !enabled;
  ok.style.opacity = enabled ? '1' : '0.55';
  ok.style.cursor = enabled ? 'pointer' : 'not-allowed';
}

function setHint(msg, isError) {
  var el = document.getElementById('lab-consolidate-hint');
  if (!el) return;
  el.textContent = msg || '';
  el.style.color = isError ? '#B91C1C' : 'var(--text-muted)';
}

/**
 * @param {HTMLElement} backdrop
 * @param {{
 *   candidates: object[],
 *   validateGroup: (setIds: string[]) => { ok: boolean, error?: string },
 *   onConfirm: (groups: string[][]) => void
 * }} opts
 */
export function wireLabConsolidateModal(backdrop, opts) {
  var candidates = (opts && opts.candidates) || [];
  var validateGroup =
    opts && typeof opts.validateGroup === 'function'
      ? opts.validateGroup
      : function () {
          return { ok: true };
        };
  var onConfirm = opts && typeof opts.onConfirm === 'function' ? opts.onConfirm : function () {};
  /** @type {{ setIds: string[] }[]} */
  var groups = [];

  function refresh() {
    var body = document.getElementById('lab-consolidate-body');
    if (body) body.innerHTML = renderBodyHtml(candidates, groups);
    setOkEnabled(backdrop, groups);
    setHint('');
    bindDynamic();
  }

  function bindDynamic() {
    var addBtn = document.getElementById('lab-consolidate-add-group');
    if (addBtn) {
      addBtn.onclick = function () {
        var ids = selectedSetIds(backdrop);
        var check = validateGroup(ids);
        if (!check || !check.ok) {
          setHint((check && check.error) || 'Grupo inválido', true);
          return;
        }
        var used = assignedSetIds(groups);
        for (var i = 0; i < ids.length; i++) {
          if (used[ids[i]]) {
            setHint('Ese conjunto ya está en otro grupo', true);
            return;
          }
        }
        groups.push({ setIds: ids.slice() });
        refresh();
      };
    }
    backdrop.querySelectorAll('.lab-consolidate-group-remove').forEach(function (btn) {
      btn.onclick = function () {
        var gi = parseInt(btn.getAttribute('data-gi') || '', 10);
        if (!isFinite(gi) || gi < 0) return;
        groups.splice(gi, 1);
        refresh();
      };
    });
  }

  document.getElementById('lab-consolidate-cancel').onclick = function () {
    backdrop.remove();
  };
  document.getElementById('lab-consolidate-ok').onclick = function () {
    if (!groups.length) return;
    var payload = groups.map(function (g) {
      return g.setIds.slice();
    });
    backdrop.remove();
    onConfirm(payload);
  };

  bindDynamic();
  setOkEnabled(backdrop, groups);
}

export function finishLabConsolidateUi(patientId, mergedCount) {
  saveState({ immediate: true });
  labPanelBridge.renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
  if (el && patientId && notes[patientId]) {
    el.value = notes[patientId].estudios || '';
  }
  if (mergedCount > 0) {
    rt.addAuditEntry('lab-history-consolidate', 'ok', mergedCount, String(patientId));
    rt.showToast('Fusionados ' + mergedCount + ' conjunto(s) ✓', 'success');
  } else {
    rt.showToast('No había conjuntos para fusionar con la selección actual', 'success');
  }
}

export { tipoLabel };

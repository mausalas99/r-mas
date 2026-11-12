/**
 * "Consolidar historial" modal. Preact: same DOM, ids, classes and inline styles the string builders
 * in lab-panel-history-consolidate-modal.mjs made. Redrawn in place after each group change (the old
 * code swapped #lab-consolidate-body); the hint and Consolidar button are edited by the modal's handlers.
 */
import { render } from 'preact';

const BTN = 'background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);';
const LABEL = 'margin:0 0 8px;font-size:12px;font-weight:600;color:var(--text-muted);';

export function groupSetsByDay(candidates) {
  const byDay = Object.create(null);
  (candidates || []).forEach((c) => {
    const dk = c.dayKey || 'unknown';
    (byDay[dk] = byDay[dk] || []).push(c);
  });
  return Object.keys(byDay)
    .sort((a, b) => String(b).localeCompare(String(a)))
    .map((dk) => ({ dayKey: dk, dayLabel: byDay[dk][0].dayLabel || dk, sets: byDay[dk] }));
}

export function assignedSetIds(groups) {
  const used = Object.create(null);
  (groups || []).forEach((g) => (g.setIds || []).forEach((id) => { used[String(id)] = true; }));
  return used;
}

function SetRow({ c, used }) {
  const sid = String(c.id);
  const taken = !!used[sid];
  return (
    <label
      class={'lab-consolidate-set-row' + (taken ? ' lab-consolidate-set-row--taken' : '')}
      style={'display:flex;gap:10px;align-items:flex-start;margin:6px 0;padding:8px 10px;border:1px solid var(--border);border-radius:8px;cursor:' + (taken ? 'default' : 'pointer') + ';background:var(--surface);opacity:' + (taken ? '0.55' : '1') + ';'}
    >
      {/* checked={false}: a redraw reuses the node, the old body swap gave a fresh unchecked one. */}
      <input type="checkbox" class="lab-consolidate-set-cb" data-sid={sid} checked={false} disabled={taken} style="margin-top:3px;flex-shrink:0;" />
      <span style="font-size:13px;line-height:1.4;">
        <strong>{c.label || sid}</strong>
        {c.sections ? <><br /><span style="color:var(--text-muted);font-size:12px;">{c.sections}</span></> : null}
        {taken ? <><br /><span style="color:var(--text-muted);font-size:11px;">Ya está en un grupo</span></> : null}
      </span>
    </label>
  );
}

function GroupCard({ group, idx, byId }) {
  const labels = (group.setIds || []).map((id) => (byId[String(id)] ? byId[String(id)].label : String(id))).join(' + ');
  return (
    <div class="lab-consolidate-group-card" data-gi={String(idx)} style="display:flex;gap:8px;align-items:flex-start;justify-content:space-between;margin:6px 0;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);">
      <span style="font-size:13px;line-height:1.4;">
        <strong>{'Grupo ' + (idx + 1)}</strong><br />
        <span style="color:var(--text-muted);font-size:12px;">{labels}</span>
      </span>
      <button type="button" class="lab-consolidate-group-remove" data-gi={String(idx)} style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);flex-shrink:0;">Quitar</button>
    </div>
  );
}

function Body({ candidates, groups }) {
  const used = assignedSetIds(groups);
  const byId = Object.create(null);
  candidates.forEach((c) => { byId[String(c.id)] = c; });
  return (
    <>
      <div style="margin:0 0 12px;">
        <p style={LABEL}>Conjuntos</p>
        {groupSetsByDay(candidates).map((day) => (
          <div class="lab-consolidate-day" style="margin:0 0 14px;">
            <p style={LABEL.replace('0 0 8px', '0 0 6px')}>{day.dayLabel || day.dayKey}</p>
            {day.sets.map((c) => <SetRow c={c} used={used} />)}
          </div>
        ))}
      </div>
      <div style="margin:0 0 4px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button type="button" id="lab-consolidate-add-group" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:7px 12px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Añadir grupo</button>
        <span id="lab-consolidate-hint" style="font-size:12px;color:var(--text-muted);"></span>
      </div>
      <div style="margin:14px 0 0;">
        <p style={LABEL}>Grupos a fusionar</p>
        <div id="lab-consolidate-groups">
          {groups.length > 0
            ? groups.map((g, i) => <GroupCard group={g} idx={i} byId={byId} />)
            : <p style="margin:0;font-size:12px;color:var(--text-muted);">Ningún grupo aún. Marca ≥2 conjuntos del mismo día y pulsa «Añadir grupo».</p>}
        </div>
      </div>
    </>
  );
}

export function LabConsolidateModal({ candidates = [], groups = [] }) {
  return (
    <div class="lab-conflict-modal" style="max-width:560px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;">
      <h3 style="margin:0 0 8px;">Consolidar historial</h3>
      <p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Elige qué conjuntos unir. Arma uno o más grupos (mismo día; no mezcles labs con cultivos). Solo se fusionan los grupos que crees.</p>
      <div id="lab-consolidate-body" style="overflow-y:auto;flex:1;min-height:0;padding-right:4px;">
        <Body candidates={candidates} groups={groups} />
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;">
        <button type="button" id="lab-consolidate-cancel" style={BTN}>Cancelar</button>
        <button type="button" id="lab-consolidate-ok" disabled style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;">Consolidar</button>
      </div>
    </div>
  );
}

export function drawLabConsolidateModal(backdrop, candidates, groups) {
  render(<LabConsolidateModal candidates={candidates} groups={groups} />, backdrop);
}

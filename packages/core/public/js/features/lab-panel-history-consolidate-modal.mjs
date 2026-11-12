import { getNotes, persistClinicalState } from '../app-state.mjs';
import { labPanelBridge } from './lab-panel-bridge.mjs';
import { rt } from './lab-panel-runtime-state.mjs';
import { runLabConsolidateUiRefresh } from './lab-panel-history-consolidate-refresh.mjs';

function tipoLabel(tipo) {
  if (tipo === 'cultivo') return 'Cultivo';
  if (tipo === 'gaso') return 'Gasometría';
  return 'Labs';
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
 * Lazy-loads the Preact view, draws it into `backdrop` (already in the document), then wires it.
 * @param {HTMLElement} backdrop
 * @param {{
 *   candidates: object[],
 *   validateGroup: (setIds: string[]) => { ok: boolean, error?: string },
 *   onConfirm: (groups: string[][]) => void
 * }} opts
 */
export async function mountLabConsolidateModal(backdrop, opts) {
  var view = await import('./lab-panel-history-consolidate-view.jsx');
  var assignedSetIds = view.assignedSetIds;
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
  view.drawLabConsolidateModal(backdrop, candidates, groups);

  function refresh() {
    view.drawLabConsolidateModal(backdrop, candidates, groups);
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

export function finishLabConsolidateUi(patientId, mergedCount, opts) {
  runLabConsolidateUiRefresh(
    {
      persistClinicalState: persistClinicalState,
      setActiveLab: function (v) {
        labPanelBridge.setActiveLab(v);
      },
      renderLabHistoryPanel: function () {
        labPanelBridge.renderLabHistoryPanel();
      },
      refreshTendenciasOrCultivosPanel: function () {
        rt.refreshTendenciasOrCultivosPanel();
      },
      syncEstudiosTextarea: function (pid) {
        var el = document.querySelector('#note-form textarea[data-oninput-args*=\'"estudios"\']');
        if (el && pid && getNotes()[pid]) {
          el.value = getNotes()[pid].estudios || '';
        }
      },
      addAuditEntry: function (action, status, n, detail) {
        rt.addAuditEntry(action, status, n, detail);
      },
      showToast: function (msg, kind) {
        rt.showToast(msg, kind);
      },
    },
    patientId,
    mergedCount,
    opts
  );
}

export { tipoLabel };

import {
  renderSomeReportTablesHtml,
  wireSomeTableExportButtons,
} from '../labs-some-table.mjs';
import { isCasiopeaTourSendBlocked } from '../tour-guards.mjs';

let rt = {
  showToast() {},
  getParsed() {
    return null;
  },
  isPaseMode() {
    return false;
  },
  syncLabCopyFab() {},
  syncLabOutputChrome() {},
  openSesionIngresoSend() {},
};

let sendButtonWired = false;

function triggerSesionIngresoSend(ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  if (isCasiopeaTourSendBlocked('lab')) {
    rt.showToast('En el tutorial solo mostramos el botón; fuera del tour aquí se abre Neo.', 'info');
    return;
  }
  rt.openSesionIngresoSend();
}

function wireSesionIngresoSendButton() {
  if (sendButtonWired) return;
  var backdrop = document.getElementById('lab-some-tables-backdrop');
  if (!backdrop) return;
  sendButtonWired = true;
  backdrop.addEventListener(
    'pointerup',
    function (ev) {
      if (ev.button !== 0) return;
      if (!ev.target.closest('#lab-some-tables-send-sesion-btn, .lab-some-tables-send-btn')) return;
      triggerSesionIngresoSend(ev);
    },
    true,
  );
}

export function registerLabSomeTablesModalRuntime(partial) {
  if (!partial || typeof partial !== 'object') return;
  Object.assign(rt, partial);
}

export function syncLabSomeTablesBtn(show) {
  var btn = document.getElementById('lab-some-tables-btn');
  if (!btn) return;
  var visible = !!show;
  if (visible) {
    btn.removeAttribute('hidden');
    btn.setAttribute('aria-hidden', 'false');
  } else {
    btn.setAttribute('hidden', '');
    btn.setAttribute('aria-hidden', 'true');
  }
}

export function openLabSomeTablesModal() {
  if (rt.isPaseMode()) return;
  var parsed = rt.getParsed();
  if (!parsed || !parsed.departments || !parsed.departments.length) return;
  var backdrop = document.getElementById('lab-some-tables-backdrop');
  var body = document.getElementById('lab-some-tables-modal-body');
  if (!backdrop || !body) return;
  body.innerHTML = renderSomeReportTablesHtml(parsed, {
    hideGroupTitles: true,
    modalLayout: true,
  });
  wireSomeTableExportButtons(body, function (msg, kind) {
    rt.showToast(msg, kind);
  }, {
    getDept: function (deptIndex) {
      return parsed.departments && parsed.departments[deptIndex]
        ? parsed.departments[deptIndex]
        : null;
    },
    getGroup: function (deptIndex, groupIndex) {
      var dept = parsed.departments && parsed.departments[deptIndex];
      return dept && dept.groups ? dept.groups[groupIndex] : null;
    },
  });
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('lab-some-tables-modal-open');
  rt.syncLabCopyFab(false);
  wireSesionIngresoSendButton();
}

export function closeLabSomeTablesModal() {
  var backdrop = document.getElementById('lab-some-tables-backdrop');
  var body = document.getElementById('lab-some-tables-modal-body');
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('lab-some-tables-modal-open');
  if (body) body.innerHTML = '';
  rt.syncLabOutputChrome();
}

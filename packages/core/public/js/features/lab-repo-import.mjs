import { registerLabPanelRuntime } from './lab-panel-runtime-state.mjs';

export function labRepoDefaultDateRange() {
  var hasta = new Date();
  hasta.setHours(0, 0, 0, 0);
  var desde = new Date(hasta);
  desde.setDate(desde.getDate() - 2);
  return { desde: desde, hasta: hasta };
}

export function labRepoToDateInputValue(d) {
  var pad = function (n) {
    return String(n).padStart(2, '0');
  };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

export function syncLabRepoDateField(input) {
  if (!input) return;
  input.dispatchEvent(new Event('rpc-date-refresh'));
}

function parseDateInputDay(isoDay) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDay || '').trim());
  if (!m) return null;
  var y = Number(m[1]);
  var mo = Number(m[2]) - 1;
  var day = Number(m[3]);
  var dt = new Date(y, mo, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== day) return null;
  return dt;
}

/** Inclusive calendar-day range for portal Fecha Solicitud filter. */
export function labRepoFetchRangeFromDateInputs(desdeDay, hastaDay) {
  var desde = parseDateInputDay(desdeDay);
  var hasta = parseDateInputDay(hastaDay);
  if (!desde || !hasta) return null;
  desde.setHours(0, 0, 0, 0);
  hasta.setHours(23, 59, 59, 999);
  if (desde.getTime() > hasta.getTime()) return null;
  return { desde: desde, hasta: hasta };
}

export function registerLabRepoImportRuntime(ctx) {
  registerLabPanelRuntime(ctx);
}

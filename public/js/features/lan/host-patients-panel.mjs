/**
 * LAN host patient census — CTA to open the full dashboard modal.
 */

import { isLanSessionConfiguredForRest } from './transport.mjs';
import { openLanHostCensusDashboard } from './host-patients-dashboard.mjs';

export { annotateLanHostPatientRows } from './host-patients-annotate.mjs';
export { fetchLanHostCensusSnapshot } from './host-patients-snapshot.mjs';

/**
 * @param {HTMLElement} root
 * @param {{ showToast?: Function, onChanged?: Function }} [opts]
 */
export async function appendLanHostPatientsSection(root, opts) {
  if (!root || !isLanSessionConfiguredForRest()) return;
  const showToast =
    typeof opts?.showToast === 'function'
      ? opts.showToast
      : function () {};
  const onChanged = opts?.onChanged;

  if (root.querySelector('.lan-host-patients-panel')) return;

  const wrap = document.createElement('div');
  wrap.className = 'lan-host-patients-panel';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-lan-primary lan-host-patients-open-dashboard';
  btn.style.width = '100%';
  btn.textContent = 'Abrir censo LAN';
  btn.addEventListener('click', function () {
    void openLanHostCensusDashboard({ showToast: showToast, onChanged: onChanged });
  });

  wrap.appendChild(btn);
  root.appendChild(wrap);
}

/** Pestaña / segmento VPO — orquestador. */
import { renderVpoPanel, stashVpoForPatient, registerVpoPanelRuntime } from './vpo-panel.mjs';

/** @type {{ getActiveId(): string|null }} */
let rt = {
  getActiveId() {
    return null;
  },
};

export function registerVpoRuntime(partial) {
  if (partial && typeof partial === 'object') {
    Object.assign(rt, partial);
    registerVpoPanelRuntime(partial);
  }
}

export function renderVpo() {
  var mount = document.getElementById('vpo-container');
  if (!mount) return;
  renderVpoPanel(mount, rt.getActiveId());
}

export { stashVpoForPatient };

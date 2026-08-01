/**
 * LAN panel host pin + shift PIN sections — extracted from panel.mjs.
 */
import { appendLanHostPinSection } from './panel-host-pin-fix.mjs';
import {
  appendLanTurnResetAlertStrip,
  resetLanTurnConnectionFromUi,
} from './panel-host-pin-turn-reset.mjs';
import { appendLanShiftPinClientConnectSection } from './panel-host-pin-shift-client.mjs';
import {
  appendLanHostAddressCopyButton,
  appendLanShiftPinSection,
} from './panel-host-pin-shift-host.mjs';

/** @typedef {{
 *   runtime: () => object,
 *   renderLanPanel: (opts?: object) => void,
 *   lanHostUrl: () => string,
 *   lanPanelRenderStale: (gen: number) => boolean,
 *   getLanClient: () => object,
 *   leaveLiveSyncRoom: (...args: unknown[]) => unknown,
 *   resumeAutoHostDetectAndReconnect: () => void,
 *   focusLanShiftPinInput: () => boolean,
 * }} PanelHostPinDeps */

/** @typedef {ReturnType<typeof createPanelHostPin>} PanelHostPinApi */

/** @param {PanelHostPinDeps} deps */
export function createPanelHostPin(deps) {
  return {
    appendLanHostPinSection: function (root) {
      return appendLanHostPinSection(deps, root);
    },
    appendLanTurnResetAlertStrip: function (root, gen) {
      return appendLanTurnResetAlertStrip(deps, root, gen);
    },
    appendLanShiftPinClientConnectSection: function (root, gen) {
      return appendLanShiftPinClientConnectSection(deps, root, gen);
    },
    appendLanHostAddressCopyButton: function (root, gen) {
      return appendLanHostAddressCopyButton(deps, root, gen);
    },
    appendLanShiftPinSection: function (root, gen) {
      return appendLanShiftPinSection(deps, root, gen);
    },
    resetLanTurnConnectionFromUi: function () {
      return resetLanTurnConnectionFromUi(deps);
    },
  };
}

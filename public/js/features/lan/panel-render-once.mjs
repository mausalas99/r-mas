/**
 * Full LAN ⇄ panel rebuild (renderLanPanelOnce) — extracted from panel.mjs.
 */
import { storage } from '../../storage.js';
import { hasElevatedTeamPrivileges, canManageInternoQr } from '../../clinical-privileges.mjs';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { appendLanHubStatusCard, appendLanHubRoomsCard } from '../lan-hub-panel-shell.mjs';
import { appendInternoQrPanel } from '../interno-qr-panel.mjs';
import { LIVE_SYNC_SALA_DEFS } from '../../lan-join-link.mjs';
import { getPinnedHostUrl } from '../../lan-host-pin.mjs';
import { canLocalMacBeLanHost, isClinicalRankConfiguredForLan } from '../../lan-host-rank-policy.mjs';
import {
  isLanSessionConfiguredForRest,
  isLanElectronDesktop,
  promoteThisMacToLanHost,
  syncLanHostClinicalMetaToDisk,
  ensureLanElectronHostReady,
  applyPinnedHostOverride,
  getLanTeamCodeFromConfig,
  resolveLanHostUrlAuto,
} from './transport.mjs';
import { activeLiveSyncRoomId } from './runtime.mjs';
import { appendLanPanelGuardCards_ } from './panel-render-guards.mjs';
import { lanHubStatusCopy } from './panel-hub-status.mjs';
import { patchLanPanelJoinButtons } from './panel-known-sessions.mjs';
import {
  isLanConnectionDropdownOpen,
  captureConnectionDropdownScrollTop,
  restoreConnectionDropdownScrollTop,
  captureLanPanelExpandState,
  restoreLanPanelExpandState,
} from './panel-connection-chrome.mjs';
import { lanNetworkProfile } from '../../lan-network-profile.mjs';
import { appendLanHostPatientsSection } from './host-patients-panel.mjs';
import {
  getClinicalRank,
  getUserSala,
  isClinicalRegistered,
  getClinicalUserUserId,
  isLanHostActive,
} from './panel-clinical-context.mjs';

/** @param {ReturnType<typeof createPanelRenderOnce> extends never ? object : Parameters<typeof createPanelRenderOnce>[0]} deps */
function maybeAppendInternoQrPanel_(deps, root) {
  if (!isLanElectronDesktop() || !isLanHostActive()) return;
  if (!canManageInternoQr(clinicalSessionContext.user)) return;
  void resolveLanHostUrlAuto().then(function (hostBaseUrl) {
    void appendInternoQrPanel(root, {
      hostBaseUrl: hostBaseUrl,
      userId: getClinicalUserUserId(),
      showToast: deps.runtime().showToast,
    });
  });
}

/** @param {Parameters<typeof maybeAppendInternoQrPanel_>[0]} deps */
async function syncLanHostBeforeRender_(deps, rankConfigured) {
  if (!rankConfigured) return;
  try {
    await syncLanHostClinicalMetaToDisk();
    if (getPinnedHostUrl() && !isLanConnectionDropdownOpen()) {
      await applyPinnedHostOverride(getLanTeamCodeFromConfig(), { quiet: true, boot: true });
    } else if (
      typeof storage.getLanUiRole === 'function' &&
      storage.getLanUiRole() === 'host' &&
      canLocalMacBeLanHost()
    ) {
      await ensureLanElectronHostReady();
    }
  } catch {
    // Non-fatal — still render panel so ⇄ stays usable offline.
  }
}

/**
 * @param {Parameters<typeof maybeAppendInternoQrPanel_>[0]} deps
 * @returns {Promise<boolean>} true when render should stop after in-place refresh
 */
async function tryRefreshChromeInPlace_(deps, root, _gen) {
  if (isLanConnectionDropdownOpen() && deps.lanPanelHasBuiltChrome(root) && !deps.lanPanelNeedsFullRebuild(root)) {
    await deps.refreshLanPanelChromeInPlace();
    patchLanPanelJoinButtons();
    return true;
  }
  return false;
}

function appendOfflineBanner_(root) {
  if (lanNetworkProfile.getNetworkProfile() !== 'offline') return;
  var offlineBanner = document.createElement('div');
  offlineBanner.className = 'lan-offline-banner';
  offlineBanner.innerHTML = [
    '<div class="lan-offline-banner__text">',
    '<span class="lan-hub-status-dot lan-hub-status-dot--offline"></span>',
    ' Sin conexión al anfitrión · LiveSync en pausa',
    '</div>',
    '<div class="lan-offline-banner__hint">',
    'Los cambios se guardan localmente y se sincronizarán al reconectar.',
    '</div>',
    '<button class="lan-offline-banner__btn" data-lan-action="reconnect-from-offline">',
    'Reconectar',
    '</button>',
  ].join('');
  root.appendChild(offlineBanner);
}

function resolveVisibleSalaDefs_(isElevated, userSala, registered, clinicalUserId) {
  var salaDefs = LIVE_SYNC_SALA_DEFS;
  if (isElevated) return salaDefs;
  if (userSala) {
    var filtered = salaDefs.filter(function (d) {
      return d.key === userSala;
    });
    return filtered.length ? filtered : salaDefs;
  }
  if (!registered && clinicalUserId) return salaDefs;
  return [];
}

/** @param {Parameters<typeof maybeAppendInternoQrPanel_>[0]} deps */
function appendHubStatusCardSection_(deps, root, hubStatus, needsInvitePaste) {
  appendLanHubStatusCard(root, {
    connected: hubStatus.connected,
    statusLine: hubStatus.line,
    statusHint: hubStatus.hint,
    isElectronDesktop: isLanElectronDesktop(),
    showBecomeHost: canLocalMacBeLanHost(),
    showInvitePaste: needsInvitePaste && deps.runtime().isMobileWeb(),
    onBecomeHost: function () {
      void promoteThisMacToLanHost();
    },
  });
}

/** @param {Parameters<typeof maybeAppendInternoQrPanel_>[0]} deps */
async function appendShiftPinSections_(deps, root, gen) {
  await deps.renderLanPreflightUx(root);
  await deps.appendLanShiftPinSection(root, gen);
  if (deps.isRenderStale(gen)) return;
  deps.appendLanHostAddressCopyButton(root, gen);
  if (deps.isRenderStale(gen)) return;
  await deps.appendLanShiftPinClientConnectSection(root, gen);
  if (deps.isRenderStale(gen)) return;
  await deps.appendLanTurnResetSection(root, gen);
}

/** @param {Parameters<typeof maybeAppendInternoQrPanel_>[0]} deps */
function appendMobileLanSections_(deps, root, hubStatus) {
  if (!deps.runtime().isMobileWeb()) return;
  if (!hubStatus.connected) {
    deps.appendLanMobileJoinSection(root);
    return;
  }
  deps.appendLanMobileSharerCard(root);
}

/** @param {Parameters<typeof maybeAppendInternoQrPanel_>[0]} deps */
function appendElectronDesktopSections_(deps, root, needsInvitePaste) {
  if (!isLanElectronDesktop()) return;
  var canShare = deps.canOfferMobileLanShare();
  if (!needsInvitePaste && canShare) {
    deps.appendLanInviteShareCards(root);
  }
  deps.appendLanJoinOtherMacSection(root, {
    open: needsInvitePaste || !canShare,
  });
  if (needsInvitePaste && canShare) {
    deps.appendLanInviteShareCards(root);
  }
}

/** @param {Parameters<typeof maybeAppendInternoQrPanel_>[0]} deps */
function appendRoomsAndRankSections_(deps, root, hubStatus, visibleSalaDefs, rank, isElevated) {
  if (!deps.runtime().isMobileWeb() || !hubStatus.connected) {
    appendLanHubRoomsCard(root, {
      visibleSalaDefs: visibleSalaDefs,
      activeRoomId: activeLiveSyncRoomId,
    });
  }
  if (rank === 'R1') {
    deps.buildR1Section(root);
  } else if (rank === 'R2') {
    deps.buildR2Section(root);
  } else if (isElevated) {
    deps.buildR4Section(root);
  }
}

/** @param {Parameters<typeof maybeAppendInternoQrPanel_>[0]} deps */
async function appendPanelFooterSections_(deps, root, gen, expandState, dropdownScrollTop) {
  deps.appendLanHostPinSection(root);
  var appendConflictDrafts = deps.runtime().appendLanConflictDraftsSection;
  if (typeof appendConflictDrafts === 'function') {
    void appendConflictDrafts(root);
  }
  await deps.appendLanSyncDiagnosticsSection(root);
  await appendLanHostPatientsSection(root, {
    showToast: function (msg, kind) {
      deps.runtime().showToast(msg, kind);
    },
    onChanged: function () {
      if (typeof deps.runtime().renderPatientList === 'function') deps.runtime().renderPatientList();
    },
  });
  if (deps.isRenderStale(gen)) return;
  deps.purgeDuplicateLanShiftPinCards(root);
  restoreLanPanelExpandState(root, expandState);
  restoreConnectionDropdownScrollTop(dropdownScrollTop);
  maybeAppendInternoQrPanel_(deps, root);
}

/** @param {Parameters<typeof maybeAppendInternoQrPanel_>[0]} deps */
async function renderLanPanelOnce_(deps) {
  var gen = deps.bumpRenderGen();
  var root = document.getElementById('lan-connection-panel-root');
  if (!root) return;

  var registered = isClinicalRegistered();
  var userSala = getUserSala();
  var rank = getClinicalRank();
  var clinicalUserId = getClinicalUserUserId();
  var rankConfigured = isClinicalRankConfiguredForLan();

  await syncLanHostBeforeRender_(deps, rankConfigured);
  if (deps.isRenderStale(gen)) return;
  if (await tryRefreshChromeInPlace_(deps, root, gen)) return;

  var expandState = captureLanPanelExpandState(root);
  var dropdownScrollTop = captureConnectionDropdownScrollTop();
  root.innerHTML = '';

  if (
    appendLanPanelGuardCards_(root, {
      registered,
      clinicalUserId,
      userSala,
      rankConfigured,
      isElevated: hasElevatedTeamPrivileges(clinicalSessionContext.user),
    })
  ) {
    return;
  }

  var isElevated = hasElevatedTeamPrivileges(clinicalSessionContext.user);
  appendOfflineBanner_(root);

  var hubStatus = lanHubStatusCopy();
  var needsInvitePaste = !deps.runtime().isMobileWeb() && !isLanSessionConfiguredForRest();
  appendHubStatusCardSection_(deps, root, hubStatus, needsInvitePaste);
  if (deps.isRenderStale(gen)) return;

  await appendShiftPinSections_(deps, root, gen);
  if (deps.isRenderStale(gen)) return;

  appendMobileLanSections_(deps, root, hubStatus);
  appendElectronDesktopSections_(deps, root, needsInvitePaste);

  var visibleSalaDefs = resolveVisibleSalaDefs_(isElevated, userSala, registered, clinicalUserId);
  appendRoomsAndRankSections_(deps, root, hubStatus, visibleSalaDefs, rank, isElevated);
  await appendPanelFooterSections_(deps, root, gen, expandState, dropdownScrollTop);
}

/** @param {{
 *   runtime: () => object,
 *   bumpRenderGen: () => number,
 *   isRenderStale: (gen: number) => boolean,
 *   refreshLanPanelChromeInPlace: () => Promise<void>,
 *   lanPanelHasBuiltChrome: (root: HTMLElement) => boolean,
 *   lanPanelNeedsFullRebuild: (root: HTMLElement) => boolean,
 *   renderLanPreflightUx: (root: HTMLElement) => Promise<unknown>,
 *   appendLanShiftPinSection: (root: HTMLElement, gen: number) => Promise<void>,
 *   appendLanHostAddressCopyButton: (root: HTMLElement, gen: number) => void,
 *   appendLanShiftPinClientConnectSection: (root: HTMLElement, gen: number) => Promise<void>,
 *   appendLanTurnResetSection: (root: HTMLElement, gen: number) => Promise<void>,
 *   appendLanMobileJoinSection: (root: HTMLElement) => void,
 *   appendLanMobileSharerCard: (root: HTMLElement) => void,
 *   appendLanJoinOtherMacSection: (root: HTMLElement, opts?: object) => void,
 *   appendLanInviteShareCards: (root: HTMLElement) => void,
 *   canOfferMobileLanShare: () => boolean,
 *   buildR1Section: (root: HTMLElement) => void,
 *   buildR2Section: (root: HTMLElement) => void,
 *   buildR4Section: (root: HTMLElement) => void,
 *   appendLanHostPinSection: (root: HTMLElement) => void,
 *   appendLanSyncDiagnosticsSection: (root: HTMLElement) => Promise<void>,
 *   purgeDuplicateLanShiftPinCards: (root: HTMLElement) => void,
 * }} deps */
export function createPanelRenderOnce(deps) {
  async function renderLanPanelOnce() {
    await renderLanPanelOnce_(deps);
  }
  return { renderLanPanelOnce };
}

import {
  startHelpTourInterconsulta,
  startHelpTourMain,
  startMiniTour,
  startTourModule,
  togglePresentationModeFromHelp
} from "/mobile/js/chunks/chunk-3AJQII7X.js";
import {
  closeLearnHub,
  openLearnHub,
  renderLearnHubBody,
  syncLearnAprenderChrome
} from "/mobile/js/chunks/chunk-ED5MLKYM.js";
import {
  dismissGuardiaV7UpgradeCard
} from "/mobile/js/chunks/chunk-TWAIII5B.js";
import {
  closeShortcutsModal,
  openShortcutsHelpCenter,
  openShortcutsModal
} from "/mobile/js/chunks/chunk-SR3SZGIB.js";
import {
  closeQuickHelp,
  onHelpListKeydown,
  onHelpSearchInput,
  onHelpSearchKeydown,
  openQuickHelp
} from "/mobile/js/chunks/chunk-3N4MBEKI.js";
import "/mobile/js/chunks/chunk-ZUYL4WDU.js";
import "/mobile/js/chunks/chunk-TM7QOJ25.js";
import "/mobile/js/chunks/chunk-5AYFIESA.js";
import {
  DEMO_PATIENT_ID,
  RELEASE_NOTES_DEV_FORCE_SHOW,
  closeLabBulkTourHintModal,
  closeReleaseNotes,
  closeSettingsDropdown,
  expandSettingsAccordionBackupSync,
  exportCensoPdfFromHelp,
  finishGuidedTour,
  formatCuratedReleaseNotesPlain,
  getGuidedTourContext,
  guidedTourAdvanceAfter,
  guidedTourAdvanceAfterIndicaGenerated,
  guidedTourAdvanceAfterNotaGenerated,
  guidedTourClickNext,
  guidedTourClickPrev,
  guidedTourPause,
  initReleaseNotesDevPreviewIfEnabled,
  insertLabTourSecondPatientExample,
  isTourDemoPatientId,
  maybeShowReleaseNotesFor,
  onTourDockClick,
  onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend,
  registerSettingsHelpRuntime,
  resetAndStartOnboarding,
  resumeGuidedTourFromProgress,
  showSettingsPanel,
  skipGuidedTour,
  syncSettingsNavVisibility,
  syncTeamSyncHeaderButton,
  toggleSettingsDropdown,
  toggleSettingsSection,
  toggleTourDockCollapsed,
  tourAfterBulkLabParse,
  tourOnBulkPreviewPatientSaved
} from "/mobile/js/chunks/chunk-JHCY7JRY.js";
import "/mobile/js/chunks/chunk-SITKK64L.js";
import "/mobile/js/chunks/chunk-TKGLBZLP.js";
import "/mobile/js/chunks/chunk-DID5RG6K.js";
import "/mobile/js/chunks/chunk-YFGSR2LP.js";
import "/mobile/js/chunks/chunk-HZLTCETY.js";
import "/mobile/js/chunks/chunk-TERSLZ3P.js";
import "/mobile/js/chunks/chunk-WQ6PPSIC.js";
import "/mobile/js/chunks/chunk-MUKCCNIH.js";
import {
  guidedTourIntroChooseInterconsulta,
  guidedTourIntroChooseSala,
  guidedTourIntroSkip,
  hideTourIntroModal,
  initGuidedTourGate,
  markGuidedTourVersionDone,
  normalizeTourVersionLabel,
  resolveAppVersionForTour,
  settingsHelpBridge,
  syncLearnHubContinueVisibility
} from "/mobile/js/chunks/chunk-SYWZMYIW.js";
import "/mobile/js/chunks/chunk-XWOEH37S.js";
import {
  GUIDED_TOUR_LS_KEY
} from "/mobile/js/chunks/chunk-ZJ5Q2DYI.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-PZEHK5VE.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-YQDSERQQ.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-3QKGKUYY.js";
import "/mobile/js/chunks/chunk-ARCLVSLZ.js";
import "/mobile/js/chunks/chunk-V25HP6NK.js";
import "/mobile/js/chunks/chunk-23D7ZB6I.js";
import "/mobile/js/chunks/chunk-CFQPZQBI.js";
import "/mobile/js/chunks/chunk-VL2HB7CD.js";
import "/mobile/js/chunks/chunk-QJ4AKPQ5.js";
import "/mobile/js/chunks/chunk-72XICSYX.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-RQX7XEPZ.js";
import "/mobile/js/chunks/chunk-4VEBEOGH.js";
import "/mobile/js/chunks/chunk-FKV7DR6T.js";
import "/mobile/js/chunks/chunk-PGT753Q4.js";
import "/mobile/js/chunks/chunk-KYGE5G3V.js";
import "/mobile/js/chunks/chunk-PMCRNWVY.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-ISXDOTEU.js";
import "/mobile/js/chunks/chunk-GJK2JHBF.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-YSMCQRZC.js";
import "/mobile/js/chunks/chunk-AWQNHSEL.js";
import "/mobile/js/chunks/chunk-QY3EXE2C.js";
import "/mobile/js/chunks/chunk-NT3TRJXB.js";
import "/mobile/js/chunks/chunk-3YCJDDNO.js";
import "/mobile/js/chunks/chunk-EJ66PJTG.js";
import "/mobile/js/chunks/chunk-QHIEC6QJ.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-CAVI7UGR.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";

// public/js/features/settings-help/index.mjs
settingsHelpBridge.closeReleaseNotes = closeReleaseNotes;
settingsHelpBridge.closeQuickHelp = closeQuickHelp;
settingsHelpBridge.openQuickHelp = openQuickHelp;
settingsHelpBridge.syncLearnHubContinueVisibility = syncLearnHubContinueVisibility;
var settingsHelpWindowHandlers = {
  toggleSettingsSection,
  toggleSettingsDropdown,
  closeSettingsDropdown,
  expandSettingsAccordionBackupSync,
  syncTeamSyncHeaderButton,
  showSettingsPanel,
  syncSettingsNavVisibility,
  openQuickHelp,
  closeQuickHelp,
  onHelpSearchInput,
  onHelpSearchKeydown,
  onHelpListKeydown,
  openShortcutsModal,
  closeShortcutsModal,
  openShortcutsHelpCenter,
  closeReleaseNotes,
  startMiniTour,
  startHelpTourMain,
  togglePresentationModeFromHelp,
  exportCensoPdfFromHelp,
  guidedTourIntroChooseSala,
  guidedTourIntroChooseInterconsulta,
  guidedTourIntroSkip,
  skipGuidedTour,
  toggleTourDockCollapsed,
  onTourDockClick,
  guidedTourClickNext,
  guidedTourClickPrev,
  guidedTourPause,
  finishGuidedTour,
  guidedTourFinish: finishGuidedTour,
  resumeGuidedTourFromProgress,
  startTourModule,
  startHelpTourInterconsulta,
  resetAndStartOnboarding,
  closeLabBulkTourHintModal,
  insertLabTourSecondPatientExample,
  openLearnHub,
  closeLearnHub,
  dismissGuardiaV7UpgradeCard
};
export {
  DEMO_PATIENT_ID,
  GUIDED_TOUR_LS_KEY,
  RELEASE_NOTES_DEV_FORCE_SHOW,
  closeLabBulkTourHintModal,
  closeLearnHub,
  closeQuickHelp,
  closeReleaseNotes,
  closeSettingsDropdown,
  finishGuidedTour,
  formatCuratedReleaseNotesPlain,
  getGuidedTourContext,
  guidedTourAdvanceAfter,
  guidedTourAdvanceAfterIndicaGenerated,
  guidedTourAdvanceAfterNotaGenerated,
  hideTourIntroModal,
  initGuidedTourGate,
  initReleaseNotesDevPreviewIfEnabled,
  isTourDemoPatientId,
  markGuidedTourVersionDone,
  maybeShowReleaseNotesFor,
  normalizeTourVersionLabel,
  onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend,
  openLearnHub,
  registerSettingsHelpRuntime,
  renderLearnHubBody,
  resolveAppVersionForTour,
  resumeGuidedTourFromProgress,
  settingsHelpWindowHandlers,
  syncLearnAprenderChrome,
  syncTeamSyncHeaderButton,
  toggleSettingsDropdown,
  tourAfterBulkLabParse,
  tourOnBulkPreviewPatientSaved
};
//# sourceMappingURL=/js/chunks/settings-help-ZICXOTEY.js.map

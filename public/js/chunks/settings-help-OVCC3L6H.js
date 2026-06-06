import {
  dismissGuardiaV7UpgradeCard
} from "/js/chunks/chunk-UD6VN2PX.js";
import {
  startHelpTourInterconsulta,
  startHelpTourMain,
  startMiniTour,
  startTourModule,
  togglePresentationModeFromHelp
} from "/js/chunks/chunk-6CVJMELR.js";
import {
  closeLearnHub,
  openLearnHub,
  renderLearnHubBody,
  syncLearnAprenderChrome
} from "/js/chunks/chunk-NBUMQJOA.js";
import "/js/chunks/chunk-PBCVTB75.js";
import "/js/chunks/chunk-GDISREMV.js";
import "/js/chunks/chunk-4NCUFN7B.js";
import {
  closeQuickHelp,
  onHelpListKeydown,
  onHelpSearchInput,
  onHelpSearchKeydown,
  openQuickHelp
} from "/js/chunks/chunk-DKCM7TZ4.js";
import {
  DEMO_PATIENT_ID,
  GUIDED_TOUR_LS_KEY,
  RELEASE_NOTES_DEV_FORCE_SHOW,
  closeLabBulkTourHintModal,
  closeReleaseNotes,
  exportCensoPdfFromHelp,
  finishGuidedTour,
  formatCuratedReleaseNotesPlain,
  getGuidedTourContext,
  guidedTourAdvanceAfter,
  guidedTourAdvanceAfterIndicaGenerated,
  guidedTourAdvanceAfterNotaGenerated,
  guidedTourClickNext,
  guidedTourClickPrev,
  guidedTourIntroChooseInterconsulta,
  guidedTourIntroChooseSala,
  guidedTourIntroSkip,
  guidedTourPause,
  hideTourIntroModal,
  initGuidedTourGate,
  initReleaseNotesDevPreviewIfEnabled,
  insertLabTourSecondPatientExample,
  isTourDemoPatientId,
  markGuidedTourVersionDone,
  maybeShowReleaseNotesFor,
  normalizeTourVersionLabel,
  onTourDockClick,
  onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend,
  resetAndStartOnboarding,
  resolveAppVersionForTour,
  resumeGuidedTourFromProgress,
  skipGuidedTour,
  startNeoCompanionTour,
  syncLearnHubContinueVisibility,
  toggleTourDockCollapsed,
  tourAfterBulkLabParse,
  tourOnBulkPreviewPatientSaved
} from "/js/chunks/chunk-GHTBYATE.js";
import "/js/chunks/chunk-YQ6NOVAM.js";
import "/js/chunks/chunk-KXYUGJFS.js";
import "/js/chunks/chunk-3YMZD64L.js";
import "/js/chunks/chunk-NAOXCYGS.js";
import {
  settingsHelpBridge
} from "/js/chunks/chunk-6IT4VYWH.js";
import "/js/chunks/chunk-DANTQKNZ.js";
import {
  closeSettingsDropdown,
  expandSettingsAccordionBackupSync,
  syncTeamSyncHeaderButton,
  toggleSettingsDropdown,
  toggleSettingsSection
} from "/js/chunks/chunk-UJ6DPQ6B.js";
import {
  registerSettingsHelpRuntime
} from "/js/chunks/chunk-MRR5ZOSS.js";
import "/js/chunks/chunk-QOOZHVER.js";
import "/js/chunks/chunk-XNV42VUV.js";
import "/js/chunks/chunk-WI6BMSWT.js";
import "/js/chunks/chunk-MLXZVY56.js";
import "/js/chunks/chunk-BCNABZWJ.js";
import "/js/chunks/chunk-434Q5TP4.js";
import "/js/chunks/chunk-K6QXHWFW.js";
import "/js/chunks/chunk-ZRVSNZK5.js";
import "/js/chunks/chunk-2VRIL4MF.js";
import "/js/chunks/chunk-LX374JRN.js";
import "/js/chunks/chunk-JAJBXVG3.js";
import "/js/chunks/chunk-FWKRNT2R.js";

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
  openQuickHelp,
  closeQuickHelp,
  onHelpSearchInput,
  onHelpSearchKeydown,
  onHelpListKeydown,
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
  startNeoCompanionTour,
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
  startNeoCompanionTour,
  syncLearnAprenderChrome,
  syncTeamSyncHeaderButton,
  toggleSettingsDropdown,
  tourAfterBulkLabParse,
  tourOnBulkPreviewPatientSaved
};
//# sourceMappingURL=/js/chunks/settings-help-OVCC3L6H.js.map

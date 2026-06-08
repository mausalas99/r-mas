import {
  dismissGuardiaV7UpgradeCard
} from "/js/chunks/chunk-PAPNRIZI.js";
import {
  startHelpTourInterconsulta,
  startHelpTourMain,
  startMiniTour,
  startTourModule,
  togglePresentationModeFromHelp
} from "/js/chunks/chunk-5TMV4Z5C.js";
import {
  closeLearnHub,
  openLearnHub,
  renderLearnHubBody,
  syncLearnAprenderChrome
} from "/js/chunks/chunk-WADTLUNZ.js";
import "/js/chunks/chunk-L2VI5EO5.js";
import "/js/chunks/chunk-TVNIPUSB.js";
import "/js/chunks/chunk-V5MWVLLV.js";
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
} from "/js/chunks/chunk-OYLFJ5I5.js";
import "/js/chunks/chunk-Z7QY65HI.js";
import "/js/chunks/chunk-HH564DRX.js";
import {
  closeQuickHelp,
  onHelpListKeydown,
  onHelpSearchInput,
  onHelpSearchKeydown,
  openQuickHelp
} from "/js/chunks/chunk-ZNMIK6TF.js";
import {
  closeSettingsDropdown,
  expandSettingsAccordionBackupSync,
  syncTeamSyncHeaderButton,
  toggleSettingsDropdown,
  toggleSettingsSection
} from "/js/chunks/chunk-DYQX7PMJ.js";
import "/js/chunks/chunk-POBHJ4SL.js";
import "/js/chunks/chunk-S2QDFGEP.js";
import {
  settingsHelpBridge
} from "/js/chunks/chunk-6IT4VYWH.js";
import {
  registerSettingsHelpRuntime
} from "/js/chunks/chunk-GP6ZPKZF.js";
import "/js/chunks/chunk-MLXZVY56.js";
import "/js/chunks/chunk-QZXLPUPG.js";
import "/js/chunks/chunk-PSYRE3OM.js";
import "/js/chunks/chunk-O4YWLSR7.js";
import "/js/chunks/chunk-JXZHJ3CP.js";
import "/js/chunks/chunk-QOWDHS6Z.js";
import "/js/chunks/chunk-BCNABZWJ.js";
import "/js/chunks/chunk-QSBWAKTB.js";
import "/js/chunks/chunk-FII6Y5F2.js";
import "/js/chunks/chunk-TNTHAQJD.js";
import "/js/chunks/chunk-PVRUBDE5.js";
import "/js/chunks/chunk-2TZHN5MF.js";
import "/js/chunks/chunk-K6QXHWFW.js";
import "/js/chunks/chunk-WM442OFV.js";
import "/js/chunks/chunk-CRJYUJ23.js";
import "/js/chunks/chunk-2VRIL4MF.js";
import "/js/chunks/chunk-LX374JRN.js";
import "/js/chunks/chunk-O4LBB2N7.js";
import "/js/chunks/chunk-FWKRNT2R.js";
import "/js/chunks/chunk-VQ3KZLKM.js";

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
//# sourceMappingURL=/js/chunks/settings-help-THN45LUL.js.map

import {
  dismissGuardiaV7UpgradeCard
} from "/js/chunks/chunk-QIIUYMUE.js";
import {
  startHelpTourInterconsulta,
  startHelpTourMain,
  startMiniTour,
  startTourModule,
  togglePresentationModeFromHelp
} from "/js/chunks/chunk-MGB27RSQ.js";
import {
  closeLearnHub,
  openLearnHub,
  renderLearnHubBody,
  syncLearnAprenderChrome
} from "/js/chunks/chunk-K7C5OEOR.js";
import "/js/chunks/chunk-TVNIPUSB.js";
import "/js/chunks/chunk-V5MWVLLV.js";
import "/js/chunks/chunk-L2VI5EO5.js";
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
} from "/js/chunks/chunk-D4JQUN4J.js";
import "/js/chunks/chunk-7QKFSOEQ.js";
import "/js/chunks/chunk-TDLD4C3Z.js";
import {
  closeQuickHelp,
  onHelpListKeydown,
  onHelpSearchInput,
  onHelpSearchKeydown,
  openQuickHelp
} from "/js/chunks/chunk-A35Y5P3X.js";
import {
  closeSettingsDropdown,
  expandSettingsAccordionBackupSync,
  syncTeamSyncHeaderButton,
  toggleSettingsDropdown,
  toggleSettingsSection
} from "/js/chunks/chunk-R3I7OW2C.js";
import "/js/chunks/chunk-POBHJ4SL.js";
import "/js/chunks/chunk-7V673IEZ.js";
import {
  settingsHelpBridge
} from "/js/chunks/chunk-6IT4VYWH.js";
import {
  registerSettingsHelpRuntime
} from "/js/chunks/chunk-L3YP7XLW.js";
import "/js/chunks/chunk-MLXZVY56.js";
import "/js/chunks/chunk-QZXLPUPG.js";
import "/js/chunks/chunk-5HKJHRHR.js";
import "/js/chunks/chunk-Q33X722Y.js";
import "/js/chunks/chunk-KZCXUBUQ.js";
import "/js/chunks/chunk-WD7VCIKP.js";
import "/js/chunks/chunk-TNTHAQJD.js";
import "/js/chunks/chunk-QN7Q4ZRJ.js";
import "/js/chunks/chunk-2TZHN5MF.js";
import "/js/chunks/chunk-K6QXHWFW.js";
import "/js/chunks/chunk-MSBFOYVD.js";
import "/js/chunks/chunk-2VRIL4MF.js";
import "/js/chunks/chunk-LX374JRN.js";
import "/js/chunks/chunk-QKS27SZP.js";
import "/js/chunks/chunk-FWKRNT2R.js";
import "/js/chunks/chunk-BCNABZWJ.js";

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
//# sourceMappingURL=/js/chunks/settings-help-MW6VFHSL.js.map

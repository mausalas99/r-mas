import {
  closeLearnHub,
  openLearnHub,
  renderLearnHubBody,
  syncLearnAprenderChrome
} from "/js/chunks/chunk-EGWIFGQB.js";
import {
  dismissGuardiaV7UpgradeCard
} from "/js/chunks/chunk-3OYBRNE5.js";
import "/js/chunks/chunk-V5MWVLLV.js";
import "/js/chunks/chunk-L2VI5EO5.js";
import {
  startHelpTourInterconsulta,
  startHelpTourMain,
  startMiniTour,
  startTourModule,
  togglePresentationModeFromHelp
} from "/js/chunks/chunk-KHKZIYXS.js";
import "/js/chunks/chunk-TVNIPUSB.js";
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
} from "/js/chunks/chunk-BBWHLKOH.js";
import "/js/chunks/chunk-QZOYS7B3.js";
import "/js/chunks/chunk-POBHJ4SL.js";
import "/js/chunks/chunk-KCH77UA3.js";
import "/js/chunks/chunk-7JXODOZO.js";
import {
  closeQuickHelp,
  onHelpListKeydown,
  onHelpSearchInput,
  onHelpSearchKeydown,
  openQuickHelp
} from "/js/chunks/chunk-RFCOXV3R.js";
import {
  settingsHelpBridge
} from "/js/chunks/chunk-6IT4VYWH.js";
import {
  closeSettingsDropdown,
  expandSettingsAccordionBackupSync,
  syncTeamSyncHeaderButton,
  toggleSettingsDropdown,
  toggleSettingsSection
} from "/js/chunks/chunk-XBICGDK6.js";
import {
  registerSettingsHelpRuntime
} from "/js/chunks/chunk-67RFW3B4.js";
import "/js/chunks/chunk-MLXZVY56.js";
import "/js/chunks/chunk-QZXLPUPG.js";
import "/js/chunks/chunk-2Q6272BN.js";
import "/js/chunks/chunk-5DFAIE36.js";
import "/js/chunks/chunk-H3GRLPFC.js";
import "/js/chunks/chunk-GMVJRWWR.js";
import "/js/chunks/chunk-BCNABZWJ.js";
import "/js/chunks/chunk-GPPD4VPS.js";
import "/js/chunks/chunk-6F4UJTPO.js";
import "/js/chunks/chunk-EXMEBP6A.js";
import "/js/chunks/chunk-TNTHAQJD.js";
import "/js/chunks/chunk-PVRUBDE5.js";
import "/js/chunks/chunk-2TZHN5MF.js";
import "/js/chunks/chunk-K6QXHWFW.js";
import "/js/chunks/chunk-WM442OFV.js";
import "/js/chunks/chunk-CRJYUJ23.js";
import "/js/chunks/chunk-M3F4WDAD.js";
import "/js/chunks/chunk-LX374JRN.js";
import "/js/chunks/chunk-7JSEAPOX.js";
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
//# sourceMappingURL=/js/chunks/settings-help-FSWNWN5H.js.map

/** Perfil, modo Sala/Inter, plantillas y carga guardada del modal de usuario — barrel. */
import {
  closeClinicoUnlockModal,
  confirmClinicoUnlock,
} from "../clinico-access.mjs";
import { ensureProfileTemplateDefaults } from "../profile-templates.mjs";
import { updateDefaultFormatField } from "../profile-formats-editor.mjs";
import {
  toggleProfileSection,
  openProfileFromHeader,
  openProfileModal,
  closeProfileModal,
} from "./profile-modal.mjs";
import {
  onAppModeChange,
  toggleHeaderWorkMode,
  setWorkModeFromHeader,
} from "./profile-app-mode.mjs";
import { saveSettings, saveQuickOutputFormat } from "./profile-save.mjs";
import {
  setHideManejoSection,
  setHideClinicoTab,
  setHideListadoProblemasAiPrompt,
} from "./profile-prefs.mjs";
import {
  openTemplatesModal,
  openNoteFormatsFromProfile,
  openIndicaFormatsFromProfile,
  saveDefaultFormatsFromEditor,
  exitFormatsEditor,
  resetProfileTemplates,
  closeTemplatesModal,
  saveTemplates,
} from "./profile-formats.mjs";

export {
  registerProfileRuntime,
  attachProfileSettingsGetter,
  normalizeQuickOutputFormat,
} from "./profile-runtime.mjs";

export { loadSettings, syncProfileModalLayout } from "./profile-load.mjs";

export { saveSettings, saveQuickOutputFormat } from "./profile-save.mjs";

export {
  applyAppModeSwitchEffects,
  onAppModeChange,
  toggleHeaderWorkMode,
  setWorkModeFromHeader,
} from "./profile-app-mode.mjs";

export {
  openProfileModal,
  closeProfileModal,
  toggleProfileSection,
  syncProfileSectionVisibility,
  openProfileFromHeader,
} from "./profile-modal.mjs";

export {
  openNoteFormatsFromProfile,
  openIndicaFormatsFromProfile,
  openTemplatesModal,
  closeTemplatesModal,
  saveTemplates,
  saveDefaultFormatsFromEditor,
  exitFormatsEditor,
  resetProfileTemplates,
} from "./profile-formats.mjs";

export {
  isHideManejoSectionEnabled,
  isHideClinicoTabEnabled,
  syncHideManejoSectionUI,
  syncHideClinicoTabUI,
  ensureClinicoTabConsistency,
  applyHideManejoSectionEffects,
  applyHideClinicoTabEffects,
  setHideManejoSection,
  setHideClinicoTab,
  isHideListadoProblemasAiPromptEnabled,
  syncHideListadoProblemasAiPromptUI,
  setHideListadoProblemasAiPrompt,
} from "./profile-prefs.mjs";

/** Censo y listado guardan nombres por separado; esto solo copia el valor mostrado, no cambia el guardado. */
export function copyCensoFromListado() {
  [
    ["settings-medico-r2", "profile-r2"],
    ["settings-medico-r1a", "profile-r1a"],
    ["settings-medico-r1b", "profile-r1b"],
    ["settings-medico-profesor", "profile-maestro"],
  ].forEach(([srcId, dstId]) => {
    const src = document.getElementById(srcId);
    const dst = document.getElementById(dstId);
    if (src && dst) dst.value = src.value;
  });
}

/** @param {Record<string, unknown>} st */
export function hydrateProfileSettings(st) {
  if (!st || typeof st !== "object") return st;
  ensureProfileTemplateDefaults(st);
  if (st.hideListadoProblemasAiPrompt === undefined) {
    st.hideListadoProblemasAiPrompt = true;
  }
  return st;
}

export const profileWindowHandlers = {
  toggleProfileSection,
  openProfileFromHeader,
  openProfileModal,
  closeProfileModal,
  onAppModeChange,
  toggleHeaderWorkMode,
  setWorkModeFromHeader,
  saveQuickOutputFormat,
  setHideManejoSection,
  setHideClinicoTab,
  setHideListadoProblemasAiPrompt,
  closeClinicoUnlockModal,
  confirmClinicoUnlock,
  openTemplatesModal,
  openNoteFormatsFromProfile,
  openIndicaFormatsFromProfile,
  saveDefaultFormatsFromEditor,
  exitFormatsEditor,
  updateDefaultFormatField,
  resetProfileTemplates,
  saveSettings,
  closeTemplatesModal,
  saveTemplates,
  copyCensoFromListado,
};

export { updateDefaultFormatField };

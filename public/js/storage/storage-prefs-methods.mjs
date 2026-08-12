import { safeParseObject } from './storage-core.mjs';

export const prefsStorageMethods = {
  getSettings() {
    return safeParseObject(localStorage.getItem('rpc-settings'));
  },

  /**
   * Save application settings to localStorage
   * @param {Object} settings - Settings object
   */
  saveSettings(settings) {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  },

  /**
   * Get current theme preference from localStorage
   * @returns {string} Theme name ('light' or 'dark')
   */
  getTheme() {
    return localStorage.getItem('theme') || 'light';
  },

  /**
   * Save theme preference to localStorage
   * @param {string} theme - Theme name ('light' or 'dark')
   */
  saveTheme(theme) {
    localStorage.setItem('theme', theme);
  },

  /**
   * Get guided tour completion version from localStorage
   * @returns {string|null} Guided tour version or null if not completed
   */
  getGuidedTourVersion() {
    return localStorage.getItem('rpc-guidedTourDone');
  },

  /**
   * Save guided tour completion version to localStorage
   * @param {string} version - Guided tour version
   */
  saveGuidedTourVersion(version) {
    localStorage.setItem('rpc-guidedTourDone', version);
  },

  /**
   * Remove guided tour completion flag from localStorage
   */
  removeGuidedTourVersion() {
    localStorage.removeItem('rpc-guidedTourDone');
  },
};

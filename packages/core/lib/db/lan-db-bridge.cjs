'use strict';

/** @type {import('./db-manager.mjs').DbManager | null} */
let lanDbManager = null;

/** @param {import('./db-manager.mjs').DbManager | null} mgr */
function setLanDbManager(mgr) {
  lanDbManager = mgr;
}

function getLanDbManager() {
  return lanDbManager;
}

module.exports = { setLanDbManager, getLanDbManager };

/**
 * Default update feed for the Electron app. `worker` (default for new
 * builds) points electron-updater at the rmas-update-feed Cloudflare Worker
 * (cloud/update-worker), which probes GitHub then GitLab. `github` restores
 * today's direct-to-GitHub behavior — an easy revert once mausalas99/r-mas
 * is public again (see cloud/update-worker/README.md).
 *
 * Keep in sync with lib/update-feed.mjs (ESM twin used by renderer + tests).
 */
const UPDATE_FEED_MODE = 'worker'; // 'github' | 'worker'
const UPDATE_WORKER_URL = 'https://rmas-update-feed.rmas-workersdev.workers.dev/';

module.exports = { UPDATE_FEED_MODE, UPDATE_WORKER_URL };

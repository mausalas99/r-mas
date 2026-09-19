/** @typedef {'ws' | 'poll' | 'offline'} CloudSyncTransport */

import { createRoomWsController } from './room-sync-ws-internals.mjs';

/**
 * Room DO WebSocket — revision hints only; pull applies data.
 * @param {{
 *   getBaseUrl: () => string,
 *   getToken: () => string,
 *   getRoomId: () => string,
 *   getRevision: () => number,
 *   onRevisionHint?: (revision: number) => void,
 *   onTransportChange?: (transport: CloudSyncTransport) => void,
 * }} deps
 */
export function createRoomSyncWs(deps) {
  return createRoomWsController(deps);
}

/** Resolve live Conexión chip status from runtime + outbox (avoids stale "Nube al día"). */

import { getSharedNubeOutbox, getSharedNubeRuntime } from './panel-conexion-runtime.mjs';

/** @param {{ runtime?: any, outbox?: any } | undefined} sources */
function chipSources(sources) {
  if (sources) return sources;
  return { runtime: getSharedNubeRuntime(), outbox: getSharedNubeOutbox() };
}

/**
 * The runtime only re-reads the outbox on its own cycles, so rows that land
 * outside one — above all the SQLCipher rows `createSqlcipherOutbox().hydrate()`
 * restores after boot — leave it sitting at 'idle' with work still queued. The
 * chip asks the outbox itself so that stall can never read as "Nube al día".
 *
 * @param {{ runtime?: any, outbox?: any }} [sources] Defaults to the shared
 *   runtime/outbox the panel runs on; passed in by tests.
 * @returns {{ status: string, detail: string, transport: 'ws' | 'poll' | 'offline' }}
 */
export function resolveCloudConexionChipStatus(sources) {
  const { runtime, outbox } = chipSources(sources);
  const detail = String(runtime?.getDetail?.() || '');
  const transport = runtime?.getTransportState?.() || 'poll';
  const pending = outbox?.list?.().length || 0;
  return { status: liveChipStatus(runtime, pending, transport), detail, transport };
}

/**
 * The sync cycle can settle on 'idle' over the HTTP poll fallback while the
 * live WS channel itself is down and still reconnecting — that used to read as
 * green "Nube al día" even though the channel was not live. A room's runtime
 * always requests a WS (see startSharedNubeRuntime), so seeing 'poll' here
 * means the channel isn't up, not a deliberate mode.
 *
 * A runtime that reports 'pending' itself could not reach the Worker (or it
 * was busy) and holds queued changes: keep «Pendiente · sin conexión» — the
 * cause is the server, not only the live channel.
 * @param {any} runtime @param {number} pending @param {string} transport
 */
function liveChipStatus(runtime, pending, transport) {
  const raw = String(runtime?.getStatus?.() || 'idle');
  if (raw !== 'idle') return raw;
  if (runtime && transport === 'poll') return 'reconnecting';
  return pending > 0 ? 'pending' : raw;
}

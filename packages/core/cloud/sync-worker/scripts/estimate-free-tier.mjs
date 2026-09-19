#!/usr/bin/env node
/**
 * Free-tier headroom for Nube sync (poll-only or realtime DO+WS).
 * Run: npm run estimate:free
 *
 * Institutional default: ~47 R1 (primary editors) + ~10 R2/R3/R4 (mostly readers).
 * USERS=60 is a soft rollout estimate, not a hard cap.
 *
 * Env overrides:
 *   USERS              — soft account ceiling (default EDITORS+VIEWERS)
 *   EDITORS            — R1-style primary editors (default 47)
 *   VIEWERS            — R2/R3/R4 mostly read/sync (default 10)
 *   CONCURRENT_EDITORS — peak focused R1 clients (default min(EDITORS, 28))
 *   CONCURRENT_VIEWERS — peak focused senior clients (default min(VIEWERS, 8))
 *   CONCURRENT         — override total concurrent (ignores editor/viewer split)
 *   HOURS              — active hours per concurrent user (default 12)
 *   POLL_SEC           — poll when poll-only or WS fallback (default 20)
 *   POLL_SEC_WS        — safety poll when WS healthy (default 90; realtime only)
 *   REALTIME           — 1 = DO signal + relaxed poll; 0 = poll-only
 *   EDITS_PER_HOUR_EDITORS — default 30
 *   EDITS_PER_HOUR_VIEWERS — default 4 (occasional senior edit)
 *   PUSHES_PER_EDIT    — coalesced pushes per edit burst (default 0.35)
 *   PEERS_PER_SIGNAL   — other room members who pull on revision signal (default 9)
 *   WRITES_PER_PUSH    — D1 rows written per push (default 2)
 */
const editors = Number(process.env.EDITORS || 47);
const viewers = Number(process.env.VIEWERS || 10);
const users = Number(process.env.USERS || editors + viewers);

const concurrentEditors = Number(
  process.env.CONCURRENT_EDITORS || Math.min(editors, 28)
);
const concurrentViewers = Number(
  process.env.CONCURRENT_VIEWERS || Math.min(viewers, 8)
);
const concurrentFromEnv = Number(process.env.CONCURRENT || 0);
const concurrent =
  concurrentFromEnv > 0
    ? concurrentFromEnv
    : concurrentEditors + concurrentViewers;

const hours = Number(process.env.HOURS || 12);
const pollSec = Number(process.env.POLL_SEC || 20);
const pollSecWs = Number(process.env.POLL_SEC_WS || 90);
const realtime = String(process.env.REALTIME || '0') === '1';
const editsPerHourEditors = Number(process.env.EDITS_PER_HOUR_EDITORS || 30);
const editsPerHourViewers = Number(process.env.EDITS_PER_HOUR_VIEWERS || 4);
const pushesPerEdit = Number(process.env.PUSHES_PER_EDIT || 0.35);
const peersPerSignal = Number(process.env.PEERS_PER_SIGNAL || 9);
const writesPerPush = Number(process.env.WRITES_PER_PUSH || 2);

const safetyPollSec = realtime ? pollSecWs : pollSec;
const safetyPolls = Math.ceil((concurrent * hours * 3600) / safetyPollSec);

const editorPushesPerDay = Math.ceil(
  concurrentEditors * editsPerHourEditors * hours * pushesPerEdit
);
const viewerPushesPerDay = Math.ceil(
  concurrentViewers * editsPerHourViewers * hours * pushesPerEdit
);
const pushesPerDay = editorPushesPerDay + viewerPushesPerDay;
const signalPulls = realtime ? Math.ceil(pushesPerDay * peersPerSignal) : 0;
const workerPulls = safetyPolls + signalPulls;
const workerRequests = workerPulls + pushesPerDay;

const d1Writes = pushesPerDay * writesPerPush;

const doConnects = concurrent * 2;
const doNotifyRpc = realtime ? pushesPerDay : 0;
const doRequests = doConnects + doNotifyRpc;

const freeWorkerReqDay = 100_000;
const freeDoReqDay = 100_000;
const freeWritesDay = 100_000;

const out = {
  mode: realtime ? 'realtime_ws' : 'poll_only',
  assumptions: {
    usersSoftCeiling: users,
    editorsR1: editors,
    viewersSeniors: viewers,
    concurrentFocused: concurrent,
    concurrentEditors,
    concurrentViewers,
    hours,
    pollSec,
    pollSecWs: realtime ? pollSecWs : null,
    editsPerHourEditors,
    editsPerHourViewers,
    pushesPerEdit,
    peersPerSignal: realtime ? peersPerSignal : 0,
    writesPerPush,
  },
  estimated: {
    safetyPollsPerDay: safetyPolls,
    editorPushesPerDay,
    viewerPushesPerDay,
    pushesPerDay,
    signalPullsPerDay: signalPulls,
    workerRequestsPerDay: workerRequests,
    d1RowsWrittenPerDay: d1Writes,
    doRequestsPerDay: doRequests,
  },
  freeLimits: {
    workerRequestsPerDay: freeWorkerReqDay,
    doRequestsPerDay: freeDoReqDay,
    d1RowsWrittenPerDay: freeWritesDay,
  },
  headroom: {
    workerRequestPct: Math.round((workerRequests / freeWorkerReqDay) * 1000) / 10,
    doRequestPct: Math.round((doRequests / freeDoReqDay) * 1000) / 10,
    d1WritePct: Math.round((d1Writes / freeWritesDay) * 1000) / 10,
  },
  notes: [
    'Institutional model: ~47 R1 do most edits; R2/R3/R4 mostly read + occasional push.',
    'USERS is a soft rollout estimate (~60), not a hard platform cap.',
    'PEERS_PER_SIGNAL ≈ room members − 1 (seniors still pull on R1 signals).',
    'Stress: CONCURRENT_EDITORS=47 REALTIME=1 npm run estimate:free',
  ],
};

console.log(JSON.stringify(out, null, 2));

let failed = false;
if (workerRequests > freeWorkerReqDay) {
  console.error(
    `\n⚠ Worker requests ${workerRequests} exceed Free cap ${freeWorkerReqDay}.`
  );
  failed = true;
}
if (realtime && doRequests > freeDoReqDay) {
  console.error(`\n⚠ DO requests ${doRequests} exceed Free cap ${freeDoReqDay}.`);
  failed = true;
}
if (d1Writes > freeWritesDay) {
  console.error(`\n⚠ D1 writes ${d1Writes} exceed Free cap ${freeWritesDay}.`);
  failed = true;
}

if (failed) {
  console.error('Raise poll interval, reduce concurrent editors, or plan Paid tier.');
  process.exit(2);
}

console.error(
  `\n✓ Within Free caps (${realtime ? 'realtime WS + relaxed poll' : 'poll-only'}).`
);

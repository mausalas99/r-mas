# LAN Delta Sync Design

## Summary

LAN delta sync adds field-level synchronization for the highest-collision clinical editing paths while preserving the existing full-bundle sync as the compatibility and recovery baseline.

The v1 scope is intentionally narrow:

- `historiaClinica`
- `agenda`
- `todo`

The first version does not include `clinicalOps`, rosters, manejo, or administrative patient fields such as room, bed, and team assignment. Those domains stay on the existing LAN paths until the delta engine is proven under active charting load.

## Goals

- Avoid document-level clobbering when peers edit different fields of the same entity.
- Preserve user edit intent during offline outbox flushes.
- Keep mixed-version LAN rooms convergent while upgraded clients gain delta benefits.
- Keep conflict feedback non-blocking but visible for clinical safety.
- Reuse the current mutation mental model instead of introducing RFC 6902 JSON Patch.

## Non-Goals

- No CRDT list editing in v1.
- No domain-specific operation registry in v1.
- No proxy-based observer for initial delta generation.
- No blocking path-level conflict review UI.
- No hard protocol cutover that requires all peers to update at once.

## Architecture

The design uses a **delta overlay, bundle baseline** model.

The host remains authoritative for canonical room state. Deltas are a more precise write path and replay optimization, not a replacement for full bundle sync.

V1 clients announce support in `livesync:hello`:

```js
{
  type: 'livesync:hello',
  roomId,
  clientId,
  capabilities: {
    deltaSync: 1,
    deltaEntities: ['historiaClinica', 'agenda', 'todo'],
    lastDeltaSeq: 1042
  }
}
```

The host stores per-client capabilities for the live room.

- V1 clients send `livesync:delta` over WebSocket for live edits.
- V1 clients send `POST /api/lan/v1/rooms/:id/delta` for offline outbox flushes.
- The host applies accepted paths to canonical entity state, bumps entity/room versions, and appends a short delta log entry.
- V1 peers receive canonical accepted deltas.
- V0 peers receive revision/full-bundle signals and continue converging through the existing sync path.
- Reconnect begins with full bundle catch-up unless the client and host agree that `lastDeltaSeq` can be replayed without gaps.

Mixed-version rooms must converge even when older peers ignore deltas. Therefore every accepted delta immediately updates the host's canonical bundle/entity state. The delta log is a recent replay cache, not the source of truth.

## Host Data Model

Each delta-enabled host entity keeps a flat `fieldMeta` dictionary beside the existing entity record.

```js
{
  version: 43,
  data: {
    labsAtAdmission: { na: 140 }
  },
  fieldMeta: {
    'labsAtAdmission.na': {
      clientTimestamp: 1718293049283,
      committedAt: '2026-06-05T20:45:10.000Z',
      deltaSeq: 1045,
      clientId: 'lc_a'
    }
  },
  updatedAt: '2026-06-05T20:45:10.000Z',
  deleted: false
}
```

`fieldMeta` is physically flat for O(1) lookup by normalized path. It still represents a logical metadata tree because each key maps to one nested field in `data`.

`clientTimestamp` preserves edit intent from the originating client. `committedAt` and `deltaSeq` are host-assigned and provide deterministic ordering. `deltaSeq` is monotonic per room.

## Delta Payload

Delta payloads extend the current mutation shape instead of replacing it with RFC 6902 JSON Patch.

```js
{
  entityType: 'historiaClinica',
  entityId: 'pat_123',
  expectedVersion: 42,
  clientId: 'lc_a',
  txId: 'tx_abc123',
  pathValues: {
    'labsAtAdmission.na': 140
  },
  pathMeta: {
    'labsAtAdmission.na': {
      clientTimestamp: 1718293049283
    }
  }
}
```

Every key in `pathValues` must have matching metadata in `pathMeta`. Omission means no change. An explicit `null` value means clear this field and still participates in field-level ordering.

```js
{
  pathValues: {
    'labsAtAdmission.na': null
  },
  pathMeta: {
    'labsAtAdmission.na': { clientTimestamp: 1718294000000 }
  }
}
```

## Path Rules

The host normalizes and validates every path before it reaches the apply loop.

Rejected paths include:

- Unknown paths for the entity type.
- Prototype-pollution paths such as `__proto__`, `prototype`, or `constructor`.
- Paths that cross numeric array indexes.
- Paths that try to modify entity identity/version fields outside the protocol.

Array-index paths are unsafe because indices shift under concurrent insert/delete operations. V1 must reject paths such as `plan.0.text`. Repeated list structures may only be replaced as an allowlisted opaque section, or they remain on the legacy sync path until migrated to stable IDs or typed list operations later.

## Conflict Resolution

WebSocket and HTTP deltas use one host pipeline.

1. Validate `entityType`, `entityId`, `expectedVersion`, `pathValues`, and `pathMeta`.
2. Normalize paths and apply the path allowlist.
3. For each path, compare `pathMeta[path].clientTimestamp` with `entity.fieldMeta[path].clientTimestamp`.
4. Accept paths with newer timestamps.
5. Use host `committedAt` / `deltaSeq` and deterministic `clientId` ordering for ties or suspicious timestamps.
6. Apply only accepted paths to canonical `data`.
7. Store `fieldMeta` for accepted paths with `clientTimestamp`, `committedAt`, `deltaSeq`, and `clientId`.
8. Bump entity `version` and room `revision` if at least one path was accepted.
9. Return and broadcast `acceptedPaths` and `rejectedPaths`.

The host may partially accept a delta. For example, one payload can accept `labsAtAdmission.na` and reject `plan` if `plan` was already superseded by a newer edit.

Response statuses:

- `ok`: all paths accepted.
- `partial_success`: at least one path accepted and at least one path rejected.
- `stale_delta`: all paths rejected; no state mutation.
- `invalid_delta`: payload or path validation failed.

Example response:

```json
{
  "status": "partial_success",
  "deltaSeq": 1045,
  "acceptedPaths": ["labsAtAdmission.na"],
  "rejectedPaths": ["plan"],
  "rejectedMeta": {
    "plan": {
      "winnerClientId": "lc_b",
      "winnerCommittedAt": "2026-06-05T20:45:10.000Z"
    }
  }
}
```

## Broadcast And Echo Suppression

Accepted deltas are broadcast as host-canonical deltas. The broadcast includes origin and transaction metadata:

```js
{
  type: 'livesync:delta:applied',
  roomId,
  originClientId: 'lc_a',
  txId: 'tx_abc123',
  deltaSeq: 1045,
  entityType: 'historiaClinica',
  entityId: 'pat_123',
  version: 43,
  acceptedPaths: ['labsAtAdmission.na'],
  rejectedPaths: ['plan'],
  pathValues: {
    'labsAtAdmission.na': 140
  },
  fieldMeta: {
    'labsAtAdmission.na': {
      clientTimestamp: 1718293049283,
      committedAt: '2026-06-05T20:45:10.000Z',
      deltaSeq: 1045,
      clientId: 'lc_a'
    }
  }
}
```

The originating client suppresses a successful echo when `originClientId` and `txId` match a pending local transaction. It still updates local base/version metadata. If the echo is a partial success, the client must reconcile rejected paths from host state and show a non-blocking toast.

Remote apply must run under an internal guard so local save hooks do not enqueue another outbound delta while applying a host broadcast.

## Client UX

Rejected paths must not be silent. The client maps raw paths to Spanish UI labels in renderer code and shows a non-blocking toast.

Example label map:

```js
{
  'historiaClinica.labsAtAdmission': 'Laboratorios de ingreso',
  'historiaClinica.labsAtAdmission.na': 'Sodio',
  'historiaClinica.signosVitalesIngreso.fc': 'Frecuencia cardiaca',
  'historiaClinica.plan': 'Plan'
}
```

Example toast:

> Tu cambio en "Plan" fue reemplazado por una edición más reciente en la sala.

The host does not own human-readable labels. It returns canonical protocol facts, and the renderer decides presentation.

## Offline Outbox

Offline edits should flush as deltas, not as full bundles, whenever they target v1 entities and paths. This avoids reconnect clobbering after a client edits one field while the ward continues editing other fields.

Outbox items remain ordered. V1 may coalesce only consecutive pending deltas for the same `entityType + entityId + path` when no intervening delta depends on the earlier value. Different paths and meaningful section changes preserve sequence.

Each path carries its own timestamp:

```js
{
  kind: 'delta',
  payload: {
    entityType: 'historiaClinica',
    entityId: 'pat_123',
    expectedVersion: 42,
    clientId: 'lc_a',
    txId: 'tx_abc123',
    pathValues: {
      'labsAtAdmission.na': 140
    },
    pathMeta: {
      'labsAtAdmission.na': {
        clientTimestamp: 1718293049283
      }
    }
  }
}
```

## Delta Replay

The host keeps a short per-room delta log. Each log entry includes:

- `deltaSeq`
- `committedAt`
- `originClientId`
- `txId`
- `entityType`
- `entityId`
- `version`
- `acceptedPaths`
- `pathValues`
- `fieldMeta`

On reconnect, a v1 client sends `lastDeltaSeq`. If the host can replay a contiguous range, it replays accepted deltas before returning the client to live mode. If the range has a gap or has aged out, the client performs the existing full bundle reconcile, updates its base state, and resumes live delta subscription.

## Backward Compatibility

Mixed v0/v1 rooms are supported.

- V1 clients announce delta capability and receive delta broadcasts.
- V0 clients do not need to understand deltas. They continue to receive revision hints and full-bundle sync signals.
- V0 writes remain accepted through legacy paths.
- When a legacy write touches an entity with `fieldMeta`, the host treats it as an opaque entity or section replacement and updates corresponding metadata at the replacement scope.
- Full bundle reconcile remains the repair path for all clients.

This avoids a hard cutover while still protecting upgraded clients from high-frequency clinical edit collisions.

## Testing Plan

Host tests:

- Valid delta accepts newer path and updates canonical entity data.
- Stale path is rejected without mutating state.
- One payload can produce `partial_success`.
- Explicit `null` clears a field and updates `fieldMeta`.
- Prototype-pollution paths are rejected.
- Array-index paths are rejected.
- WS `livesync:delta` and HTTP `POST /delta` use the same apply pipeline.
- Delta log replay succeeds for contiguous ranges.
- Delta log gaps force full bundle fallback.
- Legacy writes update canonical state and keep v0/v1 convergence.

Client tests:

- Delta generation uses explicit `pathValues` / `pathMeta`.
- Outbox flush preserves sequence and only coalesces safe same-path edits.
- Rejected paths map to friendly Spanish labels in a toast.
- Remote apply guard prevents outbound echo loops.
- Origin echo suppression acknowledges successful `txId` broadcasts.
- Partial-success echo reconciles rejected paths instead of being fully ignored.
- Full bundle catch-up runs before live delta mode when replay is unavailable.

Integration tests:

- Mixed v0/v1 room: v1 delta updates canonical host bundle; v0 peer converges via legacy reconcile.
- Offline v1 client flushes a single-path delta after concurrent edits to other paths; host accepts only valid newer paths and preserves unrelated fields.
- Reconnect with `lastDeltaSeq` replays recent deltas; reconnect after log expiry falls back to full sync.

## Rollout Notes

Implementation should start with explicit mutation adapters for `historiaClinica`, `agenda`, and `todo`. Avoid proxy observers until the explicit path model is proven.

The initial path allowlist should be conservative. Collaborative list internals should stay opaque unless they already use stable IDs.

The first release should keep full-bundle reconcile visibly available in diagnostics, because it remains the consistency repair mechanism.

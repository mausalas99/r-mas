# LAN Command Sync Substrate Design

## Summary

This design adds a registry-driven command sync path for the LAN hot paths that become painful on slow or unstable ward networks.

The first proof domains are:

- `estadoActual`: field/key updates with LWW conflict resolution.
- `eventualidades`: add-only append log with stable-id dedupe.
- `pendientes`: item commands for add, update, and complete. Delete/archive is out of scope for this pass.

Historia clínica, clinicalOps/teams, manejo, patient roster, and administrative patient fields stay on their existing LAN paths unless explicitly registered later. The goal is to prove a domain-agnostic command substrate without a big-bang rewrite.

## Goals

- Keep UI latency tied to local writes, not network round trips.
- Persist every accepted command before ACK so clinical data survives host crashes after acknowledgement.
- Reuse the existing room-scoped `deltaSeq` as the host-authoritative command sequence.
- Coalesce expensive materialization and snapshot persistence outside the command ACK path.
- Make command routing explicit through a registry so future domains can opt in safely.
- Preserve full-bundle sync as the compatibility and recovery fallback.

## Non-Goals

- No HC migration in this proof.
- No CRDTs in this proof.
- No delete/archive for `eventualidades` or `pendientes`.
- No replacement of existing bundle sync, LAN discovery, auth, or clinicalOps sync.
- No requirement that clients know or submit the next server sequence.

## Architecture

The design adds a command path beside the current full-bundle and field-delta paths:

1. UI writes to the local store first and updates immediately.
2. The client appends a typed command to a persistent local outbox.
3. Background sync posts the command to `POST /api/lan/v1/rooms/:roomId/commands`.
4. The host command registry validates the domain and operation.
5. The resolver applies the registered strategy to in-memory canonical room state.
6. The host assigns the next room-scoped `deltaSeq`.
7. The host durably appends the compact accepted command/delta log before returning ACK.
8. The host broadcasts a canonical applied-command message.
9. `sync-scheduler` coalesces materialized room view and snapshot persistence.

The key invariant is:

> ACK waits for the L1 command log, not for L2 materialization.

This keeps command submission durable without making every user action wait on full room bundle serialization.

## L1/L2 Commit Model

### L0: Client Submission

The client submits a typed command with stable identity and advisory sync context. The command includes `commandId`, `clientId`, `clientCreatedAt`, `baseSeq`, `domain`, `op`, and a JSON `payload`.

The host ignores any client-supplied `deltaSeq`. `baseSeq` is advisory conflict context only.

### L1: Atomic Host Command Commit

The host must complete L1 before returning ACK:

- Validate the command envelope and registered domain/op.
- Resolve conflict semantics against in-memory state.
- Assign the next room `deltaSeq`.
- Update in-memory canonical state.
- Append a compact command log entry durably.

If the process crashes after ACK, replaying the durable command log must recover the accepted command.

### L2: Coalesced Materialization

After L1 succeeds, the host calls `syncScheduler.scheduleMaterialize(roomId, { reason })`.

L2 is responsible for:

- Materializing derived room views.
- Persisting the current snapshot once per coalesced window.
- Keeping bundle consumers and legacy sync paths convergent.

`scheduleMaterialize()` must provide an at-least-once guarantee for each dirty room. If any accepted command marks a room dirty, a materialization must eventually run unless an explicit `flush()` handles it first.

## Sync Scheduler

Add `lan-squad/sync-scheduler.js` as the owner of L2 coalescing policy.

Proposed interface:

```js
createSyncScheduler({
  hostStore,
  windowMs: 50,
})

scheduleMaterialize(roomId, { reason })
flush(roomId, { reason })
flushAll({ reason })
```

`host-store.js` remains responsible for counters, in-memory state, entity versions, and durable L1 log appends. The scheduler owns timers and flush policy.

`flush(roomId, { reason })` must:

- Clear any pending throttle for the room.
- Run materialization immediately.
- Persist the current snapshot once.
- Return `{ ok, roomId, revision, latestDeltaSeq, reason }`.

Use `flush()` for manual "Sync now", shutdown, tests, and any snapshot endpoint that must serve fully materialized views. The flush endpoint is non-destructive and should use the same LAN room authorization as other room APIs, with a light per-client/room rate limit.

## Command Registry

The registry is the single source for command-path domain behavior. It decides which domains use the new substrate and which fall back to legacy sync.

Each domain registers:

```js
{
  domain,
  strategy,
  ops,
  validate(command),
  apply({ command, currentState, roomState }),
  materialize({ roomState })
}
```

`validate(command)` must check:

- Required envelope fields.
- Domain/op support.
- Payload shape.
- Stable entity identifiers.
- `baseSeq` staleness.

If `baseSeq` is more than 150 accepted commands behind the host `deltaSeq`, the registry/resolver returns `STALE_BASE_SEQ_REQUIRES_SNAPSHOT`. This fits inside the current 200-entry `deltaLog` retention while leaving headroom for concurrent activity. The client must pause that domain's queue, catch up via deltas or full bundle, then replay still-valid local commands.

## Domain Strategies

### `estadoActual`: `LWW_SCALAR`

Use for monitoring/vitals state that changes frequently during a shift.

Commands update a specific key or stable nested path. Conflict resolution is per key:

1. Newer `clientCreatedAt` wins.
2. Ties use `clientId`.
3. Remaining ties use `commandId`.
4. Accepted history is finalized by host-assigned `deltaSeq`.

Clock drift is warn-only in v1. If `clientCreatedAt` is more than 10 minutes from host `committedAt`, record diagnostics but do not reject unless another validation rule fails.

### `eventualidades`: `APPEND_LOG`

Initial scope is add-only.

Commands append an event with a stable `eventualidadId` and `commandId`. The host dedupes by stable id and existing semantic dedupe logic such as `dedupeEventualidadKey`.

Repeated submissions of the same stable id or same command are treated as idempotent no-ops, not errors. Display may use clinical event time, but convergence and replay use `deltaSeq`.

### `pendientes`: `COMMAND_ITEM`

Register `pendientes` as a named proof domain even if it maps onto existing todo storage.

Initial operations:

- `add`
- `update`
- `complete`

Each command targets a stable item id. LWW applies per item for update/complete using `clientCreatedAt`, `clientId`, and `commandId`; host `deltaSeq` records final accepted order. Delete/archive is deferred to a later tombstone-aware design.

## API Contract

### Submit Command

`POST /api/lan/v1/rooms/:roomId/commands`

Request:

```js
{
  commandId: 'cmd_uuid',
  domain: 'estadoActual',
  op: 'updateField',
  roomId: 'sala-1',
  patientId: 'pat_123',
  entityId: 'pat_123:estadoActual',
  clientId: 'lc_a',
  clientCreatedAt: 1718293049283,
  baseSeq: 1042,
  lastAppliedSeq: 1042,
  payload: {
    path: 'signosVitales.fc',
    value: 110
  }
}
```

Required envelope fields:

- `commandId`
- `domain`
- `op`
- `roomId`
- `clientId`
- `clientCreatedAt`
- `baseSeq`
- `payload`

`payload` is a JSON object. The envelope should be strictly typed and rejected when required fields are missing or unknown domains/ops are used.

Success:

```js
{
  ok: true,
  status: 'accepted',
  commandId: 'cmd_uuid',
  domain: 'estadoActual',
  op: 'updateField',
  roomId: 'sala-1',
  patientId: 'pat_123',
  entityId: 'pat_123:estadoActual',
  deltaSeq: 1043,
  revision: 88,
  committedAt: '2026-06-06T14:34:10.000Z',
  materialized: false
}
```

Duplicate retry:

```js
{
  ok: true,
  status: 'duplicate_ignored',
  commandId: 'cmd_uuid',
  deltaSeq: 1043,
  revision: 88
}
```

Stale base fallback:

```js
{
  ok: false,
  status: 'stale_base_seq_requires_snapshot',
  code: 'STALE_BASE_SEQ_REQUIRES_SNAPSHOT',
  latestDeltaSeq: 1198,
  fallback: 'sync_bundle'
}
```

### Broadcast

Accepted commands broadcast canonical host metadata:

```js
{
  type: 'livesync:command:applied',
  roomId,
  commandId,
  domain,
  op,
  originClientId: clientId,
  deltaSeq,
  revision,
  committedAt,
  payload
}
```

Clients must apply broadcasts in `deltaSeq` order. If `deltaSeq > lastAppliedSeq + 1`, the client pauses live application and requests `/api/lan/v1/rooms/:roomId/deltas?afterSeq=<lastAppliedSeq>`. If replay is unavailable, it falls back to full bundle.

### Flush

`POST /api/lan/v1/rooms/:roomId/flush`

Response:

```js
{
  ok: true,
  roomId: 'sala-1',
  revision: 88,
  latestDeltaSeq: 1043,
  reason: 'sync-now'
}
```

This endpoint is public to LAN-authenticated room clients in v1. It forces L2 materialization only. It does not accept new commands and does not mutate clinical intent.

## Client Outbox Lifecycle

The client-side outbox must be persistent and command typed. Each entry must include at minimum:

- `commandId`
- `domain`
- `op`
- `roomId`
- `clientId`
- `clientCreatedAt`
- `baseSeq`
- `payload`

Including `domain` and `op` is required for restart survival. After an application restart, the client must be able to resume the exact pending command without partial-replay ambiguity.

An outbox entry is deleted only after:

- `ok: true` with `accepted`, or
- `ok: true` with `duplicate_ignored`, or
- a non-retryable error that explicitly requires fallback or user intervention.

For `STALE_BASE_SEQ_REQUIRES_SNAPSHOT`, pause that domain's queue, perform catch-up/full-bundle recovery, then replay still-valid local commands.

Retry should use exponential backoff and connectivity-observer hints. UI state remains local-first while the queue drains in the background.

## Observability

Expose enough diagnostics to debug ward network failures:

- Local queue depth.
- Oldest pending command age.
- Last ACK time/status.
- Last applied `deltaSeq`.
- Last acked `commandId`.
- Scheduler pending rooms.
- Last flush reason and result.
- Stale-base fallback count.
- Duplicate retry count.
- Clock-drift warnings.
- Replay gap and full-bundle fallback count.

User-facing copy should be non-alarming and Spanish, for example: "Guardado localmente; se publicará al reconectar."

## Testing

Required tests:

- Duplicate retry returns `duplicate_ignored` and does not double-apply.
- `estadoActual` LWW resolves timestamp, `clientId`, and `commandId` ties deterministically.
- `eventualidades` add-only commands dedupe by stable id and semantic key.
- `pendientes` add/update/complete converge by stable item id.
- Scheduler coalesces multiple commands into one materialization window.
- `flush(roomId)` pre-empts the throttle and persists a current snapshot.
- Stale `baseSeq` returns `STALE_BASE_SEQ_REQUIRES_SNAPSHOT`.
- Broadcast gap triggers delta replay, then full-bundle fallback when replay has a gap.
- Client outbox survives restart with `domain`, `op`, and `commandId` intact.
- Host restart recovers accepted commands from the durable L1 log.

## Rollout Plan

1. Add registry interfaces and proof-domain registrations.
2. Add command endpoint and canonical broadcast.
3. Add L1 command log commit using existing room `deltaSeq`.
4. Add `sync-scheduler.js` and route materialization through it.
5. Wire client outbox command serialization for the three proof domains.
6. Add observability to LAN diagnostics.
7. Keep full-bundle sync as fallback throughout the rollout.

## V1 Implementation Defaults

- Stale `baseSeq` threshold: 150 commands behind the host `deltaSeq`.
- Clock-drift warning threshold: 10 minutes from host `committedAt`.
- Command log persistence: initially reuse room bundle persistence with compact command entries; split to a dedicated persisted log only if metrics show snapshot writes still dominate ACK latency.
- Flush endpoint: public to LAN-authenticated room clients with light per-client/room rate limiting.

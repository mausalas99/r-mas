# Clinical Data Reckoning — Program (post-8.0.5)

> **For implementation:** After this program is approved, use **superpowers:writing-plans** for one plan per phase (P1 → P5). Do not start a later phase until the prior phase’s acceptance gate passes — except **P3** may overlap P1/P2 once 8.0.5 LAN retirement ships.

**Date:** 2026-08-11  
**Status:** Draft for review  
**Codename:** Reckoning  
**Baseline:** **8.0.5** shipped (Nube-only sync per [`2026-08-07-lan-retirement-nube-only-design.md`](2026-08-07-lan-retirement-nube-only-design.md))  
**Target:** **8.1.x** — structural debt reduction without user-visible feature freeze  
**Related:** [`01-vision-north-star.md`](../../core/01-vision-north-star.md), [`2026-08-02-cloud-sync-free-pilot-design.md`](2026-08-02-cloud-sync-free-pilot-design.md), [`2026-08-07-lan-retirement-nube-only-design.md`](2026-08-07-lan-retirement-nube-only-design.md)

---

## Problem statement

8.0.x migrated **sync authority** to Nube, but the **write path** inside each client is still a stack of compensating layers:

```
Feature UI
  → mutate app-state globals (patients, labHistory, …)
  → debounced saveState()
  → localStorage blobs (storage.js)
  → SQLCipher clinical_blob (db-storage-bridge)
  → mutate-bridge maps memory → cloud ops
  → outbox → Worker
```

Each layer was added for a valid reason (offline, tour demos, web client, LAN era). Together they create:

- **Bridges** (`mutate-bridge`, `patients-bridge`, `db-storage-bridge`) that translate between representations of the same patient.
- **Dual domain logic** (`lib/db/clinical-access-*` vs `public/js/clinico-access-*`).
- **Residual LAN fossils** in storage keys, tests, and import graph even after Nube retirement.
- **Invalid states** that require reconcile/prune/legacy-ack code in `sync.js` and the renderer.

The product north star is unchanged. This program fixes **how data moves inside a client** so sync becomes a projection of one commit, not a sibling religion.

---

## Design invariant (locked)

> **One authoritative clinical write path per runtime:**  
> `command → repository (SQLCipher) → sync projector (outbox)`  
> The renderer holds **read models** subscribed to repository changes — not a parallel database in RAM.

Web/mobile clients without SQLCipher use an **in-memory repository implementation** with the same command API — not a second ad-hoc state tree.

---

## Phase map

```
P1 Canonical store ──► P2 Sync projection ──► P5 Read models + storage demotion
         │                      │
         └──────────┬───────────┘
                    ▼
              P4 Unified access (parallel after P1 API exists)
                    │
                    ▼
              P3 LAN graveyard completion (after 8.0.5; can start early)
```

| Phase | Spec | Shippable outcome |
| --- | --- | --- |
| **P1** | [`2026-08-11-p1-canonical-clinical-store-design.md`](2026-08-11-p1-canonical-clinical-store-design.md) | `clinical-repo` command API; vertical slice (eventualidades) writes DB-first |
| **P2** | [`2026-08-11-p2-sync-projection-outbox-design.md`](2026-08-11-p2-sync-projection-outbox-design.md) | Outbox fed from repo change log; `mutate-bridge` shrinks to op encoding |
| **P3** | [`2026-08-11-p3-lan-graveyard-completion-design.md`](2026-08-11-p3-lan-graveyard-completion-design.md) | Zero LAN imports in prod graph; storage blob cleanup; metrics baseline refresh |
| **P4** | [`2026-08-11-p4-unified-clinical-access-design.md`](2026-08-11-p4-unified-clinical-access-design.md) | `lib/clinical-scope/` pure domain; renderer/main import adapters only |
| **P5** | [`2026-08-11-p5-renderer-read-models-design.md`](2026-08-11-p5-renderer-read-models-design.md) | `app-state` demoted to read cache; localStorage prefs-only; migrate remaining domains |

Each phase must leave the app **usable on guardia** — no half-migrated save path that loses censo or breaks Nube pull.

---

## North-star fit

| Principle | How Reckoning serves it |
| --- | --- |
| Lower TTD | Fewer save layers → fewer “saved but not synced” bugs |
| LiveSync trust | One commit → one outbox entry → predictable LWW |
| Offline first-class | Repository + outbox queue; no LAN fallback required |
| Anti-goals | No rewrite in another language; no big-bang freeze |

---

## Non-goals (whole program)

- Rewriting the Cloudflare Worker protocol or D1 schema (except tombstone/ack cleanup tied to P2).
- CRDT / operational transform for clinical fields.
- Splitting Electron into a local microservice.
- EMR replacement or new user-facing features (features may **migrate** onto P1 API, not expand scope).
- Porting `.docx` generation off IPC.

---

## Release strategy

| Milestone | Contents | User-visible? |
| --- | --- | --- |
| **8.1.0** | P1 slice + P3 completion (if 8.0.5 left LAN residue) | No (unless P3 deletes broken dev paths) |
| **8.1.1** | P2 for P1 slice domains | No |
| **8.1.2–8.1.4** | Roll P1+P2 across census, labs, notes, EA | Incremental; each domain gated |
| **8.1.5** | P4 + P5 complete | No |
| **8.2.0** | Delete deprecated `saveState` hot path; bridge modules removed | Internal only; release notes mention “sync reliability” |

**Parallel work:** P4 can start once P1 defines stable patient/team IDs in repository commands. P3 can run anytime after 8.0.5 merges.

---

## Risk register

| Risk | Mitigation |
| --- | --- |
| Big-bang migration breaks guardia | Vertical slices per domain; feature flag `R_PLUS_REPO_WRITE_PATH=1` per domain |
| Tour/pitch demo patients | Keep `demo-pitch` injection at **read** layer only |
| Web/mobile without SQLCipher | Shared command API + in-memory repo impl (same tests) |
| `mutate-bridge` still needed during transition | P2 dual-write: old path + repo projector until domain flag on |
| Test suite size / flake | `test:one` per touched file; domain characterization tests before deleting bridges |
| Debt score during deletion (P3) | User-initiated `baseline.json` refresh in same release as LAN excision |

---

## Documentation deliverables

| Artifact | When |
| --- | --- |
| This program + P1–P5 specs | Review now |
| `plans/2026-08-11-clinical-data-reckoning.md` | After approval — ordered tasks per phase |
| `project-context.mdc` changelog | Each phase merge |
| `docs/logic/logic-index.md` | After P1 + P2 (clinical-repo, sync projector) |
| `RELEASE_NOTES_8.1.x.txt` | Per milestone — “confiabilidad de sincronización” only |

---

## Summary for PO

**Stop adding bridges; finish deleting LAN; make SQLCipher the only write path; let Nube sync project from that.**

Not a rewrite — a **vertical-slice migration** across 5 specs, shippable in 8.1.x without blocking guardia features.

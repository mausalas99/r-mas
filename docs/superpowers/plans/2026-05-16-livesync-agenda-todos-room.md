# LiveSync por sala — agenda y pendientes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Sincronizar agenda de procedimientos y pendientes solo dentro de una sala `live:{roomId}`, con snapshots locales, bundle opcional en host y LWW por `updatedAt`.

**Architecture:** Dos WebSockets en `LanClient` (sync + live); protocolo `livesync:*` en `live-sync-room.mjs`; host `roomSyncBundles`; hooks en `app.js` al guardar agenda/todos.

**Tech Stack:** Electron, `ws`, vanilla ESM, `node --test`.

**Spec:** [`2026-05-16-livesync-agenda-todos-room-design.md`](../specs/2026-05-16-livesync-agenda-todos-room-design.md)

---

Implementado en `main` (2026-05-16): ver commits `feat(livesync)` y archivos listados en el spec.

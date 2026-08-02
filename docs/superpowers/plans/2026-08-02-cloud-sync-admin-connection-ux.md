# Cloud Sync Connection UX + Admin Console — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace bolted-on Nube UI with account→Mi rotación→turn-room flow (unified @usuario), and ship full admin ops console for R4/program admin.

**Architecture:** Worker gains `role`/`turn_key`/`ensure-turn` + `/admin/*`. Renderer gets `panel-conexion`, `identity-bridge`, `ensure-turn-room`, `panel-admin`, Hallmark CSS. Same username on LAN and cloud.

**Tech Stack:** Existing cloud/sync-worker + public/js/features/cloud-sync + clinical-teams join hooks + clinical-privileges.

**Spec:** `docs/superpowers/specs/2026-08-02-cloud-sync-admin-connection-ux-design.md`

---

### Task 1: Schema + ensure-turn + user role

**Files:** Create `cloud/sync-worker/schema/002-admin-turn.sql`; Modify `rooms.js`, `auth.js`, `quotas.js`

- [ ] Migration: `users.role TEXT DEFAULT 'member'`, `users.disabled INTEGER DEFAULT 0`, `rooms.turn_key TEXT`, unique index on `(sala, turn_key)` where turn_key not null
- [ ] `POST /rooms/ensure-turn` `{ sala, turnKey? }` — normalize sala (allowlist), default turnKey = YYYY-MM-DD Mexico City, join-or-create, return room
- [ ] Reject auth for `disabled=1` users
- [ ] Register stores displayName as today; role member
- [ ] Tests for turn key + allowlist on ensure-turn helpers
- [ ] Commit: `feat(sync-worker): turn rooms, user role/disabled for admin`

### Task 2: Admin API

**Files:** Create `cloud/sync-worker/src/admin.js`; Modify `routes.js`, `errors.js`

- [ ] Authz: Bearer user with role admin/program_admin OR `X-Sync-Admin-Key` === env.SYNC_ADMIN_KEY
- [ ] Endpoints from spec: overview, rooms list/detail, rotate-code, purge, mutations, users search, revoke-sessions, promote, disable, delete user
- [ ] Overview includes counts + storage sum (Free meters best-effort)
- [ ] Unit tests for authz helpers
- [ ] README: SYNC_ADMIN_KEY + promote bootstrap
- [ ] Commit: `feat(sync-worker): admin ops API for R4/program admin`

### Task 3: Identity bridge + panel-conexion

**Files:** Create `identity-bridge.mjs`, `panel-conexion.mjs`, `public/styles/cloud-sync.css`; Modify panel mount, replace primary use of panel-nube-section

- [ ] Crear cuenta / Entrar: @usuario, nombre, contraseña (Sala/Torre only); Spanish Hallmark UI
- [ ] On success: upsert local clinical user username + clinical_name (identity-bridge)
- [ ] CTA Ir a Mi rotación when no team
- [ ] Status strip; avanzado URL collapsed
- [ ] Wire mount to replace nube section for cloud salas
- [ ] Tests: username normalize parity with clinical-username rules where possible
- [ ] Commit: `feat(cloud-sync): Conexión panel with unified @usuario identity`

### Task 4: ensure-turn on Mi rotación join

**Files:** Create `ensure-turn-room.mjs`; Modify teams join handler / invite success path

- [ ] After successful joinClinicalTeamByButton (cloud sala): call ensureTurnRoom
- [ ] Start sync runtime if needed
- [ ] Toast Spanish on success/fail
- [ ] Commit: `feat(cloud-sync): auto-join canonical turn room after Mi rotación`

### Task 5: Admin panel UI

**Files:** Create `panel-admin.mjs`, admin CSS section; Modify lan panel / nav for R4+program admin

- [ ] Gate with hasProgramAdminPrivileges || rank R4
- [ ] Sections: Resumen, Salas, Usuarios, Mutaciones, Peligro
- [ ] Call admin API; destructive confirms
- [ ] Commit: `feat(cloud-sync): Administración nube ops console`

### Task 6: User wipe docs + release notes

**Files:** Modify RELEASE_NOTES_7.9.0.txt, sync-worker README, optional migration flag doc

- [ ] Document local user wipe + cloud D1 reset; patients preserved
- [ ] Commit: `docs(7.9): user wipe and re-register cutover notes`


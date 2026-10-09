# 8 · The team layer: users, teams, guardia, handoff

> **You'll learn:** how R+ knows who you are, how teams and rotations are modelled, which patients each person may see or delete, how a guardia handoff (*entrega*) is built and carried to the next shift, how Interconsultas and Interno phones fit in, and how this team data ("clinicalOps") is stored and synced.
>
> **Prereqs:** [03](./03-shared-state-and-wiring.md), [09](./09-storage-and-security.md) (tables, IPC), [10](./10-nube-sync.md) (rooms, merges)

Paths are under `packages/core/`.

---

## The mental model

```
   users ──< team_membership >── teams ──< patient_team_assignment >── patients
     │                              │                                     │
     │ rank R1–R4 / Admin           │ sala, service, cycle letter A–D…    │
     │ sala                         │ rotation_active, archived_at        │
     ▼                              ▼                                     ▼
 privileges (what you may do)   on-call today? (cycle math)     scope (who sees whom)
                                    │
                         active_guardias  ◄── entrega (handoff) builds one row per patient
                                    │
              all of the above travels as ONE synced value: clinicalOps
```

The team layer is **relational data in SQLite** (real tables, unlike the JSON blobs for clinical content). It's exported as one snapshot called **clinicalOps**, pushed into the Nube room, and merged back into the tables on other devices.

---

## 1. Users and identity

### The `users` table
`lib/db/schema-primitives.mjs` (rebuilt in later migrations): `user_id`, **`username`** (unique), `rank` ∈ R1 · R2 · R3 · R4 · Admin, `clinical_name`, **`sala`**, `is_program_admin`, `last_activity_at`, and an RSA key pair (the "private key" column holds a plaintext PEM; see [13](./13-open-questions-and-doc-drift.md)).

**@usuario rules** (`lib/db/clinical-username.mjs`, mirrored in `public/js/clinical-username.mjs`): `^[a-z][a-z0-9_]{2,31}$`, with any leading `@` stripped and the name lowercased. Handles like `lc_*`, `peer_*`, `local_*` are machine stubs waiting to be claimed.

### Privileges
`lib/db/clinical-privileges.mjs` (mirrored in the renderer):

| Check | Who passes |
|---|---|
| `hasProgramAdminPrivileges` | `is_program_admin` or rank Admin |
| `canConfigureRotation`, `canManageInternoQr`, `canManageTeamRoster`, `hasElevatedTeamPrivileges`, `canDeleteDirectoryUser` | **R4 or program admin** |
| becoming program admin | requires the **admin code** (scrypt hash in `app_meta`), unless already admin |

### Worked example: registering ("Guardar perfil")
`public/js/features/clinical-onboarding-handlers.mjs` → `handleUsernameStepSubmit`:

1. **Claim the handle:** IPC `db:clinical-username-claim`. If it's taken, try to *resume* that identity (`db:clinical-identity-resume`).
2. **Save the profile:** `db:clinical-profile-upsert`. The DB also drops your memberships in teams of **other salas** (`reconcileTeamMembershipForSalaChange`).
3. Bind this device to the user (`rpc-settings`).
4. If the sala is on Nube (`isCloudSala`), `registerCloudDuringOnboarding()`: register/login (password ≥ 10 chars) → `ensureTurnRoom` → load the room key → pull → hydrate teams → start the sync runtime.
5. Fire `rpc-clinical-teams-changed` so every team-aware view refreshes ([03](./03-shared-state-and-wiring.md)).

Onboarding offers three modes (`clinical-onboarding-shell.mjs`): **Nube** ("Guardia con R+ Cloud"), **existing account**, and **local**. "Local" is **«Solo este equipo»**, and *equipo* here means *this computer*, not a clinical team (`rpc-settings.clinicalLocalOnly`).

The Learn Hub content is `public/js/onboarding-curriculum.mjs` (version 20) with separate chapters for Sala, Interconsultas and Guardia.

---

## 2. Teams and rotations

### Tables
| Table | Key columns |
|---|---|
| `teams` | `sala`, `service` (incl. «Rotación»), `sub_area_fraction` (cycle letter), `leader_user_id`, `rotation_active`, `archived_at`, `succeeds_team_id` |
| `team_membership` | `(team_id, user_id)`, member's cycle letter, `cycle_set_at` |
| `patient_team_assignment` | `(patient_id, team_id, effective_at)`. **The newest row with `effective_at ≤ now` wins.** A row with `team_id = ''` means "no team" (that's why v29 dropped the foreign key) |
| `rotation_cycles` | rotation periods |

### Cycle letters: who's on call today?
`lib/clinical-scope/cycle-letters.mjs`:

| Group | Letters | Cycle |
|---|---|---|
| Sala ward R2 | A–F | 6 days |
| Sala ward R1 | A1–D1, A2–D2 | 8 days |
| Everything else (incl. UCI / PostQx / Subespecialidad) | A–D | 4 days |

`isOnCallToday`: `(dayOfMonth − 1) % cycleLength === letterIndex`. A declared guardia (`team_guardia_today`) overrides the calculation for that team.

### Membership rules (`lib/db/clinical-access-teams-membership.mjs`)
- Joining a team **moves you off your other teams** by default.
- An **R2 may cover up to 2 teams** (`MAX_R2_TEAMS`).
- Creating a team in a sala that already has a live team creates it **staged** (`rotation_active = 0`) until the next rotation.

### «Nueva rotación» (`db:rotation-nueva`)
One transaction:
1. archive **all live teams, hospital-wide**, promote staged teams, clear all guardias;
2. move patients to successor teams (`succeeds_team_id`);
3. release patients whose team is archived (`team_id = ''`);
4. stamp `rotationNuevaAt`. When a peer sees a newer stamp, it runs the same archive locally.

> ⚠️ The IPC handler has **no privilege check**; only the UI hides the button (`canConfigureRotation`). See [13](./13-open-questions-and-doc-drift.md).

**"Unlock frees team patients"** (commit `a899362`): every DB unlock already ran `releaseArchivedTeamPatients`. The commit counts the released patients and shows a toast: *«N pacientes quedaron sin equipo porque su equipo se archivó.»* (IPC `db:take-unlock-notice`).

---

## 3. Who sees which patient (scope)

The pure evaluator is `lib/clinical-scope/evaluate/evaluate-clinical-scope.mjs`. Being in `lib/`, it can run anywhere (see [05](./05-codebase-map.md)). Checks in order:

1. **Preamble:** identity → admin → an *active guardia* covering you → the incoming-preview window
2. **Interconsultas** on-call rules
3. **Guardia** rules (when guardia mode is on)
4. **Rank:** R4 global; R1/R2/R3 by team assignment or handoff

**Where it's enforced:**
- **Desktop:** shows the **full census** and narrows with Filtros (`shouldUseCloudTeamPatientMirror` = false). The decision log notes that hard-hiding non-team charts broke visibility after team archives.
- **iPad / web:** a strict mirror (`mobile-team-patient-scope.mjs`): your joined teams' patients, those covered by your guardia, Interconsultas patients while on call, or unassigned patients that structurally match your team.

**Who can delete:** `canDeletePatientChart()`: anyone in local-only mode; R4/Admin any patient; everyone else only patients on a team they joined (toast *«Solo puedes eliminar pacientes de tu equipo»*).

**Which Nube room a patient goes to:** `resolveOperationalPatientSala()` (`features/cloud-sync/cloud-census-sala-push.mjs`): the **assigned team's sala** first, then the patient's own sala. Team assignment decides where data travels.

---

## 4. Guardia

### Two different "guardia" switches
| Switch | What it is |
|---|---|
| **Guardia view** (header density `guardia`, `features/chrome.mjs` `isGuardiaMode`) | the board layout for the night |
| `clinicalSessionContext.guardiaMode` (`guardia-mode-sync.mjs`) | a census filter, **«solo entregados»**: only patients handed to you |

### Worked example: the guardia board
`features/guardia-board-render.mjs` → `renderGuardiaBoard()`:
1. Build scope (today's declared guardias, who receives on call).
2. Pick the sala: last declared (24 h) → home sala → picker.
3. Filter patients by scope, then **by team sala** (not `patient.sala`).
4. `mountGuardiaCensusTable()`: Cama · Paciente · **Alterados** (out-of-range vitals, via `isVitalKeyAltered`) · Pendiente · Estado, grouped by team.
5. Clicking a row opens the **entrega modal**.

### Active guardias
`active_guardias`: one **Active** row per patient: `covering_user_id`, `source_team_id`, `is_critical`, `pendientes_json`, `vitals_frequency`, `last_vitals_check`, `status` (Active/Resolved), `updated_at`. Resolving writes a tombstone so peers don't resurrect it.

### Inicio de turno
A full-screen summary (`features/inicio-turno/`) opened from ⌘K: inherited pendientes, vitals due, overnight admissions, "lo primero" rows. It reads the **patients** list, not `active_guardias`.

---

## 5. Entrega: the handoff

### Worked example: handing a patient to the night R1
1. `openEntregaModal()` (`features/clinical-entrega/clinical-entrega-modal.mjs`) proposes who receives: the activator or **the sala's on-call R1** (`resolveR1GuardiaCovering`), from a rank-filtered list (`listEntregaTargetsR1/R2/R3`).
2. `buildEntregaSubmitPayload()` serializes **`pendientes_json` v2**: `{ vitalsPlan, handoffContext, patientCensus, items }`. The helpers live in **`lib/entrega/`** (`entrega-pendientes.mjs`, `entrega-handoff-context.mjs`, `entrega-vitals-plan.mjs`); the sync Worker imports them too ([05](./05-codebase-map.md)).
3. `submitEntregaAssignment()`:
   - signs the change (`signOutgoingLiveSyncMutation('entrega.assign')`);
   - IPC `db:guardia-upsert` → `upsertActiveGuardia()` (audit `entrega.assign`);
   - `pushCloudClinicalOpsNow()` + `scheduleCloudSyncPush()`.
4. **On the receiving device**, the `active_guardias` row arrives inside clinicalOps and is merged by `mergeActiveGuardias()` (`lib/db/clinical-ops-sync-merge-guardias.mjs`): last write per patient on `updated_at`.

> 📝 **Entrega templates** (`entrega_template_user` / `_team` tables, IPC `db:entrega-template-*`) exist and sync, but **no UI code calls them** today. **Pase-labs** (`GET /api/sync/v1/pase-labs`) returns **503 `temporarily_disabled`** since E2EE, because the server can no longer read labs.

---

## 6. Interconsultas and Interno

### Interconsultas mode
`rpc-settings.appMode !== 'sala'` → no sidebar; a **4-team board** fills the window (`features/interconsulta-team-board.mjs`). Roles rotate on the A–D cycle: *guardia · postguardia · activo* (`lib/clinical-scope/interconsulta-team-roles.mjs`). Buckets: preop · pendientes · under · archivado. Patients carry `interconsult_type` / `interconsult_status`. A rollover IPC (`db:clinical-interconsulta-rollover`) exists, but no caller was found.

### Interno MIP (medical interns' phones)
1. An R4/admin enables a sala (only Sala 1/2/E) → `sala_interno_access` token.
2. `buildInternoQrUrl()` → `<base>/interno/<sala>?t=<token>#k=<subkey>`, where the subkey is derived from the room key and travels only in the URL fragment.
3. The phone builds a medición with **`recordedBy: { kind: 'interno', … }`** (`lib/interno/interno-vitals.mjs`), encrypts it, and posts it.
4. The Worker (`cloud/sync-worker/src/interno/vitals.js`) writes it into `entries/<id>/monitoreo` as actor `interno:<sala>` and notifies the room.
5. The intern's board shows **only patients with an Active guardia in that sala** (`lib/interno/interno-scope.mjs`).

> ⚠️ Nothing on desktop reads `recordedBy`, and the `rpc-interno-vitals-synced` event has listeners but no sender. Intern vitals still appear (they're ordinary mediciones), but they aren't singled out.

---

## 7. How clinicalOps is stored and synced

### Export → push
`lib/db/clinical-ops-sync-export.mjs` → `exportClinicalOpsSnapshot()` collects: users, teams, memberships (+ removals and rejoins), assignments, `team_guardia_today`, active and resolved guardias, rotation cycles, archived teams, entrega templates, `rotationNuevaAt`. `filterClinicalOpsSnapshotForSala()` narrows it to one sala. It's pushed as **one op, `path: 'clinicalOps'`** (`features/cloud-sync/cloud-clinical-ops-sala.mjs`), always **pull-then-push** (`syncClinicalOpsForSala`).

### Merge on the receiving device (`lib/db/clinical-ops-sync-merge.mjs`)
Phases, in order:
1. newer `rotationNuevaAt` → run the archive locally
2. users (your own sala is never overwritten)
3. membership tombstones
4. teams (pick a winner, promote orphan staged teams, apply archives)
5. entrega templates (last write)
6. membership **union**, then enforce exclusivity
7. assignments **`INSERT OR IGNORE`** (append-only union)
8. `team_guardia_today` (last write by `declared_at`)
9. resolved, then active guardias

### And on the Worker?
With room encryption on, the clinicalOps value is an **opaque envelope**, so the Worker just **replaces** it whole. The client is responsible for merging before pushing (hence pull-then-push). For legacy plaintext rooms, `clinical-ops-lww.js` merges teams/users by id and unions assignments/memberships, but **overwrites** guardias and templates. Chapter [10](./10-nube-sync.md)'s "union by id" applies only to those few fields.

### IPC map
| File (`lib/db/`) | Channels |
|---|---|
| `ipc-handlers-register-profile.mjs` | profile get/upsert, username claim, admin code, identity resume, sign/verify change |
| `ipc-handlers-register-teams.mjs` | teams list/create/update/archive/join, members add/remove, user directory, team guardia set/clear |
| `ipc-handlers-register-guardia.mjs` | access bootstrap, scope context, guardia census, guardia upsert/resolve, rotation cycle, **rotation-nueva** |
| `ipc-handlers-register-interno.mjs` | interno QR tokens, entrega templates |
| `ipc-handlers-register-core.mjs` | clinicalOps export/merge, unlock notice |

---

## Check yourself

1. A Sala R2 with letter C: is she on call on the 9th of the month?
2. You archive a team. What happens to its patients?
3. Why must clinicalOps always pull before it pushes?
4. A patient is assigned to a team in Sala 2 but their own `sala` says Sala 1. Which Nube room gets their data?
5. Who can press «Nueva rotación», according to the UI and according to the IPC?

<details><summary>Answers</summary>

1. R2 cycle is 6 days (A–F); C is index 2; (9 − 1) % 6 = 2 → **yes**.
2. They get a `team_id = ''` assignment ("no team"), or move to the successor team if one is linked; the next unlock reports the count.
3. On encrypted rooms the Worker replaces the whole value; pushing without merging first would erase other devices' changes.
4. Sala 2: the assigned team's sala wins.
5. UI: R4/program admin. IPC: anyone (no check).
</details>

**Next:** [09 · Storage & security →](./09-storage-and-security.md)

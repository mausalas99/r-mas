---
type: "core"
name: "User Journey"
status: "stable"
dependencies: ["01-vision-north-star", "02-product-context"]
description: "Primary happy-path flows from the clinician's perspective."
---

# User Journey: R+

## Onboarding (first shift)

1. Install R+ from GitHub Releases (Mac `.dmg` / Windows `.exe`).
2. Choose sync mode: **sala Nube** or **solo mi equipo**.
3. Register **@usuario**, rango (R1–R4), sala/guardia.
4. Unlock SQLCipher clinical DB (local-first).
5. Optional: open **⇄** → R+ Cloud login → join sala.
6. Learn Hub / tutorial: **structure first** (Paciente | Laboratorio | Manejo | Agenda), then **+ Agregar** and complete **cuarto / cama / servicio** if the card is incomplete.

## Happy path — Magic moment (documentation)

1. Select patient in sidebar → **Paciente → Resumen** (glance home).
2. Open **Laboratorio** → paste SOME report → **Procesar**.
3. Review structured results, tendencias, cultivos under **Laboratorio** (Labs | Tendencias | Cultivos).
4. Open **Paciente → Clínico → Nota** (or Estado actual in Sala) → generate **`.docx`**.
5. Print or attach per hospital workflow.

*North Star:* steps 2–4 complete in minimum wall-clock time (TTD metric).

## Happy path — Turn sync (team)

1. Sala Nube: the monthly room for the sala exists (`ensure-turn`). The first user creates it and becomes owner.
2. Residents join the room with its **6-character join code**.
3. Census, clinical-ops, HC deltas sync without silent overwrite (LWW + diagnostics).
4. Handoff via **Modo Entrega** / guardia phase bar when shift changes.

## Error recovery

| Situation | User action |
|-----------|-------------|
| Lost Nube connection | ⇄ → Reconectar / Restablecer conexión |
| Conflict | LWW toast; optional draft review in Ajustes → LAN |
| Offline | Local edits queue in SQL outbox; flush on reconnect |

## Related

- Feature map: [features/features-index.md](../features/features-index.md)
- Nube sync: [wiki 10 · Nube sync](../wiki/10-nube-sync.md)

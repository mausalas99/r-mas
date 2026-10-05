# UI map — index

App-wide map of every screen, control and flow in R+. Built 2026-10-05 from the code. Every claim cites `path:line`. Where the code was unclear, the file says "not found".

| # | File | Covers |
|---|------|--------|
| 1 | [01-shell-navigation.md](01-shell-navigation.md) | Top bar, patient sidebar, tab tree, command palette, shortcuts, toasts and pop-ups, empty states |
| 2 | [02-patient-workspace.md](02-patient-workspace.md) | Paciente, Laboratorio, Clínico, Manejo, Agenda, Expediente, medicines, `.docx` export, flows |
| 3 | [03-modals-settings.md](03-modals-settings.md) | Every modal, Ajustes, Mi perfil, Datos, Nube, LAN, first run and unlock, flows |
| 4 | [04-sala-guardia-and-companion-apps.md](04-sala-guardia-and-companion-apps.md) | Sala, Guardia, Interconsulta, Eventualidades, Modo Entrega, VPO, Censo, mobile, Interno, Equipos |

## Findings worth knowing

- The app has two modes. Sala and Interconsulta show different Clínico tabs ([02](02-patient-workspace.md), section 0.3).
- Tab choice is kept in memory only. The app opens on Paciente > Resumen each time.
- The menu calls ⌘T "Tratamiento". The shortcuts sheet calls it "Tendencias / Cultivos".
- LAN connect by shift PIN is retired. The PIN field is hidden by code.
- The master-password change modal has no HTML and no trigger.
- The Guardia phase bar, "Finalizar turno" and roster are removed in code. Help text still names them.
- `mobile/join.html` loads `/js/lan-join-boot.mjs`. That file does not exist.

## Known gaps

Each file ends with its own gap list. Some line numbers marked `~` are approximate. Re-check before you rely on them.

Related: [03-user-journey.md](../03-user-journey.md), [06-design-system.md](../06-design-system.md).

## Live check (2026-10-05)

All four maps were checked against an isolated test app with synthetic data. Marks in each file: `✔ live` matches, `✘ fixed` was wrong and is corrected, `not reachable` could not show, `+ live` was missing and is added. Each file ends with its own "Live verification" section.

| File | ✔ live | ✘ fixed | + live | Not reachable |
|------|-------:|--------:|-------:|--------------:|
| 01 shell and navigation | 41 | 15 | 22 | 15 |
| 02 patient workspace | 28 | 18 | 8 | 8 |
| 03 modals and settings | 66 | 32 | 18 | 45 |
| 04 Sala, Guardia, IC | 61 | 27 | 29 | 10 |
| 04 companion apps | 11 | 3 | 3 | many |

Counts are the helpers' own tallies. They are approximate.

Not checked live: first run and unlock, the native menu, offline and cloud banners, the mobile login, the Interno board, the Equipos forms, and anything needing a Nube room.

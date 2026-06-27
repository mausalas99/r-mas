# Lab repo portal fixtures

Captured from `http://148.234.140.71/laboratorio/index.aspx` (2026-06-27).

## Form controls

| Control | `name` | Notes |
|---------|--------|-------|
| Search mode dropdown | `Drop1` | Values: `NOMBRE` (default on GET), `REGISTRO` |
| Search text | `TextBox2` | Registro or patient name |
| Search button | `Button1` | Value `Buscar` |
| ViewState | `__VIEWSTATE` | Required on every POST |
| Event validation | `__EVENTVALIDATION` | Required on every POST |
| ViewState encrypted | `__VIEWSTATEENCRYPTED` | Empty string on capture |

## Search flow

1. `GET /laboratorio/index.aspx` — `Drop1` defaults to `NOMBRE`.
2. `POST` with `Drop1=REGISTRO`, `TextBox2=<registro>`, `Button1=Buscar`, plus hidden fields from step 1.
3. Results page includes a table (GridView) when matches exist; empty search shows `SIN COINCIDENCIAS`.

## Files

| File | Source |
|------|--------|
| `index-initial.html` | Live GET (default NOMBRE mode) |
| `search-results-registro.html` | **Synthetic** table rows for unit tests (live registro returned no rows on capture date) |

## Seleccionar postback

Each results row uses ASP.NET `__doPostBack('GridView1','Select$N')` where `N` is zero-based row index. Parser should extract target/argument from the link or button in each row.

Replace `search-results-registro.html` with a live capture when testing on LAN with a registro that has active results.

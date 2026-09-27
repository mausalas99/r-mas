---
type: "core"
name: "Testing Strategy"
status: "stable"
description: "E2E primero (app real con Playwright); pocos unit tests, solo donde E2E no alcanza."
---

# Estrategia de testing

## Regla

**E2E primero.** El comportamiento de la app se prueba manejando la app real
(Electron + Playwright) en `scripts/e2e/*.e2e.mjs`. Los unit tests son la
excepción, no la red principal.

Un unit test (`*.test.mjs` / `*.test.js`, colocado junto al código) solo existe
si cumple **al menos una** de estas condiciones:

1. **Lógica clínica pura con espacio de entrada grande**: parsers SOME
   (`labs-*`, `gaso-*`, cultivos, LCR, citoquímico), cálculos (eGFR, anion gap,
   Ca corregido, Ret corregido), detección de dosis/insulina/potasio, receta,
   Estado actual (parser, I/O, ventilatorio). Un E2E no puede recorrer todas
   las variantes de un reporte.
2. **Integridad de datos**: esquema SQLCipher y migraciones (`lib/db/`),
   historial de labs (dedupe/prune/consolidación), merge de pacientes,
   proyector/encoder de clinical-repo, outbox/tombstones, pull-apply.
3. **Seguridad y cripto**: firma y verificación de módulos
   (`packages/shared-signing`), llaves de sala, cifrado de wire/at-rest,
   políticas de ventana/protocolo, downgrade/feed de actualizaciones.
4. **Servidor Nube** (`cloud/sync-worker`): auth, sesión, recuperación, LWW,
   guardas de mutación y membresía, carreras de unión a sala, purga.
5. **Seguridad del paciente** en el ruteo: `paste-smart-model` (a qué
   paciente va un reporte), autorización de borrado.

**No** se escriben unit tests para: render de HTML/DOM, chrome/UI, tours y
demos, CSS, animación, wiring de módulos, scripts de build/CI/métricas, ni
nada que un E2E ya ejercita. Tampoco tests que leen código fuente como texto
(`scripts/ci/structure-pinning-tests.mjs` lo impide).

## E2E

```bash
npm ci && (cd packages/core/cloud/sync-worker && npm ci)   # una vez
npm run e2e                        # compila y corre todos, uno tras otro
npm run e2e -- patients vpo        # solo esos escenarios
npm run e2e -- --no-build          # sin recompilar renderer / páginas del Worker
npm run e2e:patients               # un escenario directo (requiere build previo)
```

- `scripts/e2e/run-all.mjs` compila el renderer y `cloud/sync-pages/public`
  (lo necesita `wrangler dev`), corre cada escenario en secuencia (comparten
  puertos) y escribe `e2e-artifacts/summary.json`. En Linux sin `DISPLAY` usa
  `xvfb-run`.
- Cada escenario abre la app en un `userData` desechable, con datos DEMO
  sintéticos; los escenarios Nube levantan una copia **local** del Worker real
  (`scripts/e2e/nube-worker.mjs`), nunca Cloudflare.
- Artefactos: `e2e-artifacts/<escenario>/<run-id>/` (report.json + capturas).
- Cada escenario abre con «Ways it can go wrong»: cada viñeta es un `check`.
  Al agregar una función nueva, agrega viñetas + checks al escenario del área
  (o un escenario nuevo) en vez de unit tests de UI.

## Unit tests

```bash
npm run test:one -- path/to/changed.test.mjs    # desarrollo: solo lo que tocas
npm test                                        # CI / release: todos (~120 archivos)
```

`test:one` corre bajo el Node de Electron (`scripts/run-with-electron-node.mjs`,
mismo ABI de SQLCipher que la app). No uses `node --test` directo para suites
de DB/nativos.

## Otros métodos

Tres métodos complementan a E2E y unit tests. Los tres corren con `npm test`
(los dos primeros) o `npm run e2e` (el tercero); no hay nada extra que invocar.

### Property-based (parsers SOME)

`public/js/labs-procesar.property.test.mjs` usa [fast-check](https://fast-check.dev)
para generar miles de reportes SOME con las formas reales de fila (subconjunto
de analitos, valores y banderas al azar, espacios/CRLF) y comprobar reglas que
siempre deben cumplirse: cada valor pegado sale bajo su propia etiqueta sin
cambios, nunca aparece un analito que no se pegó, CRLF y espacios finales no
cambian el resultado, el orden de los bloques no importa, y un reporte
mutilado nunca rompe el parser. Con semilla fija para que CI sea reproducible;
para buscar más: `FC_RUNS=5000 FC_SEED=7 npm run test:one -- public/js/labs-procesar.property.test.mjs`.
Si falla, imprime el reporte mínimo que lo reproduce: pégalo en la app.

Al tocar un parser, agrega aquí una propiedad nueva (una regla general) antes
que otro ejemplo suelto.

### Golden files (corpus)

`scripts/golden/golden-corpus.test.mjs` corre los parsers y generadores reales
sobre `scripts/golden/corpus/` y compara con la salida esperada guardada al lado:

| Entrada | Proceso | Esperado |
|---------|---------|----------|
| `labs/<n>.txt` (pegado SOME) | `procesarLabs` | `labs/<n>.golden.json` |
| `receta/<n>.tsv` (indicaciones SOME) | `parseIndicacionesPaste` | `receta/<n>.golden.json` |
| `docs/<n>.note.json` | Nota de evolución .docx | `docs/<n>.note.golden.txt` (texto visible) |
| `docs/<n>.indicaciones.json` | Indicaciones .docx | `docs/<n>.indicaciones.golden.txt` |

Un cambio en valores o en el texto del documento aparece como diff legible en
el PR. Si el cambio es intencional: `npm run test:golden:update` y revisa el
diff antes de commitear. Para agregar un caso de regresión: deja un archivo de
entrada nuevo (nombres DEMO, expedientes inventados) y corre el mismo comando.

### Accesibilidad (ratchet)

Cada captura de pantalla de un escenario E2E corre también axe-core (WCAG 2.1
A/AA) sobre esa pantalla; solo cuentan problemas *serious/critical*. Los ya
conocidos viven en `scripts/e2e/a11y-baseline.json`; el check de accesibilidad
del escenario falla si aparece una regla nueva en una pantalla o más elementos
fallan una regla. Al arreglar problemas, vuelve a grabar para bajar el techo:

```bash
A11Y_UPDATE=1 npm run e2e -- <escenario>   # regraba el baseline de ese escenario
E2E_A11Y=0 npm run e2e                    # sin escaneo (depurar otra cosa)
```

## CI

Orden de gates en `.github/workflows/ci.yml`: `build:ui` → `npm run lint` →
`metrics:check` → `npm test`. Los E2E se corren con `npm run e2e` antes de un
release o al tocar el área de un escenario.

## Referencias

- Mapa de dominios y parsers: `docs/logic/logic-index.md`
- Índice de features: `docs/features/features-index.md`
- Mapa de código: `docs/core/04-directory-structure.md`

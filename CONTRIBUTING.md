# Contributing to R+

¡Gracias por tu interés en contribuir a R+!

## Documentación

- **Punto de entrada:** [`docs/core/00-system-index.md`](docs/core/00-system-index.md)
- **Estándar:** [`docs/core/17-docs-blueprint.md`](docs/core/17-docs-blueprint.md)
- **Producto / trade-offs:** [`docs/core/01-vision-north-star.md`](docs/core/01-vision-north-star.md)

## Primeros pasos

```bash
git clone <repo>
cd R+
npm install
npm run build:ui
npm start
```

Revisa [`README.md`](README.md) para instalación y desarrollo.

## Convenciones

- **No** editar manualmente `public/js/app.bundle.mjs` o chunks — edita fuentes y corre `npm run build:ui`
- **Sí** actualizar `docs/features/features-index.md` al añadir un dominio de feature
- UI en español; tests con `npm run test:one -- path/to/file.test.mjs` (no `npm test` en local salvo CI/release)
- Debt gate: `npm run metrics:check` debe pasar

## Pull requests

1. Branch con nombre descriptivo
2. `npm test` y `npm run metrics:check` deben pasar
3. Documenta features nuevas en los índices de `docs/`
4. Cambios arquitectónicos: considera `docs/core/18-knowledge-capture.md`

# R+ — Roadmap de actualizaciones y producto (inventario)

**Fecha:** 2026-04-23  
**Tipo:** Especificación de inventario / roadmap — **no** compromete implementación hasta fases acordadas.  
**Alcance explícito:** Incluye mejoras al flujo de actualización de la app de escritorio e ideas de producto. **Excluye:** integración con calendario, webhooks, y un bloque dedicado a “calidad clínica” o alertas clínicas.

---

## Cómo usar este documento

- **Priorización recomendada (hilo conductor):** impacto en UX primero; dentro de cada bloque, etiquetar ítems como *solo cliente* vs *cliente + servidor/infra* para no mezclar dependencias.
- **Este inventario es vivo:** los ítems pueden moverse de fase o descartarse sin invalidar el resto del documento.

---

## Parte 1 — Actualizaciones y confianza en releases

### A. Descubrimiento y presentación

- Modal centrado (referencia tipo “GameHub”: versión, notas, CTA) además o en lugar del banner fijo actual.
- Release notes desde texto embebido, metadata en el canal de releases (`latest.yml` u equivalente enriquecido), o URL a changelog.
- Indicador “Novedades” tras instalar y abrir la nueva versión (una sola vez o hasta descartar).
- Comprobación manual “Buscar actualizaciones” con feedback claro (*solo cliente*; ya existe base en la app).

### B. Durante la descarga

- Mostrar **MB descargados / total** y, si es viable, velocidad estimada (*cliente*: requiere exponer bytes agregados desde el proceso principal si hoy solo hay porcentaje).
- Pausa / reanudar solo si la plataforma y `electron-updater` lo hacen razonable; si no, **cancelar** y reintentar con estado claro.
- Estados explícitos en copy: conectando, descargando, verificando, listo.

### C. Instalación y control

- **Instalar ahora** frente a **al cerrar la aplicación**, alineado con `quitAndInstall` y expectativas del usuario.
- **Posponer** (“más tarde” / snooze): no mostrar el modal en cada arranque durante un intervalo configurable; definir política para actualizaciones críticas de seguridad (*producto + posible canal de política remota*).
- Mensajes claros para permisos, instancia en uso o fallos del instalador según SO.

### D. Errores y confianza

- Errores accionables: reintentar, comprobar red, enlace a soporte o página de estado.
- Canales **estable / beta** (metadata + preferencia avanzada) (*cliente + hosting de artifacts*).
- Copy breve sobre verificación de firma / origen de la actualización (*educativo; sin sustituir documentación legal*).

### E. Operación (producto / infra)

- **Versión mínima soportada** o actualización sugerida forzada vía endpoint (*cliente + backend*): útil antes de romper compatibilidad con API interna.
- Telemetría **opcional** y mínima: éxito o fallo de actualización, sin datos clínicos (*política de privacidad explícita*).
- Rollback automático en desktop suele ser costoso; documentar **rollback manual** (reinstalar versión anterior) como alternativa realista.

---

## Parte 2 — Funcionalidades de producto (más allá del updater)

### F. Productividad y flujo de trabajo

- Atajos de teclado globales y por pantalla.
- Historial / deshacer donde el modelo de datos lo permita sin riesgo.
- Plantillas más ricas (textos reutilizables, snippets entre contextos).
- Búsqueda unificada con filtros guardados.
- Modo “enfoque” (reducir paneles secundarios durante una tarea larga).

### G. Datos, copias de seguridad y portabilidad

- Copia automática programada (local o ruta configurable) con retención simple.
- Sincronización opcional entre equipos con cifrado, manejo explícito de conflictos y sin sincronización silenciosa destructiva.
- Exportar / importar por paciente o por rango de fechas, además del backup completo.
- Registro de auditoría ligero si en el futuro hay multiusuario (exportaciones, borrados relevantes).

### H. Salida de información

- Envío a nota o documento con **formato configurable** (extensión del flujo actual hacia PDF/HTML u otros formatos acordados).

### J. Experiencia y accesibilidad

- Tamaño de fuente y contraste por perfil (más allá de tema claro/oscuro).
- Mejora para lector de pantalla: etiquetas en modales, orden de foco, toasts anunciados de forma accesible.
- Localización (por ejemplo es/en) si la audiencia lo requiere.

### K. Rendimiento y robustez

- Arranque más rápido mediante carga diferida de módulos pesados.
- Cola de tareas visible para operaciones largas (generación de informes, exportaciones).
- Modo offline explícito con mensajes claros cuando no hay servidor.

### L. Descubrimiento y ayuda

- Centro de ayuda embebido (búsqueda y artículos cortos).
- Novedades in-app legibles para el usuario final, enlazadas al flujo de actualización.
- Tours contextuales por sección (evolución del tour existente).

### M. Privacidad y gobierno (datos sensibles en desktop)

- Bloqueo por inactividad (PIN o reautenticación vía SO).
- Transparencia de **zona de datos**: dónde se guarda todo, acceso rápido “abrir carpeta de datos”.
- Borrado de caché o temporales con flujo explícito para el usuario.

---

## Autorrevisión (checklist interna)

- **Placeholders:** Ningún ítem crítico quedó como “TBD”; la priorización entre fases queda para el plan de implementación.
- **Consistencia:** Las exclusiones solicitadas (calendario, webhooks, bloque de calidad clínica) no aparecen en el inventario.
- **Alcance:** Documento de roadmap; una sola fase de implementación debería tomar un subconjunto acotado de ítems.
- **Ambigüedad:** Los ítems que implican backend o hosting están señalados en la Parte 1; el resto se asume principalmente *cliente* salvo que el plan detalle lo contrario.

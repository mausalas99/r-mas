# Nota de estrategia: por qué cambiar de "investigación" a "innovación"

Con base en la reunión que tuviste, hay dos rutas de tesis en el posgrado, y son distintas comités:

| | Investigación (ruta anterior) | Innovación / Desarrollo tecnológico (ruta nueva) |
|---|---|---|
| Comité | Comité de Investigación y Ética | Comité de Innovación |
| Sujetos | Pacientes reales, dos grupos, prospectivo | Casos simulados / datos públicos o sintéticos, no pacientes reales |
| Requisito duro | Cálculo de tamaño de muestra; si no se alcanza el N, el estudio no es viable en 2 años | No se pide cálculo de muestra de pacientes |
| Riesgo de tiempo | Alto: si el N no se alcanza en Medicina Interna antes de tu cambio a Derma, la tesis queda inconclusa | Bajo: la validación es una prueba piloto con voluntarios/datos simulados, controlable en semanas |
| Qué se entrega | Resultados clínicos con pacientes | Resultados de desempeño (tiempo, satisfacción) + sistema funcionando |
| Quién puede continuar | Solo tú, en tu ventana de tiempo | Un residente futuro puede tomar la validación prospectiva con pacientes reales como su propia tesis |

**Recomendación del asesor de innovación, y la que sigue este documento:** somete el proyecto por la vía de innovación, redactado como si el sistema todavía no existiera ("voy a desarrollar…", "se va a probar de esta forma…"), aunque en realidad ya tengas 180+ versiones. Esto es normal y aceptado — muchos residentes someten con desarrollo ya avanzado.

La validación con dos grupos de pacientes reales (la que armamos en el protocolo anterior) no se descarta: queda como el **siguiente escalón**, disponible para un residente que quiera continuar el proyecto después de ti, ya con este primer sometimiento aprobado y el sistema con historial de uso.

---

# DOCUMENTO 1 — Registro de idea (una hoja, para enviar ya por correo a innovación)

**Nombre del proyecto:** R+ — Sistema de digitalización y visualización de tendencias de laboratorio para el flujo de trabajo de Medicina Interna.

**Problemática que se quiere solucionar:**
El registro y seguimiento de resultados de laboratorio en la práctica clínica diaria se realiza hoy de forma manual: se copian los reportes de SOME a una hoja de cálculo o a mano, sin comparación automática de tendencias entre días, y sin ligar de forma segura cada resultado al paciente correcto. Esto genera dos riesgos concretos: error de transcripción entre pacientes y pérdida de la comparación evolutiva (solo se ve el valor del día, no su tendencia).

**Propuesta de solución:**
Una aplicación de escritorio (Electron, Windows/Mac) que extrae de forma automática los resultados de laboratorio pegados desde SOME, los liga de forma segura al expediente correcto, grafica su tendencia en el tiempo, rastrea cultivos y resistencias hasta su cierre, y genera en formato .docx la nota de evolución, las indicaciones y el estado actual (formato SWAP) a partir de la misma información — sin interpretación clínica ni recomendaciones automatizadas por diseño.

**Antecedentes (pendiente de completar con el servicio de búsqueda tecnológica):**
No se ha identificado, en la revisión preliminar de literatura, un sistema publicado que combine extracción automática desde el sistema hospitalario de laboratorio con graficación de tendencias y generación de documentos clínicos en un solo flujo, dentro del contexto de hospitales en México. Sistemas hospitalarios de laboratorio conocidos (p. ej. sistemas tipo SIS usados en otras instituciones) son sistemas cerrados sin acceso externo por diseño. Se solicita el servicio de búsqueda tecnológica de la Subdirección de Investigación para verificar patentes y literatura relacionada antes del sometimiento formal.

**Solicitud:** formato de sometimiento de innovación (fase de registro/pre-registro) y programación del servicio de búsqueda tecnológica.

---

# DOCUMENTO 2 — Protocolo de Desarrollo Tecnológico e Innovación (extenso)

## Título
R+: sistema de digitalización, trazabilidad y visualización de tendencias de laboratorio para optimizar el flujo de documentación clínica en Medicina Interna.

## 1. Planteamiento del problema

En la práctica diaria del servicio de Medicina Interna, la revisión y registro de resultados de laboratorio se realiza copiando manualmente los reportes de SOME a un documento de trabajo (hoja de cálculo o registro en papel). Este proceso tiene dos limitaciones documentadas por observación directa del flujo de trabajo:

1. **Riesgo de error de transcripción entre pacientes**, especialmente en condiciones de fatiga (posguardia).
2. **Pérdida de la visión evolutiva**: al registrar solo el valor del día, no se compara de forma sistemática contra días previos, lo que dificulta detectar tendencias (mejoría o deterioro) a simple vista.

*(Sección a completar con estadística de la búsqueda tecnológica: porcentaje de tiempo médico dedicado a documentación reportado en la literatura, comparación de expediente físico vs. digital en instituciones de salud en México, y antecedentes de sistemas similares o patentes relacionadas.)*

## 2. Propuesta de valor / diferencial de innovación

Frente a las alternativas actuales identificadas:

- **Hoja de cálculo manual** (el método vigente): requiere copiado manual, no liga de forma segura el dato al paciente, no grafica tendencia.
- **Herramientas genéricas de análisis de datos** (Excel avanzado, Power BI): requieren captura manual de los mismos datos; no resuelven el problema de extracción ni de ligado seguro al expediente.
- **Sistemas hospitalarios de laboratorio institucionales** (p. ej. sistemas tipo SIS): son sistemas cerrados por diseño, sin acceso desde dispositivos externos, por lo que no ofrecen graficación de tendencias ni generación de documentos al usuario final.

**Lo que R+ ofrece de forma diferencial:**

- Extracción automática del resultado de laboratorio pegado desde SOME, con ligado directo y verificado al expediente correcto (elimina el paso manual de transcripción y el riesgo de error de paciente cruzado).
- Graficación automática de tendencias de laboratorio en el tiempo, incluyendo seguimiento de cultivos hasta el reporte final de resistencias.
- Generación directa de nota de evolución, indicaciones y estado actual (formato SWAP) en el formato oficial ya utilizado en el hospital, a partir de la misma captura, sin doble trabajo de redacción.
- Arquitectura de privacidad local-first: el sistema no interpreta ni da recomendaciones clínicas por diseño (decisión explícita para evitar el riesgo de "caja negra" y de responsabilidad ante mal uso de una recomendación automatizada).

## 3. Objetivos

**Objetivo general:** desarrollar y validar, mediante una prueba piloto con casos simulados, un sistema que digitalice y automatice la captura, trazabilidad y visualización de resultados de laboratorio y la generación de documentos clínicos en Medicina Interna.

**Objetivos específicos:**
- Desarrollar el módulo de extracción y ligado automático de laboratorios desde SOME.
- Desarrollar el módulo de graficación de tendencias y seguimiento de cultivos/resistencias.
- Desarrollar el módulo de generación de nota de evolución, indicaciones y estado actual.
- Desarrollar la arquitectura de sincronización cifrada entre dispositivos (Nube), preservando la privacidad del paciente.
- Validar el desempeño del sistema (tiempo de captura y percepción de carga) frente al método convencional, usando casos simulados.

## 4. Plan de desarrollo (por fases)

1. **Fase 1 — Módulo de captura y ligado de laboratorios.** Se desarrollará un analizador de texto que reciba el reporte de SOME pegado por el usuario, lo estructure en formato de tabla abreviada y lo ligue al expediente correcto, eliminando el paso de transcripción manual.
2. **Fase 2 — Módulo de tendencias.** Se agregará la graficación de la evolución de cada valor de laboratorio en el tiempo, y el seguimiento de cultivos hasta el cierre de resistencias.
3. **Fase 3 — Módulo de documentos clínicos.** Se desarrollarán los formularios que generan, a partir de la misma información capturada, la nota de evolución, las indicaciones médicas y el estado actual en formato SWAP, en el formato oficial vigente en el hospital.
4. **Fase 4 — Arquitectura de sincronización cifrada.** Se desarrollará la sincronización entre dispositivos mediante una capa de orquestación en la nube, que cifrará el contenido de extremo a extremo en el dispositivo de origen antes de transmitirlo, de forma que ningún dato clínico identificable resida en el servidor en texto plano (ver sección 6).
5. **Fase 5 — Validación piloto.** Prueba de desempeño con casos simulados frente al método convencional (ver sección 5).

## 5. Plan de validación (piloto con casos simulados)

Esta validación **no utilizará datos de pacientes reales**, precisamente para mantener el proyecto dentro del alcance del Comité de Innovación y evitar los requisitos de un protocolo clínico con pacientes (cálculo de muestra, consentimiento informado de paciente, Comité de Investigación y Ética).

**Fuente de datos:** un "SOME simulado" — un conjunto de valores de laboratorio sintéticos o tomados de bases de datos públicas/abiertas, diseñado para parecerse a un caso típico de Medicina Interna en un hospital mexicano, con un mecanismo de actualización que imite el flujo real (el usuario "actualiza" y el sistema despliega nuevos valores, igual que ocurre con SOME).

**Diseño sugerido (a definir con el asesor de tesis, ejemplos de opciones):**
- Grupo A (n≈5) usa R+ para procesar una serie fija de casos simulados; grupo B (n≈5) usa el método convencional (Excel/"mollete" o el diagrama manual en cuadrícula) con los mismos casos.
- Alternativa cruzada: 2 usuarios, cada uno procesa 10 casos con cada método, en orden alternado, para comparar dentro del mismo usuario.

**Variables a medir:**
- Tiempo de captura por caso (cronómetro), comparando R+ vs. método convencional.
- Percepción de carga y satisfacción, mediante una escala Likert modificada (no una escala validada formal, sino un cuestionario corto ad hoc: facilidad de uso, sensación de ahorro de tiempo, disposición a seguir usándolo).
- Tasa de error de captura (p. ej. valor mal transcrito) en cada método, si el diseño del piloto lo permite medir de forma objetiva.

**Por qué no un ensayo con pacientes reales en este sometimiento:** el cálculo de tamaño de muestra necesario para un estudio comparativo con desenlaces de paciente puede no alcanzarse dentro de la ventana de dos años en Medicina Interna, y ese diseño cae bajo el Comité de Investigación y Ética, con mayor tiempo de revisión. Esa validación con pacientes reales queda documentada aquí como la **fase siguiente**, disponible para que otro residente la continúe como su propia tesis, una vez este proyecto tenga la aprobación de innovación y un sistema con historial de uso.

## 6. Protección de datos

- **Almacenamiento:** todos los datos clínicos residen de forma local en el equipo de cada usuario, cifrados con SQLCipher; no existe una base de datos central con la información del paciente.
- **Sincronización entre dispositivos (Nube):** el servidor en la nube actúa únicamente como orquestador de sincronización, no como repositorio de datos. La información se cifra de extremo a extremo en el dispositivo de origen, usando una llave derivada de la contraseña del usuario y de la sala de sincronización, antes de salir hacia la nube. El servidor nunca recibe el contenido en texto plano.
- **Identificación de pacientes:** el número de expediente se usa únicamente de forma local, para el ligado del reporte de laboratorio al paciente correcto dentro del propio dispositivo. Hacia la capa de sincronización, cada paciente se identifica solo con un identificador único (UDID) sin relación reconocible con el número de expediente; el servidor no recibe el número de expediente en ningún momento.
- **Recuperación de acceso:** las llaves de cifrado están ligadas tanto a la sala de sincronización como a la contraseña de cada usuario. Si todos los usuarios de una sala pierden su contraseña, esa sala queda inaccesible de forma permanente — ni el administrador de la infraestructura puede recuperar el contenido.
- **Sin interpretación automatizada:** el sistema no analiza, interpreta ni da recomendaciones clínicas. Es, por diseño, un presentador de datos y generador de documentos, decisión tomada explícitamente para evitar el riesgo de responsabilidad por una recomendación automatizada mal utilizada.
- **Cuenta de infraestructura:** el servicio de sincronización en la nube se desplegará sobre una cuenta administrada por el departamento o por TI institucional, nunca sobre una cuenta de desarrollo personal, antes de cualquier uso más allá de la validación piloto con datos simulados.
- **Marco normativo a citar en el extenso final:** NOM aplicable a expediente clínico electrónico en México, y ley de protección de datos personales aplicable (LFPDPPP o LGPDPPSO según el régimen del hospital), además de una referencia a estándares internacionales de manejo de datos de salud (p. ej. principios de HIPAA) como marco comparativo de buenas prácticas, aunque el hospital no esté sujeto a HIPAA.

## 7. Entregables

- Sistema funcional con los módulos descritos en la sección 4, demostrable en vivo.
- Resultados del piloto de validación: comparación de tiempos y de percepción de carga/satisfacción entre R+ y el método convencional, traducidos a lenguaje clínico-administrativo (p. ej. minutos ahorrados por caso, proyección de tiempo liberado por turno).
- Reporte final de resultados para la Subdirección de Investigación, conforme al formato de resultados de innovación.

## 8. Cronograma sugerido

| Etapa | Duración estimada |
|---|---|
| Registro de idea + solicitud de búsqueda tecnológica | 1–2 semanas |
| Búsqueda tecnológica (patentes/literatura) | 2–4 semanas |
| Redacción y sometimiento del extenso al Comité de Innovación | 2–4 semanas |
| Revisión del comité (sesiona mensualmente) y respuesta a comentarios | 4–8 semanas |
| Construcción del set de casos simulados ("SOME simulado") | 2–4 semanas |
| Ejecución del piloto de validación | 2–4 semanas |
| Análisis de resultados y redacción final | 4 semanas |

*Nota de vocabulario institucional:* la oficina de innovación usa el marco de Nivel de Madurez Tecnológica (TRL). Con lo descrito arriba, este sometimiento corresponde a TRL 3–4 (prueba de concepto validada con casos simulados). El paso siguiente — piloto con pacientes reales en el hospital — correspondería a TRL 5–6, y es el que se deja como tesis futura de otro residente (sección 5).

*— Fin del Documento 2. Todo lo que sigue es para tu uso personal; no se entrega al comité. —*

---

# ANEXO INTERNO (no forma parte del sometimiento)

## A. Próximos pasos administrativos (checklist)

- [ ] Enviar correo a innovación solicitando el formato de registro de idea, mencionando la reunión ya sostenida.
- [ ] Solicitar el servicio de búsqueda tecnológica (patentes + literatura) para nutrir la sección de antecedentes y confirmar el diferencial de innovación.
- [ ] Confirmar asesor de tesis y recabar firmas requeridas para el sometimiento formal.
- [ ] Definir con el asesor el diseño final del piloto simulado (tamaño de grupos, número de casos).
- [ ] Contactar al Dr. Nacud para introducción con el Ing. Bujans (TI/infraestructura), para la migración futura de la cuenta de nube a una cuenta institucional — en paralelo a la tesis, no como requisito de sometimiento.

## B. Riesgos abiertos — sin resolver en la reunión, no esperar al comité para atenderlos

Estos puntos quedaron señalados en la reunión pero sin dueño ni fecha. Son para ti, sobre el estado real del proyecto — no van en el documento entregado al comité, que está redactado como si el desarrollo aún no hubiera comenzado.

- **Vía legal de extracción de datos desde SOME (urgente).** Hoy no existe un acuerdo formal con quien desarrolla/administra SOME para que R+ extraiga los laboratorios. Antes de seguir ampliando el uso de la aplicación en el hospital, hay que verificar y formalizar esa vía con el área responsable de SOME — es el punto que más rápido puede convertirse en un problema con el hospital si no se resuelve primero, independientemente del sometimiento de tesis.
- **Continuidad del proyecto después de tu cambio a Dermatología.** Aún no hay respuesta a la pregunta que ya te hicieron los profesores: quién mantiene R+ cuando termines Medicina Interna. Esto incluye quién administra la cuenta de nube (hoy personal) y quién da soporte técnico. Vale la pena tener, aunque sea informalmente, un plan de transferencia (¿un residente de años posteriores?, ¿el departamento?) antes del sometimiento formal, porque es previsible que el comité lo pregunte.
- **Diseño exacto del piloto.** Se decidió el enfoque (casos simulados, no pacientes reales) pero no el número exacto de usuarios/grupos ni el número de casos por persona. Definir esto con tu asesor antes de redactar la versión final del extenso.
- **Métricas más allá de tiempo y Likert.** Falta decidir si se medirá algo adicional (p. ej. tasa de error de captura) y cómo se traduce cada métrica a lenguaje médico-administrativo (ahorro de tiempo → más pacientes vistos → ahorro de costo).
- **Fechas límite.** Ninguna de las tareas administrativas (correo a innovación, solicitud de formato, contacto con Ing. Bujans) tiene fecha límite todavía. Ponerles fecha evita que se queden pendientes indefinidamente.

## C. Trabajo ya en curso que puede alimentar las fases futuras del plan

Estos elementos ya están comiteados en el repositorio de código pero no publicados/desplegados a usuarios. Como el documento de sometimiento ya describe estas piezas como fases futuras (sección 4), no hace falta reescribir nada ahí — esto es solo para que sepas qué ya tienes de avance real cuando llegue el momento de ejecutar cada fase:

- **Cifrado de extremo a extremo para el contenido sincronizado en Nube** — código ya escrito y comiteado, marcado explícitamente como "no desplegado" (commit `0223c7c0`). Corresponde a lo descrito como parte de la Fase 4 del plan de desarrollo (sección 4) y del apartado de protección de datos (sección 6).
- **Rediseño visual ("paleta teal")** — cambio de interfaz, sin relación con la validación o la protección de datos; no es relevante para el protocolo de tesis.
- El resto de commits recientes son correcciones de errores (bugs) sobre funciones ya descritas en el plan (sincronización, equipos clínicos, atajos de teclado) — no representan nuevas fases ni cambian nada del protocolo.

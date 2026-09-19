# PROTOCOLO DE INVESTIGACIÓN

## Evaluación comparativa del uso de R+ sobre el desempeño autopercibido de los residentes y los desenlaces clínicos de los pacientes en un servicio de Medicina Interna

Tesis de especialidad — Medicina Interna. Línea de investigación: innovación tecnológica en la práctica clínica.

Versión preliminar para revisión del residente y del asesor de tesis. Requiere aprobación del Comité de Ética en Investigación y del Comité de Investigación institucional antes de iniciar reclutamiento.

---

## 1. Planteamiento del problema

Los residentes de Medicina Interna dedican una fracción considerable de su jornada a tareas de documentación clínica: transcribir resultados de laboratorio, redactar notas de evolución y generar hojas de indicaciones. Este trabajo es repetitivo, propenso a error de transcripción y compite por tiempo con la evaluación directa del paciente.

R+ es una aplicación de escritorio (Electron) de uso local que permite pegar resultados de laboratorio en texto libre (formato SOME) y obtiene de forma automática una tabla estructurada de laboratorios con tendencias, además de generar notas de evolución y órdenes en formato .docx. La aplicación no es un expediente clínico electrónico (EMR): es una herramienta adjunta que complementa el flujo de trabajo existente.

No existe, hasta la fecha, evidencia formal sobre si el uso de R+ produce un beneficio medible en (a) el desempeño autopercibido del residente — carga cognitiva, confianza clínica, síntomas de desgaste — y (b) los desenlaces del paciente — oportunidad del tratamiento, duración de estancia, eventos adversos. Esta pregunta debe responderse antes de recomendar su adopción formal en el hospital.

## 2. Justificación

Toda herramienta digital que se introduce en un flujo clínico debe demostrar valor antes de institucionalizarse: valor para el residente que la usa y valor —o al menos ausencia de daño— para el paciente. Evaluar ambos planos evita dos errores comunes: adoptar una herramienta solo porque "se siente más rápida" sin verificar desenlaces duros, o rechazarla solo por percepción sin medir su efecto real en la carga de trabajo.

Este protocolo aporta el primer marco metodológico para decidir, con datos, si R+ merece pasar de herramienta de uso personal a herramienta recomendada o exigida a nivel de servicio.

## 3. Objetivos

### 3.1 Objetivo general

Comparar el desempeño autopercibido de los residentes y los desenlaces clínicos de los pacientes entre un grupo que utiliza R+ para la documentación clínica y un grupo que utiliza el método convencional, en un mismo servicio de Medicina Interna y periodo de tiempo.

### 3.2 Objetivos específicos

- Comparar el tiempo de documentación (proxy de "tiempo a la nota", TTD) entre ambos grupos.
- Comparar la carga cognitiva percibida (NASA-TLX) y la usabilidad percibida (System Usability Scale) entre ambos grupos.
- Comparar indicadores de desgaste (Maslach Burnout Inventory, versión abreviada) al inicio y al final del periodo de estudio en ambos grupos.
- Comparar desenlaces del paciente: tiempo puerta–indicación, duración de estancia hospitalaria, tasa de eventos adversos relacionados con documentación (error de dosis, omisión, duplicidad) y tasa de reingreso a 30 días.
- Describir la frecuencia de uso real de R+ y las razones de no adherencia en el grupo de intervención.

## 4. Hipótesis

**H1:** Los residentes que utilizan R+ presentan menor tiempo de documentación y menor carga cognitiva percibida que los residentes que utilizan el método convencional.

**H2:** Los pacientes atendidos por residentes que utilizan R+ no presentan una tasa mayor de eventos adversos relacionados con documentación que los pacientes atendidos por residentes con el método convencional, y pueden presentar una tasa menor.

**H0:** No existe diferencia entre grupos en ninguno de los desenlaces primarios.

## 5. Metodología

### 5.1 Tipo y diseño de estudio

Estudio cuasi-experimental, comparativo, prospectivo, de dos grupos paralelos (con uso de R+ vs. método convencional), en un solo centro. No es posible el cegamiento del residente ni del evaluador de proceso, dado que el uso de la herramienta es evidente; los desenlaces duros del paciente se extraerán de expediente por un evaluador ciego a la asignación de grupo cuando sea factible.

Justificación del diseño: un ensayo aleatorizado por paciente no es factible porque la exposición (uso de R+) ocurre a nivel de residente, no de paciente. Se recomienda asignación por bloques a nivel de residente o de rotación (ver 5.3), reduciendo el riesgo de contaminación entre grupos.

### 5.2 Población y muestra

**Población blanco:** residentes de Medicina Interna del hospital sede y los pacientes que ingresan a su cuidado durante el periodo de estudio.

**Criterios de inclusión (residentes):** residentes de Medicina Interna de 1º a 3º año, rotando en el servicio durante el periodo de estudio, que otorguen consentimiento informado.

**Criterios de inclusión (pacientes):** mayores de 18 años, ingresados al servicio de Medicina Interna durante el periodo de estudio, bajo el cuidado directo de un residente participante, que otorguen consentimiento informado (o su representante legal).

**Criterios de exclusión:** residentes con menos de dos semanas de rotación en el servicio durante el periodo de estudio; pacientes trasladados a otro servicio o egresados en menos de 24 horas; pacientes en estado crítico que impida el consentimiento sin representante disponible.

**Cálculo de tamaño de muestra** (variable primaria de paciente — duración de estancia hospitalaria en días): asumiendo una desviación estándar poblacional σ = 3 días, una diferencia mínima clínicamente relevante Δ = 1 día, α = 0.05 (dos colas) y potencia del 80% (β = 0.20), la fórmula n = 2(Zα/2 + Zβ)²σ²/Δ² arroja n ≈ 141 pacientes por grupo (282 en total), antes de ajuste por pérdidas. Estos valores de σ y Δ son estimaciones de literatura general y deben refinarse con datos piloto locales de 4–8 semanas antes de fijar el tamaño de muestra definitivo. El mismo cálculo debe repetirse para la variable primaria de residente (NASA-TLX) usando datos piloto de variabilidad intra-servicio.

### 5.3 Asignación de grupos

Asignación por bloques a nivel de residente, por bloque de rotación (p. ej. mensual), para minimizar contaminación (un residente no puede estar "a medias" en ambos grupos el mismo mes). Dentro de cada bloque, los residentes se asignan de forma aleatoria (tabla de números aleatorios o generador certificado) a grupo R+ o grupo convencional, estratificando por año de residencia para balancear experiencia clínica entre grupos.

### 5.4 Variables

| Tipo | Variable | Definición operacional / instrumento |
|---|---|---|
| Independiente | Uso de R+ | Dicotómica: grupo intervención (usa R+ para documentación) vs. grupo control (método convencional). Verificada por registro de asignación y por frecuencia de uso real. |
| Dependiente – residente | Tiempo de documentación (proxy TTD) | Minutos desde el inicio de la revisión de un paciente hasta la nota firmada. Medido con cronómetro/registro manual estandarizado en ambos grupos (ver 5.6). |
| Dependiente – residente | Carga cognitiva percibida | Escala NASA-TLX (0–100), aplicada al final de cada turno evaluado. |
| Dependiente – residente | Usabilidad percibida | System Usability Scale (SUS, 0–100), solo grupo intervención, aplicada mensualmente. |
| Dependiente – residente | Desgaste profesional | Maslach Burnout Inventory, versión abreviada, basal y al cierre del estudio, ambos grupos. |
| Dependiente – residente | Confianza clínica autopercibida | Escala Likert 1–5 ad hoc sobre confianza en la exactitud de la documentación propia, validada por jueces expertos antes del estudio. |
| Dependiente – paciente | Tiempo puerta–indicación | Minutos entre el ingreso y la primera indicación médica documentada, extraído de expediente. |
| Dependiente – paciente | Estancia hospitalaria | Días entre ingreso y egreso, extraído de expediente. |
| Dependiente – paciente | Eventos adversos por documentación | Error de dosis, omisión de indicación, duplicidad de orden; identificados por auditoría de expediente ciega a grupo, con definición operacional prefijada y checklist. |
| Dependiente – paciente | Reingreso a 30 días | Dicotómica, verificada en sistema hospitalario de admisiones. |
| Confusoras | Año de residencia, carga de pacientes por turno, gravedad basal (índice de Charlson), turno (diurno/nocturno) | Registradas para ajuste en el análisis multivariado. |

### 5.5 Instrumentos de medición

- NASA Task Load Index (NASA-TLX) — escala validada de carga cognitiva, versión en español.
- System Usability Scale (SUS) — escala validada de usabilidad, 10 ítems, versión en español.
- Maslach Burnout Inventory, versión abreviada (MBI-9 o equivalente validado en personal de salud hispanohablante).
- Escala Likert ad hoc de confianza clínica autopercibida (validación de contenido por 3 jueces expertos antes del piloto).
- Hoja de extracción de expediente clínico, con checklist de eventos adversos por documentación definido a priori.
- Cronómetro/registro manual de tiempos de documentación, estandarizado (ver nota de instrumentación abajo).

### 5.6 Nota de instrumentación técnica (hallazgo de revisión de código)

Una revisión técnica de la aplicación (agosto 2026) confirmó que R+ no cuenta hoy con un módulo de telemetría de uso: no registra clics, conteos de error ni tiempo por acción. Existen dos tablas de auditoría que pueden servir como proxy parcial de tiempo de documentación — `forensic_audit_chain` (evento con marca de tiempo por acción de guardado/eliminación de paciente) y `clinical_change_log` (marca de tiempo por cambio clínico, con actor y tipo de acción) — pero ninguna mide el tiempo TTD ("tiempo a la nota") de punta a punta.

Antes de iniciar el estudio, el equipo de desarrollo debe:
1. Construir un script de extracción que calcule el intervalo entre apertura de un paciente y guardado final de la nota a partir de `clinical_change_log`.
2. Validar ese proxy contra cronometraje manual en un piloto de 2 semanas.

Si el proxy no correlaciona bien con el tiempo real, el estudio debe apoyarse en cronometraje manual estandarizado como método primario.

### 5.7 Configuración técnica de la aplicación durante el estudio

La misma revisión técnica identificó que la sincronización en la nube (Nube) de R+ corre hoy sobre una cuenta personal de Cloudflare, sin acuerdo de tratamiento de datos (DPA), y que el contenido de la sala de sincronización se almacena en texto plano (el cifrado de extremo a extremo está construido pero no desplegado).

Por lo tanto, durante todo el estudio la aplicación debe configurarse en **modo exclusivamente local (SQLCipher local, Nube desactivada)** en los equipos de los residentes participantes del grupo de intervención. Esta configuración debe verificarse al inicio de cada turno evaluado y documentarse en la bitácora del estudio. No debe usarse la sincronización en la nube con datos de pacientes reales hasta que exista una evaluación formal de cumplimiento normativo (NOM-024, LFPDPPP) por el comité institucional correspondiente.

### 5.8 Procedimiento

- **Fase 0 — Piloto (2–4 semanas):** validar instrumentos, proxy de TTD y flujo de extracción de expediente con 5–10 residentes fuera de la muestra definitiva.
- **Fase 1 — Basal:** aplicación de MBI y consentimiento informado a todos los residentes elegibles antes de la asignación de grupo.
- **Fase 2 — Asignación:** aleatorización por bloques de rotación, estratificada por año de residencia (ver 5.3).
- **Fase 3 — Intervención:** seguimiento durante el periodo definido por el cálculo de muestra (estimado 3–6 meses), con recolección continua de variables de paciente y aplicación periódica de NASA-TLX (por turno), SUS (mensual, solo grupo R+) y bitácora de uso real.
- **Fase 4 — Cierre:** aplicación final de MBI, extracción completa de expediente por evaluador ciego a grupo, cálculo de desenlaces.

### 5.9 Plan de análisis estadístico

Análisis por intención de tratar (según asignación de grupo, no según adherencia real). Variables continuas: comparación con prueba t de Student o U de Mann-Whitney según distribución (verificada con Shapiro-Wilk). Variables categóricas: chi-cuadrada o exacta de Fisher. Ajuste por confusores (año de residencia, gravedad basal por índice de Charlson, turno) mediante regresión lineal múltiple (desenlaces continuos) o regresión logística (desenlaces binarios). Nivel de significancia α = 0.05. Análisis de sensibilidad por protocolo (solo residentes con adherencia ≥80% al uso asignado) como análisis secundario. Software sugerido: R o SPSS.

## 6. Consideraciones éticas

- Sometimiento a Comité de Ética en Investigación y Comité de Investigación institucional antes de reclutar.
- Consentimiento informado por escrito de cada residente participante y de cada paciente (o representante legal).
- Los pacientes en el grupo control reciben el estándar de atención vigente; no existe riesgo adicional atribuible a la asignación de grupo, ya que R+ es una herramienta de documentación, no de decisión clínica autónoma.
- Confidencialidad: los datos de paciente se manejan bajo el mismo estándar institucional vigente; ver 5.7 sobre configuración local obligatoria de la aplicación durante el estudio.
- Los resultados individuales de MBI y NASA-TLX de cada residente se manejan de forma confidencial y no se comparten con el jefe de servicio ni afectan la evaluación académica del residente.
- Derecho de retiro voluntario en cualquier momento, sin afectar la atención del paciente ni la evaluación del residente.

## 7. Limitaciones del estudio

- No hay cegamiento posible del uso de la herramienta por parte del residente.
- R+ no cuenta hoy con telemetría de uso; el tiempo de documentación depende de un proxy no validado o de cronometraje manual, con riesgo de sesgo de medición.
- Diseño de un solo centro: limita la generalización a otros hospitales o servicios.
- Posible contaminación si residentes de distintos grupos comparten turno y comentan el uso de la herramienta.
- R+ no es un expediente clínico electrónico certificado; los hallazgos aplican a su función actual de asistente de documentación, no implican equivalencia con un EMR institucional.

## 8. Cronograma

| Etapa | Duración estimada |
|---|---|
| Aprobación de comité de ética / investigación | 4–8 semanas |
| Desarrollo y validación de instrumentación técnica (proxy TTD) | 2–4 semanas, en paralelo |
| Fase piloto | 2–4 semanas |
| Reclutamiento y fase basal | 2 semanas |
| Fase de intervención y seguimiento | 3–6 meses |
| Análisis estadístico y redacción de resultados | 6–8 semanas |

## 9. Recursos necesarios

- Acceso a licencias/uso de las escalas NASA-TLX, SUS y MBI en su versión validada en español.
- Tiempo de un desarrollador para construir y validar el script de extracción de proxy TTD (ver 5.6).
- Apoyo de un evaluador externo (ciego a grupo) para la auditoría de expediente.
- Asesoría estadística para el cálculo definitivo de tamaño de muestra tras el piloto.

## 10. Referencias

- Hart, S. G., & Staveland, L. E. (1988). *Development of NASA-TLX: Results of empirical and theoretical research.*
- Brooke, J. (1996). *SUS: A quick and dirty usability scale.*
- Maslach, C., Jackson, S. E., & Leiter, M. P. *Maslach Burnout Inventory Manual.*
- Charlson, M. E., et al. (1987). *A new method of classifying prognostic comorbidity in longitudinal studies.*
- [Completar con literatura específica de innovación tecnológica y carga de documentación en Medicina Interna, y con la normativa institucional/nacional vigente de protección de datos de salud aplicable al centro.]

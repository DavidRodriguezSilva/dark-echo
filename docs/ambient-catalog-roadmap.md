# Hoja de ruta del catálogo de ambientes

Antes de seguir ampliando el catálogo, este documento fija qué ambientes lo
componen hoy y cuáles están previstos, para dar dirección a las próximas
entregas sin decidirla ambiente a ambiente sobre la marcha. Es documentación
de planificación, no un requisito formal: se actualiza cada vez que un
ambiente cambia de estado. La visión completa del producto está en la
propuesta original de `procedural-audio-foundation`
(`openspec/changes/procedural-audio-foundation/proposal.md`, sección "Fuera
de alcance"); este documento es su seguimiento, ambiente por ambiente.

## Implementados

| Id            | Ambiente     | Modelo (`docs/synthesis-reference.md`)         |
| ------------- | ------------ | ---------------------------------------------- |
| `rain`        | Lluvia       | `impacto-gota`                                 |
| `wind`        | Viento       | `rafaga-aire`                                  |
| `river`       | Río          | `flujo-turbulento` + `impacto-gota` (burbujeo) |
| `ocean`       | Océano       | `oleaje` + `impacto-gota` (rompiente)          |
| `white-noise` | Ruido blanco | `ruido-de-color` (α = 0)                       |
| `pink-noise`  | Ruido rosa   | `ruido-de-color` (α = 1)                       |
| `brown-noise` | Ruido marrón | `ruido-de-color` (α = 2)                       |

## Planeados

| Ambiente                              | Modelo                                                                                     | Nota                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Tormentas                             | `descarga-electrica` (ya documentado) + `rafaga-aire` y `impacto-gota` para lluvia intensa | Compone modelos ya existentes; no exige investigación nueva antes de declarar el ambiente.                        |
| Fogatas                               | `combustion` (ya documentado)                                                              | Idem: el modelo ya está en la referencia, documentado sin ambiente que lo use, a la espera de esta entrega.       |
| Bosques                               | Pendiente de investigar                                                                    | Fenómeno compuesto (viento entre hojas, fauna, crujidos) sin modelo único de referencia todavía.                  |
| Ambientes urbanos                     | Pendiente de investigar                                                                    | Sin precedente en este documento; requiere su propia investigación de síntesis antes de declarar el ambiente.     |
| Cafeterías                            | Pendiente de investigar                                                                    | Idem — mezcla de voces, vajilla y maquinaria, ninguno modelado aún.                                               |
| Bibliotecas                           | Pendiente de investigar                                                                    | Idem — ambiente de fondo muy tenue, ningún fenómeno dominante claro que investigar primero.                       |
| Concentración / relajación / descanso | No aplica — no es un fenómeno nuevo                                                        | Previsiblemente escenas compuestas de ambientes ya existentes (ver `scene save`), no un modelo de síntesis nuevo. |

## Cómo mover un ambiente de "planeado" a "implementado"

Seguir el procedimiento de `readme.md`, sección "Cómo añadir un ambiente
nuevo": investigar y documentar el modelo en `docs/synthesis-reference.md`
si no existe todavía, declarar el ambiente en `domain/ambients/`, registrarlo
en `domain/catalog.ts`, y añadir su test de señal. Actualizar este documento
como parte del mismo cambio.

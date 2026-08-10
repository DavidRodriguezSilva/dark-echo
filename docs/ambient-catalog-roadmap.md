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

| Ambiente                              | Modelo                                                                                     | Nota                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Tormentas                             | `descarga-electrica` (ya documentado) + `rafaga-aire` y `impacto-gota` para lluvia intensa | Compone modelos ya existentes; no exige investigación nueva antes de declarar el ambiente.                                                   |
| Fogatas                               | `combustion` (ya documentado)                                                              | Idem: el modelo ya está en la referencia, documentado sin ambiente que lo use, a la espera de esta entrega.                                  |
| Bosques                               | Probablemente un `Environment`, no un `Source` — ver más abajo                             | Relectura: la parte reutilizable (hojas, ramas, reverberación) es un entorno; solo faltaría investigar su `Source` propio (fauna, crujidos). |
| Ambientes urbanos                     | Pendiente de investigar                                                                    | Sin precedente en este documento; requiere su propia investigación de síntesis antes de declarar el ambiente.                                |
| Cafeterías                            | Pendiente de investigar                                                                    | Idem — mezcla de voces, vajilla y maquinaria, ninguno modelado aún.                                                                          |
| Bibliotecas                           | Pendiente de investigar                                                                    | Idem — ambiente de fondo muy tenue, ningún fenómeno dominante claro que investigar primero.                                                  |
| Concentración / relajación / descanso | No aplica — no es un fenómeno nuevo                                                        | Previsiblemente escenas compuestas de ambientes ya existentes (ver `scene save`), no un modelo de síntesis nuevo.                            |

## Motor de composición

Además del motor actual, que es el que reproduce todo el catálogo de arriba,
existe un **segundo motor de composición** que ensambla una escena a partir de
componentes independientes en lugar de ambientes cerrados: uno o varios
`Source`, un `Environment` (recinto), una `Occlusion` (barrera) y `Modifiers`
(distancia). Se alcanza por su propio comando (`compose`), no por
`play`/`add`/`remove`, y **no altera nada de lo anterior** — ver los changes
`add-ambient-composition-engine` (piloto) y `add-multi-source-composition`.

| Familia       | Disponible                                                        |
| ------------- | ----------------------------------------------------------------- |
| `Source`      | **Todo el catálogo de arriba**, derivado de `domain/catalog.ts`   |
| `Environment` | `cabana`, `casa`, `campo-abierto`                                 |
| `Occlusion`   | `techo-madera`, `techo-madera-grueso`, `ventana-vidrio`           |
| `Modifier`    | `distancia` — **uno por `Source`**, independiente entre `Source`s |

Varios `Source` pueden sonar a la vez, hasta un límite de **12 capas
simultáneas** (lo que hace que el catálogo entero quepa justo); el
`Environment` y la `Occlusion` son propiedades de la escena y alcanzan a
todos los `Source` a la vez, mientras que los `Modifiers` pertenecen a un
`Source` concreto y se nombran explícitamente al ajustarlos. El presupuesto de
cómputo medido está en `docs/synthesis-reference.md`.

Lo que sigue pendiente: hacer variable la **intensidad** de un `Source` —hoy
las densidades y ganancias de cada ambiente son fijas, así que el peldaño "con
distintos niveles de intensidad" de la composición progresiva no se puede
ejercitar— y la retirada del motor actual, que es un change aparte.

### Relectura de esta hoja de ruta a la luz del modelo de composición

La existencia de `Environment` como componente reutilizable cambia el trabajo
pendiente de algunos ambientes de la tabla de arriba:

- **Bosques** probablemente **no necesita un `Source` nuevo**: la parte que lo
  hace reconocible (hojas, ramas, reverberación del arbolado) es un
  `Environment` que ya aplicaría a `rain` y a `wind` sin inventar un fenómeno
  completo. Lo que sí faltaría investigar es su `Source` propio —fauna,
  crujidos—, un problema bastante menor que el original.
- **Ciudad, cafetería y biblioteca** sí combinan `Source`s genuinamente nuevos
  (voces, vajilla, maquinaria, tráfico) con un `Environment`. Para esos, la
  investigación de síntesis sigue siendo necesaria antes de declarar nada.
- **Tormentas** y **fogatas** ya tienen su `Source` documentado
  (`descarga-electrica`, `combustion`) y encajan en el modelo sin decisión de
  arquitectura pendiente.

## Cómo mover un ambiente de "planeado" a "implementado"

Seguir el procedimiento de `readme.md`, sección "Cómo añadir un ambiente
nuevo": investigar y documentar el modelo en `docs/synthesis-reference.md`
si no existe todavía, declarar el ambiente en `domain/ambients/`, registrarlo
en `domain/catalog.ts`, y añadir su test de señal. Actualizar este documento
como parte del mismo cambio.

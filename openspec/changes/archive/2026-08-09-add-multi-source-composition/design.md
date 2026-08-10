## Context

El motor de composición existe y está validado, pero con dos restricciones
que el piloto se impuso a propósito (design.md D8 de
`add-ambient-composition-engine`): un solo `Source` en el catálogo (`rain`) y
un solo `Source` activo a la vez. Este change levanta ambas.

La cadena de la escena hoy es una línea recta, con las tres etapas
moduladoras permanentemente en el grafo en estado neutro:

```text
sourceBus → ModifierStage → OcclusionStage → EnvironmentStage → master → limiter
```

Todas las capas de todos los `Source` desembocan en `sourceBus`. Con un
`Source` eso es correcto. Con dos deja de serlo, porque la `ModifierStage`
queda aguas abajo del punto donde las señales ya se sumaron: la distancia se
aplicaría a la suma, no a cada `Source`.

## Goals / Non-Goals

**Goals**

- Los siete `Source` del catálogo alcanzables por el motor de composición.
- Varios `Source` simultáneos, cada uno con sus propios `Modifiers`.
- Cumplir la requirement de `ambient-modifiers` que hoy se incumple.
- Presupuesto de cómputo medido, no supuesto, para escenas multi-`Source`.

**Non-Goals**

- Retirar el motor actual ni tocar sus comandos — change posterior, y
  deliberadamente posterior (ver D5).
- Unificar la gramática de `compose` con `play`/`add`/`remove` — también
  change posterior; hacerlo aquí obligaría a cambiar la gramática dos veces.
- Hacer variable la intensidad de un `Source`. Sigue siendo trabajo sobre el
  `Source`, fuera de esta familia (D4 del piloto), y sigue siendo lo que le
  falta a la tarea 7.1 del piloto para cerrarse.
- Introducir `Environment` u `Occlusion` nuevos. El catálogo de esas dos
  familias no se toca.

## Decisions

### D1 — La `ModifierStage` pasa a ser por `Source`, no por escena

La cadena queda así, con una instancia de `ModifierStage` por `Source`
activo:

```text
Source_a (capas) → ModifierStage_a ─┐
Source_b (capas) → ModifierStage_b ─┼→ sceneBus → Occlusion → Environment → master → limiter
Source_c (capas) → ModifierStage_c ─┘
```

Es la única topología que satisface la requirement "Un `Modifier` pertenece a
un `Source`, no a la escena" sin casos especiales: la independencia sale de
que cada señal atraviesa su propia etapa antes de sumarse, no de lógica que
la vigile.

`Occlusion` y `Environment` se quedan compartidas y aguas abajo de la suma,
que es igualmente lo que sus specs piden: una barrera y un recinto son
propiedades de la escena, y todo lo que suena dentro de ella los atraviesa.

**Alternativa descartada**: mantener una `ModifierStage` compartida y aplicar
la distancia como una ganancia y un filtro por `Source` en el punto de
conexión al bus. Reproduce el efecto, pero duplica el modelo de
`atenuacion-distancia` en dos sitios —la etapa y el punto de conexión—, y la
regla del proyecto es que un modelo de síntesis vive en un solo lugar y se
deriva de sus unidades físicas. Se prefiere mover la etapa.

**Coste**: una `ModifierStage` por `Source` activo en vez de una por escena.
Se mide en la tarea de presupuesto (grupo 5); es la razón principal por la
que el presupuesto se remide en vez de heredarse.

### D2 — El `Source` se nombra explícitamente en los comandos que le pertenecen

Con un solo `Source` posible, `compose distance 30` no era ambiguo. Con
varios sí lo es, y resolver la ambigüedad implícitamente (p. ej. "el último
activado") produce un comando cuyo efecto depende de un estado que el usuario
no ve. Se nombra el destinatario:

- `compose source <id>` — incorpora un `Source`, **acumulando** sobre los que
  ya suenan (antes sustituía).
- `compose remove <id>` — retira ese `Source` y su `ModifierStage`.
- `compose source off` — retira todos los `Source`.
- `compose distance <source> <metros>` — distancia de ese `Source`.
- `compose modifier <source> <tipo|off>` — activa o retira un `Modifier` de
  ese `Source`.

`compose status` pasa a listar un renglón por `Source` activo con sus
`Modifiers`, en vez de un único renglón `Source: …`.

### D3 — El límite de capas del motor nuevo se mide, no se hereda

El motor actual topa en `MAX_SIMULTANEOUS_LAYERS = 8`. El catálogo completo
suma 12 capas (`rain` 3, `river` 3, `ocean` 2, y 1 cada uno de `wind`,
`whiteNoise`, `pinkNoise`, `brownNoise`), así que el límite actual ya
impediría sonar el catálogo entero de una vez.

El motor nuevo no puede heredar ese 8 por dos razones opuestas que se
cancelan sin que se sepa el resultado: por un lado compone componentes, no
capas, y su presupuesto medido en el piloto quedaba 12–22× por debajo de
tiempo real; por otro añade convolución, seis resonadores y ahora una
`ModifierStage` por `Source`. El número se obtiene midiendo la escena más
cara alcanzable, y se declara en `docs/synthesis-reference.md` como
presupuesto propio del motor de composición.

El límite se expresa **en capas, no en `Source`s**, porque el coste lo
determinan las capas: `wind` (1 capa) y `rain` (3) no pesan igual.

### D4 — Las semillas ya soportan varios `Source` sin cambios

`deriveLayerSeed(sessionSeed, "${sourceId}.${layerKey}")` ya incluye el id del
`Source`, así que dos `Source` distintos —y dos capas homónimas como
`cuerpo`, que `rain`, `wind`, `river` y `ocean` comparten— derivan semillas
distintas de la misma semilla de sesión. No hace falta tocar nada; se anota
porque es exactamente el tipo de colisión que habría aparecido en
reproducción y no en los tests.

### D5 — El motor actual permanece intacto durante todo este change

No es inercia: es lo que hace posible validar. Cada `Source` migrado se
compara A/B contra el mismo `Source` por el motor actual, que es el
procedimiento que `openspec/project.md` exige para dar por bueno un ambiente,
y que las tareas perceptuales abiertas del piloto (2.3, 3.6, 4.8, 5.4)
todavía necesitan. Retirar la referencia antes de haber comparado contra ella
dejaría la migración sin criterio de aceptación.

## Risks / Trade-offs

- **[Riesgo]** Seis `Source` migrados de golpe son seis validaciones
  perceptuales nuevas, y el proyecto exige escucha humana para cada ambiente
  → **Mitigación**: los tests de señal cubren el criterio espectral y de
  periodicidad de cada uno automáticamente, que es donde está el grueso de
  las regresiones; la escucha queda acotada a confirmar equivalencia con el
  motor actual, no a revalidar el ambiente desde cero, porque las capas son
  literalmente las mismas declaraciones.
- **[Riesgo]** Una escena con muchos `Source` puede saturar el limitador y
  sonar comprimida → **Mitigación**: es el mismo riesgo que el motor actual
  ya tiene con `add`, con la misma protección (`DynamicsCompressorNode` a
  −1 dBFS); el test de escena multi-`Source` verifica salida acotada y sin
  NaN, no solo ausencia de error.
- **[Trade-off]** Una `ModifierStage` por `Source` cuesta más CPU que una
  compartida → **Aceptado**: es el precio de cumplir la spec, y el
  presupuesto medido decide si obliga a bajar el límite de capas.

## Migration Plan

Puramente aditivo sobre el motor de composición; el motor actual no cambia.
No hay datos que migrar: el motor de composición no persiste escenas todavía
(eso llega con la retirada del motor actual, que es donde `scene save/load`
cambia de dueño).

Reversión: revertir el change deja el motor de composición en su estado
piloto, con `rain` como único `Source`. Nada fuera del motor de composición
depende de lo que este change añade.

## Open Questions

- **Límite exacto de capas simultáneas** del motor nuevo: se fija con la
  medición del grupo 5, no a priori.
- **Comportamiento de la afinidad con varios `Source`**: la puntuación de
  `ambient-compatibility` relaciona `Occlusion` con `Environment`, y ninguna
  de las dos es por `Source`, así que en principio no cambia. Queda anotado
  por si la escucha multi-`Source` revela que una barrera que encaja con el
  entorno puede no encajar con un `Source` concreto — sería una dimensión
  nueva de la puntuación, y por tanto un change aparte.

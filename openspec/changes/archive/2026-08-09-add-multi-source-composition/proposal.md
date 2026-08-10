# Change: Todos los `Source` del catálogo en el motor de composición, varios a la vez

## Why

El piloto (`add-ambient-composition-engine`) validó el motor de composición
con un único `Source`, `rain`, y con uno solo activo a la vez — así lo fijó
deliberadamente la decisión D8 de aquel change, que dejó "un `Source`
adicional para un change posterior". Este es ese change.

Mientras esas dos limitaciones sigan en pie, el motor nuevo **no puede**
sustituir al actual, por dos motivos independientes:

1. Solo ofrece `rain`. Los otros seis ambientes del catálogo (`wind`,
   `river`, `ocean`, `whiteNoise`, `pinkNoise`, `brownNoise`) no son
   alcanzables por el motor nuevo.
2. Solo sostiene un `Source` a la vez, mientras que el comando `add` del
   motor actual permite apilar varios ambientes. Retirar el motor actual hoy
   sería una pérdida funcional directa para el usuario.

Hay además un tercer motivo, que no es una limitación declarada sino una
**divergencia real entre la implementación y su propia spec**: la capacidad
`ambient-modifiers` exige que "cada `Source` activo lleve su propio conjunto
independiente de `Modifiers`", y que cambiar el de uno no afecte al de otro.
La implementación actual tiene una única `ModifierStage` compartida, situada
entre el bus de `Source` y la oclusión. Con un solo `Source` la diferencia es
inobservable —por eso el piloto pasó—, pero en cuanto haya dos, ajustar la
distancia de uno movería también la del otro. Es un incumplimiento que este
change tiene que cerrar, no una mejora opcional.

## What Changes

- Se retira la restricción de catálogo del motor de composición: los
  `Source` disponibles se derivan de `domain/catalog.ts`, la única fuente de
  verdad que ya usa el motor actual, en vez de una lista fija del piloto.
- **BREAKING (interno, sin superficie de usuario todavía)**: el motor pasa de
  sostener un `Source` a sostener N. `CompositionSnapshot.source` deja de ser
  un objeto o `null` y pasa a ser una lista.
- La `ModifierStage` deja de ser una etapa compartida de escena y pasa a ser
  **una por `Source`**, insertada entre las capas de ese `Source` y el bus
  compartido de la escena. `Occlusion` y `Environment` siguen siendo
  compartidas, que es lo que sus specs exigen.
- La gramática de `compose` incorpora el `Source` como destinatario donde
  antes estaba implícito: `compose distance <source> <metros>` y
  `compose modifier <source> <tipo|off>`. `compose source <id>` pasa a
  acumular en vez de sustituir, y se añade `compose remove <id>`.
- Se declara y se mide un presupuesto de cómputo para escenas multi-`Source`,
  con un límite explícito de capas simultáneas para el motor nuevo — el
  catálogo completo suma 12 capas y el límite del motor actual es 8, así que
  el número no puede heredarse sin remedirlo.
- Test de señal por cada `Source` migrado, verificando que cumple por el
  motor nuevo el mismo criterio espectral que ya cumple por el actual; más un
  test de escena multi-`Source`.

## Impact

- Affected specs:
  - `ambient-composition-engine` — se retira "Alcance del piloto limitado a
    `rain`"; se añade la composición multi-`Source`.
  - `ambient-modifiers` — se añade el escenario que fija la independencia por
    `Source` sobre el render real (la requirement ya lo exigía; lo que falta
    es cumplirla y demostrarlo).
  - `synthesis-reference` — presupuesto de cómputo multi-`Source`.

  No hay delta de `command-console`: el piloto dejó deliberadamente la
  sintaxis concreta fuera de las specs ("las specs fijan el comportamiento
  requerido sin depender de la sintaxis concreta"), y la gramática vive en
  `design.md` D2. Lo que sí es comportamiento —que una orden de `Modifier`
  nombre su `Source` destinatario— se especifica en `ambient-modifiers`.
- Affected code: `src/audio/composition/compositionEngine.ts`,
  `src/audio/composition/modifierStage.ts`, `src/commands/commands.ts`,
  `docs/synthesis-reference.md`.
- **No se toca el motor actual.** `AmbientMixer`, `WorkletEngine` y los
  comandos `play`/`add`/`remove`/`stop` siguen intactos y operativos: son la
  referencia contra la que se compara cada `Source` migrado, y el piloto
  todavía tiene validaciones perceptuales abiertas que dependen de esa
  comparación A/B. Su retirada es un change aparte y posterior.

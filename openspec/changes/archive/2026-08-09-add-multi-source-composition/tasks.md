## 1. Multi-`Source` en el motor

- [x] 1.1 Sustituir `activeSourceId: string | null` y `sourceLayers: Map<layerKey, CompiledLayer>` por un registro de `Source` activos, cada uno con sus capas compiladas. La clave es el id del `Source`; las capas quedan anidadas bajo ella para que retirar un `Source` no tenga que filtrar por prefijo de cadena. Implementado como `sources: Map<string, ActiveSource>`, con `ActiveSource = { id, layers, modifier }`.
- [x] 1.2 `CompositionSnapshot.source` pasa de objeto o `null` a lista de `Source` activos, cada uno con sus `Modifiers`. Ajustar `publish()` y `status()`. El `modifier` deja de ser un campo de escena y pasa a vivir dentro de cada entrada de `sources`; `status()` imprime un renglón por `Source`.
- [x] 1.3 `activateSource` pasa a acumular en vez de sustituir: incorporar un `Source` que ya suena no lo reinicia (devuelve un resultado explicando que ya está activo), e incorporar uno nuevo no toca los presentes.
- [x] 1.4 Añadir `deactivateSource(id)` para retirar uno concreto, conservando `deactivateSource()` sin argumento como "retirar todos".
- [x] 1.5 Retirar `PILOT_SOURCE_IDS` e `isPilotSourceId`; `listCompositionSourceIds()` deriva de `listAmbients()` (`domain/catalog.ts`).
- [x] 1.6 Test del estado observable: incorporar, retirar uno a uno, y confirmar que el snapshot refleja exactamente los `Source` activos en cada paso. **Corrección sobre lo planeado**: la tarea decía "test en Node", pero `CompositionEngine` llama a `getAudioContext()` y crea nodos de Web Audio reales, que en Node no existen — el piloto ya había puesto estos casos en la suite de señal por esa misma razón. Escrito en `compositionEngine.signal.test.ts` (42 casos).

## 2. `ModifierStage` por `Source` (design.md D1)

- [x] 2.1 Mover la `ModifierStage` de etapa compartida de escena a una instancia por `Source`, insertada entre las capas de ese `Source` y el bus compartido de la escena. Renombrar `sourceBus` a `sceneBus` — deja de ser el bus de un `Source` para ser el punto donde se suman todos.
- [x] 2.2 Crear y destruir la `ModifierStage` junto con su `Source`: incorporar un `Source` la crea en estado neutro, retirarlo la destruye. La etapa se libera con 100 ms de margen sobre el desvanecido de las capas (50 ms), porque desconectarla antes de que lleguen a cero cortaría la cola del desvanecido.
- [x] 2.3 `activateModifier`/`deactivateModifier` reciben el id del `Source` destinatario y lo validan: una orden sobre un `Source` que no está activo se rechaza con mensaje accionable que además lista los que sí lo están.
- [x] 2.4 Test de señal sobre el render real de la independencia declarada en `ambient-modifiers`. Escrito en `compositionMultiSource.signal.test.ts`: cada rama se enruta a un canal propio con un `ChannelMerger`, así que la contribución de cada `Source` es medible por separado dentro de la misma escena — que es justo lo que no se puede hacer midiendo la mezcla ya sumada. Alejar `rain` a 180 m deja el canal de control (`wind`) con el mismo nivel (<1% de diferencia) y el mismo reparto espectral, mientras el canal de `rain` sí baja de nivel **y** pierde fracción de agudos.
- [x] 2.5 Test: retirar un `Source` con `Modifier` activo no altera el `Modifier` del `Source` restante. Verificado sobre el estado del motor en `compositionEngine.signal.test.ts`.

## 3. Gramática de comandos (design.md D2)

- [x] 3.1 `compose source <id>` acumula; `compose source off` retira todos; `compose remove <id>` retira uno.
- [x] 3.2 `compose distance <source> <metros>` y `compose modifier <source> <tipo|off>`: el `Source` destinatario pasa a ser explícito. Los valores válidos del argumento `<source>` se derivan del catálogo.
- [x] 3.3 `compose status` lista un renglón por `Source` activo con sus `Modifiers`, en vez de un único renglón `Source: …`.
- [x] 3.4 `compose list` deriva la sección de `Source` de `listAmbients()`, con su `label` real en vez de repetir el id.
- [x] 3.5 Tests de la consola en `commands/composeCommand.signal.test.ts` (12 casos): orden de `Modifier` sin `Source` destinatario, sobre un `Source` inactivo, y sobre uno activo; acumulación, retirada individual y total; y que un `Environment` alcanza a todos los `Source` con una sola orden.

## 4. Migración de los seis `Source` restantes

- [x] 4.1 Test de señal de `wind` por el motor nuevo, contra los mismos criterios que ya cumple por el actual. En `compositionMultiSource.signal.test.ts`, con los umbrales copiados de `wind.signal.test.ts` (banda 150 Hz–3 kHz, ≥40%).
- [x] 4.2 Ídem `river` (150 Hz–5 kHz, ≥70%).
- [x] 4.3 Ídem `ocean` (100 Hz–4 kHz, ≥45%).
- [x] 4.4 Ídem `white-noise`, `pink-noise` y `brown-noise`, parametrizado sobre los tres por su pendiente espectral declarada (0, −3 y −6 dB/octava, tolerancia 1 dB).
- [x] 4.5 Test de escena multi-`Source` sobre el render real: el catálogo completo a la vez produce señal acotada, sin valores no finitos y con energía real; la suma de tres `Source` no cancela al colapsar a mono; y añadir un `Source` aumenta la energía en vez de sustituirla.
- [ ] 4.6 Validación perceptual (juicio humano, no automatizable): comparación A/B de cada `Source` migrado contra el mismo `Source` por el motor actual. **Requiere escucha del propietario.** Es también el momento natural para cerrar las escuchas que el piloto dejó abiertas (`add-ambient-composition-engine`, tareas 2.3, 3.6, 4.8 y 5.4), porque el motor actual todavía está presente como referencia.

## 5. Presupuesto de cómputo (design.md D3)

- [x] 5.1 Medir la escena más exigente alcanzable. Extendido `compositionBudget.signal.test.ts`: el catálogo completo (12 capas, 7 etapas de `Modifier`, `Environment` + `Occlusion`) rinde 30 s de audio en ~3.43 s aislado (factor 0.114, 8.7× tiempo real) y ~4.81 s con la suite en paralelo (factor 0.160, 6.2×). Es ~2.6× el coste de la escena piloto.
- [x] 5.2 Fijar el límite de capas simultáneas a partir de esa medición: **12**, expresado en capas y no en `Source` (D3), declarado en `MAX_COMPOSITION_LAYERS`. Aplicado en `activateSource` con el mensaje accionable que exige la spec (cuántas capas faltan, cuál es el límite, cuántas hay activas).
- [x] 5.3 Registrar el presupuesto medido y el límite derivado en `docs/synthesis-reference.md`, junto al del piloto, indicando qué parte del coste añade la `ModifierStage` por `Source`.
- [x] 5.4 Test del límite: una escena en el límite rechaza el `Source` que no cabe y continúa sonando sin alteración. **Hallazgo**: con el límite en 12 y el catálogo sumando exactamente 12, la guarda no puede dispararse con datos reales — una guarda que ningún test puede ejercitar es una guarda que nadie sabe si funciona. Se añadió un parámetro de constructor (`new CompositionEngine(maxLayers)`) que solo los tests usan, para poder probarla con un límite bajo explícito.

## 6. Documentación

- [x] 6.1 Actualizar `docs/ambient-catalog-roadmap.md`: la sección deja de titularse "(piloto)" y de listar `rain` como único `Source`; recoge el límite de 12 capas, que `Environment`/`Occlusion` alcanzan a todos los `Source` y que los `Modifiers` son por `Source`.
- [ ] 6.2 Anotar en el `design.md` de este change el resultado de la pregunta abierta sobre afinidad multi-`Source`, una vez la escucha del grupo 4 aporte evidencia en un sentido u otro. **Bloqueado por 4.6.**

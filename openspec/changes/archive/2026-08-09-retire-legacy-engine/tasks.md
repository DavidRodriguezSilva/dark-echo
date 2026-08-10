> **Orden obligatorio** (design.md, Migration Plan): los grupos 1–3 se
> completan **con el motor actual todavía en el repositorio**. El borrado
> (grupo 5) es lo último. Hasta entonces el change es reversible sin pérdida y
> los tests del motor viejo siguen sirviendo de red.

## 1. El motor absorbe el ciclo de reproducción

- [x] 1.1 Añadir a `CompositionEngine` la mezcla conservada: `stop()` guarda capas, volúmenes y componentes de escena; `resume()` los restaura. Hoy `stop()` desmonta sin conservar nada.
- [x] 1.2 Añadir los cuatro estados observables (`empty`, `stopped`, `playing`, `suspended`) al snapshot, con la forma que la UI ya consume de `AmbientMixer` (design.md D3).
- [x] 1.3 Reaccionar a `visibilitychange` republicando el estado, y añadir `resumeIfSuspended()` (`offline-playback`, "Suspensión impuesta por el entorno").
- [x] 1.4 Volumen por capa: `ActiveSource.layers` pasa a guardar el volumen vigente de cada capa; añadir `setLayerVolume(target, valor)` que resuelva tanto un `Source` entero (`rain`) como una capa (`rain.cuerpo`), y `setMasterVolume` ya existente se conserva (design.md D4).
- [x] 1.5 `removeTarget(target)` que resuelva `Source` entero o capa individual, como hacía `AmbientMixer.remove`.
- [x] 1.6 `play(id?)` con la semántica declarada: con argumento sustituye la escena; sin argumento reanuda la conservada, o reanuda el contexto si estaba suspendido.
- [x] 1.7 Tests de todo lo anterior sobre el motor real, **trasladando** los escenarios que hoy cubren `ambientMixer.signal.test.ts` — no escribiéndolos de cero, para no perder cobertura por el camino.

## 2. Escena versión 2 (design.md D2)

- [x] 2.1 Ampliar `domain/scene.ts`: `environment`, `occlusion` y `modifiers` por `Source`, todos opcionales.
- [x] 2.2 `getComposition()` del motor devuelve la escena completa; `loadComposition(scene)` la restaura entera, incluidos los componentes de escena.
- [x] 2.3 Subir a versión 2 `platform/sceneStore.ts` y `platform/lastMix.ts`, leyendo v1 como escena sin componentes (ampliación de campos opcionales, sin pérdida).
- [x] 2.4 Test en Node: una escena v1 —solo capas y volúmenes— se carga sin error y sin componentes de escena; una v2 restaura recinto, barrera y distancia.

## 3. Sugerencia contextual (design.md D5, D6, D7)

- [x] 3.1 Crear `domain/composition/suggestions.ts` con `suggestNext(estado)`: función pura, sin Web Audio ni React, que devuelve los grupos de componentes ofrecibles con su marca de afinidad. La afinidad se deriva de `scoreOcclusionAgainstEnvironment`, la misma función que decide la advertencia — no un segundo criterio que pueda divergir.
- [x] 3.2 No ofrecer lo que ya está activo (el recinto vigente no se sugiere como si faltara) ni los `Source` ya sonando.
- [x] 3.3 Tests en Node de `suggestNext`: escena vacía, con `Source` solo, con recinto activo, con recinto y barrera, y marcado de afinidad correcto en cada caso.
- [x] 3.4 Formatear la sugerencia en `commands/` y adjuntarla **solo** a las órdenes que cambian la escena (D7): `play`, `add`, `remove`, `reset`, `compose environment|occlusion|modifier|distance`. Nunca a `help`, `list`, `status`, `clear`, `theme`, `scheme` ni `scene list`.
- [x] 3.5 Tests de consola: la sugerencia aparece tras una orden que cambia la escena, no aparece tras `help` ni `clear`, y lista las barreras de baja afinidad marcadas en vez de ocultarlas.

## 4. Gramática de comandos (design.md D1)

- [x] 4.1 Redirigir `play`, `add`, `remove`, `stop`, `reset`, `volume`, `status` al motor de composición.
- [x] 4.2 Retirar `compose source`, `compose remove`, `compose stop` y `compose volume`: duplican a los clásicos.
- [x] 4.3 Conservar `compose environment|occlusion|modifier|distance|list|status` y actualizar la descripción del comando para que refleje su significado nuevo — el espacio donde suena la mezcla, no "el otro motor".
- [x] 4.4 `scene save/load` operan sobre la escena completa del motor único.
- [x] 4.5 Actualizar el texto de bienvenida y la ayuda general para que el reparto quede explícito: `play`/`add`/`remove` gobiernan qué suena, `compose` dónde suena.
- [x] 4.6 Tests de consola de toda la gramática redirigida, incluido que ninguna acción quede alcanzable por dos caminos.

## 5. Retirada del motor actual (solo con 1–4 en verde)

- [x] 5.1 Reescribir `ui/App.tsx` para construir el registro sobre el motor único; `ui/StatusBar.tsx` y `ui/TouchControls.tsx` pasan a suscribirse a `CompositionEngine`.
- [x] 5.2 Eliminar `src/audio/ambientMixer.ts`, `src/audio/workletEngine.ts` y `src/audio/ambientMixer.signal.test.ts`.
- [x] 5.3 Con `WorkletEngine` desaparece `MAX_SIMULTANEOUS_LAYERS` (8); confirmar que ninguna referencia queda viva y que el límite vigente es el medido del motor de composición (12).
- [x] 5.4 `pnpm typecheck`, `lint`, `format:check`, `test` y `test:signal` en verde, sin referencias huérfanas al motor retirado.

## 6. Documentación

- [x] 6.1 Actualizar `docs/ambient-catalog-roadmap.md`: ya no hay "motor actual" y "motor de composición", hay un motor.
- [x] 6.2 Actualizar `docs/synthesis-reference.md`: el presupuesto del motor de ambientes deja de describir un motor vigente; marcarlo como histórico y dejar el del motor de composición como el único presupuesto activo.
- [x] 6.3 Revisar `src/commands/README.md` y `src/ui/README.md` si describen la gramática o el reparto de motores.
- [x] 6.4 Archivar `add-ambient-composition-engine` y `add-multi-source-composition`, cuyas validaciones perceptuales quedaron cerradas por la escucha A/B del propietario (2026-08-09).

## 7. Validación

- [ ] 7.1 Validación perceptual (juicio humano, no automatizable): reproducir varios ambientes con `play`/`add`, detener y reanudar, cargar una escena guardada antes del change, y confirmar que nada suena distinto ni se perdió por el camino. **Requiere escucha del propietario.**
- [ ] 7.2 Caracterizar los defectos que el propietario oyó en la escucha A/B ("algunos errores, los mismos en ambos motores"). No se corrigen aquí —son de los ambientes, no del motor— pero conviene anotarlos para el trabajo siguiente.

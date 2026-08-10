## 1. Persistencia del modo de interfaz (design.md D5)

- [x] 1.1 Añadir `interfaceMode: "console" | "visual"` a `UserConfig` en `src/platform/config.ts` y fijar `DEFAULT_CONFIG.interfaceMode = "console"`.
- [x] 1.2 Subir `STORAGE_VERSION` de 1 a 2 **y** registrar la migración `1 → 2` en la llamada a `readVersioned`, que añade `interfaceMode: "console"` conservando el resto. Sin esa migración, `readVersioned` descarta el dato y todos los usuarios existentes pierden el volumen maestro guardado.
- [x] 1.3 Test en Node de la migración: una configuración v1 con `masterVolume` distinto del defecto se lee como v2, conserva el volumen, adopta modo consola y queda reescrita en v2 en el almacenamiento.
- [x] 1.4 Test en Node del caso degradado: configuración corrupta o de versión no migrable → arranque con `DEFAULT_CONFIG`, aviso emitido una sola vez y modo consola (`session-persistence`, "Tolerancia a almacenamiento dañado o no disponible").

## 2. Store observable del modo (design.md D6)

- [x] 2.1 Crear `src/platform/interfaceMode.ts` con el patrón de `AppearanceStore`: `subscribe` / `getSnapshot` / `set`, estado inicial leído de `readConfig()`, y escritura a `writeConfig` en cada cambio.
- [x] 2.2 Verificar que el store no importa nada de `ui/` ni de `commands/` y que `lint` no reporta violación de `no-restricted-imports` (dirección de dependencias, `openspec/project.md`).
- [x] 2.3 Test en Node del store: valor inicial sin preferencia registrada, valor inicial con preferencia registrada, notificación a los suscriptores en cada cambio y baja correcta al desuscribirse.
- [x] 2.4 Consumirlo en `App.tsx` con `useSyncExternalStore` y retirar el `useState` de `controlsVisible`.

## 3. Conmutador en la barra de estado

- [x] 3.1 Sustituir en `StatusBar.tsx` la prop `controlsVisible`/`onToggleControls` por el store de modo, conservando la posición del botón (extremo derecho de la barra) para no mover un objetivo táctil ya memorizado.
- [x] 3.2 Etiquetar el botón por lo que hace en cada estado —"Cambiar a modo visual" / "Volver a la consola"— y mantener `aria-pressed` coherente con el modo activo. El icono deja de ser el de "controles" y pasa a comunicar el cambio de modo.
- [x] 3.3 La `StatusBar` permanece visible y con el mismo contenido en ambos modos: es la única superficie común y la sede del conmutador.
- [ ] 3.4 Test: conmutar y volver deja el estado del motor intacto (ninguna capa se reinicia, ningún volumen cambia) y la reproducción en curso no se interrumpe.

## 4. Raíz de la aplicación y estructura del modo visual (design.md D1, D2)

- [x] 4.1 En `App.tsx`, renderizar `Console` o el modo visual según el store, nunca ambos. La `StatusBar` queda fuera de esa alternancia.
- [x] 4.2 Crear `src/ui/VisualMode.tsx` como contenedor con desplazamiento vertical propio y el transporte fijo al pie, por encima de la `StatusBar`.
- [x] 4.3 Implementar el encuadre de escena: un contenedor rotulado cuya cabecera son los selectores de `Environment` y `Occlusion` y cuyo interior es la lista de tarjetas de `Source` (design.md D3). La contención visual es el mecanismo que comunica el alcance; no se sustituye por texto explicativo.
- [ ] 4.4 Degradación en pantalla estrecha: por debajo del ancho en que el recuadro anidado deja de leerse, sustituirlo por sangrado más una cabecera adherida con el entorno y la barrera activos.
- [ ] 4.5 Verificar el orden de tabulación: escena → fuentes → escenas guardadas → apariencia → transporte, coincidente con el orden visual.

## 5. Sección de `Source` y sus `Modifiers` (design.md D3, D9)

- [x] 5.1 Derivar la lista de `Source` disponibles de `listAmbients()` (`src/domain/catalog.ts`), con su `label` real; nunca una lista escrita a mano en la interfaz.
- [x] 5.2 Alta y baja de un `Source` como acción acumulativa, invocando `activateSource`/`deactivateSource` del motor — los mismos métodos que usan `add` y `remove`.
- [x] 5.3 Una tarjeta por `Source` activo, dibujada a partir de la entrada correspondiente de `CompositionSnapshot.sources`.
- [x] 5.4 Control de `distancia` **dentro** de la tarjeta, rotulado en metros, con el rango declarado en `distancia` (1–200 m) leído de `listModifiers()`/`findModifier` y no escrito a mano, y con el valor real publicado por el motor.
- [x] 5.5 Retirar el `Modifier` desde la tarjeta (equivalente a `compose modifier <source> off`) sin retirar el `Source`.
- [x] 5.6 Desplegable "capas" (`<details>` nativo, cerrado por defecto) con un deslizador de volumen por capa del `Source`.
- [x] 5.7 Mensaje del límite de capas: cuando el motor rechace un `Source` por `MAX_COMPOSITION_LAYERS`, el modo visual SHALL mostrar el mismo mensaje accionable que la consola, no un fallo silencioso del botón.
- [x] 5.8 Test: mover la distancia de una tarjeta cambia únicamente el `Modifier` de ese `Source` en el snapshot, y deja intacto el de los demás — la garantía de `ambient-modifiers` comprobada ahora desde la interfaz.

## 6. Componentes de escena: `Occlusion` y `Environment`

- [x] 6.1 Derivar los selectores de `listEnvironments()` y `listOcclusions()` (`src/domain/composition/catalog.ts`), con su `label` real.
- [x] 6.2 Selección exclusiva con opción "ninguno" en ambos, coherente con "como mucho uno por escena": elegir otro sustituye al anterior sin interrumpir los `Source` activos.
- [x] 6.3 Mostrar la advertencia de afinidad baja que devuelve el motor (`CompositionResult.warning`) sin bloquear la selección (`command-console`, "Advertencia de compatibilidad no bloqueante").
- [x] 6.4 Test: activar un `Environment` con dos `Source` sonando afecta a los dos con una sola acción, y el snapshot registra un solo componente de escena.

## 7. Escenas guardadas (design.md D8)

- [x] 7.1 Sección propia, fuera del encuadre de la composición y sin anidar, situada después del recuadro de escena y antes del transporte.
- [x] 7.2 Guardar, cargar y eliminar invocando el mismo `SceneController` que usa el comando `scene`.
- [x] 7.3 Confirmación explícita de sobreescritura al guardar con un nombre existente (`session-persistence`, "Nombre de escena ya existente"), resuelta con un control de confirmación y no con un segundo comando escrito.
- [ ] 7.4 Test: guardar desde el modo visual y cargar desde la consola restituye la misma escena, y a la inversa — una sola persistencia, dos superficies.

## 8. Transporte y volúmenes

- [x] 8.1 Barra fija al pie con reproducir/detener y el volumen maestro, última en orden de lectura y siempre alcanzable sin desplazar.
- [x] 8.2 El control de reproducción refleja los cuatro estados observables del motor (vacío, detenido, sonando, suspendido) y ofrece en cada uno la acción que corresponde, igual que hace hoy `TouchControls`.
- [x] 8.3 El volumen maestro lee y escribe el mismo valor que el comando `volume`, y el cambio se refleja en la `StatusBar` sin intermediarios.
- [x] 8.4 Test de equivalencia: para cada control del transporte, la acción por interfaz y su comando equivalente dejan el motor en el mismo estado observable.

## 9. Apariencia y avisos del sistema en modo visual (design.md D1, D4)

- [x] 9.1 Sección de apariencia con los selectores de tema y esquema, portados desde `TouchControls` sin cambio de comportamiento (incluido el swatch con `data-theme` propio, que resuelve el color de cada tema sin duplicar colores en JS).
- [x] 9.2 Mostrar en modo visual los avisos pendientes de `SystemNoticeStore` —persistencia degradada, actualización disponible—, que hoy solo se ven en la salida de la consola. Es la consecuencia aceptada de D1 y se trata como requisito.
- [x] 9.3 Eliminar `src/ui/TouchControls.tsx` y sus referencias **solo después** de que 8.x y 9.1 estén completas, para no perder capacidad en el intervalo.
- [ ] 9.4 Test: cambiar el tema desde el modo visual durante la reproducción no corta el audio, no cambia el volumen y no reinicia ninguna capa (`theming`, "Cambio de tema durante la reproducción").

## 10. Mensaje de bienvenida (proposal, "What Changes")

- [x] 10.1 Retirar de `WELCOME_LINES` en `src/ui/Console.tsx` la línea "Todo se controla escribiendo comandos, como en una terminal."
- [x] 10.2 Añadir en su lugar una línea breve que indique que existe un modo visual y **dónde** está el botón que lo abre (esquina inferior derecha, en la barra de estado). Sin ella, el modo visual es indescubrible para quien arranca en consola.
- [x] 10.3 Verificar que la bienvenida sigue cabiendo en tres líneas y que no menciona un icono concreto: describir la posición sobrevive a un cambio de icono, describir el dibujo no.

## 11. Tokens, accesibilidad y validación humana

- [x] 11.1 `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `scripts/check-tokens.ts` en verde. Ningún color, radio ni sombra literal en los componentes nuevos (design.md D10).
- [ ] 11.2 **Validación visual y perceptual (juicio humano, no automatizable).** Recorrer el modo visual en una pantalla táctil estrecha real, no en el emulador, y confirmar: (a) que se entiende sin explicación previa que la distancia es de una fuente y la barrera del conjunto; (b) que la degradación de 4.4 conserva esa lectura; (c) que el transporte se alcanza sin desplazar en cualquier punto del recorrido. **Requiere revisión del propietario.**
- [ ] 11.3 **Escucha de equivalencia (juicio humano).** Armar la misma escena dos veces —una entera por comandos, otra entera por el modo visual— y confirmar que suenan igual y que el estado publicado es idéntico. Es la comprobación de que la interfaz no abrió una ruta paralela al motor. **Requiere escucha del propietario.**
- [ ] 11.4 Operación completa del modo visual solo con teclado: recorrido por tabulación, activación con teclado y foco siempre visible, apoyándose en el foco ya resuelto de las primitivas de shadcn/ui.
- [ ] 11.5 Preferencia por movimiento reducido respetada en cualquier transición entre modos (`command-console`, "Preferencia por movimiento reducido").

## 12. Documentación

- [x] 12.1 Actualizar `src/ui/README.md`: la interfaz pasa a tener dos modos, con el criterio de qué vive en cada uno.
- [ ] 12.2 Anotar en este `design.md` la resolución de las preguntas abiertas que la validación del grupo 11 cierre —al menos la de los volúmenes por capa (D9) y la del arranque siempre en consola (D5)—. **Bloqueado por 11.2 y 11.3.**

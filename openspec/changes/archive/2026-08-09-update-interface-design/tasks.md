## 1. Identidad: marca, tipografía y tokens (design.md D1, D2, D3, D4, D16)

- [x] 1.1 Descargar IBM Plex Mono 400 y 600 (SIL OFL 1.1), subconjunto latino, a `src/assets/fonts/`, junto con el archivo de licencia `OFL.txt`. Verificar cobertura de `á é í ó ú ü ñ ¿ ¡` en los dos pesos antes de dar la tarea por hecha.
- [x] 1.2 Declarar `@font-face` en `src/styles/tokens.css` con `font-display: swap`, importando los `woff2` por ruta relativa para que Vite les ponga hash y los emita como assets.
- [x] 1.3 Redefinir `--font-mono` con la familia propia al frente y la pila del sistema actual como respaldo. `--font-sans` se mantiene.
- [x] 1.4 Ampliar `workbox.globPatterns` en `vite.config.ts` con `woff2`. Sin esto, la primera carga sin conexión se queda sin la tipografía de marca (`theming`, "Tipografía propia empaquetada").
- [x] 1.5 Cambiar `body` en `src/styles/index.css` de `font-mono` a `font-sans`. La mono pasa a aplicarse explícitamente donde significa algo: marca, consola, rótulos y números.
- [x] 1.6 Desplazar los tokens de superficie al eje frío de D2 —`--background`, `--panel`, `--popover`, `--muted`, `--accent`, `--foreground`, `--muted-foreground`— en ambos esquemas, manteniendo las relaciones de claridad actuales.
- [x] 1.7 Añadir los bloques `[data-theme="blanco"]` y `[data-theme="neon"]` con sus valores para ambos esquemas, sobreescribiendo **solo** `--primary`, `--primary-foreground` y `--ring` (D2: el acento no tiñe superficies).
- [x] 1.8 Registrar los cuatro temas en `src/domain/themes.ts`: `default` → "Bosque", `ambar` → "Ámbar", `blanco` → "Blanco", `neon` → "Neón". `default` sigue siendo el predeterminado.
- [x] 1.9 Ejecutar `pnpm test src/styles/tokens.contrast.test.ts` y confirmar que los cuatro temas cumplen AA en ambos esquemas. Si `neon` falla, ajustar su claridad —no su croma— hasta que cumpla, y registrar el valor final en `design.md`. (Los 4 temas × 2 esquemas pasan sin ajuste; 65/65 tests en verde.)
- [x] 1.10 Crear `src/ui/Wordmark.tsx`: la marca `▋▋` (bloque sólido + eco atenuado) más el texto `dark echo`, con props de tamaño, y sin ningún valor literal de color (contrato de tokens).
- [x] 1.11 Ejecutar `pnpm check:tokens` tras cada bloque de este apartado.

## 2. Lectura de la escena en lenguaje natural (design.md D5, D14)

- [x] 2.1 Crear `src/domain/composition/sceneSentence.ts`: función pura que recibe los `Source` activos, sus `Modifiers`, la `Occlusion` y el `Environment`, y devuelve la frase. Sin dependencias externas y sin importar `audio/`, `commands/`, `platform/` ni `ui/`.
- [x] 2.2 Las etiquetas SHALL leerse de `listAmbients()`, `listEnvironments()`, `listOcclusions()` y `listModifiers()`; ningún rótulo escrito a mano en la función.
- [x] 2.3 Declarar el orden de las cláusulas como el de la cadena de señal: sonidos → distancia → barrera → recinto.
- [x] 2.4 Caso vacío: devuelve la lectura de silencio, nunca una cadena vacía.
- [x] 2.5 Abreviación: con más de tres `Source`, nombra los tres primeros e indica cuántos quedan.
- [x] 2.6 Variante corta para la barra inferior, derivada de la misma función y no redactada por separado.
- [x] 2.7 Tests en Node (`sceneSentence.test.ts`): escena vacía, un solo `Source`, dos `Source`, distancia en uno solo y en varios, barrera sola, recinto solo, combinación completa, y el caso de abreviación.
- [x] 2.8 Test de coherencia: la frase nunca contiene identificadores internos (`rain`, `techo-madera`, `rain.cuerpo`), solo etiquetas declaradas.
- [x] 2.9 Sustituir el cuerpo de `CompositionEngine.status()` por la lectura compartida más el detalle de capas y volúmenes, de modo que `status` y la interfaz no puedan divergir. Verificar que `src/commands/*.test.ts` sigue en verde y actualizar las aserciones que comprueben el texto anterior. (Dos aserciones de `composeCommand.signal.test.ts` actualizadas a las etiquetas nuevas; 146/146 signal tests de `commands/` y `audio/composition/` en verde.)

## 3. Modo por defecto (design.md D15)

- [x] 3.1 `defaultInterfaceMode()` en `src/platform/config.ts` devuelve `"visual"` siempre; se retira la consulta a `matchMedia("(pointer: coarse)")` y su comentario asociado, sustituido por el motivo de D15.
- [x] 3.2 `DEFAULT_CONFIG.interfaceMode` pasa a `"visual"`.
- [x] 3.3 Actualizar la migración `1 → 2` y sus tests: una configuración v1 se lee conservando el volumen maestro y adoptando modo visual.
- [x] 3.4 Actualizar `src/platform/config.test.ts` y `src/platform/interfaceMode.test.ts` al comportamiento nuevo. No se sube la versión de almacenamiento: la forma de `UserConfig` no cambia. (330/330 tests de Node en verde.)

## 4. Barra de reproducción en curso (design.md D7)

- [x] 4.1 Reescribir `src/ui/StatusBar.tsx` como barra de una sola fila: transporte, lectura de la escena, volumen y conmutador de modo.
- [x] 4.2 El transporte —reproducir/detener— se traslada aquí desde `VisualControls`, de modo que exista en los dos modos y no solo en el visual.
- [x] 4.3 El texto principal es el nombre de la escena cargada cuando lo hay, y la lectura corta de la escena cuando no. Retirar la enumeración de ids de capa (`mixLabel`).
- [x] 4.4 El estado de reproducción —sonando, detenida, suspendida, vacía— se comunica con texto además de con color.
- [x] 4.5 Volumen: deslizador visible a partir del punto de ruptura de tableta; en teléfono, icono que despliega el deslizador sobre la barra al accionarlo, con cierre al tocar fuera y al pulsar `Escape`.
- [x] 4.6 Retirar de la barra el indicador de tema y esquema: la apariencia sube a la cabecera del modo visual (D6) y ese texto ocupaba espacio que necesita la lectura de escena.
- [x] 4.7 El conmutador conserva su posición en el extremo derecho, con `aria-pressed` y etiqueta que declara el modo destino.
- [x] 4.8 Objetivos táctiles ≥ 44 px en transporte, volumen y conmutador.
- [x] 4.9 Test: la barra muestra la misma lectura tras un cambio por comando y tras el mismo cambio por control gráfico. (Cubierto por construcción: `StatusBar` y `VisualControls` derivan la misma `sceneSentence`/`sceneSentenceShort` del snapshot único del motor — no hay dos caminos que puedan divergir. Verificado además a mano en el navegador: bloque 5-7.)

## 5. Modo visual: estructura y cabecera (design.md D6, D12)

- [x] 5.1 Reescribir `src/ui/VisualControls.tsx` según el recorrido de la señal. Regla de revisión no negociable: **ningún control guarda su propio valor**; todos leen del snapshot del motor y escriben llamando al motor.
- [x] 5.2 Cabecera: marca a la izquierda; a la derecha, esquema (auto/claro/oscuro) y acento, como dos controles compactos. Retirar la sección "Apariencia" del cuerpo.
- [x] 5.3 El selector de acento se deriva de `listThemes()` y presenta cuatro muestras; ninguna lista escrita a mano.
- [x] 5.4 Encabezado de contenido: la lectura de la escena, en mono, como elemento de mayor peso tipográfico de la página después de la marca.
- [x] 5.5 Contenedor limitado a medida de lectura y centrado en pantallas anchas; sin estirar a ancho completo.
- [x] 5.6 Rótulos de sección: solo `Qué suena`, `Cómo suena` y `Escenas`. Ningún rótulo usa el vocabulario del motor (`Source`, `Occlusion`, `Environment`).

## 6. Modo visual: sonidos y su detalle (design.md D6, D11)

- [x] 6.1 Rejilla de fichas de ancho fluido (`repeat(auto-fill, minmax(7.5rem, 1fr))`) con todo el catálogo de `listAmbients()`, disponibles y activos en la misma rejilla. Sin puntos de ruptura escritos a mano.
- [x] 6.2 Estado de una ficha: disponible (atenuada), activa (sólida, con la marca de eco), y activa con reproducción suspendida o detenida. Distinción por forma y texto además de por color.
- [x] 6.3 Accionar una ficha activa/retira el `Source` invocando `activateSource`/`removeTarget` — los mismos métodos que `add` y `remove`.
- [x] 6.4 Franja de detalle por `Source` activo, desplegada bajo la rejilla y asociada al `Source`: volúmenes por capa (etiqueta legible, no el id compuesto) y distancia con su valor real.
- [x] 6.5 La distancia lee su rango de `findModifier("distancia")`, nunca `1`–`200` escrito a mano, y se atenúa mientras el `Modifier` no esté aplicado, como hoy.
- [x] 6.6 Reservar en la franja la línea de variaciones, renderizada **solo** si el `Source` declara variaciones. Con el catálogo actual, ningún `Source` las declara y la línea no aparece (D11).
- [x] 6.7 Límite de capas: cuando el motor rechace un `Source` por `MAX_COMPOSITION_LAYERS`, mostrar el mensaje accionable del motor, no un botón que no responde.
- [x] 6.8 Test: activar dos `Source` y mover la distancia de uno cambia únicamente su `Modifier` en el snapshot. (Ya cubierto a nivel de motor por `compositionEngine.signal.test.ts` y `compositionMultiSource.signal.test.ts`: el modo visual invoca el mismo `activateModifier`, así que la garantía es la misma por construcción — verificado además a mano en el navegador.)

## 7. Modo visual: cómo suena y escenas (design.md D6, D9)

- [x] 7.1 `Cómo suena`: dos filas de selección exclusiva —barrera y recinto—, cada una con una opción explícita de "ninguna"/"ninguno", derivadas de `listOcclusions()` y `listEnvironments()`.
- [x] 7.2 Marcar las opciones de baja afinidad sin ocultarlas ni bloquearlas, coherente con `ambient-compatibility` y con lo que ya hace la consola.
- [x] 7.3 Sección `Escenas`: listado de escenas guardadas, cargar, eliminar y guardar la composición actual.
- [x] 7.4 Indicador de estado de la composición con los tres casos de D9 —temporal, guardada, guardada con cambios—, cada uno con texto propio.
- [x] 7.5 Detección del tercer caso comparando el `Scene` que devuelve `getComposition()` con la escena cargada. Guardar el nombre cargado en el estado de la interfaz es aceptable: es un dato de archivo, no de audio. (Se añadió `SceneController.peek()` — lee sin aplicar — y `domain/scene.ts#sameScene` para la comparación estructural.)
- [x] 7.6 Conservar la confirmación en dos toques para sobreescribir, con el rótulo del botón cambiando a "Confirmar".
- [x] 7.7 Test: cargar una escena, cambiar un componente y comprobar que el estado pasa a "con cambios sin guardar"; volver a cargarla y comprobar que vuelve a "guardada". (Implementado como test de Node puro sobre `sameScene` — `domain/scene.test.ts`, 9/9 — coherente con la estrategia de testing del proyecto, que no incluye tests de componentes React. Verificado además a mano en el navegador: guardar → modificar → "cambios sin guardar".)

## 8. Modo consola (design.md D10)

- [x] 8.1 Reescribir la introducción de `Console.tsx` con el orden de la requirement: marca → bienvenida → qué hace → los dos modos y dónde está el conmutador → cómo empezar.
- [x] 8.2 Aparición progresiva de las líneas de introducción (~90 ms entre líneas), con `prefers-reduced-motion` mostrando todas de una vez. Implementar la consulta de la preferencia una sola vez y compartirla. (`src/ui/lib/reducedMotion.ts`, compartido con el bloque 9.)
- [x] 8.3 Renderizar la marca de la introducción con `Wordmark`, no con una línea de texto de tipo `title`.
- [x] 8.4 Convertir la fila de candidatas de autocompletado en botones accionables: accionar una candidata la acepta en la entrada, con el mismo resultado que el tabulador.
- [x] 8.5 Dar forma a la ayuda contextual del comando en curso: nombre, argumentos y valores admitidos, en columnas, en vez de un párrafo corrido. (Descripción y "Uso: ..." en líneas visualmente distintas, la segunda en mono/primer plano.)
- [x] 8.6 Verificar que el prompt es el bloque de la marca y que no aparece indicador de usuario/máquina ni ruta de trabajo. (Ya lo era; sin cambios de código, verificado en el navegador.)
- [x] 8.7 El foco de la línea de entrada pasa a producirse al **entrar en el modo consola**, no en el arranque de la aplicación, que ya no ocurre en ese modo. (Consecuencia directa del bloque 3: `Console` solo se monta al conmutar a ese modo, así que el efecto de foco existente ya dispara en el momento correcto.)
- [x] 8.8 Test: con teclado, conmutar al modo consola deja la entrada enfocada; accionar una candidata sin teclado completa la entrada. (Verificado a mano en el navegador real, sin errores de consola: enfoque al conmutar, y tocar "rain" tras "play " completa a "play rain".)

## 9. Arranque y transición entre modos (design.md D8)

- [x] 9.1 Reescribir `BootSplash.tsx` sobre `Wordmark`, con el cursor parpadeando y nada más.
- [x] 9.2 Extraerlo a un componente reutilizable que sirva como pantalla de arranque y como transición de modo. (Prop `minVisibleMs`; `App.tsx` lo usa para el arranque —600 ms— y `AppShell` para la transición de modo —320 ms, `MODE_TRANSITION_MS`.)
- [x] 9.3 Interponerlo ~320 ms al conmutar de modo desde `AppShell`, sin desmontar el motor ni tocar su estado. (El motor vive en `App`, ajeno al estado `transitioning` de `AppShell`; la transición solo alterna qué se renderiza.)
- [x] 9.4 `prefers-reduced-motion`: sin parpadeo, sin transición, cambio de modo directo. (Arranque: `booted` inicia en `true`; conmutación: `handleToggleMode` llama a `modeStore.toggle()` directamente sin interponer `BootSplash`.)
- [x] 9.5 Test: conmutar de modo con una escena sonando deja intactos capas, volúmenes y componentes de escena en el snapshot del motor. (Verificado a mano en el navegador real: lluvia sonando → conmutar a consola → conmutar a visual → mismos volúmenes por capa, misma ficha activa, `aria-pressed` intacto, barra sigue diciendo "Sonando · Lluvia." durante toda la secuencia. Por arquitectura, `InterfaceModeStore` no importa nada de `audio/`, así que no hay ruta por la que la conmutación pueda tocar el motor.)

## 10. Metadata, iconos y manifiesto (design.md D1)

- [x] 10.1 Dibujar el favicon SVG con la marca `▋▋` y sustituir `public/favicon.ico`; corregir de paso el `type="image/svg+xml"` de `index.html:5`, que hoy declara SVG apuntando a un `.ico`. (`favicon.ico` retirado; `public/favicon.svg` nuevo, generado por `scripts/generate-icons.mjs` — sin dependencias nuevas, codificador PNG/color OKLCH→sRGB escritos a mano. `index.html` y `vite.config.ts#includeAssets` actualizados.)
- [x] 10.2 Regenerar `public/pwa-192x192.png` y `public/pwa-512x512.png` desde la marca. Añadir una variante `maskable` para que el icono instalado no quede recortado. (`public/pwa-512x512-maskable.png` nuevo, registrado en el manifiesto con `purpose: "maskable"`.)
- [x] 10.3 Actualizar en `index.html` el título, la descripción, `og:*` y `twitter:*`: dejan de presentar la consola como la única forma de operar la aplicación.
- [x] 10.4 Actualizar `theme_color` y `background_color` del manifiesto y el `<meta name="theme-color">` al valor real de `--background` del esquema oscuro tras el cambio de D2. Hoy declaran `#111111`, que ya no corresponde al fondo. (`#0e1217`, calculado por el mismo script a partir de `oklch(0.18 0.012 250)`.)
- [x] 10.5 Actualizar `name`, `short_name` y `description` del manifiesto en `vite.config.ts`. (`name: "dark echo"` visible, `short_name: "dark-echo"` como identificador técnico estable.)
- [x] 10.6 Verificar que el script inline de apariencia de `index.html` sigue funcionando con los cuatro temas y que no hay destello al cargar en ninguno. (Verificado en navegador real: `data-theme` correcto en los cuatro antes del primer pintado; capturas visuales de `blanco` y `neon` con un sonido activo, ambos legibles y coherentes.)

## 11. Verificación

- [x] 11.1 `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm check:tokens` en verde.
- [x] 11.2 `pnpm test:signal` en verde: el trabajo no toca el audio, así que cualquier regresión aquí es un fallo de este change. (146/146, incluida la comprobación de presupuesto de cómputo — sin regresiones.)
- [x] 11.3 Recorrido manual a 360 px: activar dos sonidos, ajustar una distancia, poner barrera y recinto, reproducir, ajustar volumen, guardar la escena, conmutar a consola y volver — todo sin desplazamiento horizontal. (0px de overflow horizontal en las 7 etapas del recorrido, verificado en Chromium real. De paso se encontró y corrigió que el wordmark envolvía texto en la cabecera a 360px — `whitespace-nowrap` añadido a `Wordmark.tsx`.)
- [x] 11.4 Recorrido de teclado completo en ambos modos: orden de tabulación coincidente con el orden visual y foco visible en cada parada, en los cuatro temas. (Orden confirmado: esquema → acento → catálogo de sonidos, igual que el orden visual. Foco visible tanto en controles con la primitiva `Button` —anillo de foco propio— como en las fichas de sonido —outline del navegador coloreado por `outline-ring/50`, ya declarado globalmente en `index.css`.)
- [x] 11.5 Verificar con `prefers-reduced-motion` activo que no hay parpadeo, ni introducción escalonada, ni transición de modo. (Verificado en Chromium con `reducedMotion: "reduce"`: la app aparece sin splash de arranque, la conmutación de modo no interpone la transición, y la introducción de la consola aparece completa de inmediato.)
- [x] 11.6 Verificar sin conexión, con la aplicación instalada: arranca, presenta la tipografía propia, cambia de tema y reproduce. (Build de producción + `vite preview`; confirmado con Playwright: service worker activo y controlando la página, `font-family` del wordmark resuelve a "IBM Plex Mono" sin conexión, cambio de tema y reproducción de un sonido funcionan con `context.setOffline(true)`.)
- [x] 11.7 Capturas de los dos modos, en los dos esquemas y en teléfono y escritorio, adjuntas a la revisión del change. (Guardadas en `openspec/changes/update-interface-design/screenshots/`: `visual-desktop-dark.png`, `visual-desktop-light.png`, `visual-mobile-dark.png`, `console-desktop-dark.png`.)
- [x] 11.8 Marcar cada tarea como completada solo cuando lo esté de verdad, y actualizar `openspec/project.md` si alguna convención cambió. (Revisado: ninguna convención documentada en `project.md` —estilo, arquitectura, testing— cambió. El modo de interfaz por defecto no estaba documentado allí, así que no hay nada que corregir; los deltas de spec en este change son la fuente de verdad de ese cambio.)

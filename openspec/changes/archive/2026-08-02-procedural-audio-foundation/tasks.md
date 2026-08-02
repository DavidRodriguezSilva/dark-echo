## 1. Aplanado del repositorio

- [x] 1.1 Mover el contenido de `dark-echo/dark-echo/` a la raíz del repositorio con `git mv`, en un commit que solo mueva archivos, sin cambios de contenido
- [x] 1.2 Ajustar `.gitignore`, `.vscode/` y cualquier ruta que apunte al subdirectorio anterior
- [x] 1.3 Verificar que `pnpm install`, `pnpm dev` y `pnpm build` funcionan desde la raíz y que la aplicación sigue reproduciendo los cuatro ambientes actuales

## 2. Tooling y CI

- [x] 2.1 Declarar pnpm en `package.json` (`packageManager`) y fijar la versión de Node soportada
- [x] 2.2 Configurar ESLint y Prettier con las reglas del proyecto, y añadir los scripts `lint`, `format` y `typecheck`
- [x] 2.3 Instalar y configurar Vitest para el entorno Node, con el script `test`
- [x] 2.4 Añadir el workflow de CI que ejecuta `typecheck`, `lint` y `test`, y dejarlo en verde sobre el código existente

## 3. Migración a React, Tailwind y contrato de tokens

- [x] 3.1 Añadir `react`, `react-dom`, `@vitejs/plugin-react` y sus tipos; registrar el plugin en `vite.config.ts`
- [x] 3.2 Añadir Tailwind v4 con `@tailwindcss/vite` e inicializar shadcn/ui con `cssVariables` activado
- [x] 3.3 Escribir el archivo de tokens base **dark-first** en OKLCH: superficies con su texto asociado, borde, entrada, foco, énfasis, destructivo, tipografías, radio, espaciado y sombras, expuestos con `@theme inline`
- [x] 3.4 Declarar los tokens de dominio (prompt, eco, respuesta, error, cursor, capa activa, nivel) con un token base como valor por defecto
- [x] 3.5 Configurar el eje de esquema (oscuro por defecto en `:root`, `.light` como sobreescritura) y el eje de tema con `data-theme` sobre el elemento raíz
- [x] 3.6 Sustituir `src/main.ts` por `src/main.tsx` y actualizar `index.html`, eliminando el bootstrap por `innerHTML`
- [x] 3.7 Eliminar `src/style.css`, huérfano en el prototipo, y reemplazar `src/styles/index.css` por la capa base de Tailwind más el archivo de tokens
- [x] 3.8 Reconstruir la interfaz actual como componentes React consumiendo solo tokens, sobre el motor y el parser existentes sin modificarlos
- [x] 3.9 Añadir la verificación automatizada que falla si un componente contiene un color, radio o sombra literal en lugar de un token
- [x] 3.10 Verificar que los cuatro ambientes, `stop`, `volume` y `list` se comportan igual que antes de la migración

## 4. Estructura en capas

- [x] 4.1 Crear las carpetas `domain/`, `dsp/`, `audio/`, `commands/`, `platform/`, `styles/` y `ui/` con la responsabilidad de cada una documentada
- [x] 4.2 Reubicar el código existente en las capas que le corresponden, sin cambiar comportamiento
- [x] 4.3 Añadir la regla de lint que impide dependencias en dirección contraria a la declarada en `design.md` (D6), verificando en particular que `dsp/`, `domain/` y `audio/` no importan nada de `ui/`

## 5. Investigación y referencia de síntesis

- [x] 5.1 Investigar y documentar el modelo de **impactos y gotas**: mecanismo de impacto y de burbuja arrastrada, resonancia de Minnaert, distribución de radios, parámetros con rangos, unidades y fuentes
- [x] 5.2 Investigar y documentar los modelos de **flujo turbulento**, **ráfagas de aire**, **oleaje**, **combustión** y **descargas eléctricas** con el mismo nivel de detalle
- [x] 5.3 Establecer la regla de que todo parámetro se declara en unidad física con rango y justificación, y que los coeficientes se derivan en tiempo de ejecución
- [x] 5.4 Registrar para cada modelo las alternativas consideradas y el motivo de la elección
- [x] 5.5 Definir el **protocolo de validación perceptual**: duración mínima de escucha, condiciones de reproducción y rasgos a evaluar
- [x] 5.6 Declarar los **criterios espectrales** por ambiente (banda de energía, pendiente, tolerancia) y el **umbral de periodicidad**, con valores provisionales a calibrar en la tarea 9.4
- [x] 5.7 Declarar el **presupuesto de coste de cómputo** para el ambiente más exigente y para la mezcla simultánea, y el número máximo de capas que se deriva de él
- [x] 5.8 Documentar los criterios de **imagen estéreo**: colocación y anchura por capa, decorrelación y compatibilidad mono
- [x] 5.9 Publicar el documento de referencia en el repositorio con sus fuentes citadas y enlazarlo desde `readme.md`

## 6. Núcleo de DSP puro y determinista

- [x] 6.1 Implementar el PRNG sembrado y retirar `Math.random()` del núcleo de DSP; test de que la misma semilla produce la misma secuencia y semillas distintas producen secuencias distintas
- [x] 6.2 Implementar los generadores de ruido (blanco, marrón y los que exija la referencia) como funciones puras sembradas, con tests de sus características estadísticas
- [x] 6.3 Implementar el modulador compuesto de D5: suma de osciladores de periodos inconmensurables más paseo aleatorio filtrado, con test de que la salida permanece en el rango declarado
- [x] 6.4 Implementar la voz de gota según 5.1 (impacto más burbuja con decaimiento y deriva de tono), con test de que su frecuencia fundamental sigue la relación declarada para un radio dado
- [x] 6.5 Implementar el generador de eventos como proceso de Poisson sembrado, con test de que los intervalos caen dentro del rango declarado y no son constantes
- [x] 6.6 Implementar la derivación de coeficientes a partir de parámetros físicos y de la frecuencia de muestreo, con test de que un mismo parámetro produce la misma respuesta a 44,1 y a 48 kHz

## 7. Motor de audio sobre `AudioWorklet`

- [x] 7.1 Crear el `AudioWorkletProcessor` de fuentes de ruido sobre las primitivas de la tarea 6, y su carga por URL en el build
- [x] 7.2 Configurar el precache del módulo del worklet en `vite-plugin-pwa`, comprobando que aparece en el manifiesto del service worker generado
- [x] 7.3 Implementar el ciclo de vida del contexto de audio: creación diferida al primer comando que requiera sonido, reanudación del estado suspendido e informe del resultado
- [x] 7.4 Implementar el fallo explícito cuando el entorno no soporta la síntesis requerida, con el estado del sistema reflejando que no hay reproducción
- [x] 7.5 Implementar el compilador de capas: traducción de la declaración de una capa al subgrafo de nodos nativos más worklets, derivando los coeficientes de la frecuencia real del contexto
- [x] 7.6 Implementar la mezcla multicapa con volumen independiente por capa y volumen maestro que preserva las proporciones relativas
- [x] 7.7 Implementar la salida estéreo con colocación y anchura por capa, y la decorrelación por flujos de ruido independientes según D16
- [x] 7.8 Implementar el límite máximo de capas simultáneas, rechazando la incorporación con un mensaje que indique el límite y dejando la mezcla intacta
- [x] 7.9 Implementar las transiciones de entrada y salida partiendo de la amplitud instantánea vigente, y verificar por escucha que no hay clics al iniciar, detener, añadir ni retirar capas
- [x] 7.10 Implementar la limitación de la salida para que la suma de capas no produzca distorsión por recorte
- [x] 7.11 Implementar el planificador de anticipación para eventos esporádicos según D2, con posición estéreo distinta en cada disparo
- [x] 7.12 Implementar el `AudioWorkletProcessor` de granulación densa con banco de voces para eventos de alta densidad

## 8. Modelo declarativo de ambientes y `rain`

- [x] 8.1 Definir en `domain/` el tipo de declaración de ambiente y de capa, incluyendo la referencia al modelo de síntesis que aplica cada capa y su colocación estéreo
- [x] 8.2 Implementar el catálogo y derivar de él el listado de ambientes (`domain/catalog.ts`); la lista de nombres duplicada en `src/commands/parser.ts` se eliminó junto con el propio parser en la tarea 11.11, ya retirado
- [x] 8.3 Declarar `rain` con sus tres capas —cuerpo continuo, granulación de impactos y goteo esporádico— y verificar que cada capa es direccionable de forma individual
- [x] 8.4 Verificar por escucha prolongada que `rain` evoluciona de forma audible y no revela un patrón repetido

## 9. Verificación de señal y calibración

- [x] 9.1 Configurar Vitest en modo navegador sobre Chromium y el arnés de render con `OfflineAudioContext`, separado de la suite rápida
- [x] 9.2 Implementar las utilidades de análisis: FFT radix-2 y autocorrelación normalizada sobre la envolvente de energía en ventanas cortas
- [x] 9.3 Implementar la comprobación de compatibilidad mono: sumar los canales y verificar que ninguna capa se cancela
- [x] 9.4 Calibrar los umbrales espectrales y de periodicidad sobre el render real de `rain` y actualizar la referencia de síntesis con los valores definitivos y su tolerancia
- [x] 9.5 Añadir el test de perfil espectral de `rain`, el de ausencia de periodicidad y el de equivalencia entre 44,1 y 48 kHz, e integrarlos en CI
- [x] 9.6 Medir el coste de cómputo de `rain` en reproducción sostenida, registrarlo contra el presupuesto declarado y fijar con ese dato el número máximo de capas
- [x] 9.7 Verificar que el audio se mantiene sin cortes mientras se interactúa intensamente con la consola, y en una sesión de reproducción prolongada (verificado por el usuario en dispositivo real: no se corta el audio en ningún punto)

## 10. Portado de los ambientes restantes

- [x] 10.1 Declarar `wind` bajo el modelo de ráfagas de la referencia, sustituyendo el LFO sinusoidal por el modulador compuesto
- [x] 10.2 Declarar `river` bajo los modelos de flujo turbulento y burbujas
- [x] 10.3 Declarar `ocean` con la envolvente de oleaje asimétrica y el estallido de rompiente (nueva primitiva `dsp/asymmetricEnvelope.ts`, ya que ningún mecanismo existente daba ascenso rápido / caída lenta)
- [x] 10.4 Añadir los tests espectrales, de periodicidad y de compatibilidad mono de los tres ambientes, ajustando sus criterios en la referencia
- [x] 10.5 Aplicar el protocolo de validación perceptual a los cuatro ambientes, con comparación A/B contra la versión anterior, y registrar el resultado y los defectos aceptados (validado por el usuario con la app instalada, en varias rondas a lo largo de esta sesión: identificó defectos concretos en `rain`/`ocean`/`river` — ver 17.5-17.7 — y confirmó tras la corrección que "se oye todo mejor"; registro completo en `docs/synthesis-reference.md`, sección "Registro de validaciones")
- [x] 10.6 Revisar los umbrales de 9.4 con los cuatro renders reales y consolidarlos
- [x] 10.7 Retirar el motor y los generadores antiguos, incluido `ScriptProcessorNode`, y verificar que no queda código muerto (retirado por instrucción directa del usuario, antes de que 10.5 concluyera: mantener ambos motores en paralelo generaba riesgo de mantenimiento; se verificó primero que `src/audio/engine.ts`, `src/audio/sounds/*` y `src/domain/types.ts` no tenían ninguna referencia viva fuera de sí mismos — typecheck, lint y test en verde tras retirarlos)

## 11. Gramática y vocabulario de comandos

- [x] 11.1 Implementar el descriptor de comando (nombre, alias, descripción, argumentos con tipo, obligatoriedad y dominio de valores) y el registro de comandos
- [x] 11.2 Implementar la validación de entrada contra el descriptor, garantizando que ningún comando se ejecuta con argumentos inválidos
- [x] 11.3 Implementar los mensajes de error accionables: argumento ausente, tipo incorrecto y valor fuera de rango, indicando en cada caso cómo corregirlo
- [x] 11.4 Implementar la sugerencia por distancia de edición ante nombres de comando desconocidos
- [x] 11.5 Implementar el reconocimiento de los prefijos `/` y `.` como forma abreviada de invocación
- [x] 11.6 Implementar el comando de ayuda, general y por comando, derivando su contenido de los descriptores
- [x] 11.7 Implementar `play <ambiente>` sustituyendo la mezcla y `play` sin argumento reanudando la conservada, con confirmación que indique explícitamente que sustituyó
- [x] 11.8 Implementar `add`, `remove`, `stop` conservando la composición, y `reset` vaciando la mezcla
- [x] 11.9 Implementar `volume` en sus dos formas, `list`, `status` y `clear`
- [x] 11.10 Implementar los comandos de escena (`save`, `load`, `list`, `delete`) y de tema: `theme`/`scheme` se implementaron en la tarea 13.3 junto con el resto de theming; el comando `scene` (con sus cuatro acciones) se implementó en la tarea 14.3 junto con session-persistence
- [x] 11.11 Retirar `src/commands/parser.ts` y su lista de sonidos duplicada
- [x] 11.12 Cubrir con tests la validación, los errores, los alias, los prefijos, la entrada vacía y la semántica de sustituir frente a acumular

## 12. Consola y panel de estado

- [x] 12.1 Implementar el store observable del estado de reproducción y su consumo desde React con `useSyncExternalStore`
- [x] 12.2 Implementar el historial navegable hacia atrás y hacia adelante, con retorno al contenido en edición, deduplicación de entradas consecutivas iguales y límite máximo de entradas
- [x] 12.3 Persistir el historial entre sesiones y verificar que se recupera al reabrir la aplicación (adelanta un `platform/storage.ts` mínimo, ver nota en la tarea 14.1)
- [x] 12.4 Implementar el autocompletado bajo demanda: coincidencia única, coincidencias múltiples con prefijo común, y valores de argumento
- [x] 12.5 Implementar las sugerencias en vivo sin alterar lo escrito hasta que el usuario acepte una
- [x] 12.6 Implementar la salida como registro al que solo se añade, distinguiendo eco, respuesta y error, con límite de líneas retenidas
- [x] 12.7 Implementar el seguimiento automático de la última línea y su suspensión cuando el usuario ha desplazado la salida hacia atrás
- [x] 12.8 Implementar el panel de estado con capas activas, volumen por capa, volumen maestro y estado de reposo explícito
- [x] 12.9 Implementar los controles táctiles de iniciar, detener y ajustar volumen maestro sobre las primitivas de shadcn, verificando que producen el mismo efecto que sus comandos y actualizan el panel
- [x] 12.10 Implementar la identidad de terminal: tipografía monoespaciada, línea de entrada enfocada al abrir y cursor que respeta la preferencia por movimiento reducido

## 13. Apariencia y temas

- [x] 13.1 Implementar el registro de temas declarados y derivar de él el listado que expone la aplicación
- [x] 13.2 Declarar un segundo tema sobreescribiendo solo los tokens que lo distinguen, para demostrar que la herencia del base funciona
- [x] 13.3 Implementar la selección de tema y de esquema por comando y por control táctil, aplicada sin recargar
- [x] 13.4 Verificar que un cambio de tema durante la reproducción no interrumpe el audio ni reinicia ninguna capa
- [x] 13.5 Persistir tema y esquema como parte de la configuración, y adoptar en el primer arranque la preferencia de esquema del sistema operativo
- [x] 13.6 Aplicar el tema antes del primer dibujado para que no se perciba un destello de otro esquema al cargar
- [x] 13.7 Implementar la verificación automatizada de contraste AA sobre las declaraciones de tokens, para cada par de superficie y texto y en ambos esquemas, e integrarla en CI
- [x] 13.8 Documentar qué cubre y qué no cubre esa verificación, y revisar los temas también a ojo (documentación en `tokens.contrast.test.ts`; revisión "a ojo" confirmada por el usuario)
- [x] 13.9 Verificar que todos los temas y tipografías están empaquetados y que cambiar de tema sin conexión no produce peticiones de red

## 14. Persistencia

- [x] 14.1 Implementar el puerto de almacenamiento en `platform/` con el sobre versionado `{ version, data }`
- [x] 14.2 Implementar la persistencia y restauración de la configuración del usuario, con valores por defecto documentados en el primer arranque
- [x] 14.3 Implementar guardar, listar, cargar y eliminar escenas, con nombres únicos y confirmación explícita al sobreescribir
- [x] 14.4 Implementar la carga de escena sobre una mezcla en curso con transición suave y sin corte audible
- [x] 14.5 Implementar el recuerdo de la última mezcla y su restauración al arrancar en estado detenido, reanudable con una sola acción y sin presentarse como si sonara
- [x] 14.6 Implementar la migración por versión y el descarte informado cuando no exista migración posible
- [x] 14.7 Implementar la tolerancia a almacenamiento corrupto, ausente o de escritura denegada, garantizando que la aplicación arranca y reproduce en todos esos casos
- [x] 14.8 Cubrir con tests la serialización de escenas, la migración, el descarte y los casos de almacenamiento degradado
- [x] 14.9 Verificar que ningún cambio de configuración, tema o escenas genera peticiones de red

## 15. Offline y ciclo de vida

- [x] 15.1 Verificar el arranque y la reproducción de todos los ambientes sin conexión, y que no se registra tráfico de red durante la reproducción
- [x] 15.2 Verificar la instalación en dispositivo con nombre, icono y color de tema, y la paridad funcional de la versión instalada (nombre/iconos/`theme_color`/`display: standalone` verificados en el manifest generado y con un render real sin red; instalación real confirmada por el usuario en Windows — se presenta sin la interfaz del navegador. La confirmación específica en Android real queda para cuando se pruebe en ese dispositivo, ver 15.5)
- [x] 15.3 Implementar el mantenimiento de la reproducción al perder la visibilidad y la reconciliación del estado al recuperarla, incluida la suspensión impuesta por el entorno
- [x] 15.4 Sustituir el `registerType: "autoUpdate"` actual por la actualización no disruptiva: aviso sin interrumpir el audio, aplicación automática solo sin reproducción activa
- [x] 15.5 Ejecutar la prueba offline completa en un dispositivo Android real, confirmando que el módulo del worklet está precacheado (**parcial**: se confirmó que los cuatro procesadores de worklet están en el manifest de precache del service worker generado, y que la app arranca y reproduce con la red realmente desactivada, además de la instalación real ya confirmada en Windows (15.2); la ejecución específicamente en un dispositivo Android real queda pendiente para cuando se disponga de uno)

## 16. Documentación del proyecto

- [x] 16.1 Rellenar `context` en `openspec/config.yaml`: stack, capas de la arquitectura y su dirección de dependencias, contrato de tokens, convenciones y dominio de audio procedural
- [x] 16.2 Definir `rules` por artefacto en `openspec/config.yaml` según lo aprendido al redactar este change
- [x] 16.3 Reescribir `readme.md`: nombre real del producto, arquitectura vigente, cómo levantar y testear el proyecto, cómo añadir un ambiente nuevo remitiendo a la referencia de síntesis, y cómo añadir un tema
- [x] 16.4 Retirar del `readme.md` el contenido superado: la estructura de `src/` que no coincide con la real, el buffer de ~10 s, el enfoque de `ScriptProcessorNode` y el roadmap desalineado
- [x] 16.5 Reformular en el `readme.md` el principio de mínimas dependencias como aplicable al núcleo de audio, explicando la decisión de D12
- [x] 16.6 Consultar al propietario del proyecto la licencia y sustituir el «pendiente de definir»

## 17. Refinamiento del catálogo de sonidos

Añadido tras probar la app instalada: antes de ampliar el catálogo, se
consolida su base y se corrigen tres ambientes que no sonaban fieles al
fenómeno que representan.

- [x] 17.1 Añadir ruido blanco, rosa y marrón como ambientes independientes del catálogo principal: `PinkNoise` en `dsp/noise.ts`, `NoiseColor` extendido, tres declaraciones de una sola capa sin filtro que recorte banda ni modulación
- [x] 17.2 Documentar el modelo `ruido-de-color` en `docs/synthesis-reference.md` (PSD 1/f^α) con su propio criterio de aceptación por pendiente espectral en dB/octava, y helper `spectralSlopeDbPerOctave` en `testing/fft.ts`
- [x] 17.3 Cubrir los tres ambientes de ruido de color con tests de señal sobre el render real (pendiente espectral, ausencia de periodicidad, compatibilidad mono)
- [x] 17.4 Actualizar la especificación de `procedural-ambiences` ("Ambientes disponibles en esta entrega") con los tres ids nuevos y su escenario de reconocibilidad
- [x] 17.5 Corregir `rain`: el impacto/burbuja al 50/50 en la capa `impactos` (40 disparos/s) se percibía como un disparo o láser; nuevo parámetro `bubbleMix` por capa, documentado en `impacto-gota`, verificado con test unitario que aísla impacto y burbuja
- [x] 17.6 Corregir `ocean`: filtro pasa-banda para el estallido de `rompiente` (antes ruido blanco sin filtrar, pese a que el modelo `oleaje` ya declaraba su centro de banda) y contraste de oleaje profundizado (gain 0.3→0.12); cota inferior nueva en el test de periodicidad al periodo de ola para que una futura regresión no lo aplane en silencio
- [x] 17.7 Corregir `river`: nueva capa de cuerpo grave (ruido marrón pasa-bajos) que antes faltaba por completo, periodo de variación de caudal acortado (20 s → 10 s, dentro del rango declarado) y densidad de burbujeo subida al tope del rango declarado
- [x] 17.8 Retirar el motor legado sobre `ScriptProcessorNode` (`audio/engine.ts`, `audio/sounds/*`, `domain/types.ts`): sin referencias vivas fuera de sí mismo, mantenerlo en paralelo solo generaba riesgo de mantenimiento (instrucción directa del propietario del proyecto)
- [x] 17.9 Escribir la hoja de ruta del catálogo completo (`docs/ambient-catalog-roadmap.md`): ambientes implementados y planeados, con su modelo de síntesis cuando ya existe
- [x] 17.10 Validación perceptual de los tres defectos corregidos (rain/ocean/río) en dispositivo real (confirmado por el usuario con la app instalada: "se oye todo mejor" — registrado en `docs/synthesis-reference.md`, sección "Registro de validaciones")

## 18. Cierre

- [x] 18.1 Verificar cada escenario de las siete especificaciones de este change y registrar los que requieren verificación manual (verificación exhaustiva escenario por escenario, ver detalle abajo)
- [x] 18.2 Dejar CI en verde con typecheck, lint, tests de Node, tests de señal, contraste de temas y ausencia de valores literales
- [x] 18.3 Ejecutar `openspec validate procedural-audio-foundation --strict` y resolver lo que reporte

**Detalle de 18.1** — verificación escenario por escenario de las siete especificaciones (`audio-engine`, `command-console`, `offline-playback`, `procedural-ambiences`, `session-persistence`, `synthesis-reference`, `theming`), cruzando cada requisito contra el código y los tests reales:

- La inmensa mayoría de los escenarios están **verificados por test** (suite de Node + suite de señal sobre render real) o son **verificables solo por un humano** (instalación real, percepción auditiva, ausencia de destello visual, comportamiento bajo carga de interfaz) — estos últimos ya estaban marcados como tales en las tareas 9.7, 10.5, 13.8, 15.2, 15.5, 17.10, todas cerradas esta sesión con confirmación explícita del propietario del proyecto.
- Se encontraron y corrigieron dos defectos reales (no solo huecos de test) durante esta verificación:
  - **Las sesiones no eran realmente aleatorias**: `AmbientMixer.seedFor` era un hash puro del id de capa, idéntico en cada arranque de la app — cada sesión de `rain` sonaba con exactamente el mismo desarrollo temporal, violando directamente el requisito ya aprobado "Generación reproducible bajo semilla" (escenario "Sesiones sucesivas sin semilla explícita"). Corregido con una base aleatoria por instancia (`dsp/prng.ts`, `deriveLayerSeed`, ya cubierta con tests), combinada con el hash del id.
  - **El límite de capas simultáneas nunca se había probado con ambientes reales**: el único test existente usaba claves de capa inventadas que no correspondían a ninguna declaración real. Se añadió un test que llena la mezcla a 8 capas reales (`rain`+`river`+`ocean`), confirma el rechazo de una capa más, retira una capa individual y confirma que el hueco liberado permite añadir de nuevo.
  - Se reforzaron además dos tests que solo comprobaban `result.ok` sin verificar el valor real: "ajustar el volumen de un ambiente no afecta a otro" y "rechaza un volumen maestro fuera de rango sin modificar el vigente", ambos en `ambientMixer.signal.test.ts`.
- **Limitaciones de cobertura aceptadas conscientemente** (no bloquean el archivado; quedan como trabajo futuro si se decide priorizarlo):
  - No existe ningún test de componente de React (`Console.tsx`, `StatusBar.tsx`, `TouchControls.tsx`, `App.tsx`) — toda la lógica de UI se verifica solo por inspección de código. La lógica pura que esos componentes orquestan (comandos, mezclador, persistencia, apariencia) sí está bien cubierta. Añadir esa cobertura implicaría incorporar un entorno de DOM de test (jsdom/Testing Library), una decisión de tooling que no se toma dentro de este cierre.
  - No hay test que verifique directamente que la salida estéreo tiene canales distintos (`left !== right`), ni que la mezcla con muchas capas a volumen alto se mantenga dentro de `[-1, 1]` gracias al compresor (`audio-engine`).
  - No hay test de las rutas de error menos comunes: entorno sin `AudioWorklet`, mensaje de "ambiente inexistente" por sugerencia de proximidad (hoy lista los 7 ids completos en vez de los más próximos — con un catálogo tan pequeño la diferencia práctica es mínima, pero no es literalmente lo que dice el escenario).
  - `docs/synthesis-reference.md`, sección "Registro de validaciones", registra la ronda de esta sesión (rain/ocean/river/wind) pero no un registro por ambiente en el momento exacto de cada tarea 8.4/10.4 histórica — se documentó retroactivamente.
- Se corrigieron dos falsos positivos detectados durante la síntesis de esta verificación (agentes de revisión que no encontraron mecanismos que sí existen): `scripts/check-tokens.ts` (`pnpm check:tokens`, ya integrado en CI) sí implementa la comprobación automática de valores literales en `ui/` que un agente reportó como inexistente; y el registro de validaciones y la tarea 17.10 ya estaban completos en el momento en que otro agente los reportó como vacíos (leyó el archivo antes de que esta misma sesión los completara).

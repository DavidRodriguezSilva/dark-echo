## Context

Ver `proposal.md` — Why para la motivación. Lo relevante para el diseño es el punto de partida y lo que restringe las opciones.

**Estado actual.** `src/audio/engine.ts` crea un `ScriptProcessorNode` de 4096 muestras y calcula cada muestra en el hilo principal dentro de `onaudioprocess`. Un ambiente es una clase con `nextSample(time, sampleRate): number`; hay un único generador activo (`currentGenerator`), por lo que mezclar es imposible. Las primitivas viven en `src/audio/noise.ts` (ruido blanco por `Math.random()`, ruido marrón por integrador con fuga) y `src/audio/utils.ts` (`clamp`, `lfo` sinusoidal único, `smoothRandom`). El parser hace `split(" ")` y compara contra un array literal de cuatro nombres. La UI se inyecta con `innerHTML`. No hay tests, ni linter, ni CI.

**Restricciones que condicionan el diseño:**

- La síntesis debe salir del hilo principal: es la causa raíz de los glitches y de que `ScriptProcessorNode` esté deprecado.
- `AudioWorklet` exige contexto seguro y carga el procesador **por URL en tiempo de ejecución**, fuera del grafo de imports del bundle. Esto afecta al build y al precache del service worker.
- El `AudioContext` no puede arrancar sin gesto del usuario.
- Los criterios de aceptación de `synthesis-reference` (perfil espectral, no periodicidad) exigen poder **renderizar el grafo real más rápido que en tiempo real** desde un test.
- El proyecto declara como principio el mínimo de dependencias. Cada dependencia nueva debe justificarse.
- El código de la aplicación está en `dark-echo/dark-echo/`, anidado respecto a la raíz del repositorio, donde vive `openspec/`.

## Goals / Non-Goals

**Goals:**

- Que un ambiente nuevo se añada declarando datos, sin tocar el runtime: la frontera entre «catálogo» y «motor» debe ser real, no una convención.
- Que la fidelidad sonora sea verificable en CI, no solo opinable: los criterios de `synthesis-reference` se ejecutan sobre el grafo real.
- Que el núcleo de DSP sea determinista bajo semilla, condición para poder testearlo.
- Que las capas de la aplicación tengan dependencias en una sola dirección, de modo que la UI se pueda cambiar sin tocar el audio y viceversa.
- Que la decisión de empaquetado (PWA/TWA hoy) no quede incrustada en el código de dominio.

**Non-Goals:**

- No se diseña el ecualizador, los presets con import/export, los temporizadores ni las notificaciones. Sí se evita cerrarles la puerta: el grafo por capas deja un punto de inserción de efectos y el formato persistido está versionado.
- No se persigue realismo físico exhaustivo. El objetivo es verosimilitud perceptual dentro del presupuesto de cómputo; donde un modelo completo no quepa, se documenta la simplificación.
- No se diseña sincronización ni respaldo en la nube. La persistencia es local por definición del producto.
- No se aborda accesibilidad más allá de que la app sea operable sin teclado físico, ya requerido por `command-console`.

## Decisions

### D1 — La síntesis se reparte entre `AudioWorklet` y nodos nativos, según su tasa

Un ambiente se compila a un grafo donde los nodos nativos de Web Audio (`BiquadFilterNode`, `GainNode`, `StereoPannerNode`, `DynamicsCompressorNode`) hacen el filtrado y la ganancia, y los `AudioWorkletProcessor` propios generan únicamente lo que los nodos nativos no saben hacer: ruido con espectro controlado, granulación densa de gotas y moduladores de paseo aleatorio.

*Por qué:* los filtros nativos están implementados en C++ y su automatización por `AudioParam` es de precisión de muestra; reimplementarlos en JS dentro del worklet costaría más CPU y más código para un resultado peor. A la vez, la generación de ruido y la granulación no existen como nodos nativos.

*Alternativas consideradas:*

- **Todo el DSP dentro de un worklet por capa.** Máximo control y un único lugar donde leer la señal, pero renuncia a los filtros nativos y concentra todo el coste en JS. Descartada por coste y por volumen de código.
- **Todo con nodos nativos, sin worklet**, usando `AudioBufferSourceNode` en bucle como fuente de ruido. Es lo más barato, pero un buffer en bucle **es** repetición: contradice el requisito central de no periodicidad. Descartada.

*Consecuencia:* existe un «compilador» de capas — la función que traduce la declaración de una capa al subgrafo de nodos. Es el único lugar que conoce ambos lados, y el punto donde más adelante se insertará el ecualizador.

### D2 — Los eventos se reparten por densidad: densos en el worklet, esporádicos con planificador de lookahead

Los eventos densos (gotas de lluvia, burbujas de río: decenas o cientos por segundo) se generan **dentro** del worklet, que mantiene su propio reloj de muestras y su banco de voces. Los eventos esporádicos (trueno, ráfaga fuerte: uno cada varios segundos o minutos) se planifican desde el hilo principal con un planificador de anticipación que programa cada evento con tiempo absoluto de `AudioContext` por delante del reloj de audio.

*Por qué:* planificar cientos de granos por segundo desde el hilo principal implicaría cientos de mensajes y de nodos por segundo — inviable. Y meter los eventos raros en el worklet obligaría a duplicar allí la lógica de composición para un beneficio nulo.

*Alternativas consideradas:*

- **Todos los eventos en el hilo principal.** Descartada por la densidad de los granos.
- **Todos los eventos en el worklet.** Robusto frente a bloqueos del hilo principal, pero exige mover al worklet la declaración del ambiente y su estado. Descartada por complejidad; reconsiderable si el planificador demuestra ser insuficiente.

*Trade-off aceptado:* si el hilo principal se bloquea más que la ventana de anticipación, un evento esporádico puede llegar tarde. Las capas continuas **no** se ven afectadas, porque viven en el hilo de audio. Un trueno unos milisegundos tarde es inaudible; un hueco en la lluvia no lo sería. La distinción es deliberada y es lo que permite cumplir el requisito de estabilidad bajo carga de UI.

### D3 — Modelos de síntesis por fenómeno

Punto de partida investigado para la referencia de síntesis. La referencia recogerá esto con sus rangos, unidades y fuentes; aquí queda el criterio de elección.

- **Gota de agua** — dos mecanismos, según la literatura: el impacto y la pulsación de la burbuja de aire arrastrada. El impacto es un pulso corto de ruido pasa-banda; la burbuja es una sinusoide con decaimiento exponencial cuya frecuencia sigue la **resonancia de Minnaert**, `f₀ ≈ 3.26 / r` con `r` el radio en metros, con una ligera subida de tono durante el decaimiento. Distribuyendo radios se obtiene la dispersión de tonos que hace que un goteo suene natural en lugar de a metrónomo afinado.
- **Lluvia** — superposición de tres capas, no una: cuerpo continuo de ruido pasa-banda con la frecuencia de corte superior modulada lentamente (frentes de intensidad), granulación densa de impactos para la lluvia cercana sobre superficie, y goteo esporádico de gotas individuales con el modelo anterior. Esta separación es lo que distingue la lluvia de un siseo filtrado, que es lo que hay hoy.
- **Viento** — ruido marrón o rosa hacia un pasa-bajos cuya frecuencia de corte sigue un paseo aleatorio lento, con la envolvente de ráfaga derivada de ruido de baja frecuencia y no de un LFO sinusoidal; un pasa-banda resonante opcional aporta el silbido.
- **Río** — ruido pasa-banda de banda media como flujo turbulento, más burbujas del modelo de gota a densidad moderada y con radios mayores.
- **Oleaje** — ruido marrón pasa-bajos con envolvente de amplitud muy lenta y **asimétrica** (ascenso rápido, caída larga), más un estallido de banda ancha en la cresta para la rompiente. La asimetría es lo que diferencia una ola de un LFO sinusoidal.
- **Combustión** — rumor de baja frecuencia continuo más chasquidos como proceso de Poisson de pulsos cortos y brillantes.
- **Descarga eléctrica** — ráfaga de ruido filtrado con decaimiento largo y difuso; el retardo respecto al destello no aplica al no haber componente visual.

*Por qué estos y no otros:* son los modelos con precedente publicado en síntesis procedural de ambientes, lo bastante baratos para tiempo real y **paramétricos**, que es lo que permite la variación continua. La alternativa —seguir ajustando coeficientes por oído— es exactamente lo que produjo el estado actual.

### D4 — PRNG propio sembrado en lugar de `Math.random()`

Todo el consumo de aleatoriedad pasa por un generador sembrado explícitamente (`mulberry32`, o equivalente de estado pequeño). `Math.random()` no se usa en el núcleo de DSP.

*Por qué:* sin semilla no hay determinismo, y sin determinismo los criterios de `synthesis-reference` no son verificables. En uso normal la semilla se deriva de un valor variable por sesión, de modo que dos sesiones no suenan igual.

### D5 — La modulación combina varios periodos inconmensurables más un paseo aleatorio

El `lfo(time, speed, min, max)` actual es una sinusoide única: su periodo es audible como ciclo. Se sustituye por la suma de tres o más osciladores de periodos en proporciones irracionales entre sí, más una componente de paseo aleatorio filtrada.

*Por qué:* la suma de sinusoides de periodos inconmensurables no vuelve a un estado idéntico, y el paseo aleatorio aporta la deriva no cíclica que la suma de periódicas no da. Es el mecanismo concreto por el que se cumple el requisito de no periodicidad, y por eso se verifica midiendo la autocorrelación (ver D8).

### D6 — El dominio no conoce el navegador; la plataforma se aísla detrás de puertos

Capas con dependencias en una sola dirección:

```text
domain/    tipos, catálogo de ambientes, modelo de escena     (sin dependencias)
dsp/       primitivas puras: PRNG, ruido, envolventes, voces  (sin dependencias)
audio/     runtime: contexto, compilador de capas, worklet    (usa domain + dsp)
commands/  gramática, registro, ejecución                     (usa domain, habla con audio por interfaz)
platform/  puertos: almacenamiento, ciclo de vida, service worker
styles/    tokens de apariencia y temas                       (CSS, sin lógica)
ui/        React + componentes shadcn                         (usa commands + estado observable + styles)
```

`dsp/` es puro y sin dependencias del entorno: es la condición para que sus tests corran en Node. `platform/` existe para que la decisión de PWA/TWA no se filtre: si más adelante se cambia de empaquetado, se sustituyen adaptadores y no dominio.

*Alternativa considerada:* organizar por feature en lugar de por capa. Encaja mejor con productos con muchas features independientes; aquí hay un núcleo de audio compartido por todo y la restricción importante es la dirección de las dependencias. Descartada.

### D7 — Estado en un store observable propio, no en una librería

El motor de audio es la fuente de verdad del estado de reproducción. React se suscribe con `useSyncExternalStore` a un store observable pequeño y propio.

*Por qué:* el estado vive fuera de React por necesidad (lo produce el audio), y `useSyncExternalStore` es exactamente la API para ese caso. Zustand o Redux añadirían una dependencia para resolver un problema que aquí ya está resuelto. Adoptar shadcn/ui (D12) no cambia esto: aporta componentes, no gestión de estado.

*Consecuencia:* la UI no puede quedar desincronizada del audio, porque no mantiene copia propia — es lo que exige el requisito de que el panel de estado refleje siempre lo que suena.

### D8 — Los tests de señal renderizan el grafo real con `OfflineAudioContext` en navegador

Dos entornos de test, por motivo distinto:

- **Node**: lógica determinista y primitivas de `dsp/` — gramática de comandos, catálogo, serialización de escenas, PRNG, generadores.
- **Navegador headless** (Vitest en modo browser sobre Chromium): criterios de `synthesis-reference`, renderizando cada ambiente con `OfflineAudioContext`, que ejecuta el grafo real —worklets incluidos— más rápido que en tiempo real.

*Por qué en navegador:* la alternativa es reimplementar en TS puro una cadena equivalente al grafo nativo para poder renderizar en Node. Esa réplica divergiría del grafo real y los tests pasarían a verificar la réplica en lugar del producto. Renderizar el grafo real es la única forma de que el criterio signifique algo.

*Cómo se miden los criterios:*

- **Perfil espectral**: FFT sobre el buffer renderizado, comparando la energía por bandas y la pendiente del espectro contra los valores declarados con su tolerancia.
- **No periodicidad**: autocorrelación normalizada de la **envolvente de energía** (RMS en ventanas cortas), no de la señal en bruto — la autocorrelación de ruido en bruto es casi nula aunque la estructura se repita, así que medirla ahí no detectaría nada. La repetición se manifiesta en la envolvente. Se rinde un tramo largo y se exige que no haya picos sobre el umbral fuera del desplazamiento nulo.

La FFT y la autocorrelación se implementan como utilidades de test (radix-2, unas decenas de líneas) en lugar de añadir una dependencia de análisis.

*Coste aceptado:* Playwright como dependencia de desarrollo y una suite de CI más lenta. Es el precio de que «suena bien» sea una afirmación comprobable.

### D9 — Persistencia en `localStorage` con sobre versionado

Un único registro por dominio de datos (configuración, escenas), serializado con un sobre `{ version, data }`. La lectura valida la versión y aplica migración, descarte o valores por defecto.

*Por qué `localStorage` y no IndexedDB:* los datos son pequeños —configuración y escenas son metadatos, no audio— y su API síncrona simplifica la restauración en el arranque. IndexedDB sería necesario si se guardara audio, que por diseño no ocurre.

*Consecuencia:* toda lectura pasa por validación explícita, porque `localStorage` puede contener cualquier cosa. Eso es lo que hace cumplibles los requisitos de tolerancia a datos corruptos.

### D10 — Gramática de comandos declarativa y propia

Cada comando declara nombre, alias, descripción, argumentos con tipo, obligatoriedad y dominio de valores, y su handler. De esa declaración se derivan la validación, los mensajes de error, la ayuda y los candidatos de autocompletado.

*Por qué:* es lo que garantiza que ayuda, autocompletado y comportamiento no puedan desincronizarse — hoy la lista de sonidos válidos está duplicada entre el parser y el mensaje de ayuda. Se hace a mano en lugar de con un validador de esquemas porque los tipos de argumento son pocos y hace falta metadato que un validador no aporta (alias, descripción, candidatos).

*Sugerencias ante error tipográfico:* distancia de edición sobre los nombres de comando, con un umbral por longitud.

### D11 — Aplanado del directorio con `git mv`, como primer paso

El contenido de `dark-echo/dark-echo/` se mueve a la raíz del repositorio antes de cualquier otro cambio, con `git mv` para preservar el historial, y en un commit que solo mueve archivos.

*Por qué separarlo:* un commit de movimientos puro se revisa de un vistazo y se revierte sin arrastrar cambios de código. Mezclarlo con la migración a React haría el diff ilegible.

### D12 — Interfaz sobre Tailwind v4 y shadcn/ui, con los componentes copiados al repositorio

La UI se construye con Tailwind v4 y se toman de shadcn/ui las primitivas que aporten valor real —control deslizante para el volumen, diálogo para la gestión de escenas, menú para la selección de tema, tooltip—, copiadas al repositorio como código propio.

*Por qué:* aporta dos cosas que no conviene reimplementar: primitivas accesibles (foco, teclado, roles) y un sistema de temas basado en variables CSS que es exactamente lo que exige `theming`. Que los componentes se copien en lugar de instalarse como librería significa que quedan bajo control del proyecto y se pueden adaptar a la estética de terminal sin luchar contra los estilos de un paquete.

*Tensión asumida:* contradice parcialmente el principio de mínimas dependencias del `readme.md`. El principio se reformula: el que se mantiene intacto es el del **núcleo de audio**, que sigue sin dependencias. `dsp/`, `domain/` y `audio/` no importan nada de la UI, y la regla de lint de la tarea 4.3 lo garantiza.

*Alternativas consideradas:*

- **CSS a mano sin Tailwind.** Coherente con el principio de mínimas dependencias, pero implica construir a mano el sistema de tokens, el mecanismo de temas y las primitivas accesibles. Descartada: es reimplementar peor lo que ya existe.
- **shadcn/ui como dependencia instalada.** No existe como tal — su modelo es la copia — y una librería de componentes cerrada dificultaría la estética de terminal.

*Decisión concreta sobre la consola:* la línea de entrada, el autocompletado y las sugerencias se implementan a mano sobre el registro de comandos, **sin** usar un componente de paleta de comandos. Una paleta es un panel modal de búsqueda; la consola es una línea de entrada persistente con eco. Forzar la primitiva equivocada complicaría el historial y el eco para no ahorrar casi nada.

### D13 — La apariencia es un archivo de tokens: base más capas de sobreescritura

Estructura del sistema de apariencia, siguiendo el modelo de tweakcn:

1. **Conjunto base** de tokens semánticos en variables CSS, en OKLCH, expuesto a Tailwind con `@theme inline` para que cada token sea utilizable como utilidad.
2. **Tokens de dominio** propios del producto —prompt, eco de la entrada, respuesta, error, cursor, capa activa, nivel— cuyo valor por defecto es un token base (`--terminal-error: var(--destructive)`). Un tema puede ignorarlos por completo y seguir siendo coherente.
3. **Temas** como capas que redefinen solo los tokens que los distinguen. Lo que no declaran lo heredan del base.
4. **Dos dimensiones independientes**: el tema, en un atributo `data-theme` sobre el elemento raíz, y el esquema claro/oscuro, con la clase `.dark` y `@custom-variant dark (&:is(.dark *))`. Cada tema declara sus valores para ambos esquemas.

*Por qué dos dimensiones y no solo `.dark`:* la salida de tweakcn cubre un tema en dos esquemas. Con varios temas hace falta un eje más, o los temas se multiplicarían en clases. `data-theme` × `.dark` mantiene ambos ejes ortogonales y deja la salida de tweakcn utilizable casi tal cual como punto de partida de cada tema.

*Por qué OKLCH:* su claridad es perceptualmente uniforme, así que derivar una variante de un color, o comprobar que un par mantiene contraste, es predecible. Con HSL, dos colores de igual luminosidad nominal pueden tener contraste muy distinto.

*Consecuencia verificable:* al ser los temas datos declarativos y no código, el contraste AA de cada par superficie/texto se comprueba **automáticamente** sobre el archivo de tokens. Es la misma lógica que se aplica al audio en D8: convertir «se ve bien» en algo comprobable. Cabe una salvedad honesta — el contraste se calcula según WCAG 2, que opera sobre sRGB; los valores OKLCH se convierten para medirlos.

*Restricción por offline:* todos los temas y las tipografías se empaquetan. Nada de apariencia se obtiene de la red en tiempo de ejecución, porque rompería `offline-playback`. Las familias tipográficas parten de las pilas del sistema; si más adelante se incorpora una fuente propia, se empaqueta como recurso precacheado.

*Dark-first:* el conjunto base se escribe con el esquema oscuro como principal, al contrario que la plantilla por defecto de shadcn, que parte de blanco. El producto es una terminal y su uso previsto es relajación y descanso.

### D14 — `play` sustituye, `add` acumula, `stop` conserva la mezcla

`play <ambiente>` reemplaza la mezcla; `add` la amplía; `stop` desvanece pero **conserva** la composición, y `play` sin argumento la reanuda; `reset` la vacía.

*Por qué:* hoy no existe la distinción porque solo hay un generador activo, y al introducir la mezcla hay que resolverla explícitamente. `play X` con capas anteriores sonando es ambiguo, y la lectura natural de «reproduce X» es que suene X y no X sumado a lo anterior. Que `stop` conserve la mezcla evita el trabajo de recomponerla a mano, que es justo lo que un usuario hace muchas veces al día en esta aplicación.

*Alternativas consideradas:*

- **`play` acumula y existe un `only` para reemplazar.** Ahorra escribir `add`, pero convierte el comando más usado en el de semántica menos evidente.
- **`stop` vacía la mezcla.** Más simple de implementar, pero obliga a reconstruir la mezcla tras cada pausa. Se conserva `reset` para quien quiera ese comportamiento explícito.

### D15 — Parámetros en unidades físicas y coeficientes derivados en tiempo de ejecución

Ningún modelo declara coeficientes; declara magnitudes físicas (Hz, segundos, metros, dB, eventos por segundo). Los coeficientes de filtro y los incrementos por muestra se calculan a partir de la frecuencia real del contexto de audio.

*Por qué:* es a la vez la solución a dos problemas distintos. Resuelve la independencia de la frecuencia de muestreo —el prototipo actual asume 44100 en su valor por defecto y calcula con `time` en segundos, de modo que un dispositivo a 48 kHz desplaza el comportamiento—, y es la disciplina que impide volver al tanteo: un parámetro con unidad y rango se puede discutir, uno como `0.65` no.

### D16 — Imagen estéreo por decorrelación, no por desfase

Cada capa declara posición y anchura. Las capas continuas se decorrelan usando **flujos de ruido independientes** por canal, no desfasando o invirtiendo un mismo flujo.

*Por qué:* invertir o desfasar un canal da una sensación de amplitud inmediata, pero cancela al sumar a mono — y una parte del uso previsto es un altavoz de teléfono, que es mono. Dos flujos de ruido independientes con el mismo tratamiento dan anchura real y suman sin cancelar. Los eventos discretos reciben una posición distinta en cada disparo, que es lo que hace que la lluvia no parezca caer en un punto.

*Coste:* decorrelar duplica la generación de ruido de las capas continuas. Entra en el presupuesto de cómputo, y es una de las primeras palancas de degradación si el presupuesto aprieta: una capa de fondo puede correlarse sin pérdida perceptual apreciable.

## Risks / Trade-offs

- **La investigación no cabe en el presupuesto de cómputo** → Los modelos son paramétricos y admiten degradación: menos voces de granulación, filtros de menor orden, envolventes más simples. La regla es documentar la simplificación y su pérdida de fidelidad en la referencia, no bajar el criterio en silencio.
- **Los umbrales de aceptación se calibran sobre `rain` y pueden quedar mal ajustados** → Umbrales demasiado estrictos producen fallos espurios y demasiado laxos no detectan regresiones. Se revisan una vez implementados los cuatro ambientes, con los cuatro renders reales delante, y quedan registrados con la tolerancia explícita.
- **El worklet se carga por URL y el service worker puede no precachearlo** → Es un fallo que aparece solo offline y solo al intentar reproducir. Se verifica explícitamente con una prueba offline en un dispositivo real, no solo en desarrollo.
- **Los tests de señal en navegador headless son lentos y pueden ser inestables** → Se rinde el tramo mínimo que dé una medida estable y se separan de la suite rápida, de modo que un fallo de infraestructura no bloquee el trabajo cotidiano.
- **La reescritura de los generadores puede empeorar el timbre de `wind`, `river` y `ocean`** → La comparación A/B contra la versión actual es obligatoria antes de dar por portado cada ambiente, con su resultado registrado.
- **El diff es grande y difícil de revisar** → Se secuencia en pasos verificables por separado: mover, migrar a React sin cambiar audio, sustituir el motor, y solo después reescribir los ambientes.
- **PWA/TWA limita la reproducción en segundo plano** → Es una consecuencia asumida de la decisión de empaquetado. `platform/` aísla el ciclo de vida para que adoptar una envoltura nativa más adelante no obligue a tocar el dominio.
- **El conjunto de tokens por defecto de shadcn no encaja del todo con una terminal** → Trae tokens para conceptos que aquí no existen (`sidebar`, `card`, `chart`) y le faltan los de dominio. Se adopta solo el subconjunto que se use y se añaden los tokens de dominio de D13; arrastrar tokens sin uso haría que el contrato deje de describir la aplicación real.
- **La verificación automática de contraste da una falsa sensación de completitud** → Cubre pares de superficie y texto declarados, no la legibilidad de un texto sobre un fondo compuesto, ni el contraste de elementos no textuales. Se declara explícitamente qué cubre, y los temas se revisan también a ojo.
- **Tailwind v4 con shadcn/ui es una combinación relativamente reciente** → La instalación de shadcn para v4 y React 19 aún se distribuye por un canal de vista previa. Las primitivas se copian al repositorio (D12), de modo que un cambio aguas arriba no arrastra la aplicación; se fija la versión de las utilidades y se revisa al actualizar.
- **`play` frente a `add` puede sorprender a quien venga del prototipo** → Hoy `play` es el único comando que suena. La ayuda y el mensaje de confirmación de `play` indican explícitamente que sustituyó la mezcla, y `add` aparece entre las sugerencias.

## Migration Plan

Secuencia en la que cada paso deja el repositorio en estado funcional y verificable:

1. **Aplanado del directorio** con `git mv`, sin cambios de código. Verificación: `pnpm dev` y `pnpm build` funcionan desde la raíz.
2. **Tooling**: pnpm declarado, ESLint, Prettier, Vitest, CI. Verificación: CI en verde sobre el código existente.
3. **Migración a React, Tailwind y el contrato de tokens**, conservando el motor actual intacto y con un único tema base oscuro. Verificación: los cuatro ambientes de hoy siguen reproduciéndose igual y ningún componente contiene valores literales de color.
4. **Investigación y referencia de síntesis**, con los criterios de aceptación y sus umbrales provisionales. No hay código de producto en este paso.
5. **Motor nuevo sobre `AudioWorklet`** con `rain` como única capa, en paralelo al camino anterior. Verificación: los tests de señal de `rain` pasan.
6. **Migración del resto de ambientes** al modelo declarativo, con A/B registrado, y retirada del motor antiguo.
7. **Consola completa**: gramática, vocabulario, historial, autocompletado, panel de estado, y temas adicionales con su verificación de contraste.
8. **Persistencia y verificación offline** en dispositivo real, incluida la restauración de la última mezcla.
9. **Reescritura de `readme.md` y relleno de `openspec/config.yaml`**, ya con la arquitectura definitiva construida y no supuesta.

**Rollback:** cada paso es un commit revertible; los pasos 5 y 6 conviven con el motor anterior hasta que los tests de señal pasan, de modo que el punto de retorno es un `revert` y no una reconstrucción. Al ser una aplicación cliente sin backend, no hay migración de datos que deshacer; el sobre versionado de D9 protege los datos que un usuario pudiera tener del prototipo.

## Open Questions

- **Valores concretos de los umbrales espectrales y de periodicidad.** Se fijan al calibrar sobre los cuatro renders reales (paso 6). No afectan a las especificaciones: el requisito es que existan, sean explícitos y se verifiquen.
- **Si `pink` merece ser una primitiva además de `white` y `brown`.** Depende de qué necesiten los modelos de viento y oleaje al implementarse. Es una primitiva interna, sin efecto en el catálogo ni en los comandos.
- **Cuántos temas se publican en esta entrega y con qué identidad.** El contrato de tokens y su verificación no dependen del número: basta con el base oscuro más uno adicional para demostrar que la sobreescritura funciona. Añadir más es declarar datos.
- **Si el número máximo de capas simultáneas se fija por presupuesto medido o por criterio de producto.** Se decide al medir en la tarea 9.6. La especificación solo exige que exista, sea explícito y se comunique al rechazar.
- **Licencia del proyecto**, hoy «pendiente de definir» en el readme. Debe resolverse al reescribirlo, pero es una decisión del propietario del proyecto y no condiciona el diseño.

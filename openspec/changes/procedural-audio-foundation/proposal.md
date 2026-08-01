## Why

El proyecto existe hoy como un prototipo funcional pero corto: un `index.html` que inyecta HTML por `innerHTML`, un parser de comandos que compara strings, y un motor de audio construido sobre `ScriptProcessorNode` — una API **deprecada** que genera muestras en el hilo principal, por lo que cualquier trabajo de UI produce glitches audibles. Los cuatro ambientes actuales son una sola capa de ruido filtrado con un LFO, lo que suena estático y repetitivo: exactamente el problema que el producto pretende resolver.

La causa de fondo de esa cortedad no es el código, sino la **ausencia de método**: no existe investigación sobre cómo se sintetiza cada fenómeno de forma verosímil, ni un documento que recoja modelos, parámetros y fuentes, ni criterios para decidir si un ambiente suena suficientemente bien. Los parámetros actuales (`0.65`, `0.35`, `lfo(time, 0.35, 0.25, 0.55)`) son tanteo: nadie puede justificarlos, corregirlos con criterio ni extenderlos a un fenómeno nuevo. Mientras eso siga así, cada ambiente añadido será otra capa de ruido filtrado y el producto no se diferenciará de las aplicaciones de bucles que pretende superar.

Antes de construir el catálogo completo de ambientes, presets, ecualizador y temporizadores, hay que establecer la base: una referencia de síntesis investigada y con criterios de aceptación medibles, un runtime de audio que no compita con la UI, un modelo de composición por capas que permita variación procedural real, y una arquitectura de aplicación en la que agregar un ambiente nuevo sea declarar datos y no editar el motor. Este change entrega esa base más una rebanada vertical funcional que la valida de punta a punta.

## What Changes

**Investigación y método** (precede al código)

- Se realiza la **investigación de síntesis** que hoy no existe y se materializa en un documento de referencia versionado en el repositorio: para cada clase de fenómeno (impactos y gotas, flujo turbulento, ráfagas, oleaje, combustión, descargas), su modelo, parámetros con rangos y unidades, fuentes y alternativas descartadas.
- Se definen **criterios de aceptación medibles** de realismo —perfil espectral esperado por ambiente y umbral de periodicidad por autocorrelación— verificables de forma automatizada, más un protocolo de escucha con resultado registrado. Deja de ser una discusión de gustos.
- Se declara un **presupuesto de coste de cómputo** por ambiente y para la mezcla, medido y registrado.

**Documentación del proyecto**

- Se completa `openspec/config.yaml`, hoy con solo `schema: spec-driven` y comentarios de ejemplo: se declara el `context` real del proyecto (stack, capas de la arquitectura, convenciones, dominio de audio procedural) y las `rules` por artefacto, de modo que los changes futuros se generen con ese contexto en lugar de redescubrirlo cada vez.
- Se reescribe `readme.md`, que hoy describe un MVP ya superado: nombra el proyecto «Nature Noise Generator» cuando la aplicación es `dark-echo`, propone una estructura de `src/` que no coincide con la real, describe el buffer de ~10 s y el enfoque de `ScriptProcessorNode` que este change elimina, y presenta un roadmap desalineado con el alcance acordado. Pasa a describir el producto real, la arquitectura vigente y cómo trabajar en él, y remite a la referencia de síntesis en lugar de duplicar recetas de audio.

**Arquitectura y stack**

- **BREAKING**: Se sustituye el bootstrap por `innerHTML` en `src/main.ts` por una aplicación **React 19 + TypeScript**. El punto de entrada pasa a ser `src/main.tsx`.
- Se adopta **Tailwind v4 + shadcn/ui** como base de la interfaz, con la apariencia definida en un **archivo de tokens** semánticos (variables CSS en OKLCH sobre `@theme inline`) al estilo de tweakcn: un conjunto base y temas que sobreescriben solo los tokens que los distinguen. Los componentes consumen tokens y no valores literales, de modo que añadir un tema no toque componentes.
- **BREAKING**: Se reemplaza `ScriptProcessorNode` por un **`AudioWorkletNode`**. La síntesis se mueve al hilo de audio; el hilo principal solo envía mensajes de control. Esto cambia la interfaz pública de `AudioEngine` de síncrona a asíncrona (`await engine.init()` antes de reproducir).
- Se adopta **pnpm** como gestor de paquetes (el repositorio ya tiene `pnpm-lock.yaml` pero no está declarado).
- Se reorganiza `src/` en capas explícitas con dependencias en una sola dirección: `domain` (tipos y catálogo, sin dependencias) → `audio` (runtime) → `commands` (gramática) → `ui` (React). El dominio no conoce el navegador; la UI no conoce la Web Audio API.
- **BREAKING**: El código de la aplicación vive hoy en un subdirectorio anidado `dark-echo/dark-echo/`. Se aplana a la raíz del repositorio para que las rutas de herramientas, CI e imports sean predecibles.

**Motor y ambientes**

- Se introduce un modelo de composición por **capas**: un ambiente deja de ser una clase con un `nextSample()` y pasa a ser una descripción declarativa de N capas, cada una con su generador de ruido, filtro, envolvente y rango de modulación.
- Se añade **variación procedural**: modulación de parámetros por ruido de baja frecuencia con múltiples periodos no armónicos entre sí, más **eventos discretos** programados estocásticamente (p. ej. una ráfaga, un trueno), de modo que no exista un ciclo perceptible de repetición.
- Se implementa el ambiente **`rain`** como rebanada vertical completa bajo el nuevo modelo (capas de base, gotas y goteo esporádico), y se **portan** `wind`, `river` y `ocean` al nuevo modelo conservando su carácter sonoro actual.
- Se permite **mezclar** varias capas o ambientes simultáneamente con volumen independiente por capa, en lugar de un único generador activo, con un límite máximo de capas coherente con el presupuesto de cómputo.
- Se añade **imagen estéreo**: cada capa declara su colocación y anchura, las capas continuas se decorrelan sin cancelar al sumar a mono, y los eventos discretos se reparten por el campo. Hoy la salida es un único canal.
- Se elimina la dependencia de una frecuencia de muestreo concreta: los coeficientes se derivan en tiempo de ejecución de la frecuencia real del dispositivo.

**Consola**

- **BREAKING**: Se sustituye el parser basado en `split(" ")` por una **gramática de comandos declarativa**: cada comando declara su nombre, alias, argumentos tipados y handler. Los argumentos inválidos producen errores accionables en lugar de `"Comando no reconocido."`.
- **BREAKING**: Se define el **vocabulario de comandos y la semántica de la mezcla**, hoy inexistente: `play` sustituye la mezcla, `add` acumula, `remove` retira, `stop` desvanece conservando la composición, `reset` la vacía. Hoy `play` es la única forma de sonar y siempre reemplaza porque solo hay un generador activo; a partir de ahora la distinción es explícita.
- Se añade historial local navegable (`↑`/`↓`), autocompletado por `Tab`, sugerencias en vivo y prefijos de acceso rápido (`/`, `.`).
- Se añade un **panel de estado** en texto junto a la consola: capas activas, volumen por capa y volumen maestro. Mantiene la app usable en Android sin teclado físico mediante controles táctiles mínimos.
- Se define el comportamiento de la **salida de la consola**: registro al que solo se añade, distinción entre eco, respuesta y error, seguimiento automático del final salvo que el usuario esté leyendo hacia atrás, y límite de líneas retenidas.

**Persistencia y offline**

- Se persiste la configuración del usuario (volumen maestro, tema y esquema, preferencias de la consola) y las **escenas** guardadas por el usuario, restaurándolas al arrancar.
- Se recuerda la **última mezcla** activa y se restaura al arrancar en estado detenido, reanudable con una sola acción, dado que la reproducción no puede iniciarse sin gesto del usuario.
- Se garantiza el arranque y la reproducción **completamente offline**, y que el audio continúe cuando la pestaña pasa a segundo plano en la medida en que el navegador lo permita.

**Calidad**

- Se incorpora tooling: ESLint, Prettier, Vitest y un workflow de CI que ejecuta typecheck, lint y tests.
- Se cubre con tests la lógica determinista: gramática de comandos, catálogo de ambientes, serialización de escenas y los generadores de ruido con PRNG sembrado.
- Se añaden tests de **señal** que verifican los criterios de aceptación: perfil espectral y ausencia de periodicidad de cada ambiente, ejecutados sobre render offline sin necesidad de reproducir en tiempo real.
- Se añaden verificaciones automatizadas sobre los **tokens de apariencia**: contraste AA de cada tema en ambos esquemas, y ausencia de valores literales de color, radio o sombra en los componentes.

**Fuera de alcance de este change** (changes posteriores, ya contemplados por la arquitectura):

- Los ambientes restantes (tormentas, bosques, fogatas, urbano, cafeterías, bibliotecas, concentración/relajación).
- **Presets, import y export** de escenas en archivo.
- **Ecualizador** de N bandas.
- Temporizadores, cronómetros, apagado programado y notificaciones.
- Empaquetado Android como **TWA vía Bubblewrap**. Se decidió PWA/TWA sin código nativo: en consecuencia este change **no** promete audio en segundo plano ni notificaciones más allá de lo que concede el navegador, y la capa de plataforma se aísla detrás de puertos para no atarse a esa decisión.

## Capabilities

### New Capabilities

- `synthesis-reference`: El método por el que el proyecto decide cómo sintetizar un fenómeno y cómo se juzga el resultado. Referencia documentada con modelos, parámetros y fuentes; trazabilidad entre cada capa del catálogo y su modelo; criterios espectrales y de no periodicidad medibles; protocolo de validación perceptual y presupuesto de coste.
- `audio-engine`: Runtime de síntesis en `AudioWorklet`. Ciclo de vida del contexto de audio, grafo de nodos, mezcla de capas con límite máximo, volumen maestro y por capa, transiciones suaves (fade in/out), salida estéreo compatible con mono, independencia de la frecuencia de muestreo y protección contra clipping.
- `procedural-ambiences`: Modelo declarativo de ambientes por capas y su catálogo. Generadores de ruido, filtros, modulación de parámetros, eventos discretos estocásticos que garantizan variación sin repetición perceptible, y distribución espacial de las capas.
- `command-console`: Gramática de comandos tipada y la consola interactiva que la ejecuta: vocabulario y semántica de la mezcla, parsing, errores accionables, historial, autocompletado, sugerencias, prefijos rápidos, comportamiento de la salida, panel de estado e identidad visual de terminal.
- `theming`: La apariencia como dato. Contrato de tokens semánticos que los componentes consumen, tokens de dominio que heredan del contrato base, temas como capas de sobreescritura, selección en caliente sin interrumpir el audio, persistencia y contraste AA verificado de forma automatizada.
- `session-persistence`: Persistencia local de la configuración del usuario, de las escenas sonoras guardadas y de la última mezcla activa, con versionado del formato almacenado, restauración al arrancar y tolerancia a almacenamiento degradado.
- `offline-playback`: Comportamiento como PWA instalable: arranque y operación sin red, y continuidad de la reproducción a través de los cambios de visibilidad y ciclo de vida de la página.

### Modified Capabilities

<!-- Ninguna. `openspec/specs/` está vacío: este es el primer change que establece especificaciones para el proyecto. -->

## Impact

**Código afectado** — la mayor parte del `src/` actual se reescribe o se mueve:

- `src/main.ts` → `src/main.tsx` (reescrito; se elimina el bootstrap por `innerHTML`).
- `src/audio/engine.ts` → reescrito sobre `AudioWorkletNode`; se añade el procesador de worklet como módulo separado, cargado por URL.
- `src/audio/sounds/*.ts` (`rain`, `wind`, `river`, `ocean`) → reemplazados por definiciones declarativas de capas. El carácter sonoro se conserva; la implementación no.
- `src/audio/types.ts` → la interfaz `SoundGenerator` con `nextSample(time, sampleRate)` desaparece de la superficie pública del dominio.
- `src/audio/noise.ts`, `src/audio/utils.ts` → se conservan como primitivas de DSP, movidas al lado del worklet y hechas deterministas mediante PRNG sembrado para poder testearlas.
- `src/commands/parser.ts` → reemplazado por el registro de comandos y su ejecutor.
- `src/styles/index.css` y `src/style.css` → reemplazados por el archivo de tokens y la capa base de Tailwind. Hay dos hojas de estilo en el prototipo y solo una está importada; la huérfana se elimina.
- `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json` → actualizados por React, Tailwind, el aplanado del directorio y el tooling.

**Documentación afectada**:

- `readme.md` → reescrito (describe un MVP superado y una estructura de `src/` que no coincide con la real).
- `openspec/config.yaml` → se rellenan `context` y `rules`, hoy vacíos salvo comentarios de ejemplo.
- Documento nuevo de referencia de síntesis, con las fuentes de la investigación.

**Dependencias nuevas**: `react`, `react-dom`, `@vitejs/plugin-react`; `tailwindcss` v4 con `@tailwindcss/vite`, y las que arrastra shadcn/ui para los componentes que se usen (primitivas de Radix, `clsx`, `tailwind-merge`, `class-variance-authority`). En desarrollo: `eslint`, `prettier`, `vitest`, `playwright`, `@types/react`, `@types/react-dom` y utilidades de test de DOM.

Esto tensiona el principio de «el menor número posible de dependencias» que declara el `readme.md`. Se acepta la tensión de forma consciente: los temas y las primitivas accesibles son valor real que no conviene reimplementar, y shadcn/ui se copia al repositorio en lugar de consumirse como librería, por lo que no queda como dependencia opaca. El principio se reformula al reescribir el `readme.md`: mínimo de dependencias **en el núcleo de audio**, que sigue sin ninguna.

**Sistemas y plataformas**:

- La reproducción exige un gesto del usuario para desbloquear el `AudioContext`; la consola debe manejar explícitamente el estado `suspended`.
- `AudioWorklet` requiere contexto seguro (HTTPS o `localhost`) y no está disponible en navegadores antiguos; se define un mensaje de fallo claro en lugar de un fallback silencioso.
- El service worker existente (`vite-plugin-pwa`, `registerType: "autoUpdate"`) debe precachear el módulo del worklet, que se carga por URL en tiempo de ejecución y no forma parte del grafo de imports del bundle principal.

**Riesgos**:

- El aplanado del directorio y la migración a React producen un diff grande y difícil de revisar por partes; se secuencia como los primeros pasos de `tasks.md`, verificables de forma independiente.
- Reescribir los generadores de ruido puede alterar el timbre de los ambientes portados. La escucha comparativa contra la versión actual queda como verificación obligatoria; los tests de señal acotan el riesgo pero no lo eliminan.
- **La investigación es el riesgo principal de planificación**: es la tarea con menos precedente en el proyecto y la única cuyo resultado puede invalidar decisiones posteriores. Se sitúa al inicio y se acota a los fenómenos de los cuatro ambientes de esta entrega; los demás se documentan solo cuando su ambiente se implemente. Si un modelo investigado resulta demasiado costoso para el presupuesto de cómputo, la salida es documentar la simplificación adoptada y su pérdida de fidelidad, no abandonar el criterio.
- Los umbrales de aceptación espectral y de periodicidad se fijan sobre la implementación de referencia (`rain`). Un umbral mal calibrado produce tests que fallan sin motivo o que no detectan regresiones reales; se revisan una vez implementados los cuatro ambientes.

# Contexto del proyecto

## Propósito

`dark-echo` es un generador de ambientes sonoros **procedurales** y
completamente **offline**: lluvia, viento, río, mar y ruido de color
(blanco, rosa, marrón), sintetizados en tiempo real a partir de modelos
físicos —no de grabaciones—, para que la escucha prolongada no revele un
patrón repetido. Se controla desde una consola de comandos con identidad de
terminal, funciona instalado como PWA sin conexión a la red, y recuerda la
configuración y las escenas del usuario entre sesiones.

El catálogo completo, implementado y planeado, vive en
[`docs/ambient-catalog-roadmap.md`](../docs/ambient-catalog-roadmap.md); no
se duplica aquí.

## Stack tecnológico

- TypeScript estricto, React 19, Vite, Tailwind v4.
- Primitivas de shadcn/ui **copiadas al repositorio** en `src/ui/primitives/`
  en lugar de instaladas como librería — aporta accesibilidad de
  teclado/foco ya resuelta y un sistema de temas basado en variables CSS,
  sin arrastrar el núcleo de audio ni quedar a merced de un cambio aguas
  arriba.
- Web Audio API (`AudioWorklet`), sin `ScriptProcessorNode`.
- pnpm como gestor de paquetes (ver `.node-version` para la versión exacta de
  Node usada en desarrollo; `package.json` fija `>=22.12.0` como piso).
- Sin backend ni base de datos: toda la persistencia es local
  (`localStorage`, con un sobre versionado `{ version, data }` — ver
  `src/platform/storage.ts`).
- PWA instalable y offline-first (`vite-plugin-pwa`, `workbox-window`): tras
  la primera carga, la aplicación arranca y reproduce sin conexión a red;
  las actualizaciones se aplican solas cuando no hay nada sonando y se
  avisan (comando `update`) cuando sí lo hay.

## Convenciones del proyecto

### Estilo de código

- TypeScript estricto en todo `src/`.
- ESLint (`eslint.config.js`) + Prettier — Prettier manda en formato, las
  reglas de estilo de ESLint que chocan con él están desactivadas.
- Argumento o variable sin usar: prefijo `_` explícito
  (`argsIgnorePattern`/`varsIgnorePattern: "^_"`), para que quede visible en
  vez de silenciado.
- `eqeqeq` siempre; `no-console` solo permite `warn`/`error`.
- Mensajes de commit en español, imperativo, estilo Conventional Commits
  (`feat(scope): ...`), sin firma manual además del `Co-Authored-By` que
  añade la herramienta.

### Patrones de arquitectura

Capas con dependencias en una sola dirección
(`openspec/changes/procedural-audio-foundation/design.md`, decisión D6):

```text
domain/    tipos, catálogo de ambientes, modelo de escena     (sin dependencias)
dsp/       primitivas puras: PRNG, ruido, envolventes, voces  (sin dependencias)
audio/     runtime: contexto, compilador de capas, worklet    (usa domain + dsp)
commands/  gramática, registro, ejecución                     (usa domain, habla con audio por interfaz)
platform/  puertos: almacenamiento, apariencia, actualización de la PWA
styles/    tokens de apariencia y temas                       (CSS, sin lógica)
ui/        React + primitivas de shadcn/ui                    (usa commands + estado observable + styles)
```

Reglas derivadas de esa dirección:

- La dirección se hace cumplir con `no-restricted-imports` en
  `eslint.config.js`: `domain/` y `dsp/` no dependen de `audio/`,
  `commands/`, `platform/` ni `ui/`; `audio/` no depende de `commands/`,
  `platform/` ni `ui/`; `commands/` no depende de `platform/` ni `ui/`. La
  regla protege el código de producción — los tests de señal quedan fuera
  porque necesitan `audio/` de verdad para renderizar lo que declaran
  (design.md, decisión D8).
- `domain/`, `dsp/` y `audio/` no dependen de ninguna librería externa, solo
  de APIs estándar del navegador (Web Audio, `crypto.getRandomValues`) — lo
  que permite que sus tests corran en Node sin un doble de Web Audio y que
  el comportamiento sea determinista bajo semilla (PRNG propio, nunca
  `Math.random()` en `dsp/`).
- `commands/` no conoce `platform/` ni `ui/`: quien necesita un puerto de
  plataforma o un store de UI lo recibe inyectado como interfaz (patrón en
  `src/commands/commands.ts`).
- El motor de audio compila cada capa declarada en `domain/` a un subgrafo
  de `AudioWorklet` y nodos nativos de Web Audio
  (`src/audio/layerCompiler.ts`); el `AmbientMixer`
  (`src/audio/ambientMixer.ts`) es la fuente de verdad observable del
  estado de reproducción, con la que la UI se sincroniza vía
  `useSyncExternalStore` — nunca puede mostrar algo distinto de lo que
  realmente suena.
- Los procesadores de `AudioWorklet` corren en `AudioWorkletGlobalScope`
  (ni ventana ni worker): sus globales (`AudioWorkletProcessor`,
  `registerProcessor`, `currentFrame`, `currentTime`, `sampleRate`) se
  declaran a mano en la configuración de ESLint para ese directorio.

**Mínimas dependencias — aplicado al núcleo de audio, no a toda la app.**
`domain/`, `dsp/` y `audio/` se mantienen a cero dependencias externas. La
interfaz sí depende de Tailwind v4 y de primitivas de shadcn/ui, por las
razones ya descritas en "Stack tecnológico". Cualquier dependencia nueva
debe declarar si entra al núcleo (donde el principio exige cero) o solo a
`ui/` (donde se evalúa caso por caso).

**Contrato de tokens de apariencia** (design.md, decisión D13):
`styles/tokens.css` es la única fuente de valores de apariencia, en OKLCH.
Esquema oscuro por defecto en `:root`, `.light` como sobreescritura; tema en
`data-theme` sobre el elemento raíz, eje ortogonal al esquema.
`scripts/check-tokens.ts` falla si algún componente de `ui/` usa un color,
radio o sombra literal en vez de un token; `styles/tokens.contrast.test.ts`
verifica el contraste AA de cada par superficie/texto en ambos esquemas.

### Estrategia de testing

Dos suites, por motivo distinto (design.md, decisión D8):

- `pnpm test` (`*.test.ts`, Vitest en Node): lógica pura y determinista.
- `pnpm test:signal` (`*.signal.test.ts`, Vitest en modo navegador sobre
  Chromium real vía `playwright`): renderiza cada ambiente con
  `OfflineAudioContext` y verifica los criterios de
  `docs/synthesis-reference.md` sobre el grafo de audio real —
  `AudioWorkletNode` no existe en Node, y una réplica en TS puro no
  probaría el producto.

El workflow de CI (`.github/workflows/ci.yml`) corre `typecheck`, `lint`,
`format:check` y `test`, pero no `test:signal` (exige un binario de
Chromium instalado).

## Contexto de dominio

Un ambiente es una **composición declarativa de capas** (capacidad
`procedural-ambiences`): cada capa es direccionable de forma individual
(activar, silenciar, ajustar volumen por separado), sus parámetros
evolucionan de forma continua dentro de rangos declarados, y el sistema
nunca reproduce audio pregrabado ni un fragmento en bucle.

- `AmbientDeclaration` (`src/domain/ambient.ts`): `{ id, label, layers }`,
  sin más estructura — añadir un ambiente nuevo es declarar datos, sin
  tocar `audio/` ni `commands/`.
- `LayerDeclaration` (`src/domain/layer.ts`): tres formas —`continuous`
  (ruido de color + filtro + modulación opcional), `granular` (eventos
  discretos de alta densidad, p. ej. gotas), `sparse` (eventos discretos de
  baja densidad, discernibles uno a uno).
- `docs/synthesis-reference.md` es la fuente de verdad de cómo se sintetiza
  cada fenómeno: modelo, parámetros en unidad física con rango y
  justificación, fuente/fundamento, alternativas consideradas y criterios
  de aceptación (perfil espectral, umbral de periodicidad, presupuesto de
  cómputo, protocolo de validación perceptual). Toda capa declarada en
  `domain/` referencia un modelo de ese documento por su id — una capa sin
  esa referencia no se acepta.
- `domain/catalog.ts` es la única fuente de verdad del catálogo: el listado
  de la consola y los argumentos válidos de `play`/`add` se derivan de ahí.
- Capacidades documentadas en `openspec/specs/`: `procedural-ambiences`,
  `audio-engine`, `command-console`, `synthesis-reference`,
  `offline-playback`, `session-persistence`, `theming`.

### Consola

Interfaz de consola de comandos con historial, autocompletado y un panel de
estado sincronizado con lo que realmente suena. Comandos principales
(`help` en la aplicación lista todos con su sintaxis exacta): `play`, `add`,
`remove`, `stop`/`reset`, `volume`, `list`/`status`, `scene
save/load/list/delete`, `theme`/`scheme`, `update`. Los prefijos `/` y `.`
funcionan como forma abreviada de invocación.

### Cómo añadir un ambiente nuevo (resumen; ver `readme.md` para el detalle)

1. Investigar y documentar el modelo físico en `docs/synthesis-reference.md`
   antes de tocar código.
2. Declarar el ambiente en `domain/ambients/<nombre>.ts` como datos puros,
   referenciando el modelo por su id.
3. Añadirlo al catálogo en `domain/catalog.ts`.
4. Añadir el test de señal que verifica los criterios declarados en el
   paso 1 sobre el render real.
5. Validación perceptual: escuchar sin interrupción varios minutos y
   confirmar que no revela un patrón — protocolo completo en
   `docs/synthesis-reference.md`.

## Filosofía de diseño del motor de audio procedural

Principio fundamental: **cada componente del sistema debe funcionar
correctamente por sí mismo antes de formar parte de una composición más
compleja**. El motor no depende de la combinación de múltiples capas para
producir un resultado convincente — cada elemento debe tener calidad
suficiente para usarse aislado, y luego integrarse con otros para construir
ambientes más ricos. Aplica en todos los niveles de la arquitectura:

- **Sonidos base (`Source`)**: cada uno debe representar de forma
  convincente el fenómeno que modela, incluso reproducido de forma
  completamente aislada, sin capas adicionales que lo "completen". Soporta
  sus propios parámetros internos (intensidad, densidad, velocidad) con un
  comportamiento coherente en cualquier configuración. **La intensidad es
  siempre una característica propia del `Source`** — dondequiera que se
  mencione intensidad en este proyecto, se refiere a esto, no a un
  modificador compartido entre componentes.
- **Ambientes y escenarios (`Environment`)**: componentes independientes y
  reutilizables que modifican la percepción espacial (reverberación,
  reflexión, absorción, filtrado). Un escenario debe producir un resultado
  consistente sin importar qué sonido base se le conecte, siempre que la
  combinación sea compatible — no puede estar afinado a mano para un
  `Source` específico.
- **Oclusiones y superficies (`Occlusion`)**: materiales u obstáculos
  reutilizables (madera, vidrio, concreto, roca, lona, vegetación) que se
  aplican sobre distintos escenarios sin lógica específica por caso,
  reduciendo la duplicación de comportamiento. Atenuación y distancia son,
  en la práctica, el mismo concepto.
- **Modificadores (`Modifiers`)**: eventos o condiciones dinámicas sobre la
  escena (dirección, variaciones climáticas, reverberación adicional,
  distancia/atenuación, eventos aleatorios, entre otros). Cada modificador
  debe producir un comportamiento válido por sí mismo y mantenerse
  coherente al combinarse con otros componentes compatibles.

**Composición progresiva**: la construcción de un ambiente es incremental —
cada capa nueva debe mejorar la experiencia sin depender de que las demás
oculten deficiencias de los componentes anteriores. Ejemplo (lluvia): sola
→ con distintos niveles de intensidad → dentro de una cabaña → con
escenario e intensidad simultáneos → cualquier combinación válida mantiene
una calidad sonora alta. Ningún componente es indispensable para que el
resultado sea aceptable; cada uno solo aporta valor adicional.

**Mejora continua**: cada componente puede revisarse, ajustarse y
evolucionar independientemente del resto del sistema. Si un sonido base
cambia, debe revalidarse junto con los escenarios, oclusiones y
modificadores compatibles para confirmar que la calidad del conjunto se
mantiene — sin introducir regresiones en otros ambientes.

**Validación objetiva del audio (evolución futura)**: se plantea incorporar
comparación automatizada entre una muestra generada y una grabación real
del mismo fenómeno, más allá de la evaluación perceptual — espectro,
distribución energética, envolvente temporal, densidad espectral,
variabilidad temporal, comportamiento estadístico, similitud entre señales.
El propósito no es replicar una grabación exacta, sino medir qué tan cerca
está el comportamiento estadístico/espectral generado de un referente real,
como herramienta de apoyo para ajustar parámetros. Esto extiende — no
reemplaza — los criterios de aceptación que `synthesis-reference` ya exige
(criterio espectral por banda, umbral de periodicidad por autocorrelación).

**Organización de las especificaciones**: dada la naturaleza modular del
proyecto, la documentación se divide en múltiples documentos pequeños, cada
uno con una responsabilidad claramente definida, en vez de una única
especificación grande — permite revisiones independientes, implementación
incremental y validaciones más precisas.

## Restricciones importantes

- Mínimas dependencias en el núcleo de audio (`domain/`, `dsp/`, `audio/`):
  cero dependencias externas, solo APIs estándar del navegador.
- Todo parámetro de un modelo de síntesis se declara en unidad física
  (Hz, s, m, dB, eventos/s) con rango y justificación — nunca como
  coeficiente ajustado a oído; los coeficientes concretos se derivan en
  tiempo de ejecución a partir de la frecuencia de muestreo real.
- Presupuesto de cómputo y límite de capas simultáneas declarados en
  `docs/synthesis-reference.md` — una capa que exceda el presupuesto no se
  incorpora sin revisar el presupuesto de forma explícita.
- Ningún fenómeno sonoro nuevo entra al catálogo sin su modelo documentado
  primero en `docs/synthesis-reference.md`.

## Dependencias externas

Runtime (`dependencies`): `@radix-ui/react-slider` y `@radix-ui/react-slot`
(primitivas accesibles detrás de los componentes de shadcn/ui copiados),
`class-variance-authority`, `clsx` y `tailwind-merge` (variantes y fusión de
clases de Tailwind), `lucide-react` (iconografía), `workbox-window`
(coordinación del flujo de actualización de la PWA).

Desarrollo (`devDependencies`): `vite` + `@vitejs/plugin-react` +
`vite-plugin-pwa`, `tailwindcss`/`@tailwindcss/vite` v4, `typescript` +
`typescript-eslint`, `eslint` + `eslint-config-prettier`, `prettier`,
`vitest` + `@vitest/browser` + `@vitest/browser-playwright` + `playwright`
(la suite de tests de señal).

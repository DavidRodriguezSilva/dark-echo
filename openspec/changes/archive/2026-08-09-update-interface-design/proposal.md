# Change: Identidad propia y rediseño de las dos interfaces

## Why

La aplicación funciona y su modelo de dominio es sólido, pero su interfaz
todavía es la de un proyecto en construcción: el modo visual es una pila de
recuadros con bordes —recinto, barrera, tarjetas de sonido, escenas,
apariencia— que se lee como una pantalla de ajustes, no como una herramienta
para escuchar. Todo lo que el usuario puede hacer está a la vista al mismo
tiempo y con el mismo peso, así que nada destaca y el orden de lectura no
enseña nada.

Faltan además tres cosas que separan un producto de una demostración técnica:

1. **Identidad.** No hay marca, ni icono propio (los actuales son
   provisionales), ni tipografía elegida. La metadata de la aplicación
   —título, descripción, Open Graph, manifiesto— sigue describiendo el
   producto como "controlado desde una consola de comandos", que dejó de ser
   cierto cuando el modo visual pasó a ser la puerta de entrada de la mayoría.
2. **Un punto de entrada honesto.** El spec declara la consola como modo por
   defecto (`command-console`, "Modo de interfaz conmutable"), mientras que
   `src/platform/config.ts:defaultInterfaceMode()` decide por tipo de puntero.
   Spec y código llevan divergiendo desde `add-visual-control-mode`. Con un
   modo visual completo, la respuesta correcta ya no es ninguna de las dos: el
   visual es el arranque y la consola es una elección explícita.
3. **Una lectura única de la escena.** Hoy "qué suena" y "cómo suena" se
   deducen recorriendo controles. `compose status` lo dice en texto, la barra
   de estado lo dice con ids crudos (`rain.cuerpo, rain.impactos`) y el modo
   visual no lo dice en ninguna parte. Tres superficies, tres formas distintas
   de contar lo mismo.

## What Changes

### Identidad (capacidad nueva `visual-identity`)

- Se declara el **nombre y la marca**: `dark echo`, con el bloque de cursor
  duplicado y atenuado —`▋▋`, sólido más su eco— como marca gráfica. Sale del
  propio producto (el cursor ya vive en el prompt y en el arranque) y nombra
  lo que hace: una señal que vuelve más débil.
- **Favicon, iconos de PWA y metadata** (título, descripción, Open Graph,
  manifiesto) se rehacen sobre esa marca y sobre el posicionamiento actual del
  producto.
- La **pantalla de arranque** se reduce a la marca centrada con el cursor
  parpadeando, y **pasa a usarse también como transición al conmutar de modo**.
- Se empaqueta una **tipografía propia** (IBM Plex Mono, OFL) para marca,
  consola y datos, servida desde el propio bundle y precacheada: ninguna
  petición de red en ejecución.

### Modo visual

- **BREAKING (interfaz)**: el modo visual deja de ser una pila de recuadros y
  se reordena según **el recorrido de la señal hasta el oyente** — qué suena →
  a qué distancia → tras qué barrera → en qué recinto → tú (la barra
  inferior). El orden vertical *es* la cadena del motor, igual que hoy la
  contención lo es.
- Los sonidos pasan de tarjetas a una **rejilla densa de fichas** que escala a
  un catálogo mucho mayor; el detalle de un sonido (sus capas, su distancia) se
  despliega **en sitio**, no en otra tarjeta.
- Se añade la **lectura de escena en lenguaje natural**: una frase única
  —"Lluvia y viento, a 20 metros, tras un techo de madera, dentro de una
  cabaña"— derivada del snapshot del motor y **compartida por las tres
  superficies**: encabeza el modo visual, resume la barra inferior y la
  devuelve `status` en la consola.
- La distinción entre **escena guardada** y **composición temporal** se hace
  visible y explícita, incluido el estado "guardada, y modificada desde
  entonces".
- **Mobile-first**: la disposición se declara y se verifica desde el teléfono
  hacia arriba, con la barra inferior en una sola fila para no comerse el área
  útil.

### Modo consola

- Conserva su filosofía y todo su vocabulario. Cambia la **puesta en escena**:
  la entrada muestra marca, bienvenida, qué hace la aplicación, los dos modos y
  cómo empezar, **de forma progresiva**, no como un muro de seis líneas.
- Las sugerencias en vivo y la ayuda contextual pasan a ser **accionables por
  toque**, no solo por tabulador, para que la consola sea usable sin teclado
  físico.

### Apariencia (`theming`)

- El fondo deja de ser gris estrictamente neutro y adopta una desviación fría
  mínima, con el acento como única fuente de color cálido. El acento nunca
  tiñe superficies, así que **añadir un acento no toca ningún componente**.
- Se declaran **cuatro acentos**: `default` (verde, se mantiene como
  predeterminado), `ambar`, `blanco` y `neon`. Cada uno con sus valores para
  los dos esquemas y verificado en contraste AA por el test existente.

### Modo por defecto

- **BREAKING (comportamiento)**: sin preferencia registrada, la aplicación
  arranca en **modo visual**, en cualquier dispositivo. Desaparece la decisión
  por tipo de puntero de `defaultInterfaceMode()`. La consola queda a una sola
  acción desde la barra inferior.

## Non-Goals

- **No se toca el audio.** Ni `dsp/`, ni `audio/`, ni las declaraciones de
  ambientes. Ningún cambio de este trabajo puede alterar lo que suena.
- **No se inventan las "variaciones" de un sonido.** El brief las describe
  (lluvia ligera / moderada / torrencial) y `openspec/project.md` las sitúa
  como intensidad propia del `Source`, pero **no existen todavía en el
  catálogo**. La interfaz reserva su sitio en la jerarquía y lo presenta solo
  cuando un `Source` declare variaciones; mientras tanto muestra lo que sí
  existe, que son los volúmenes por capa. Añadirlas es un change aparte.
- No se añaden `Source`, `Environment`, `Occlusion` ni `Modifier` nuevos.
- No se cambia el vocabulario de comandos ni su semántica.

## Impact

- Affected specs: `command-console`, `theming`, `session-persistence`, y la
  capacidad nueva `visual-identity`.
- Affected code:
  - `src/ui/` completo — `VisualControls.tsx` (reescritura), `Console.tsx`,
    `StatusBar.tsx`, `BootSplash.tsx`, `App.tsx`, primitivas.
  - `src/styles/tokens.css` — fondo, acentos nuevos, tipografía.
  - `src/domain/themes.ts` — registro de los cuatro acentos.
  - `src/domain/composition/sceneSentence.ts` — **nuevo**, función pura.
  - `src/platform/config.ts` — modo por defecto.
  - `index.html`, `vite.config.ts`, `public/` — metadata, iconos, manifiesto.
  - `src/assets/fonts/` — **nuevo**, la tipografía empaquetada.
- Sin impacto en: `dsp/`, `audio/`, `domain/ambients/`, `domain/composition/`
  salvo el archivo nuevo, y el registro de comandos (`commands/commands.ts`)
  salvo que `status` pase a usar la lectura compartida.

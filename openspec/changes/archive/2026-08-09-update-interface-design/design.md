## Context

Este change no añade capacidades al motor: reordena, nombra y viste lo que ya
existe. La restricción dominante es que **nada de lo que suena puede cambiar**,
y la oportunidad dominante es que el modelo de dominio ya es bueno y la
interfaz todavía no lo aprovecha para enseñarse a sí misma.

### De qué se parte

| Superficie | Estado hoy | Problema |
|---|---|---|
| `BootSplash.tsx` | nombre en mono grande + cursor, 600 ms | correcto de fondo; no se reutiliza al conmutar de modo |
| `Console.tsx` | bienvenida de 6 líneas de golpe, salida, hint, sugerencias, prompt | la bienvenida satura; las sugerencias no son tocables |
| `VisualControls.tsx` | 455 líneas: recuadro de escena con cabecera (recinto/barrera) + tarjetas de `Source` + escenas + apariencia + transporte | se lee como una pantalla de ajustes; las tarjetas no escalan; la apariencia compite con los sonidos |
| `StatusBar.tsx` | una línea: `Sonando: rain.cuerpo, rain.impactos · vol 50% · Ámbar/oscuro` + conmutador | muestra ids internos; el nombre de escena no aparece |
| `tokens.css` | dark-first, OKLCH, dos temas | fondo estrictamente acromático; sin tipografía propia |

### La jerarquía, verificada contra el motor

Sin cambios respecto de lo verificado en `add-visual-control-mode`
(`src/audio/composition/compositionEngine.ts`):

```text
  Source_a (capas) → ModifierStage_a ─┐
  Source_b (capas) → ModifierStage_b ─┼→ sceneBus → Occlusion → Environment → master
  Source_c (capas) → ModifierStage_c ─┘
                    └── por Source ──┘  └──── de escena, una sola vez ────┘
```

Lo que este change cambia no es la jerarquía, sino **cómo se lee**: hasta ahora
la comunicaba la contención (un recuadro dentro de otro); a partir de aquí la
comunica el **orden vertical**, que es más barato en pantalla estrecha y
sobrevive a un catálogo grande.

## Goals / Non-Goals

**Goals**

- Que alguien que abre la aplicación por primera vez oiga algo en un toque y
  entienda, sin leer nada, qué suena y cómo suena.
- Una identidad reconocible —marca, tipografía, color, movimiento— derivada del
  producto y no aplicada por encima.
- Una sola forma de contar el estado de la escena, compartida por el modo
  visual, la barra inferior y la consola.
- Un sistema de acentos que crezca sin tocar componentes.
- Mobile-first verificado, no declarado.

**Non-Goals**

- Tocar `dsp/`, `audio/` o las declaraciones de ambientes.
- Implementar variaciones/intensidad por `Source` (ver D11).
- Cambiar el vocabulario ni la semántica de los comandos.
- Sustituir shadcn/Radix por otra base de primitivas.

## Dirección visual

### D1 — La marca es el eco del cursor

La marca es `▋▋`: el bloque de cursor que ya vive en el prompt y en el
arranque, seguido de una copia atenuada y desplazada. Es literalmente un eco
—una señal que vuelve más débil— y nombra el producto sin ilustrarlo.

Se elige eso frente a un logotipo figurativo (onda, gota, altavoz) por tres
razones: ya existe en el producto, así que no se impone nada nuevo; funciona a
16 px de favicon y a 96 px de arranque sin redibujarse; y **se generaliza a un
lenguaje de estado**. La misma pareja "sólido + atenuado" dice en toda la
interfaz lo mismo: lo sólido es lo que actúa, lo atenuado es lo que está
presente sin actuar todavía. Un sonido disponible frente a uno sonando, un
modificador sin aplicar frente a uno aplicado, el eco del comando escrito
frente a la respuesta del sistema.

Palabra: `dark echo` en dos palabras y minúsculas para la marca visible;
`dark-echo` sigue siendo el identificador técnico (paquete, storage keys,
manifiesto `short_name`). No se renombra el producto: el trabajo es madurarlo.

- Alternativa descartada: un nombre nuevo. El brief pide una versión madura de
  la aplicación existente, y un nombre nuevo rompe el reconocimiento a cambio
  de nada.

### D2 — El fondo es aire de noche, el acento es la única luz

El fondo actual es acromático puro (`oklch(0.177 0 0)`). Se le da una
desviación fría mínima (`oklch(0.18 0.012 250)`) y el acento queda como la
única fuente de color. Es una decisión de contraste cromático, no de
decoración: sobre un gris exactamente neutro, cualquier acento cálido se lee
como un color puesto encima; sobre un gris ligeramente frío se lee como una
luz dentro de la escena. En esquema claro, el equivalente es papel frío
(`oklch(0.976 0.004 250)`), no crema.

Consecuencia de sistema, y la razón principal de la decisión: **el acento no
tiñe ninguna superficie**. Solo aparece en texto de énfasis, foco, estado
activo y cursor. Por eso un acento nuevo se declara sobreescribiendo
`--primary` / `--primary-foreground` / `--ring` y nada más, y por eso el
sistema escala sin redibujar la interfaz — que es exactamente lo que pide el
brief.

Paleta nombrada (los valores exactos se fijan en la implementación, todos en
OKLCH y verificados por `tokens.contrast.test.ts`):

| Nombre | Token | Oscuro | Claro |
|---|---|---|---|
| noche | `--background` | `oklch(0.18 0.012 250)` | `oklch(0.976 0.004 250)` |
| bruma | `--panel` | `oklch(0.215 0.012 250)` | `oklch(1 0 0)` |
| cal | `--foreground` | `oklch(0.949 0.004 250)` | `oklch(0.205 0.008 250)` |
| ceniza | `--muted-foreground` | `oklch(0.735 0.006 250)` | `oklch(0.44 0.006 250)` |
| acento | `--primary` | por tema | por tema |
| eco | `--primary` al 30 % | derivado, no declarado | derivado, no declarado |

### D3 — Cuatro acentos declarados

| id | Etiqueta | Oscuro | Claro | Nota |
|---|---|---|---|---|
| `default` | Bosque | `oklch(0.815 0.135 158)` | `oklch(0.44 0.115 158)` | se mantiene tal cual y sigue siendo el predeterminado |
| `ambar` | Ámbar | `oklch(0.8 0.15 70)` | `oklch(0.55 0.15 70)` | se mantiene tal cual |
| `blanco` | Blanco | `oklch(0.93 0 0)` | `oklch(0.32 0 0)` | acento acromático |
| `neon` | Neón | `oklch(0.78 0.21 340)` | `oklch(0.52 0.22 340)` | magenta eléctrico |

Dos decisiones que conviene dejar escritas:

- **`blanco` en esquema claro no es blanco.** Un acento blanco sobre papel
  blanco es invisible, así que en claro resuelve a grafito. La etiqueta nombra
  el carácter del tema —acromático, sin color— no su valor literal en cada
  esquema. El test de contraste obliga a esto, no es una licencia.
- **`neon` es magenta, no verde ácido.** El verde ácido sobre negro es el
  cliché disponible y además chocaría con `default`, que ya es verde. El
  magenta es el que más se separa de los otros tres. Sigue siendo una opción
  que el usuario elige, nunca el recurso principal de la interfaz — el brief
  descarta el neón como estética dominante, no como tema disponible.

### D4 — Tipografía: una mono propia empaquetada, la sans del sistema para el cuerpo

Se empaqueta **IBM Plex Mono** (SIL OFL 1.1), pesos 400 y 600, subconjunto
latino, en `woff2`, servida desde el bundle y precacheada por workbox. Ninguna
petición de red en ejecución, así que `theming` → "Los temas no dependen de la
red" se mantiene: la restricción es sobre la red en tiempo de ejecución, no
sobre empaquetar el archivo.

Reparto de roles:

| Rol | Familia | Dónde |
|---|---|---|
| marca y consola | IBM Plex Mono 600 / 400 | arranque, wordmark, entrada y salida de la consola, la frase de escucha |
| datos | IBM Plex Mono 400, `tabular-nums` | metros, porcentajes, volúmenes |
| cuerpo e interfaz | `--font-sans` del sistema | etiquetas, ayuda, mensajes del modo visual |
| rótulo | IBM Plex Mono 600, versalitas espaciadas | los cinco rótulos de sección |

Hoy `body` es mono entera (`styles/index.css`), lo que en el modo visual y en
móvil es duro de leer y hace que la interfaz gráfica parezca una terminal
disfrazada. La mono se queda donde significa algo —la identidad, la consola,
los números que deben alinearse— y el texto que se lee de corrido pasa a la
sans del sistema.

- Alternativa descartada: solo pilas del sistema. Cero bytes, pero la identidad
  quedaría entera en el color, y el color es lo que el usuario puede cambiar.
- Alternativa descartada: dos familias empaquetadas. El doble de peso y de
  licencias para un beneficio que la escala tipográfica ya da.
- Por qué IBM Plex Mono y no JetBrains/Space/Departure: es humanista y cálida
  (encaja con "cercana y amigable"), tiene cobertura completa de diacríticos
  del español, y no arrastra ni la lectura de editor de código ni la retro-8-bits
  que el brief descarta.

### D5 — Elemento firma: la lectura de escena

Una sola frase, en el vocabulario del producto, que dice la escena completa:

> **Lluvia y viento, a 20 metros, tras un techo de madera, dentro de una cabaña.**

Esa frase es **la distinción "qué suena / cómo suena" hecha literal**: la
primera oración nombra los `Source`, y cada cláusula siguiente es una etapa de
la cadena en el orden en que la señal las atraviesa. Enseña el modelo mental sin
un párrafo explicativo, se reescribe al tocar cualquier control, y cuando no hay
nada dice `Silencio.` con la invitación a empezar.

Se genera con una función pura en `src/domain/composition/sceneSentence.ts` a
partir del snapshot del motor y de las etiquetas declaradas de los catálogos, y
la consumen **las tres superficies**: encabeza el modo visual, resume la barra
inferior (recortada) y la devuelve `status` en la consola. Una sola redacción,
imposible de desincronizar, verificable con tests en Node.

Ahí se gasta la audacia del diseño: el héroe de una aplicación de sonido es una
frase, no un botón de reproducción gigante ni un visualizador de onda. Se
justifica porque lo que distingue a este producto de cualquier app de lluvia no
es que suene, es que **compones un lugar**; la frase es esa composición dicha en
voz alta. Todo lo demás en la pantalla se mantiene callado.

### D6 — La disposición es el recorrido de la señal

El orden vertical del modo visual es el trayecto del sonido hasta el oyente. La
barra inferior no es un pie de página: es el final del recorrido, el oyente.

```text
┌───────────────────────────────────────────┐
│ ▋▋ dark echo                    ☾  ✳      │  marca · esquema · acento
├───────────────────────────────────────────┤
│                                           │
│ Lluvia y viento, a 20 metros, tras un     │  ← LA FRASE (firma)
│ techo de madera, dentro de una cabaña.    │
│                                           │
│ QUÉ SUENA ────────────────────────────    │
│ ┌──────┐┌──────┐┌──────┐┌──────┐          │
│ │Lluvia││Viento││ Río  ││Océano│          │  fichas: sólido = sonando
│ │  ▋▋  ││  ▋▋  ││      ││      │          │        atenuado = disponible
│ └──────┘└──────┘└──────┘└──────┘          │
│ ┌──────┐┌──────┐┌──────┐                  │
│ │blanco││ rosa ││marrón│                  │
│ └──────┘└──────┘└──────┘                  │
│                                           │
│   Lluvia                          20 m    │  detalle en sitio, solo activos
│   cuerpo    ▬▬▬▬▬▬▭▭▭▭                    │
│   impactos  ▬▬▬▬▭▭▭▭▭▭                    │
│   goteo     ▬▬▭▭▭▭▭▭▭▭                    │
│   distancia ──────●─────────────  20 m    │
│                                           │
│ CÓMO SUENA ───────────────────────────    │
│ Barrera    ninguna · techo · vidrio       │  selección exclusiva
│ Recinto    ninguno · cabaña · casa · campo│
│                                           │
│ ESCENAS ──────────────────────────────    │
│ ● noche de cabaña      ○ lluvia lejos     │
│ [ guardar esta composición ]              │
│                                           │
├───────────────────────────────────────────┤
│ ▶  Lluvia y viento · cabaña   ▬▬▬▭▭  ⌨   │  SONANDO AHORA + conmutador
└───────────────────────────────────────────┘
```

Cuatro consecuencias deliberadas:

1. **Fichas, no tarjetas.** Un `Source` disponible es una ficha de la rejilla;
   activarlo lo enciende y despliega su detalle **debajo, en sitio**. Con siete
   sonidos ya se nota; con veinte, una tarjeta por sonido sería impracticable.
2. **La apariencia sube a la cabecera.** Esquema y acento son dos controles
   pequeños arriba a la derecha, no una sección al mismo nivel que los sonidos.
   Dejaban de competir por el espacio principal, como pide el brief.
3. **`QUÉ SUENA` / `CÓMO SUENA` son los dos únicos rótulos con voz.** Nombran
   la distinción fundamental del producto en las palabras del usuario, no en
   las del motor (`Source`, `Occlusion`, `Environment` no aparecen en pantalla).
4. **Las escenas guardadas quedan fuera del recorrido**, después del recinto y
   antes de la barra, tal como exige la requirement vigente: son persistencia
   del conjunto, no una etapa de la cadena.

### D7 — La barra inferior es el oyente

Una sola fila, en los dos modos, con —de izquierda a derecha— transporte,
lectura de la escena recortada, volumen y conmutador de modo. En teléfono el
volumen colapsa a un icono que despliega el deslizador sobre la barra al
tocarlo: el brief pide explícitamente que la barra no coma área útil, y un
deslizador permanente en una fila de 48 px deja la frase en tres caracteres.

El nombre de la escena, cuando existe, precede a la frase y la sustituye:
`noche de cabaña · sonando`. Sin nombre, manda la frase. Así la barra responde
siempre a "qué estoy escuchando" con la respuesta más específica disponible.

El conmutador conserva su posición actual (extremo derecho): es un objetivo
táctil ya memorizado y moverlo no compra nada.

### D8 — La pantalla de arranque es también la transición de modo

Marca centrada, cursor parpadeando, nada más. La misma pantalla se interpone
al conmutar entre modos, ~320 ms, con `prefers-reduced-motion` respetado
(sin parpadeo y sin transición, cambio directo).

No es adorno: conmutar de modo intercambia la pantalla entera, y sin una
transición el cambio se lee como un fallo de renderizado. Usar la pantalla de
arranque —y no un desvanecido genérico— hace que el conmutador se sienta como
"volver a entrar por la puerta" y refuerza la marca en el único momento en que
el usuario no está haciendo nada más.

**Restricción dura**: la transición es exclusivamente visual. El motor no se
toca al conmutar, y la requirement vigente "La conmutación no interrumpe la
reproducción" se mantiene sin excepción.

### D9 — Escena guardada frente a composición temporal

Tres estados, distinguidos por el mismo lenguaje sólido/eco de D1:

| Estado | Cómo se ve | Cómo se dice |
|---|---|---|
| composición temporal | sin nombre, la frase manda | `Sin guardar` |
| escena guardada y cargada tal cual | nombre sólido con marca de guardado | `noche de cabaña` |
| guardada pero modificada desde entonces | nombre atenuado + marca de cambio | `noche de cabaña · modificada` |

El tercer estado es el que hoy no existe y el que provoca pérdidas de trabajo:
quien carga una escena, la ajusta y cierra, no tiene forma de saber que lo
ajustado no se guardó. Se resuelve comparando el snapshot actual del motor con
la escena cargada — dato ya disponible, sin estado nuevo que mantener.

### D10 — La consola: misma filosofía, mejor puesta en escena

Se conserva todo el vocabulario, el historial, el autocompletado y los prefijos
`/` y `.`. Cambian tres cosas:

- **Entrada progresiva.** Marca → bienvenida → qué hace → los dos modos →
  cómo empezar, en líneas que aparecen escalonadas (~90 ms) en vez de un
  bloque de seis. Con `prefers-reduced-motion`, todas a la vez.
- **Sugerencias accionables.** La fila de candidatos del autocompletado pasa a
  ser una fila de objetivos táctiles: tocarlos completa la entrada. Hoy solo
  se alcanzan con el tabulador, lo que deja la consola inservible sin teclado
  físico aunque el brief y el spec la quieran alcanzable.
- **Ayuda contextual con forma.** El hint del comando en curso se presenta
  como firma —nombre, argumentos, valores admitidos— en vez de un párrafo
  corrido.

Lo que **no** se hace: imitar una terminal de Linux. Sin `usuario@host:~$`,
sin banner ASCII, sin verde fosforito. El prompt es el bloque de cursor de la
marca.

### D11 — Las variaciones tienen sitio reservado, no implementación

El brief describe `sonidos base → variaciones → escenas/modificadores` y pone
de ejemplo lluvia ligera / moderada / torrencial. **Eso no existe en el
catálogo**: `AmbientDeclaration` es `{ id, label, layers }` y no hay ningún
concepto de intensidad. `openspec/project.md` lo sitúa como propiedad futura
del `Source`.

Decisión: el modo visual **no inventa un control de variación**. La franja de
detalle de un `Source` reserva su primera línea para las variaciones y la
renderiza solo si el `Source` las declara; mientras ninguno lo haga, esa línea
sencillamente no aparece y el detalle empieza por los volúmenes de capa, que
es lo que sí existe y sí funciona. Cuando el change de intensidad llegue, no
hay que rediseñar nada.

Un control que no altera el audio sería peor que su ausencia: contradiría la
regla de que la interfaz nunca puede mostrar algo distinto de lo que suena.

### D12 — Mobile-first, verificado

Punto de partida 360 px. Objetivos táctiles ≥ 44 px en fichas, transporte,
conmutador y acciones de escena. La rejilla de sonidos es de ancho fluido
(`auto-fill`, mínimo 7.5rem), así que el mismo componente da dos columnas en
teléfono y cinco en escritorio sin un solo breakpoint escrito a mano. La barra
inferior es la única superficie fija; todo lo demás desplaza bajo ella.

En escritorio, el contenido se limita a una medida de lectura (~64rem) y se
centra: estirar las fichas a 1920 px las convertiría en botones de un panel de
administración, que es exactamente lo que el brief descarta.

## Decisiones técnicas

### D13 — Alcance del cambio por capa

| Capa | Cambia | Qué |
|---|---|---|
| `dsp/`, `audio/` | **no** | ni una línea |
| `domain/ambients`, `domain/composition/*` | **no** | salvo el archivo nuevo |
| `domain/composition/sceneSentence.ts` | nuevo | función pura, sin dependencias |
| `domain/themes.ts` | sí | registro de cuatro acentos |
| `commands/` | mínimo | `status` pasa a usar la lectura compartida |
| `platform/config.ts` | sí | modo por defecto |
| `styles/`, `ui/` | sí | el grueso del trabajo |
| `index.html`, `vite.config.ts`, `public/` | sí | identidad y metadata |

La dirección de dependencias de `openspec/project.md` se mantiene sin
excepciones; `sceneSentence.ts` vive en `domain/` precisamente para que
`commands/` y `ui/` puedan consumirla sin que ninguna dependa de la otra.

### D14 — La frase se deriva, nunca se guarda

`sceneSentence(snapshot)` es pura y se llama en cada render a partir del
`PlaybackSnapshot` que ya publica el motor. No hay estado nuevo, ni copia, ni
efecto: se mantiene la regla de que ningún control guarda su propio valor
(`add-visual-control-mode`, D7). Si el motor cambia, la frase cambia en el
mismo render.

### D15 — Modo por defecto: visual, sin ramas

`defaultInterfaceMode()` pasa a devolver `"visual"` siempre, y desaparece la
consulta a `matchMedia("(pointer: coarse)")`. Elegir por dispositivo tenía
sentido cuando el modo visual era peor que la consola en escritorio; con un
modo visual completo, la ramificación solo produce que dos usuarios distintos
vean productos distintos en su primer arranque y que el spec no pueda declarar
un comportamiento único.

No hay migración de almacenamiento: `UserConfig` no cambia de forma, y quien ya
tenga un modo registrado lo conserva. La migración `1 → 2` existente pasa a
resolver a `"visual"`, que es lo que devuelve la función.

### D16 — La tipografía entra por el bundle, no por la red

Los `woff2` viven en `src/assets/fonts/` y se importan desde CSS, así que Vite
les pone hash y los emite como assets. `workbox.globPatterns` se amplía con
`woff2` para que entren en el precache — sin eso, la primera carga sin conexión
se quedaría sin la tipografía de marca. `font-display: swap` y la pila del
sistema como respaldo en `--font-mono`, de modo que la aplicación es legible
incluso si el asset falla.

## Risks / Trade-offs

- **La reescritura de `VisualControls.tsx` puede perder una garantía sutil.** →
  Se conserva la regla "ningún control guarda su propio valor" como criterio de
  revisión explícito, y los tests de equivalencia control/comando de la
  requirement vigente se mantienen y se amplían.
- **La frase de escucha puede quedar larga con muchos `Source`.** → Se declara
  su degradación: a partir de cuatro `Source` la enumeración se corta con
  "y N más"; en la barra inferior se recorta por ancho, no por número.
- **`neon` es de croma alto y puede fallar el contraste AA sobre `--primary`
  como fondo.** → El acento no tiñe superficies (D2), así que el único par a
  verificar es texto sobre fondo; el test existente lo cubre y bloquea si no
  cumple.
- **La tipografía añade peso a la primera carga.** → Dos `woff2` latinos
  (~35 KB en total), precacheados una vez; la aplicación ya es offline-first y
  la segunda carga no los vuelve a pedir.
- **Cambiar el modo por defecto sorprende a quien ya usaba la consola.** → No
  le afecta: solo cambia el arranque *sin preferencia registrada*, y cualquiera
  que haya conmutado alguna vez tiene preferencia registrada.

## Migration Plan

El trabajo es incremental y cada bloque de `tasks.md` deja la aplicación en
estado usable. Orden: identidad y tokens (base para todo lo demás) → lectura de
escena (la comparten las tres superficies) → modo visual → consola → barra →
metadata → verificación. Rollback: cada bloque es un commit independiente; no
hay migración de datos que revertir, porque ni el formato de configuración ni
el de escenas cambian.

## Open Questions

Ninguna pendiente. Las dos que había quedaron resueltas por el propietario al
revisar la propuesta:

- La etiqueta del tema `default` pasa de "Predeterminado" a **"Bosque"**, de
  modo que los cuatro acentos se nombren por su carácter y ninguno por su rol.
  `default` sigue siendo el id y sigue siendo el tema predeterminado.
- Los iconos —favicon y los dos tamaños de PWA— se derivan de la marca
  tipográfica `▋▋`, sin encargar una marca dibujada aparte.

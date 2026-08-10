## Context

La interfaz actual es una consola a pantalla completa (`src/ui/Console.tsx`)
con una barra de estado de una línea (`src/ui/StatusBar.tsx`) y un panel
auxiliar opcional (`src/ui/TouchControls.tsx`) que ese mismo botón revela. El
panel cubre cuatro acciones: reproducir/detener, volumen maestro, tema y
esquema. No cubre nada de la composición.

Mientras tanto, el motor de composición
(`src/audio/composition/compositionEngine.ts`) sostiene una escena con cuatro
niveles y publica su estado completo por `getSnapshot()`. Ese estado no tiene
hoy ninguna representación gráfica: existe únicamente como texto en
`compose status`.

Este change convierte el botón en un conmutador de modo y construye el modo
visual sobre ese snapshot. La restricción dominante no es técnica sino
conceptual: **la disposición de la interfaz tiene que ser la jerarquía**, no
una lista plana de ajustes que dé el mismo resultado. Si la interfaz no enseña
que un `Modifier` pertenece a un `Source` mientras la `Occlusion` pertenece a
la escena, habrá cumplido su función de mando y fallado su función de modelo.

### La jerarquía de composición (verificada contra el código)

La cadena real, leída de `CompositionEngine.ensureGraph()` y de
`activateSource()` (`src/audio/composition/compositionEngine.ts`), es:

```text
  Source_a (sus capas) → ModifierStage_a ─┐
  Source_b (sus capas) → ModifierStage_b ─┼→ sceneBus → OcclusionStage → EnvironmentStage → master → limiter
  Source_c (sus capas) → ModifierStage_c ─┘
                        └── por Source ──┘  └────────── de escena, una sola vez ──────────┘
```

De dentro hacia fuera, con lo que hoy existe en el catálogo:

| Nivel | Qué es | Alcance | Catálogo actual |
|---|---|---|---|
| **Source** | el fenómeno que suena, compuesto de capas | uno o varios por escena, acumulables hasta el límite de 12 capas | `rain`, `wind`, `river`, `ocean`, `white-noise`, `pink-noise`, `brown-noise` (`src/domain/catalog.ts`) |
| **Capas de un `Source`** | las capas declaradas del ambiente, con su ganancia | dentro de un `Source` | p. ej. `rain` aporta 3, `wind` 1 |
| **Modifiers** | condición dinámica sobre el trayecto de **ese** `Source` | **por `Source`**, nunca de escena | `distancia` (1–200 m, por defecto 20 m) |
| **Occlusion** | la barrera que todo lo que suena atraviesa | **de escena**, como mucho una | `techo-madera`, `techo-madera-grueso`, `ventana-vidrio` |
| **Environment** | el recinto donde ocurre todo | **de escena**, como mucho uno | `cabana`, `casa`, `campo-abierto` |
| **Maestro** | volumen de salida, antes del limitador | de escena | — |

Dos hechos de esa tabla son los que la interfaz tiene que hacer evidentes, y no
son intercambiables:

1. **El `Modifier` es del `Source`.** Hay una `ModifierStage` por `Source`,
   insertada antes de la suma, precisamente para que alejar `rain` no mueva a
   `wind`. Ponerlo en la interfaz como un ajuste global sería mentir sobre lo
   que hace.
2. **`Occlusion` y `Environment` son de la escena.** Están aguas abajo de la
   suma y se aplican una sola vez a todo. Ponerlos por `Source` sugeriría que
   se puede tener a `rain` bajo un techo y a `wind` al aire libre, que el motor
   no permite.

### Lo que **no** es una etapa de la cadena

Las **escenas guardadas** (`scene save|load|list|delete`) son persistencia del
conjunto completo: un eje ortogonal a la jerarquía, no un paso intermedio entre
`Source` y `Occlusion`. Cargar una escena reemplaza los cuatro niveles a la vez.
La interfaz tiene que colocarlas fuera del encadenamiento, o convertirá una
operación de archivo en un componente de la señal.

Lo mismo, por motivos distintos, con **tema y esquema**: son apariencia
(capacidad `theming`), no composición.

## Goals / Non-Goals

**Goals**

- Un conmutador de modo con dos estados excluyentes, consola por defecto.
- Un modo visual que alcance las cuatro etapas de la composición, el transporte
  y los volúmenes, sin escribir un solo comando.
- Que la disposición del modo visual **sea** la jerarquía, de forma legible sin
  documentación adjunta.
- Que el estado mostrado no pueda divergir de lo que suena.
- Que el modo elegido sobreviva al cierre de la aplicación.

**Non-Goals**

- Sustituir la consola. Sigue siendo el modo por defecto y la superficie
  completa; el modo visual cubre lo frecuente, no lo exhaustivo.
- Añadir un comando `mode` para conmutar desde la consola (ver Open Questions).
- Exponer parámetros de síntesis por capa que hoy no tienen comando
  equivalente. El modo visual no inventa capacidades del motor: solo da forma
  gráfica a las que ya existen.
- Introducir `Source`, `Occlusion`, `Environment` o `Modifier` nuevos.
- Rediseñar la consola. Cambia una línea de su bienvenida y nada más.

## Decisions

### D1 — El modo es un estado excluyente, no una capa superpuesta

Los dos modos ocupan la misma región de la pantalla y nunca coexisten. La
`StatusBar` permanece en ambos —es la única superficie común— y hospeda el
conmutador en su extremo derecho, exactamente donde el usuario ya lo tiene
memorizado.

**Alternativa descartada**: mantener el modo visual como un panel que se
despliega sobre la consola, que es literalmente lo que hoy hace
`TouchControls`. Se descarta por dos razones. La primera es de espacio: la
jerarquía completa son cinco secciones, y superpuestas a la consola dejarían
inservibles las dos superficies a la vez en una pantalla de teléfono. La
segunda es de significado: un panel auxiliar comunica "extra", y lo que el
propietario pidió es una forma alternativa y completa de operar el producto,
que es una afirmación más fuerte.

**Consecuencia aceptada**: en modo visual no se ve la salida de la consola, así
que un aviso del sistema (`SystemNoticeStore`: persistencia degradada,
actualización disponible) emitido en modo visual no sería visible. Se resuelve
en el grupo 9 de tareas mostrando los avisos pendientes también en modo visual;
no se resuelve manteniendo la consola visible.

### D2 — La disposición de las secciones es la cadena de señal, de dentro hacia fuera

Orden vertical del modo visual, de arriba abajo:

```text
┌─ Escena ─────────────────────────────────────────────┐
│  Entorno:   ( cabaña | casa | campo abierto )        │   ← Environment (de escena)
│  Barrera:   ( techo madera | … | ninguna )           │   ← Occlusion    (de escena)
│                                                      │
│  ┌─ Fuentes ────────────────────────────────────┐    │
│  │  [ lluvia ]  ▸ capas   ⟷ distancia 20 m      │    │   ← Source + sus Modifiers
│  │  [ viento ]  ▸ capas   ⟷ distancia 60 m      │    │
│  │  [ + añadir fuente ]                         │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘

  Escenas guardadas   ( guardar · cargar · eliminar )      ← ortogonal, fuera del encuadre

  ┌ Apariencia ┐  tema · esquema                           ← theming, fuera de la composición

  ▶ / ■   ────────●──── volumen maestro                    ← transporte, barra fija al pie
```

El encuadre no es decoración: el recuadro exterior **contiene** al de fuentes
porque el recinto contiene a las fuentes. Es la misma relación que en el grafo
de audio, dibujada.

El transporte queda al final en orden de lectura, como pidió el propietario, y
además **fijo al pie** por encima de la `StatusBar`: reproducir y detener son
las dos acciones que hay que poder alcanzar sin importar hasta dónde se haya
desplazado la lista de fuentes.

**Alternativa descartada**: cuatro secciones hermanas al mismo nivel —Fuentes,
Modificadores, Oclusión, Entorno—, que es la disposición que sale sola de leer
el `compose status`. Se descarta porque presenta cuatro ajustes independientes
y pierde exactamente los dos hechos que este change existe para enseñar: que el
modificador pertenece a una fuente y que la barrera y el recinto no.

**Alternativa descartada**: el orden inverso, fuentes primero y entorno al
final, siguiendo el sentido de la señal. Es más fiel al grafo, pero deja la
decisión más envolvente —dónde ocurre todo— como último paso, y obliga a
releer hacia arriba para entender qué encierra a qué. El anidamiento visual
comunica la cadena mejor que el orden, así que el orden se elige por
legibilidad.

### D3 — Los `Modifiers` viven **dentro** de la tarjeta de su `Source`; `Occlusion` y `Environment`, en la cabecera de la escena

Es el punto conceptualmente más difícil de la interfaz, y se resuelve con
contención visual en vez de con etiquetas explicativas:

- Cada `Source` activo es una **tarjeta** propia. Dentro de ella, y solo dentro
  de ella, están sus capas (con su volumen) y su control de `distancia`
  rotulado en metros, el rango declarado (1–200 m) y el valor real del motor.
  Un usuario que mueva ese deslizador ve moverse una cifra que está dibujada
  dentro del recuadro de esa fuente y de ninguna otra.
- `Occlusion` y `Environment` son **selectores únicos** —como mucho uno activo,
  con opción "ninguno"— situados en la **cabecera del recuadro que contiene a
  todas las tarjetas**. Su posición dice, sin texto, que gobiernan todo lo que
  hay dentro.

La forma del control refuerza la diferencia: los componentes de escena son
selección exclusiva (una barrera, un recinto), las fuentes son alta/baja
acumulable, y los `Modifiers` son continuos y repetidos —uno por tarjeta—.
Tres formas distintas para tres alcances distintos.

**Alternativa descartada**: una sección "Modificadores" con un selector de
`Source` destinatario, que es la traducción literal de la gramática
`compose distance <source> <metros>`. Reproduce el comportamiento correcto pero
exige que el usuario sepa de antemano lo que la interfaz debería enseñarle, y
reintroduce el estado invisible que la decisión D2 de
`add-multi-source-composition` eliminó a propósito de los comandos.

**Alternativa descartada**: repetir los selectores de `Occlusion` y
`Environment` dentro de cada tarjeta de `Source`, deshabilitados y sincronizados
entre sí, para que se vea que alcanzan a todos. Sugiere que podrían diferir, que
es justo lo contrario de lo que se quiere comunicar.

**Degradación en pantallas estrechas**: por debajo del ancho en que el recuadro
anidado deja de leerse, el encuadre se reduce a sangrado más una cabecera
adherida (`Escena: cabaña · techo de madera`) que permanece visible mientras se
recorren las fuentes. La relación de contención se conserva aunque el recuadro
desaparezca.

### D4 — `TouchControls` se absorbe y se elimina

El modo visual es un superconjunto estricto de `TouchControls`: cubre sus
cuatro controles y añade toda la composición. Conservarlo dejaría dos
superficies táctiles suscritas a los mismos stores, dos sitios donde arreglar
un fallo, y —lo decisivo— un botón que tendría que significar dos cosas
distintas.

**Alternativa descartada**: conservarlo como barra compacta dentro del modo
consola, para quien quiera detener la reproducción sin abandonar la consola. Es
la opción defendible, y se descarta porque el conmutador está a un toque, la
`StatusBar` ya informa de lo que suena sin cambiar de modo, y la requirement
"Operación sin teclado físico" queda igualmente satisfecha: alcanzar las
acciones esenciales sin teclado cuesta un toque más, no un teclado. Si la
validación humana del grupo 11 revela que ese toque estorba, reintroducir una
barra compacta es aditivo y no invalida nada de lo aquí decidido.

### D5 — El modo se persiste en `UserConfig`, subiendo el formato a la versión 2

`src/platform/config.ts` ya es el registro de "la configuración del usuario …
y las preferencias de la consola" (`session-persistence`), y el modo de
interfaz es exactamente eso. `UserConfig` incorpora
`interfaceMode: "console" | "visual"`, y `STORAGE_VERSION` pasa de 1 a 2.

La migración es **obligatoria, no opcional**: `readConfig` llama hoy a
`readVersioned` sin lista de migraciones, y `readVersioned` descarta el dato
cuando no encuentra una migración que alcance la versión vigente. Subir la
versión sin registrar la migración `1 → 2` haría que todos los usuarios
existentes perdieran su volumen maestro. La migración añade
`interfaceMode: "console"` y conserva el resto.

**Alternativa descartada**: una clave propia de `localStorage`, al estilo de
`dark-echo.appearance`. Tiene sentido para la apariencia, que debe leerse desde
un script síncrono en `index.html` antes del primer dibujado; el modo de
interfaz no tiene esa urgencia —React ya está montado cuando hace falta—, así
que una clave nueva solo añadiría un sobre, una lectura y un modo de fallo más.

**Alternativa descartada**: no persistir y arrancar siempre en consola. Obliga a
un usuario táctil a conmutar en cada arranque, que es precisamente el usuario
para el que se hace este change.

**Resolución de la tensión con "consola por defecto"**: el valor por defecto
—el que se aplica sin preferencia registrada, en el primer arranque y tras un
descarte de datos— es `"console"`. Una vez el usuario conmuta, su elección
manda. Las dos afirmaciones del propietario se sostienen a la vez porque hablan
de momentos distintos.

### D6 — El modo vive en un store observable de `platform/`, no en `useState`

Hoy `controlsVisible` es un `useState` de `App.tsx`. El modo pasa a un store
`src/platform/interfaceMode.ts` con el patrón exacto de `AppearanceStore`:
`subscribe` / `getSnapshot` / `set`, escritura a `UserConfig` en cada cambio, y
consumo desde React con `useSyncExternalStore`.

Se hace así por tres razones concretas: el modo tiene que persistirse, y la
persistencia es responsabilidad de `platform/`; `StatusBar` y la raíz necesitan
leerlo sin encadenar props; y un futuro comando `mode` podría fijarlo sin que
`commands/` tenga que conocer `ui/`, que la dirección de dependencias prohíbe.

**Alternativa descartada**: mantener `useState` en `App.tsx` y escribir la
configuración en un `useEffect`. Funciona hoy y no funcionaría en cuanto algo
que no sea un componente necesite cambiar el modo.

### D7 — El modo visual no guarda copia del estado de la escena

Todos los controles leen del snapshot del motor por `useSyncExternalStore` y
escriben llamando al motor. Ningún deslizador mantiene su propio valor "mientras
el usuario arrastra": el valor mostrado es siempre el que el motor publicó. Es
la misma garantía que `StatusBar` cumple hoy y la que hace imposible que la
interfaz muestre 60 m mientras suenan 20.

**Alternativa descartada**: estado local con reconciliación al soltar, que es el
patrón habitual para deslizadores. Se descarta porque abre exactamente la
ventana de divergencia que el proyecto prohíbe, y porque el motor ya rampa sus
parámetros —no necesita protección contra actualizaciones frecuentes—.

### D8 — Las escenas guardadas van en su propia sección, fuera del encuadre de la composición

Se sitúan después del recuadro de escena y antes del transporte, en un
contenedor visualmente distinto, sin anidar y sin flecha que las una a nada.
Guardar toma los cuatro niveles a la vez; cargar los reemplaza a los cuatro.

**Alternativa descartada**: un selector de escenas en la cabecera, como
"preajustes", que es donde la mayoría de las aplicaciones lo pone. Leído de
arriba abajo, se interpretaría como el primer paso de la cadena, y este change
existe en buena parte para que la cadena se lea bien. La comodidad de tener los
preajustes arriba no compensa desdibujar lo único que la disposición tiene que
enseñar.

### D9 — Los volúmenes expuestos son el maestro y los de capa; no se inventa un volumen por `Source`

El transporte lleva el volumen maestro. Cada tarjeta de `Source` lleva, tras un
desplegable "capas" cerrado por defecto, un deslizador por capa —los mismos que
gobierna `volume <capa> <valor>`—.

**Alternativa descartada**: un único volumen por `Source` que escale
proporcionalmente las ganancias de sus capas. Es más cómodo, y exige un
concepto nuevo en el motor: una ganancia por `Source` que hoy no existe. Peor
aún, crearía un segundo lugar donde se decide cuán fuerte suena una fuente,
junto al `Modifier` de distancia, que ya hace eso mismo derivándolo de una
magnitud física. Dos mandos para una sola magnitud es la clase de duplicación
que la filosofía del motor rechaza.

### D10 — No se añaden primitivas nuevas ni dependencias

El modo visual se construye con `button.tsx` y `slider.tsx`, ya presentes, más
contenedores con utilidades de Tailwind respaldadas por tokens. El desplegable
de capas usa `<details>`/`<summary>` nativo, que trae plegado accesible y
operable por teclado sin código. Añadir primitivas al repositorio es aceptable
por convención del proyecto, pero aquí no hace falta ninguna, y no añadir es
más barato que añadir bien.

Ningún color, radio ni sombra literal: `scripts/check-tokens.ts` es la verja, y
los componentes nuevos son código de `src/ui/`, así que la atraviesan enteros.

### D11 — Este change se implementa después de `retire-legacy-engine`

El modo visual se dibuja a partir de `CompositionSnapshot` —`sources[]` con su
`modifier`, `occlusion`, `environment`— y necesita el ciclo de reproducción
unificado (mezcla conservada tras `stop`, estados vacío/detenido/sonando/
suspendido) que aquel change traslada al motor de composición.

**Alternativa descartada**: implementarlo ya contra los dos motores, con el
transporte hablando a `AmbientMixer` y la composición a `CompositionEngine`.
Obligaría a decidir en la interfaz qué motor manda en cada control, que es la
confusión que `retire-legacy-engine` viene a eliminar, y a reescribir los mismos
paneles cuando ese change aterrice.

## Risks / Trade-offs

- **[Riesgo]** El modo visual duplica la superficie de mando y podría
  divergir del comportamiento de los comandos → **Mitigación**: cada control
  invoca el mismo método del motor que invoca su comando equivalente, nunca una
  ruta paralela; los tests del grupo 10 comprueban la equivalencia comando ↔
  control sobre el estado observable del motor.
- **[Riesgo]** La disposición anidada se rompe en pantallas estrechas, que son
  justamente las del usuario táctil al que va dirigido el modo → **Mitigación**:
  degradación declarada en D3 (sangrado + cabecera adherida) y validación humana
  explícita en pantalla estrecha real, no solo en el emulador (tarea 11.2).
- **[Riesgo]** Perder la salida de la consola en modo visual oculta los avisos
  del sistema → **Mitigación**: los avisos pendientes se muestran también en
  modo visual (grupo 9); es la consecuencia aceptada de D1 y se trata como
  requisito, no como detalle.
- **[Riesgo]** El catálogo crece y la sección de fuentes se alarga sin límite →
  **Mitigación**: las tres secciones derivan de `domain/catalog.ts` y
  `domain/composition/catalog.ts`, nunca de listas escritas a mano, así que un
  ambiente nuevo aparece solo; si el listado deja de caber, filtrarlo es un
  change aparte y no invalida la disposición.
- **[Trade-off]** Eliminar `TouchControls` deja el modo consola sin controles
  táctiles propios → **Aceptado**: el conmutador está a un toque y la
  `StatusBar` sigue informando; reintroducir una barra compacta después sería
  aditivo.
- **[Trade-off]** Sin estado local en los deslizadores, cada arrastre pasa por
  el motor → **Aceptado**: es el precio de la garantía de no divergencia, y los
  parámetros del motor ya se aplican con rampa.

## Migration Plan

1. Añadir `interfaceMode` a `UserConfig` con su migración `1 → 2` y subir
   `STORAGE_VERSION`. Se hace **antes** que nada, y con su test, porque un
   error aquí borra la configuración de todos los usuarios existentes.
2. Introducir `InterfaceModeStore` y conmutar la raíz entre `Console` y un modo
   visual todavía vacío. A partir de aquí la aplicación es funcional en todo
   momento.
3. Construir el modo visual sección a sección, en el orden de la jerarquía:
   escena (entorno, barrera), fuentes con sus modificadores, escenas guardadas,
   apariencia, transporte.
4. Eliminar `TouchControls` **solo cuando** el modo visual cubra sus cuatro
   controles, no antes: entre medias, el panel deja de tener botón que lo
   revele, así que retirarlo antes de tiempo perdería capacidad.
5. Cambiar el mensaje de bienvenida al final, cuando el botón ya signifique lo
   que el mensaje dice que significa.

**Reversión**: revertir el change devuelve la consola como interfaz única y
`TouchControls`. Una configuración escrita en versión 2 y leída por el código de
la versión 1 no se pierde: `readVersioned` solo descarta al no encontrar
migración *hacia arriba*; una versión almacenada superior a la vigente se acepta
y se reescribe, y el campo sobrante se ignora. El volumen maestro sobrevive.

## Open Questions

- **¿Arrancar siempre en consola, o en el último modo usado?** D5 resuelve la
  tensión a favor de "consola solo como valor por defecto", pero el propietario
  dijo las dos cosas y la lectura estricta de "al arrancar se entra en la
  consola" también es defendible. Si esa es la intención, el modo deja de
  persistirse y D5 se simplifica.
- **¿Comando `mode console|visual`?** Todo lo demás en el producto es
  alcanzable por comando, y el conmutador rompe esa simetría. Se deja fuera por
  ahora —el modo visual existe precisamente para quien no escribe comandos—,
  pero añadirlo es barato y `InterfaceModeStore` ya está preparado para ello.
- **¿Volúmenes por capa dentro de cada tarjeta, o solo el maestro?** D9 los
  incluye tras un desplegable. Puede que en pantalla táctil sobren y que el
  maestro más la distancia basten; la escucha del grupo 11 debería decidirlo.
- **¿El modo visual debe permitir elegir barrera o recinto sin ninguna fuente
  activa?** El motor lo permite (`activateOcclusion` no exige `Source`), y
  suena a nada. Dejarlo permitido es fiel al motor; deshabilitarlo hasta que
  haya una fuente enseña mejor la cadena. Sin decidir.
- **¿Dónde encaja la advertencia de afinidad baja en el modo visual?** En la
  consola es una línea más de salida. En el modo visual habría que decidir si
  se ancla al selector que la provocó o si se acumula en un área de avisos.
  Queda para cuando exista el área de avisos del grupo 9.

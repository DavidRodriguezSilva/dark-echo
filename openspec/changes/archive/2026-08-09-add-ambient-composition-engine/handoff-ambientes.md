# Handoff: modelo Source + Environment + Occlusion

> **Estado: investigación archivada dentro de este change.** Este documento
> vivía en la raíz del repositorio como insumo suelto; se archivó aquí porque
> el change `add-ambient-composition-engine` es la decisión de arquitectura
> que resolvió sus "Preguntas abiertas". Se conserva **sin reescribir** como
> registro del razonamiento previo y como catálogo de candidatos de
> `Environment`/`Occlusion` por fenómeno, que sigue siendo material de
> referencia útil para los `Source`s posteriores al piloto.
>
> **Qué quedó superado por el change** (leer con esa salvedad):
>
> - El bloque `AmbientSound = Source + Environment + Occlusion + Global
>   Modifiers` y la repetición de listas de `Environment`/`Occlusion` **dentro
>   de cada fenómeno** sugieren que cada `Source` posee su propio entorno. La
>   decisión adoptada es la contraria: `Environment` y `Occlusion` son buses
>   **compartidos por escena**, uno de cada uno como máximo, y el catálogo es
>   único y transversal, no una lista por fenómeno (ver `design.md`, D2).
> - **"Global Modifiers"** mezcla dos cosas distintas. La **intensidad** es,
>   sin excepción, una característica propia del `Source`, nunca un
>   `Modifier`; y **distancia** y **atenuación** son en la práctica el mismo
>   concepto (ver `design.md`, D3/D4 y `openspec/project.md`).
> - Las **preguntas abiertas 1, 3, 4 y 5** están resueltas por este change:
>   (1) concepto ortogonal, no capas de `AmbientDeclaration`; (3) no se rompe
>   la independencia de capas porque el bus es una etapa de procesamiento
>   nueva, y las interacciones cruzadas quedan fuera de alcance; (4) se
>   empieza por `Environment`/`Occlusion` pilotados en un solo `Source`;
>   (5) el límite de 8 capas no se hereda sin remedir (tarea 8.3).
>   La **pregunta 2** (cómo se sintetiza un `Environment`) sigue abierta y se
>   arrastró a `design.md`, Open Questions.
>
> **Qué sigue vigente**: la investigación por fenómeno (candidatos de entorno
> y oclusión, resonancia propia de la oclusión, el peso desigual del entorno
> entre `wind` y `rain`), el catálogo de interacciones cruzadas, y la
> relectura de la hoja de ruta (bosques como `Environment` y no como
> `Source`).

> **Qué es este documento.** Notas de investigación conceptual sobre cómo
> extender el catálogo de ambientes con capas de **entorno** y **oclusión**
> explícitas, además de la fuente sonora (`Source`) que ya existe hoy. No es
> una spec de OpenSpec ni está aprobado — es el insumo para proponer una o
> varias, vía `openspec-propose`. Antes de convertir cualquier sección en
> tasks, resolver los puntos de "Preguntas abiertas" al final.

## Relación con el proyecto

El catálogo actual (`docs/ambient-catalog-roadmap.md`) implementa `rain`,
`wind`, `river`, `ocean`, `white-noise`, `pink-noise` y `brown-noise` como
ambientes de una sola capa de `Source`: cada uno declara sus capas en
`domain/ambients/<nombre>.ts` (ver `rain.ts`) referenciando un modelo físico
de `docs/synthesis-reference.md` (`impacto-gota`, `rafaga-aire`, `oleaje`,
`flujo-turbulento`, `ruido-de-color`). **No existe hoy ningún concepto de
`Environment` ni `Occlusion` en `domain/`** — `AmbientDeclaration` solo
compone capas de fuente, sin una capa que module cómo esa fuente se
percibe según el espacio o los obstáculos entre ella y el oyente.

Este documento explora esa capa que falta, a partir de cinco fenómenos
(lluvia, viento, océano, río, fuego) usando siempre la misma arquitectura:

```text
AmbientSound =
    Source
  + Environment
  + Occlusion
  + Global Modifiers
```

`Source` es el fenómeno físico (lo que ya existe en el catálogo).
`Environment` es el lugar donde ocurre (bosque, cabaña, ciudad, cueva...).
`Occlusion` son los obstáculos entre la fuente y el oyente (ventana, techo,
muro...). `Global Modifiers` son parámetros que afectan a toda la escena
(intensidad, viento, distancia, humedad, variación temporal).

De los cinco fenómenos, `rain`, `wind`, `river` y `ocean` ya están
implementados como `Source` en el catálogo — este documento no repite su
`Source` ya construido salvo para contrastarlo, y se concentra en las capas
`Environment`/`Occlusion` que faltan. `fuego` (fogatas) es un ambiente
**planeado**, sin `Source` implementado todavía, aunque su modelo físico
(`combustion`) ya está documentado en `docs/synthesis-reference.md` sin
ambiente que lo use.

---

## 1. Lluvia (`rain`)

### Source (ya implementado)

Formado por fondo continuo (masa de lluvia) y distribución aleatoria de
impactos de gotas. En el catálogo actual esto son las capas `cuerpo`,
`impactos` y `goteo` de `rain.ts`, las tres referenciando el modelo
`impacto-gota`. Distinción usada en este documento, más granular que las
tres capas actuales:

- **Background:** ruido continuo que representa la masa de lluvia (≈ `cuerpo`).
- **Near drops:** gotas cercanas, poco frecuentes y muy definidas (≈ `goteo`).
- **Mid drops:** gotas de distancia media.
- **Far drops:** gotas lejanas que se integran con el fondo (≈ `impactos`).

Parámetros de la fuente: intensidad (densidad de gotas y energía del
fondo), tamaño de las gotas, distribución aleatoria, variación temporal
lenta, espacialización de cada impacto — todos ya cubiertos por el modelo
`impacto-gota` y sus rangos declarados.

### Environment (no implementado)

El entorno no genera lluvia; modifica cómo se escucha. No genera sonido por
sí mismo salvo cuando interactúa con la lluvia o el viento.

Candidatos: casa, apartamento, cabaña, bosque, campo abierto, ciudad, cueva,
interior de un vehículo.

Cada entorno aportaría: reverberación, reflexiones, resonancias
características, superficies predominantes (madera, metal, vidrio, hojas,
agua, tierra, concreto), coloración espectral.

### Occlusion (no implementado)

Todo lo que existe entre el oyente y la lluvia.

Candidatos: ninguno (lluvia directa), ventana abierta, ventana cerrada,
techo, árboles, toldos, cortinas, muros, vegetación.

Produciría: atenuación del volumen, filtrado de frecuencias, cambios en la
percepción de distancia, resonancias del propio obstáculo (p. ej. lluvia
sobre un techo metálico — un fenómeno de oclusión bien conocido y con
identidad sonora propia).

### Global Modifiers

- **Intensidad:** llovizna, lluvia ligera, lluvia media, lluvia fuerte,
  aguacero.
- **Viento:** dirección aparente de la lluvia, distribución espacial,
  fluctuaciones del fondo, movimiento de hojas y objetos.
- **Distancia:** bajo la lluvia, bajo un techo, observando desde el
  interior, lluvia a cientos de metros.
- **Humedad ambiental:** absorción de altas frecuencias, sensación de
  espacio.
- **Variabilidad temporal:** pequeñas fluctuaciones lentas en intensidad,
  densidad, distribución de impactos, energía del fondo — ya cubierto por
  el requisito "Variación continua de parámetros" de `procedural-ambiences`.

---

## 2. Viento (`wind`)

### Source (ya implementado)

Flujo continuo de aire y sus resonancias al interactuar con el entorno.
Composición conceptual (el `Source` real de `wind.ts` usa el modelo
`rafaga-aire`, paseo aleatorio filtrado, no un LFO):

- **Air Flow:** ruido continuo filtrado que representa el desplazamiento
  del aire.
- **Gusts:** ráfagas de intensidad variable.
- **Turbulence:** pequeñas fluctuaciones aleatorias que evitan un sonido
  uniforme.

Parámetros: intensidad, dirección, velocidad, turbulencia, variación
temporal, espacialización.

### Environment (no implementado)

A diferencia de la lluvia, el entorno es central: **el viento "suena"
principalmente porque hace vibrar y mover el mundo que lo rodea**, mucho
más que la lluvia depende del entorno. Un viento en campo abierto puede ser
casi un simple flujo de aire; el mismo viento en un bosque o una ciudad
genera un paisaje sonoro completamente distinto.

Candidatos: bosque, campo abierto, ciudad, montaña, costa, cueva, interior
de una casa, cañón.

Cada entorno añadiría sonidos característicos: hojas, ramas, pasto, arena,
olas, ventanas, cables, techos, edificios, rocas.

### Occlusion (no implementado)

Candidatos: pared, ventana, árboles, colinas, edificios, vehículo.

Produciría: atenuación, filtrado, difracción, cambios en la dirección
aparente.

### Global Modifiers

- **Intensidad:** brisa, viento suave, viento moderado, viento fuerte,
  vendaval.
- **Dirección:** frente→atrás, atrás→frente, izquierda→derecha,
  derecha→izquierda, rotación alrededor del oyente.
- **Ráfagas:** frecuencia, duración, intensidad de los incrementos
  temporales — ya modelado por `rafaga-aire`.
- **Turbulencia:** irregularidad del flujo (`──~──≈────~──≈──` frente a un
  flujo liso `──────────────`).
- **Humedad:** aire seco, húmedo, frío, cálido — afecta el carácter, no
  implementado hoy.

### Diferencia clave frente a la lluvia

- **Lluvia:** se construye a partir de una gran cantidad de **eventos
  discretos** (gotas) sobre un fondo continuo.
- **Viento:** se construye a partir de un **flujo continuo** cuya riqueza
  proviene de las **interacciones con el entorno**.

En un sintetizador procedural, esto implica que el `Environment` de `wind`
pesa mucho más en el resultado audible que el de `rain`.

---

## 3. Río (`river`)

### Source (ya implementado)

Flujo continuo de agua y sus interacciones con el cauce y obstáculos
naturales (`river.ts`, modelo `flujo-turbulento` + burbujeo vía
`impacto-gota`):

- **Water Flow:** flujo continuo del agua.
- **Surface Ripples:** pequeñas ondulaciones y turbulencias.
- **Rapids:** rápidos y zonas de mayor velocidad.
- **Falls:** pequeñas caídas o desniveles.
- **Eddies:** remolinos y corrientes secundarias.

Parámetros: caudal, velocidad del flujo, turbulencia, variación temporal,
espacialización.

### Environment (no implementado)

Describe el tipo de cauce y el paisaje alrededor. Candidatos: arroyo, río
de montaña, río boscoso, río de llanura, cañón, humedal, zona urbana,
cascada.

Cada entorno modificaría: reverberación, resonancias, tipo de fondo (roca,
arena, grava, lodo), vegetación, anchura y profundidad del cauce.

### Occlusion (no implementado)

Candidatos: árboles, rocas, taludes, puentes, vegetación, ventanas,
construcciones.

### Global Modifiers

- **Caudal:** arroyo, bajo, medio, alto, crecida.
- **Velocidad:** lento, moderado, rápido, torrencial.
- **Relieve:** plano, ondulado, rocoso, escalonado — cuánta interacción
  tiene el agua con el terreno.
- **Espacialización:** muy cerca, desde la orilla opuesta, a la distancia,
  desde un puente, desde una elevación.
- **Variación temporal:** pequeñas variaciones en velocidad, turbulencia,
  intensidad, remolinos — ya cubierto por `flujo-turbulento`.

---

## 4. Océano (`ocean`)

### Source (ya implementado)

Movimiento continuo del agua y eventos de la interacción de las olas con la
costa (`ocean.ts`, modelo `oleaje` + rompiente vía `impacto-gota`):

- **Sea Bed:** ruido continuo del agua en movimiento.
- **Waves:** ciclos de aproximación y retirada.
- **Breakers:** rompimiento de las olas.
- **Foam:** espuma y burbujeo.
- **Water Movement:** corrientes y desplazamientos entre olas.

Parámetros: estado del mar, altura de las olas, frecuencia de oleaje,
tamaño del rompimiento, variación temporal, espacialización.

### Environment (no implementado)

Candidatos: playa de arena, playa de piedras, acantilado, muelle, puerto,
manglar, costa rocosa, interior de una cueva marina, barco.

Cada entorno modificaría: tipo de rompimiento, reflexiones, reverberación,
resonancias, materiales (arena, roca, madera, concreto).

### Occlusion (no implementado)

Candidatos: dunas, rocas, vegetación, ventana, embarcación, acantilado.

### Global Modifiers

- **Estado del mar:** calmo, marejadilla, oleaje moderado, mar agitado,
  tormenta.
- **Marea:** distancia al rompimiento, intensidad de las olas, objetos
  alcanzados por el agua.
- **Dirección del oleaje:** desde dónde llegan las olas respecto al
  oyente.
- **Ritmo:** variaciones de altura, duración, intensidad e intervalo entre
  olas — ya cubierto por `oleaje` (`periodJitter`).
- **Espacialización:** rompiente cerca, a media distancia, o lejos.

### Interacciones con otros ambientes (ninguna implementada hoy)

- **Viento → Océano:** altura de las olas, cantidad de espuma, rugosidad de
  la superficie, frecuencia de rompimientos.
- **Océano → Viento:** ruido continuo de fondo, sensación de aire húmedo,
  reflexiones abiertas características de la costa.
- **Lluvia → Océano:** impactos sobre la superficie, incremento del ruido
  de fondo, difuminado del sonido de las olas.
- **Océano → Lluvia:** prácticamente ninguna, salvo el contexto acústico.

---

## 5. Fuego (`fuego` / fogatas — planeado, sin `Source` implementado)

Único de los cinco no implementado en absoluto todavía; su modelo físico
(`combustion`) ya está documentado en `docs/synthesis-reference.md` pero
solo con dos componentes (rumor grave + chasquidos). Este documento propone
una descomposición más rica para cuando se implemente.

### Source (propuesto, más granular que `combustion` hoy documentado)

- **Flame:** ruido continuo de la llama.
- **Crackles:** pequeñas crepitaciones aleatorias.
- **Pops:** chasquidos ocasionales por gases o humedad atrapados.
- **Embers:** brasas y pequeños desprendimientos.
- **Combustion:** respiración natural del fuego (aumentos y disminuciones
  suaves).

> **Nota de reconciliación:** al implementar `fogatas`, decidir si esta
> descomposición de cinco componentes reemplaza o extiende el modelo
> `combustion` de dos componentes ya documentado, antes de declarar el
> `Source` en `domain/`.

Parámetros: intensidad, tamaño de la llama, tipo de combustible, humedad
del combustible, variación temporal, espacialización.

### Environment

Candidatos: chimenea, fogata, estufa de leña, bosque, antorcha, horno,
incendio estructural, incendio forestal.

**La chimenea es un `Environment`, el fuego es el `Source`**: no hace falta
un ambiente distinto para cada caso — se reutiliza el mismo generador de
fuego en una fogata, una estufa de leña o un incendio forestal, cambiando
solo el entorno y sus modificadores.

### Occlusion

Candidatos: puerta, vidrio protector, pared, rocas, vegetación, muebles.

### Global Modifiers

- **Intensidad:** brasa, fuego pequeño, fogata, chimenea activa, gran
  incendio.
- **Combustible:** leña seca, leña húmeda, carbón, ramas, paja, papel —
  modifica frecuencia y tipo de crepitaciones.
- **Oxigenación:** poco oxígeno, combustión estable, llama muy viva.
- **Variación temporal:** la llama crece, disminuye, cambia de dirección,
  produce chasquidos impredecibles.
- **Espacialización:** frente al fuego, a un lado, muy cerca, en otra
  habitación, al aire libre.

### Interacciones con otros ambientes

- **Viento → Fuego:** intensidad de la llama, dirección de la combustión,
  frecuencia de crepitaciones, variación del ruido continuo.
- **Lluvia → Fuego:** reduce la intensidad, aumenta chasquidos por
  evaporación, apaga progresivamente la combustión.
- **Fuego → Entorno:** ambiente cálido, resonancias locales, sonido
  continuo que domina espacios cerrados.

---

## Interacciones cruzadas ya identificadas (ninguna implementada)

Ningún ambiente depende de otro para sonar, pero pueden influenciarse vía
**modificadores de interacción** sin perder su identidad:

- **Viento → Lluvia:** dirección aparente de las gotas, velocidad de
  desplazamiento, distribución espacial, densidad percibida, variación de
  intensidad, sonido de impacto sobre superficies (`↓↓↓↓` sin viento →
  `↘↘↘↘` con viento).
- **Lluvia → Viento:** reduce sonidos de hojas secas, cambia la respuesta
  del suelo, aumenta el ruido de fondo, hace que las ráfagas sean menos
  perceptibles.
- **Viento → Río:** ondulación de la superficie, movimiento de vegetación,
  sensación espacial del flujo.
- **Lluvia → Río:** impactos sobre la superficie, incremento gradual del
  caudal, mayor turbulencia, más ruido de fondo.
- **Río → Entorno:** humedad ambiental, reflexiones acústicas cercanas,
  sonido continuo que enmascara otros ambientes débiles.
- Ver también las interacciones de océano y fuego en sus secciones.

## Modificadores compartidos entre ambientes

- **Tiempo atmosférico (`Weather`):** humedad, presión, temperatura —
  modificaría simultáneamente lluvia, viento, agua y vegetación.
- **Hora del día:** modifica aves, insectos, actividad humana — no afecta
  directamente a la lluvia.
- **Entorno compartido:** el mismo bosque afecta tanto a la lluvia como al
  viento (la lluvia golpea las hojas, el viento las mueve), pero las hojas
  pertenecen al `Environment`, no a ninguno de los dos fenómenos — un
  entorno es un módulo compartido entre `Source`s, no una propiedad de uno
  solo.

## Filosofía del sistema

Cada ambiente procedural debería cumplir tres principios:

1. **Autonomía:** puede generarse y sonar correctamente por sí solo
   (`Source → Output`, ya cumplido por los cuatro ambientes implementados).
2. **Composición:** puede coexistir con cualquier otro ambiente sin
   depender de él (`Rain + Wind → Output`, ya soportado por el motor de
   mezcla — `add`/`remove` en `command-console`).
3. **Interacción:** expone parámetros que otros ambientes pueden modificar
   de forma controlada, sin perder su comportamiento base (no implementado
   — ver sección anterior).

No existen sonidos específicos como "lluvia con viento en un bosque"; en su
lugar existen módulos independientes (`Rain`, `Wind`, `Forest`, `Cabin`,
etc.) que el motor combina dinámicamente mediante modificadores
compartidos e interacciones. Esto facilita la escalabilidad y evita
diseñar manualmente cada combinación posible.

---

## Brecha con el estado actual del código

| Capa                     | Estado                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `Source`                 | Implementado para `rain`, `wind`, `river`, `ocean` (+ ruidos de color, que no tienen `Environment`).   |
| `Environment`            | No existe en `domain/`. `AmbientDeclaration` no tiene ningún campo para esto.                         |
| `Occlusion`              | No existe en `domain/`.                                                                                |
| `Global Modifiers`       | Parcialmente cubierto por la modulación propia de cada `Source` (p. ej. intensidad de `rain`); no hay un modificador compartido entre ambientes distintos (p. ej. un "viento" global que afecte a `rain` y a `ocean` a la vez). |
| Interacciones cruzadas   | No implementadas. Hoy cada `Source` es independiente y no puede leer parámetros de otro ambiente activo. |
| `fuego`                  | Ni `Source` ni el resto — es un ambiente "planeado", no iniciado.                                      |

Esto no es una carencia accidental: el `readme.md` reconoce explícitamente
que "tormentas, bosques, fogatas, urbano, cafeterías, bibliotecas" quedaron
**fuera de alcance** de `procedural-audio-foundation` (ver proposal.md,
sección homónima) y se documentan en
`docs/ambient-catalog-roadmap.md` como planeados o pendientes de
investigar. Este handoff es el punto de partida para investigar esos
ambientes con una arquitectura común en lugar de uno por uno.

## Relectura de la hoja de ruta a la luz de este modelo

`docs/ambient-catalog-roadmap.md` marca **bosques**, **ambientes urbanos**,
**cafeterías** y **bibliotecas** como "pendiente de investigar" porque no
tienen un `Source` propio claro. Este documento sugiere una relectura: al
menos **bosques** podría no necesitar un `Source` nuevo en absoluto, sino
ser un `Environment` que ya aplicaría a `rain` y `wind` (hojas, ramas,
reverberación) — reduciría el trabajo de investigación pendiente a
encontrar el `Source` propio que sí falte (fauna, crujidos) en vez de
inventar un fenómeno completo. Ciudad, cafetería y biblioteca combinan en
cambio `Source`s genuinamente nuevos (voces, vajilla, maquinaria, tráfico)
con un `Environment` — esos sí necesitan investigación de síntesis nueva
antes de declarar nada.

**Tormentas** y **fogatas**, en cambio, ya tienen su `Source` documentado
(`descarga-electrica`, `combustion`) y encajarían directamente en este
modelo sin decisión de arquitectura pendiente — son los candidatos más
baratos para validar `Environment`/`Occlusion` de punta a punta.

---

## Preguntas abiertas antes de proponer un change

1. **¿`Environment` y `Occlusion` son capas nuevas de `AmbientDeclaration`,
   o un concepto ortogonal** (aplicable a cualquier `Source` activo, no
   declarado dentro del ambiente)? Afecta si un usuario podría hacer algo
   como `add rain` + `set environment forest` de forma independiente, o si
   cada combinación (`rain-forest`, `rain-cabin`...) es un ambiente
   distinto en el catálogo. La filosofía de este documento ("no existen
   sonidos específicos como lluvia-con-viento-en-un-bosque") apunta a la
   primera opción, pero la consola (`command-console`) no tiene hoy
   gramática para eso.
2. **¿Cómo se sintetiza un `Environment`?** ¿Es una capa de reverberación
   convolucional (impulse response por entorno), un banco de filtros, o
   capas de `Source` adicionales (hojas, tráfico) que el motor mezcla
   condicionadas al entorno activo? Necesita su propia entrada en
   `docs/synthesis-reference.md` con parámetros en unidades físicas, igual
   que cualquier otro modelo — este documento no las tiene todavía.
3. **¿Las interacciones cruzadas (viento→lluvia, lluvia→fuego...) rompen la
   independencia de capas** que exige `procedural-ambiences` ("Manipulación
   de una capa individual de un ambiente")? Hay que decidir si un ambiente
   puede leer el estado de otro sin acoplar su implementación.
4. **Prioridad de implementación**: ¿se empieza por `Environment`/
   `Occlusion` (aplicable ya a los cuatro ambientes existentes) o por
   completar `Source`s nuevos del roadmap (tormentas, fogatas) con el
   modelo actual de una sola capa, dejando `Environment`/`Occlusion` para
   después? Son dos changes distintos con distinto riesgo.
5. **Presupuesto de cómputo**: `docs/synthesis-reference.md` fija un máximo
   de 8 capas simultáneas por criterio de producto. Si `Environment` y
   `Occlusion` se implementan como capas adicionales por ambiente, revisar
   si ese límite sigue siendo el adecuado.

## Cómo avanzar

1. Resolver las preguntas abiertas de arriba con el propietario del
   proyecto — son decisiones de arquitectura, no de investigación de
   síntesis.
2. Usar `openspec-propose` para convertir la decisión resultante en un
   change formal, siguiendo el procedimiento de `readme.md` ("Cómo añadir
   un ambiente nuevo") para cualquier `Source` nuevo (fuego, tormentas) y
   uno nuevo para la capa `Environment`/`Occlusion` si se decide
   construirla.
3. Si se decide construir `Environment`/`Occlusion`, investigar y
   documentar su modelo en `docs/synthesis-reference.md` antes de tocar
   `domain/`, con la misma disciplina de parámetros en unidades físicas y
   criterios de aceptación medibles que ya exige ese documento para
   cualquier modelo.

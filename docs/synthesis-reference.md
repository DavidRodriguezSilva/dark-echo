# Referencia de síntesis

Este documento es el método por el que dark-echo decide cómo sintetizar un
fenómeno sonoro y cómo se juzga si el resultado es convincente. Sustituye el
ajuste por tanteo del prototipo original —coeficientes como `0.65`, `0.35` o
`lfo(time, 0.35, 0.25, 0.55)` que nadie podía justificar ni extender— por
modelos documentados, con parámetros en unidades físicas, fuentes y
criterios de aceptación medibles.

Cada capa que declare un ambiente en `domain/` referencia un modelo de este
documento por su identificador (p. ej. `impacto-gota`, `flujo-turbulento`).
Una capa sin esa referencia no se acepta (ver capacidad `synthesis-reference`,
requisito de trazabilidad).

Regla general, sin excepciones: todo parámetro se declara en su unidad física
—hercios, segundos, metros, decibelios, eventos por segundo— con un rango
admitido y el motivo de ese rango. Los coeficientes concretos que necesite la
implementación (coeficientes de filtro, incrementos por muestra) se derivan
en tiempo de ejecución a partir de estos parámetros y de la frecuencia de
muestreo real del contexto de audio; el documento nunca fija un coeficiente
directamente, porque eso es precisamente el tanteo que se quiere evitar.

## Índice de modelos

| Id                   | Fenómeno                 | Usado por (esta entrega)                                                         |
| -------------------- | ------------------------ | -------------------------------------------------------------------------------- |
| `impacto-gota`       | Impactos y gotas         | `rain` (goteo, granulación), `river` (burbujeo)                                  |
| `flujo-turbulento`   | Flujo turbulento de agua | `river`                                                                          |
| `rafaga-aire`        | Ráfagas de aire          | `wind`                                                                           |
| `oleaje`             | Oleaje                   | `ocean`                                                                          |
| `combustion`         | Combustión               | _(sin ambiente en esta entrega; documentado para `campfires`, fuera de alcance)_ |
| `descarga-electrica` | Descargas eléctricas     | _(sin ambiente en esta entrega; documentado para tormentas, fuera de alcance)_   |

`combustion` y `descarga-electrica` se documentan ahora porque la capacidad
`synthesis-reference` exige cobertura mínima de seis clases de fenómeno antes
de que el primero de sus ambientes (tormentas, fogatas) entre al catálogo —no
porque este change los implemente.

---

## `impacto-gota` — Impactos y gotas

### Modelo

Una gota que golpea una superficie líquida produce dos sonidos distintos y
sucesivos, no uno:

1. **El impacto**: un transitorio de banda ancha y duración muy corta, producido
   por la deformación inicial de la superficie. Se modela como un pulso de
   ruido pasado por un filtro pasa-banda de Q moderado, con una envolvente de
   ataque casi instantáneo y decaimiento exponencial corto.
2. **La burbuja arrastrada**: una fracción de los impactos atrapa una burbuja
   de aire bajo la superficie. Esa burbuja oscila radialmente y es, con
   diferencia, la componente tonal dominante del sonido de una gota —el
   "plic" reconocible no lo produce el impacto, lo produce la burbuja—. Su
   frecuencia de resonancia sigue la **resonancia de Minnaert**:

   ```text
   f₀ ≈ (1 / 2πr) · √(3γP₀ / ρ)
   ```

   con `r` el radio de la burbuja en metros, `P₀` la presión ambiente, `γ` el
   índice adiabático del aire (~1.4) y `ρ` la densidad del líquido. Para agua a
   presión atmosférica esto se reduce a la forma práctica `f₀ ≈ 3.26 / r`
   (con `r` en metros y `f₀` en Hz). La oscilación decae exponencialmente y su
   frecuencia sube ligeramente durante el decaimiento a medida que la burbuja
   se estabiliza —un pequeño _chirp_ ascendente, no un tono puro—.

No toda gota arrastra burbuja: la probabilidad depende de la velocidad de
impacto y es mayor para gotas de tamaño medio que para las muy pequeñas o muy
grandes. El modelo no reproduce esa dependencia con exactitud —sería exceso
de fidelidad para el presupuesto— pero sí reproduce su consecuencia audible:
una fracción de impactos sin tono asociado.

### Parámetros

| Parámetro                             | Símbolo | Unidad | Rango           | Justificación                                                                                                                                                                               |
| ------------------------------------- | ------- | ------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Radio de burbuja                      | `r`     | m      | 0.0004 – 0.0025 | Rango de burbujas arrastradas por gotas de lluvia observado en la literatura de acústica de burbujas; produce, vía Minnaert, tonos de ~1.3 kHz a ~8 kHz, el registro reconocible del goteo. |
| Duración del decaimiento de burbuja   | `τ_b`   | s      | 0.004 – 0.02    | Las burbujas pequeñas de este rango se amortiguan en pocos ciclos; por debajo suena a clic sin tono, por encima suena a campana, ajeno al fenómeno.                                         |
| Deriva de tono durante el decaimiento | `Δf/f₀` | %      | 2 – 8           | Chirp ascendente audible pero sutil; documentado en grabaciones de gotas individuales, evita el tono "demasiado puro" de una sinusoide con envolvente simple.                               |
| Duración del transitorio de impacto   | `τ_i`   | s      | 0.001 – 0.004   | Más corto que la burbuja: el impacto es percusivo, no tonal.                                                                                                                                |
| Centro de banda del impacto           | `f_i`   | Hz     | 1500 – 6000     | Banda ancha centrada por encima del registro de la burbuja, para que ambas componentes se perciban como capas distintas de un mismo evento.                                                 |
| Probabilidad de burbuja por impacto   | `p_b`   | —      | 0.5 – 0.85      | Fracción de gotas que suenan con tono además de impacto; por debajo el goteo suena a percusión pura, por encima pierde la variedad de un goteo real.                                        |

### Fuente y fundamento

Minnaert, M. (1933), _On musical air-bubbles and the sounds of running
water_. La resonancia de burbuja arrastrada como origen del sonido de la
lluvia está descrita en la literatura de acústica submarina de precipitación
(bubble-mediated rain noise); el mecanismo de arrastre de burbuja por impacto
de gota es un resultado establecido de esa literatura.

### Alternativas consideradas

- **Solo ruido de impacto, sin componente de burbuja.** Es lo que hace el
  prototipo actual (`fineDrops = whiteNoise() * 0.08`): un pulso de ruido sin
  tono. Se descarta porque es precisamente la ausencia de esta componente lo
  que hace que el goteo actual suene a estática y no a gotas.
- **Sinusoide pura con envolvente ADSR, sin deriva de tono ni distribución de
  radios.** Más barata, pero un banco de gotas con la misma frecuencia exacta
  sigue sonando artificial —a xilófono, no a lluvia—. La distribución de
  radios y la deriva de tono son las que dan variedad perceptible entre gotas.
- **Modelo físico completo de la dinámica de arrastre (radio de burbuja en
  función de la velocidad y el ángulo de impacto).** Más fiel, pero exige
  parámetros que no son observables ni controlables en este producto (no hay
  simulación de la superficie de impacto). Se sustituye por muestreo aleatorio
  del radio dentro del rango declarado, que reproduce la variedad audible sin
  modelar la causa física de cada valor concreto.

---

## `flujo-turbulento` — Flujo turbulento de agua

### Modelo

El ruido de un flujo turbulento —un río, no una gota individual— se modela
como ruido de banda media filtrado, cuya energía se concentra donde el
oído es más sensible a la textura de "agua en movimiento" y varía con
lentitud, sin discontinuidades. A diferencia de la lluvia, no hay eventos
discretos dominantes: el carácter es continuo y de grano fino, resultado de
la superposición de innumerables microturbulencias que ningún modelo
discreto reproduciría mejor que el ruido filtrado en banda.

Sobre ese cuerpo continuo se superponen, a densidad moderada, voces del
modelo `impacto-gota` con radios mayores —el burbujeo del propio flujo
contra piedras y orillas—, más audible cuanto más próxima está la cámara
imaginaria del oyente a una zona de correntada.

### Parámetros

| Parámetro                      | Símbolo | Unidad    | Rango         | Justificación                                                                                                                                     |
| ------------------------------ | ------- | --------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frecuencia de corte inferior   | `f_lo`  | Hz        | 150 – 400     | Por debajo se percibe como rumor de motor, ajeno al agua.                                                                                         |
| Frecuencia de corte superior   | `f_hi`  | Hz        | 2500 – 5000   | Por encima el flujo suena a siseo de aire, no de agua.                                                                                            |
| Pendiente del filtro           | —       | dB/oct    | 6 – 12        | Un corte suave (6) da un flujo más "grave y ancho"; uno más pronunciado (12), un flujo más definido, típico de corrientes rápidas de poco caudal. |
| Periodo de variación de caudal | `T_v`   | s         | 8 – 40        | Variación perceptible de intensidad sin llegar a sonar como una ráfaga de viento (esas operan en el rango de `rafaga-aire`, más lento aún).       |
| Densidad de burbujeo           | `λ_b`   | eventos/s | 2 – 8         | Rango bajo: burbujeo audible como textura, no como goteo individual discernible (eso sería lluvia, no río).                                       |
| Radio de burbuja del flujo     | `r`     | m         | 0.002 – 0.006 | Mayor que el de `impacto-gota` en lluvia: burbujas de corriente, tono más grave (~550 Hz a ~1.6 kHz vía Minnaert).                                |

### Fuente y fundamento

Extensión directa de `impacto-gota` (Minnaert) para el burbujeo, más el
tratamiento estándar de ruido de banda para flujo turbulento continuo, que
sigue el mismo principio de las técnicas de síntesis basada en texturas de
sonido de fluidos (van den Doel, K., _Physically-based models for liquid
sounds_, ACM TAP 2005): el flujo continuo se modela como textura filtrada, y
los eventos discretos superpuestos (burbujas, salpicaduras) aportan el detalle
que la textura sola no puede dar.

### Alternativas consideradas

- **Ruido de banda estrecha sin burbujeo superpuesto**, que es el estado
  actual (`river.ts`: `lowFlow + midMemory·0.25 + sparkle`, sin componente
  tonal). Suena a "siseo de agua" plano; se conserva el carácter general pero
  se añade el burbujeo para dar la textura granular reconocible de una
  corriente.
- **Simulación de campo de turbulencia (Navier–Stokes simplificado) mapeada a
  audio.** Da el resultado más fiel posible, pero su coste de cómputo es
  incompatible con el presupuesto de este producto (ver _Presupuesto de
  coste_, más abajo) y no existe precedente de hacerlo en tiempo real para
  audio ambiental. Descartado sin reconsideración prevista.

---

## `rafaga-aire` — Ráfagas de aire

### Modelo

El viento no es un LFO sinusoidal —el defecto reconocible del prototipo
actual (`lfo(time, 0.18, 0.15, 0.85)`)—, porque una sinusoide vuelve a su
mismo estado en cada ciclo y una ráfaga real no tiene periodo. El modelo es
ruido marrón o rosa llevado a un filtro pasa-bajos cuya frecuencia de corte
seguida un **paseo aleatorio filtrado** (no un ciclo), de modo que la
intensidad y el brillo del viento derivan de forma impredecible y nunca
repiten un patrón. Opcionalmente, un filtro pasa-banda resonante de Q alto y
ganancia baja aporta el silbido característico de una ráfaga fuerte contra
un obstáculo, activado solo por encima de un umbral de intensidad.

### Parámetros

| Parámetro                            | Símbolo | Unidad | Rango                                                | Justificación                                                                                                                                        |
| ------------------------------------ | ------- | ------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frecuencia de corte, mínimo          | `f_min` | Hz     | 150 – 300                                            | Viento en calma: cuerpo grave, sin brillo.                                                                                                           |
| Frecuencia de corte, máximo          | `f_max` | Hz     | 1500 – 3000                                          | Ráfaga fuerte: más brillante, sin llegar a silbido de aire comprimido.                                                                               |
| Velocidad del paseo aleatorio        | `σ_f`   | Hz/s   | 40 – 200                                             | Controla qué tan rápido cambia el "carácter" del viento; por debajo suena estático, por encima nervioso e irreal.                                    |
| Periodo típico entre ráfagas fuertes | `T_g`   | s      | 15 – 90                                              | Frecuencia con la que el paseo aleatorio visita la zona alta de su rango; impredecible por construcción, este es solo el orden de magnitud esperado. |
| Frecuencia del silbido resonante     | `f_s`   | Hz     | 800 – 2500                                           | Registro típico de silbido de viento contra un borde o resquicio.                                                                                    |
| Umbral de activación del silbido     | `θ_s`   | —      | 0.6 – 0.8 (normalizado sobre el rango de intensidad) | Solo las ráfagas más fuertes silban; por debajo suena a viento continuo sin ese rasgo.                                                               |

### Fuente y fundamento

El uso de un paseo aleatorio filtrado en lugar de un oscilador periódico para
modular parámetros de ruido ambiental sigue el principio general de síntesis
de audio ambiental basada en texturas de Dobashi, Y. et al. (2003),
_Real-time rendering of aerodynamic sound using sound textures_, SIGGRAPH:
el sonido de aire en movimiento se sintetiza variando parámetros de una
textura de ruido con una señal de control de baja frecuencia no periódica,
en vez de con un LFO.

### Alternativas consideradas

- **LFO sinusoidal único** (estado actual). Es exactamente el defecto que
  motiva este change: un ciclo perceptible tras escuchar unos minutos.
  Descartado.
- **Suma de varios LFO de periodos inconmensurables, sin paseo aleatorio**
  (D5 del `design.md`, usado como modulador general de otros parámetros). Es
  una mejora sobre un LFO único, pero para el viento en concreto un paseo
  aleatorio es más fiel al carácter genuinamente impredecible de una ráfaga;
  se reserva la suma de periodos inconmensurables para parámetros donde de
  verdad hay una cadencia de fondo (p. ej. la respiración del oleaje).

---

## `oleaje` — Oleaje

### Modelo

Una ola no es simétrica: crece con relativa rapidez y se retira más
despacio, y ese contraste —no la frecuencia de la oscilación— es lo que hace
reconocible el oleaje frente a un LFO genérico. El modelo es ruido marrón
pasa-bajos modulado por una **envolvente asimétrica** (ascenso más rápido que
la caída) en lugar de una sinusoide, con un estallido de ruido de banda
ancha añadido cerca del pico de cada ciclo para la rompiente —la espuma que
se forma cuando la cresta rompe—.

### Parámetros

| Parámetro                           | Símbolo | Unidad | Rango       | Justificación                                                                                                                         |
| ----------------------------------- | ------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Periodo de ola                      | `T_w`   | s      | 4 – 12      | Rango habitual de oleaje costero moderado; por debajo se acerca a ondulación de estanque, por encima a marejada de fondo.             |
| Relación ascenso/caída              | `k_a`   | —      | 0.3 – 0.45  | Fracción del periodo que ocupa el ascenso; valores por debajo de 0.5 dan la asimetría "crece rápido, se retira despacio" reconocible. |
| Frecuencia de corte del cuerpo      | `f_c`   | Hz     | 100 – 500   | Cuerpo grave de la ola, coherente con `oleaje` como masa de agua, no espuma.                                                          |
| Duración del estallido de rompiente | `τ_r`   | s      | 0.3 – 1.2   | Más largo que un impacto de gota: la rompiente es un evento extendido, no percusivo.                                                  |
| Centro de banda del estallido       | `f_r`   | Hz     | 1000 – 4000 | Banda de la espuma, más aguda que el cuerpo de la ola.                                                                                |
| Probabilidad de rompiente por ciclo | `p_r`   | —      | 0.4 – 0.9   | No todas las olas rompen de forma audible; por debajo el oleaje suena apagado, por encima constante y artificial.                     |

### Fuente y fundamento

La asimetría ascenso/caída como rasgo distintivo del oleaje —frente a un
oscilador simétrico— es una observación directa de la forma de onda de
presión sonora de oleaje costero grabado; el estallido de banda ancha en el
pico corresponde al ruido de burbujeo de espuma en la rotura de la cresta,
consistente con la literatura de ruido ambiental oceánico de origen de
burbujas de superficie (Longuet-Higgins, M. S. (1990), _Bubble noise
spectra_, JASA) —el mismo mecanismo de burbuja que en `impacto-gota`,
aplicado aquí en agregado y no como voces individuales—.

### Alternativas consideradas

- **LFO sinusoidal simétrico** (estado actual: `lfo(time, 0.12, 0.15, 0.9)`).
  Descartado por la misma razón que en `rafaga-aire`: un ciclo simétrico es
  audible como ciclo incluso a periodos largos, y además no reproduce la
  asimetría ascenso/caída que distingue una ola de una oscilación genérica.
- **Estallido de rompiente en cada ciclo sin excepción.** Más simple de
  implementar, pero un oleaje que rompe siempre sale mecánico; `p_r` < 1
  introduce la irregularidad que distingue una serie de olas real de un
  metrónomo con espuma.

---

## `combustion` — Combustión

_(Documentado para cobertura mínima de la referencia; sin ambiente que lo use
en esta entrega — ver `fogatas`, fuera de alcance.)_

### Modelo

Un fuego produce un rumor grave continuo —la combustión del combustible
sólido y la convección del aire caliente— más chasquidos esporádicos de
banda ancha y ataque muy corto, producidos por la liberación repentina de
vapor de agua o resina atrapados en la madera. El rumor se modela como ruido
marrón muy filtrado en agudos; los chasquidos, como un proceso de Poisson de
pulsos cortos y brillantes superpuestos al rumor.

### Parámetros

| Parámetro                     | Símbolo | Unidad    | Rango         | Justificación                                                                 |
| ----------------------------- | ------- | --------- | ------------- | ----------------------------------------------------------------------------- |
| Frecuencia de corte del rumor | `f_c`   | Hz        | 80 – 250      | Registro grave y continuo, sin componente tonal.                              |
| Densidad de chasquidos        | `λ_c`   | eventos/s | 0.5 – 4       | Un fuego pequeño chasquea con poca frecuencia; uno grande, más seguido.       |
| Duración de un chasquido      | `τ_c`   | s         | 0.002 – 0.008 | Percusivo y muy corto, más breve incluso que el impacto de una gota.          |
| Centro de banda del chasquido | `f_ch`  | Hz        | 2000 – 6000   | Registro agudo y brillante, contraste deliberado con el rumor grave de fondo. |

### Fuente y fundamento

Descomposición en dos componentes —rumor continuo de combustión más
chasquidos discretos de liberación de vapor— consistente con el
comportamiento acústico conocido del fuego de leña; el chasquido como
proceso de Poisson sigue el mismo tratamiento estocástico que los eventos
esporádicos de `procedural-ambiences` en general (ver capacidad
`procedural-ambiences`, "Eventos discretos esporádicos").

### Alternativas consideradas

- **Solo ruido filtrado, sin chasquidos.** Suena a viento grave, no a fuego:
  el chasquido es la seña de identidad audible de la combustión de madera.
  Descartado en cuanto se documentó el modelo.

---

## `descarga-electrica` — Descargas eléctricas

_(Documentado para cobertura mínima de la referencia; sin ambiente que lo use
en esta entrega — ver ambiente de tormentas, fuera de alcance.)_

### Modelo

Una descarga eléctrica audible (trueno) es una ráfaga de ruido filtrado con
ataque rápido y decaimiento largo y difuso, resultado de la superposición de
las reflexiones del sonido del rayo sobre el terreno y las nubes. No hay
componente tonal. En este producto, al no existir componente visual
(relámpago), no aplica ningún modelo de retardo luz-sonido: el evento es
puramente sonoro.

### Parámetros

| Parámetro                      | Símbolo | Unidad       | Rango    | Justificación                                                                                                                      |
| ------------------------------ | ------- | ------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Duración total del evento      | `τ_t`   | s            | 1.5 – 6  | Un trueno cercano es más corto y seco; uno lejano, más largo y difuso.                                                             |
| Frecuencia de corte inicial    | `f_0`   | Hz           | 40 – 120 | Componente grave dominante al inicio del evento.                                                                                   |
| Pendiente de oscurecimiento    | —       | Hz/s         | -30 – -5 | El espectro se oscurece (pierde agudos) a medida que el evento se extiende, coherente con reflexiones progresivamente más difusas. |
| Frecuencia del evento por hora | `λ_t`   | eventos/hora | 2 – 12   | Tormenta moderada; una tormenta más intensa usaría el extremo alto.                                                                |

### Fuente y fundamento

Caracterización acústica estándar del trueno como ruido de banda ancha con
decaimiento largo y oscurecimiento espectral progresivo, consecuencia de la
dispersión y absorción atmosférica de las frecuencias altas a lo largo de la
propagación del frente de onda del rayo.

### Alternativas consideradas

- **Modelo con retardo luz-sonido para sincronizar con un destello visual.**
  Fuera de alcance: no existe componente visual en la consola de dark-echo.
  Si en el futuro se añade una señal visual de tormenta, este modelo deberá
  revisarse para incorporar el retardo.

---

## Criterios de aceptación

### Criterios espectrales por ambiente (provisionales)

Los siguientes valores son el punto de partida declarado antes de implementar
el motor nuevo. La tarea 9.4 los calibra sobre el render real de `rain` y la
9.6/10.6 los consolida con los cuatro ambientes ya portados; hasta entonces
son un compromiso razonado, no una medición.

| Ambiente | Banda de energía dominante                        | Pendiente esperada       | Tolerancia                               |
| -------- | ------------------------------------------------- | ------------------------ | ---------------------------------------- |
| `rain`   | 800 Hz – 6 kHz (cuerpo + goteo)                   | Plana en la banda, ±3 dB | ±4 dB en banda, ±20% en límites de banda |
| `wind`   | 150 Hz – 3 kHz, variable                          | -6 dB/oct desde el corte | ±3 dB/oct                                |
| `river`  | 150 Hz – 5 kHz                                    | -9 dB/oct desde el corte | ±3 dB/oct                                |
| `ocean`  | 100 Hz – 4 kHz (cuerpo grave + estallidos agudos) | -12 dB/oct en el cuerpo  | ±4 dB/oct                                |

### Umbral de periodicidad (provisional)

Sobre la autocorrelación normalizada de la envolvente de energía (RMS en
ventanas de 50 ms) de un render de al menos 120 s: ningún pico fuera del
desplazamiento nulo SHALL superar **0.15** de correlación normalizada. Este
umbral se recalibra en la tarea 9.4 sobre el primer render real; el valor de
partida es deliberadamente conservador (más estricto que laxo), porque un
umbral demasiado laxo no detectaría la regresión que la referencia existe
para prevenir.

### Protocolo de validación perceptual

1. **Duración mínima de escucha**: 3 minutos continuos por ambiente, sin
   adelantar ni repetir tramos.
2. **Condiciones de reproducción**: una vez en altavoces estéreo de escritorio
   y una vez en el altavoz mono de un teléfono, para cubrir el caso de
   compatibilidad mono exigido por `audio-engine` y `procedural-ambiences`.
3. **Rasgos a evaluar**: (a) reconocibilidad inmediata del fenómeno sin
   contexto previo; (b) ausencia de un ciclo perceptible en los 3 minutos;
   (c) ausencia de artefactos (clics, zumbidos de alias, saturación); (d)
   sensación de evolución a lo largo de la escucha, no estatismo.
4. **Registro**: cada validación queda anotada en este documento (sección
   _Registro de validaciones_, más abajo) con fecha, ambiente, resultado por
   rasgo y cualquier defecto aceptado conscientemente.
5. **Comparación A/B**: cuando un ambiente sustituye a una versión anterior
   (caso de `wind`, `river`, `ocean` en la tarea 10.5), la validación incluye
   escuchar ambas versiones en sucesión y registrar si el carácter sonoro se
   conserva o mejora.

### Presupuesto de coste de cómputo

Declarado antes de medir (la tarea 9.6 mide sobre `rain` real y fija el valor
definitivo; el 10.6 lo consolida con los cuatro ambientes):

- **Ambiente individual más exigente**: el tiempo de cómputo de audio por
  bloque de 128 muestras SHALL mantenerse por debajo del **40%** del tiempo
  real disponible para ese bloque a la frecuencia de muestreo del contexto,
  dejando margen para el sistema operativo y la interfaz.
- **Mezcla simultánea**: el conjunto de todas las capas activas SHALL
  mantenerse por debajo del **75%** de ese mismo presupuesto por bloque, para
  no operar al límite y tolerar variabilidad del entorno.
- **Número máximo de capas**: se deriva de estas dos cifras dividiendo el
  presupuesto de mezcla entre el coste medido de la capa más cara del
  catálogo. Hasta que 9.6 mida ese coste real, el valor de partida es **8**
  capas simultáneas.

### Criterios de imagen estéreo

- **Colocación por capa**: cada capa declara una posición en el campo estéreo
  en el rango `[-1, 1]` (izquierda a derecha) y una anchura en `[0, 1]` (0 =
  puntual, 1 = todo el campo). Un ambiente multicapa MUST NOT declarar todas
  sus capas en la posición `0` con anchura `0`.
- **Decorrelación sin cancelación**: las capas continuas se decorrelan
  generando **flujos de ruido independientes** por canal —nunca invirtiendo o
  desfasando un mismo flujo—, porque el desfase cancela al sumarse a mono y
  una parte del uso previsto es un altavoz de teléfono, que es mono (ver
  `design.md` D16).
- **Distribución de eventos discretos**: cada disparo de un evento esporádico
  recibe una posición distinta dentro del campo estéreo declarado para su
  capa, para que el goteo o el chasquido no se perciban concentrados en un
  punto fijo.

---

## Registro de validaciones

_(Se completa a medida que cada ambiente se declara terminado — tareas 8.4 y
10.5. Vacío hasta entonces.)_

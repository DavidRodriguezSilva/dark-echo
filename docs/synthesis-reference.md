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
| `ruido-de-color`     | Ruido de color (1/f^α)   | `white-noise`, `pink-noise`, `brown-noise`                                       |
| `combustion`         | Combustión               | _(sin ambiente en esta entrega; documentado para `campfires`, fuera de alcance)_ |
| `descarga-electrica` | Descargas eléctricas     | _(sin ambiente en esta entrega; documentado para tormentas, fuera de alcance)_   |

Modelos del **motor de composición** (change `add-ambient-composition-engine`).
No describen un fenómeno que suene por sí mismo, sino cómo se transforma lo
que ya suena — por eso ninguno tiene un ambiente propio en la columna de uso:

| Id                     | Fenómeno                             | Usado por (esta entrega)                         |
| ---------------------- | ------------------------------------ | ------------------------------------------------ |
| `reverberacion-sabine` | Reverberación de un recinto          | `Environment`: `cabana`, `casa`, `campo-abierto` |
| `transmision-masa`     | Transmisión a través de una barrera  | `Occlusion`: `techo-madera`, `ventana-vidrio`    |
| `resonancia-placa`     | Resonancia propia de una placa       | Respuesta propia de las mismas `Occlusion`       |
| `atenuacion-distancia` | Atenuación y absorción por distancia | `Modifier`: `distancia`                          |

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

| Parámetro                             | Símbolo | Unidad | Rango           | Justificación                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | ------- | ------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Radio de burbuja                      | `r`     | m      | 0.0004 – 0.0025 | Rango de burbujas arrastradas por gotas de lluvia observado en la literatura de acústica de burbujas; produce, vía Minnaert, tonos de ~1.3 kHz a ~8 kHz, el registro reconocible del goteo.                                                                                                                                                                                                                                                                                                                                                       |
| Duración del decaimiento de burbuja   | `τ_b`   | s      | 0.004 – 0.02    | Las burbujas pequeñas de este rango se amortiguan en pocos ciclos; por debajo suena a clic sin tono, por encima suena a campana, ajeno al fenómeno.                                                                                                                                                                                                                                                                                                                                                                                               |
| Deriva de tono durante el decaimiento | `Δf/f₀` | %      | 2 – 8           | Chirp ascendente audible pero sutil; documentado en grabaciones de gotas individuales, evita el tono "demasiado puro" de una sinusoide con envolvente simple.                                                                                                                                                                                                                                                                                                                                                                                     |
| Duración del transitorio de impacto   | `τ_i`   | s      | 0.001 – 0.004   | Más corto que la burbuja: el impacto es percusivo, no tonal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Centro de banda del impacto           | `f_i`   | Hz     | 1500 – 6000     | Banda ancha centrada por encima del registro de la burbuja, para que ambas componentes se perciban como capas distintas de un mismo evento.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Probabilidad de burbuja por impacto   | `p_b`   | —      | 0.5 – 0.85      | Fracción de gotas que suenan con tono además de impacto; por debajo el goteo suena a percusión pura, por encima pierde la variedad de un goteo real.                                                                                                                                                                                                                                                                                                                                                                                              |
| Peso de burbuja en la mezcla final    | `w_b`   | —      | 0.15 – 0.5      | Reparto entre el transitorio de impacto y el tono de burbuja. El valor por defecto (0.5) es el reparto original, adecuado para gotas discernibles una a una (goteo, burbujeo de río y mar). A densidad muy alta y decaimiento muy corto —`rain.impactos`, 40 disparos/s— un peso de 0.5 hace que el tono senoidal ascendente domine y se perciba como un disparo o láser en vez de un impacto de lluvia; se bajó a 0.15 (0.25 en `goteo`, donde cada gota se oye por separado y admite algo más de tono) tras confirmarse el defecto por escucha. |

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

**Refinamiento del catálogo**: el ruido de banda media filtrado por sí solo
—sin ninguna energía por debajo de su frecuencia de corte inferior— se
percibía como aire en movimiento (viento), no como una masa de agua: le
faltaba el "cuerpo" grave que da sensación de volumen a una corriente. Se
añade una capa continua adicional de ruido marrón pasa-bajos (sin
modulación propia; la variación la sigue llevando el ruido de banda media)
para aportar ese grave constante, distinguiendo a `river` de `wind` en el
registro donde antes coincidían.

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
- **Solo el ruido de banda media, sin cuerpo grave ni ajuste de densidad de
  burbujeo.** Fue la implementación inicial de esta rebanada declarativa
  (design.md D6): sonaba a una mezcla de viento y océano, no a un río —sin
  ninguna capa por debajo de 150 Hz y con un burbujeo demasiado disperso
  (5 eventos/s) para leerse como textura continua. Corregido con la capa de
  cuerpo grave descrita arriba, subiendo la densidad de burbujeo al tope del
  rango declarado (8 eventos/s) y acortando el periodo de variación de
  caudal de `flujo` (20 s → 10 s, dentro del rango declarado de `T_v`) para
  una turbulencia más rápida que la de un oleaje oceánico.
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
- **Estallido de rompiente sin filtrar (ruido blanco de espectro completo).**
  Fue la implementación inicial de `ocean.rompiente`, a pesar de que la
  tabla de parámetros ya declaraba un centro de banda para el estallido
  (1000 - 4000 Hz): un desajuste entre el modelo documentado y el código.
  Un estallido de banda completa con ataque instantáneo y caída de hasta
  1.2 s es indistinguible de "cualquier ruido que se apaga" —una antorcha,
  el viento, estática— sin ninguna característica que lo ancle al agua.
  Corregido aplicando un filtro pasa-banda centrado en la banda ya
  declarada (refinamiento del catálogo), ahora que `domain/layer.ts`
  permite declarar un filtro opcional sobre una capa esporádica completa.

---

## `ruido-de-color` — Ruido de color

### Modelo

A diferencia del resto de esta referencia, aquí el fenómeno no es un sonido
del mundo físico con una fuente identificable, sino una familia de señales
estocásticas definidas por su **densidad espectral de potencia** (PSD):

```text
S(f) ∝ 1 / f^α
```

con `α` el exponente de color. `α = 0` es ruido blanco (energía igual por
Hz, PSD plana), `α = 1` es ruido rosa (energía igual por octava —cada
duplicación de frecuencia reparte la misma potencia—, `-3 dB/octava` en el
espectro de magnitud) y `α = 2` es ruido marrón o browniano (`-6 dB/octava`,
resultado de integrar ruido blanco, de ahí que también se le llame "ruido
rojo"). Los tres son ambientes de un único parámetro fijo —el color— sin
ningún otro grado de libertad: no hay filtro que dé forma a la banda, ni
modulación de intensidad ni de frecuencia. Esa ausencia deliberada de
variación es la definición del fenómeno, no una simplificación del modelo
como en el resto de esta referencia — un "ruido blanco que varía de
carácter" dejaría de ser ruido blanco.

`white` y `brown` ya existen como primitivas de `dsp/noise.ts` (usadas hoy
como fuente de otras capas, p. ej. el cuerpo de `wind` u `ocean`); este
modelo documenta formalmente su caracterización espectral y añade `pink`,
que no existía. Exponerlos como ambientes independientes de una sola capa es
la instancia de menor complejidad de todo el catálogo: son las únicas
generatrices de ruido que aparecen sin filtro ni voces superpuestas.

### Parámetros

| Parámetro                     | Símbolo | Unidad | Rango                              | Justificación                                                                                                        |
| ----------------------------- | ------- | ------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Exponente espectral           | `α`     | —      | {0, 1, 2}                          | Discreto por definición: cada valor es un color con nombre e identidad acústica propia, no un continuo a interpolar. |
| Pendiente esperada resultante | —       | dB/oct | 0 (blanco), −3 (rosa), −6 (marrón) | Consecuencia directa de `α`; es lo que verifica el criterio de aceptación, no un parámetro libre.                    |

### Fuente y fundamento

Caracterización estándar de ruido `1/f^α` (Voss, R. F. y Clarke, J. (1975),
_"1/f noise" in music and speech_, Nature) y su generación práctica mediante
el filtro económico de 3 polos de Paul Kellet ("economy pink noise filter",
técnica de dominio público ampliamente documentada en la literatura de
síntesis de audio) aplicado sobre ruido blanco — una aproximación IIR barata
a la densidad espectral `1/f`, sin necesidad de sumar bancos de osciladores
ni de procesar en el dominio de la frecuencia.

### Alternativas consideradas

- **Síntesis por conformado espectral en el dominio de la frecuencia (FFT
  inversa de una máscara `1/f^α`).** Exacta, pero exige procesar en bloques
  con latencia y no encaja con el modelo de generación muestra a muestra del
  resto del núcleo de audio (`AudioWorkletProcessor`, sin buffers de
  antelación). Descartada por coste y por romper la arquitectura de
  generación en tiempo real ya establecida.
- **Suma de octavas de Voss–McCartney** (varias fuentes de ruido blanco a
  distintas tasas de refresco, sumadas). Más precisa a baja frecuencia que
  el filtro de Kellet, pero añade estado y ramas condicionales por octava;
  para el uso de este producto —un ambiente de fondo, no una herramienta de
  medición— la aproximación de 3 polos ya cumple el criterio de aceptación
  declarado más abajo con una fracción del coste. Se reconsiderará si algún
  ambiente futuro necesita fidelidad espectral más allá de la banda audible
  típica.
- **Ruido marrón como integral simple de ruido blanco sin más forma**
  (`BrownNoise` ya existente en `dsp/noise.ts`, reutilizada sin cambios).
  Suficiente: un solo polo ya da la pendiente `-6 dB/oct` esperada de
  `α = 2`, no hace falta el filtro de 3 polos para ese color.

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

## `reverberacion-sabine` — Reverberación de un recinto

_(Modelo del motor de composición. Un `Environment` no genera sonido: colorea
lo que suena a través de él.)_

### Modelo

Un recinto devuelve una cola reverberante cuya duración depende de cuánta
energía absorben sus superficies frente a cuánto volumen encierra. La
**fórmula de Sabine** lo expresa directamente:

```text
RT60 = 0.161 · V / A,    con A = Σ (S_i · α_i)
```

`V` es el volumen en m³, `A` la absorción equivalente en m² sabin, y `α` el
coeficiente de absorción del material —adimensional, entre 0 y 1—, tabulado
por banda de octava en cualquier manual de acústica arquitectónica. La
constante 0.161 s/m sale de `24·ln(10)/c` con `c ≈ 343 m/s`.

La respuesta al impulso **se sintetiza, no se graba**. Esto no es una
preferencia estilística: el producto no reproduce audio pregrabado en ningún
punto (`procedural-ambiences`), y un reverb por convolución con una respuesta
medida en una sala real lo violaría. En su lugar se genera ruido blanco
sembrado, se separa en tres bandas con filtros de un polo y cada banda se
multiplica por su propia envolvente `exp(-6.9078·t/RT60_banda)` —el
decaimiento que cae exactamente 60 dB en RT60 segundos, porque `ln(10³) =
6.9078`—. El resultado conserva lo que hace convincente a un reverb (cola
densa, sin patrón) sin introducir ninguna grabación.

Se generan dos canales con **flujos de ruido independientes**, nunca
desfasando o invirtiendo el mismo flujo: el desfase se cancela al sumar a
mono, y una parte del uso previsto es el altavoz mono de un teléfono (ver
"Criterios de imagen estéreo"). La respuesta se normaliza a energía unitaria
para que un entorno más reverberante no suene además más fuerte —serían dos
efectos distintos mezclados en un solo parámetro—.

### Parámetros

| Parámetro                      | Símbolo | Unidad | Rango      | Justificación                                                                                                                                                      |
| ------------------------------ | ------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Volumen del recinto            | `V`     | m³     | 0 – 500    | De una cabaña pequeña a una nave; `0` declara un espacio sin recinto (intemperie), donde Sabine no asigna cola.                                                    |
| Superficie interior expuesta   | `S`     | m²     | 0 – 600    | Coherente con `V` para geometrías habitables reales; se declara aparte porque dos recintos del mismo volumen con distinta forma absorben distinto.                 |
| Coeficiente de absorción       | `α`     | —      | 0.02 – 0.9 | Valores tabulados por material y banda. Por debajo de 0.02 no existe material real; por encima de 0.9 se entra en cámara anecoica, ajeno al catálogo.              |
| Fracción de campo reverberante | —       | —      | 0 – 0.8    | Cuánto de lo que se oye llega por el campo reverberante. Un `Source` exterior entra por toda la envolvente a la vez, de forma difusa, así que la fracción es alta. |
| Frecuencias de cruce de banda  | —       | Hz     | 250 / 2000 | Fijas, sobre las octavas estándar en las que los coeficientes de absorción están tabulados: `low` ≤ 250, `mid` 250–2000, `high` > 2000.                            |

**Valores declarados en esta entrega** (con el RT60 que Sabine deriva de ellos):

| `Environment`   | V (m³) | S (m²) | α (low/mid/high)   | RT60 resultante (low/mid/high) |
| --------------- | ------ | ------ | ------------------ | ------------------------------ |
| `cabana`        | 60     | 94     | 0.25 / 0.20 / 0.22 | 0.41 / 0.51 / 0.47 s           |
| `casa`          | 81     | 119.4  | 0.14 / 0.10 / 0.12 | 0.78 / 1.09 / 0.91 s           |
| `campo-abierto` | 0      | 0      | 0 / 0 / 0          | 0 / 0 / 0 s (sin cola)         |

La diferencia audible entre `cabana` y `casa` **no se ajustó**: sale de los
coeficientes. El concreto absorbe la mitad que la madera, así que con solo un
35% más de volumen la casa casi duplica el RT60 —es un recinto vivo y con
cola frente a una cabaña corta y seca—. Y en la cabaña el RT60 de graves sale
_más corto_ que el de medios, al revés que en la mayoría de recintos, porque
el entablado sobre rastreles absorbe más en graves al resonar contra su
cámara de aire: es lo que hace que una cabaña suene cálida sin retumbar.

`campo-abierto` no tiene cola porque a la intemperie no hay ninguna que
añadir. Su papel en esta entrega es sobre todo estructural: al no declarar
superficies construidas, es el contraejemplo con el que se verifica la
afinidad posicional (ver `transmision-masa`).

### Fuente y fundamento

Sabine, W. C. (1900), _Reverberation_ — la relación entre volumen, absorción
y tiempo de reverberación, base de la acústica arquitectónica moderna. Los
coeficientes de absorción por material y banda de octava son datos tabulados
estándar de esa misma literatura.

### Alternativas consideradas

- **Respuesta al impulso grabada en una sala real** (la práctica habitual en
  un reverb por convolución). Descartada de plano: es audio pregrabado, que
  es exactamente lo que `procedural-ambiences` prohíbe. La síntesis de la
  respuesta cuesta unos milisegundos una sola vez al activar el entorno.
- **Red de retardos realimentados (Schroeder/Moorer) con nodos nativos.** Más
  barata en tiempo de ejecución y sin buffer que generar, pero sus tiempos de
  retardo se eligen tradicionalmente **a oído** para evitar el timbre
  metálico —justo el ajuste por tanteo que este documento existe para
  eliminar—, y no hay forma limpia de derivarlos de `V` y `α`. Descartada por
  incompatibilidad con la regla de unidades físicas, no por coste.
- **Solo coloración espectral, sin cola.** Se consideró porque para un
  `Source` exterior escuchado desde dentro la absorción domina. Se descartó
  porque deja fuera precisamente lo que distingue una cabaña de una sala de
  concreto: la duración de la cola, que es donde vive el carácter del
  recinto. `campo-abierto` sí acaba siendo justo eso —un entorno casi
  transparente— y sirve para demostrar que un componente puede ser neutro sin
  dejar de ser válido.

---

## `transmision-masa` — Transmisión a través de una barrera

_(Modelo del motor de composición, camino de transmisión de una `Occlusion`.)_

### Modelo

Lo que atraviesa una barrera homogénea lo predice la **ley de masas** de
incidencia de campo:

```text
TL(f) = 20 · log10(m_s · f) − 47   [dB]
```

con `m_s` la masa superficial en kg/m² (densidad × espesor) y `f` en Hz. La
constante 47 dB es la de incidencia de campo (la versión de incidencia normal
usa 48).

La consecuencia importante es que **TL crece 6 dB por octava**: una barrera no
baja el volumen de forma pareja, se lleva los agudos. Por eso lo ocluido suena
_apagado_ y no solo más flojo, y por eso el modelo se implementa exactamente
como lo que es —un pasa-bajos de un polo— igualando su asíntota a la ley:

```text
|H(f)| = 10^(−TL/20) = 10^(47/20) / (m_s · f)     y     |H(f)| ≈ f_c / f
⇒  f_c = 10^(47/20) / m_s ≈ 223.9 / m_s
```

La barrera _es_ un pasa-bajos cuyo corte fija su masa superficial. De ahí sale
también, sin declarar nada nuevo, el grado de aislamiento: **duplicar el
espesor duplica `m_s`, baja `f_c` una octava y atenúa 6 dB más en toda la
banda audible**. La variante gruesa de un material no necesita una segunda
tabla de valores, solo otro espesor.

### Parámetros

| Parámetro        | Símbolo | Unidad | Rango       | Justificación                                                                                                                  |
| ---------------- | ------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Densidad         | `ρ`     | kg/m³  | 300 – 2600  | De una madera ligera al vidrio y el hormigón; valores tabulados por material.                                                  |
| Espesor          | `h`     | m      | 0.003 – 0.2 | De un acristalamiento simple a un muro; es el único parámetro que cambia entre la variante delgada y la gruesa de un material. |
| Masa superficial | `m_s`   | kg/m²  | derivada    | `ρ · h`. No se declara: se deriva, porque es la magnitud que de verdad gobierna el aislamiento.                                |

**Valores declarados en esta entrega:**

| `Occlusion`           | ρ (kg/m³) | h (m) | m_s (kg/m²) | f_c (Hz) | TL a 1 kHz |
| --------------------- | --------- | ----- | ----------- | -------- | ---------- |
| `techo-madera`        | 500       | 0.020 | 10          | 22.4     | 33 dB      |
| `techo-madera-grueso` | 500       | 0.040 | 20          | 11.2     | 39 dB      |
| `ventana-vidrio`      | 2500      | 0.004 | 10          | 22.4     | 33 dB      |

Que `techo-madera` y `ventana-vidrio` salgan **idénticos** en transmisión no
es un error del catálogo: una tabla de pino de 20 mm y un vidrio de 4 mm
tienen la misma masa superficial, y por tanto aíslan lo mismo. Es la razón
conocida de que un acristalamiento simple aísle tan poco como un panel ligero,
y deja claro que el material por sí solo no determina el aislamiento —lo hace
la masa por unidad de superficie—. Lo que sí los distingue es su respuesta
propia (`resonancia-placa`).

### Ganancia de compensación (decisión de producto, no del modelo)

La ley de masas aplicada tal cual deja una barrera de 10 kg/m² unos 33 dB por
debajo a 1 kHz. Es físicamente correcto —es lo que de verdad aísla un
acristalamiento simple—, pero convertiría la escena en algo inaudible sin
subir el volumen maestro cada vez que se activa una oclusión. El runtime
aplica una **ganancia de compensación fija**, referida a la barrera más ligera
del catálogo (10 kg/m² a 1 kHz), de modo que:

- el **timbre** que aporta la oclusión —la caída de 6 dB/octava, que es el
  rasgo audible— se conserva intacto;
- las diferencias **relativas** entre barreras se mantienen: una barrera del
  doble de masa sigue sonando 6 dB por debajo de la ligera;
- el nivel **absoluto** queda utilizable sin tocar el volumen maestro.

Queda declarado aquí como lo que es: una decisión de producto sobre el nivel
de escucha, no una corrección del modelo físico.

### Fuente y fundamento

Ley de masas de incidencia de campo, resultado estándar de acústica de la
edificación para el aislamiento de particiones homogéneas.

### Alternativas consideradas

- **Atenuación plana (una ganancia sin filtro).** Es lo que haría un motor que
  tratara la oclusión como un simple control de volumen. Descartada: sin la
  pendiente de 6 dB/octava, ocluir suena a bajar el volumen, no a estar detrás
  de algo. La pendiente _es_ el fenómeno.
- **Modelo completo con frecuencia crítica y ley de coincidencia.** Más fiel:
  toda partición real pierde aislamiento en una banda estrecha alrededor de su
  frecuencia crítica. Se descartó por ahora porque introduce un rasgo estrecho
  y poco audible sobre un fondo de banda ancha como la lluvia, a cambio de un
  parámetro más por material. Se reconsiderará si algún `Source` futuro tiene
  contenido tonal donde esa banda sí se note.

---

## `resonancia-placa` — Resonancia propia de una placa

_(Modelo del motor de composición, camino de respuesta propia de una
`Occlusion`. Ver `design.md` D9 del change `add-ambient-composition-engine`.)_

### Modelo

Estar bajo un techo mientras llueve no suena a lluvia con menos agudos: suena
a lluvia **golpeando un techo**. Una barrera no solo deja pasar sonido
atenuado, también devuelve el suyo propio cuando algo la excita. Modelar la
oclusión únicamente como atenuación dejaría fuera el rasgo que más carácter
aporta.

Los impactos de la lluvia son transitorios de banda ancha que excitan los
**modos propios de flexión** del paño. Para una placa rectangular delgada
simplemente apoyada:

```text
f_mn = (π/2) · c_B · [ (m/Lx)² + (n/Ly)² ]
c_B  = h · √( E / (12·(1−ν²)·ρ) )
```

con `E` el módulo de Young en Pa, `ν` el coeficiente de Poisson, `ρ` la
densidad, `h` el espesor y `Lx`,`Ly` la luz entre apoyos.

El amortiguamiento sale del **factor de pérdida** del material: `Q = 1/η`. Esa
es la clave perceptual —y la razón por la que la madera y el vidrio se
distinguen pese a tener frecuencias modales del mismo orden—:

- pino, `η ≈ 0.02` → `Q ≈ 50`: cada impacto es un **golpe seco**;
- vidrio, `η ≈ 0.002` → `Q ≈ 500`: cada impacto **tiñe y se sostiene**.

Se implementa como un banco de filtros de banda en paralelo, alimentado por la
señal del `Source`. Esa topología satisface por construcción los tres
requisitos de la capacidad `ambient-occlusion`: la respuesta depende del
`Source`, escala con su intensidad (más energía incidente, más excitación) y
es **muda sin `Source`**, porque un filtro sin entrada no produce salida.

### Parámetros

| Parámetro                      | Símbolo | Unidad | Rango        | Justificación                                                                                                                                            |
| ------------------------------ | ------- | ------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Módulo de Young                | `E`     | Pa     | 5e8 – 8e10   | De una madera blanda al vidrio; valores tabulados por material.                                                                                          |
| Coeficiente de Poisson         | `ν`     | —      | 0.2 – 0.35   | Rango de sólidos estructurales habituales.                                                                                                               |
| Factor de pérdida              | `η`     | —      | 0.001 – 0.05 | Lo que separa un material que tiñe de uno que golpea; es el parámetro perceptualmente decisivo.                                                          |
| Luz entre apoyos               | `Lx,Ly` | m      | 0.3 – 4      | Un paño de cubierta lo delimitan los cabios, no la superficie total del techo: la luz corta es la separación entre apoyos.                               |
| Número de modos compilados     | —       | —      | 4 – 8        | Cota explícita del coste del banco. Los modos de orden alto se acumulan tan densamente que dejan de ser resonancias discernibles.                        |
| Nivel de la respuesta propia   | —       | —      | 0 – 1        | Cuánto pesa este camino en la mezcla. **Es una decisión de mezcla, no física**: la física fija qué frecuencias suenan y cuánto duran, no cuánto se oyen. |
| Cota de `Q` por implementación | —       | —      | [10, 120]    | Un `Q` de varios cientos en un biquad de precisión simple a frecuencia baja es numéricamente inestable. Limita al vidrio (500 → 120), no a la madera.    |

**Valores declarados en esta entrega:**

| `Occlusion`      | Paño (m)  | E (Pa) | η     | Q   | f del modo fundamental |
| ---------------- | --------- | ------ | ----- | --- | ---------------------- |
| `techo-madera`   | 3 × 0.6   | 8e9    | 0.02  | 50  | ≈ 110 Hz               |
| `ventana-vidrio` | 1.2 × 0.8 | 70e9   | 0.002 | 120 | ≈ 22 Hz                |

El módulo de la madera es un **valor efectivo**: el pino es muy anisótropo
(unos 10 GPa en la dirección de la fibra frente a ~0.5 GPa en la transversal),
así que un paño completo se representa con un valor intermedio en lugar de
modelar la anisotropía, que exigiría dos módulos y una orientación de fibra
por oclusión sin cambiar de forma audible el resultado sobre un excitador de
banda ancha.

### Fuente y fundamento

Teoría clásica de vibración de placas delgadas (Kirchhoff–Love) para las
frecuencias propias; factores de pérdida por material tabulados en la
literatura de vibroacústica. La relación `Q = 1/η` es la definición estándar
del factor de calidad a partir del amortiguamiento estructural.

### Alternativas consideradas

- **Un `Source` secundario sincronizado con los impactos del principal.**
  Sería la lectura literal de "el techo suena": generar sus propios eventos.
  Descartada porque exigiría que la `Occlusion` leyera el estado interno del
  `Source` para saber cuándo cae cada gota, acoplando dos componentes que el
  motor mantiene deliberadamente desacoplados. El banco resonante obtiene lo
  mismo _sin_ acoplamiento: los impactos ya vienen en la señal.
- **Una capa de ruido propia de la oclusión, con su propia envolvente.**
  Descartada por la misma razón y una peor: sonaría también sin `Source`,
  violando el requisito de que la barrera sea muda sin nada que la excite.
- **Síntesis modal completa con excitación explícita por evento** (una voz por
  impacto, como `impacto-gota`). Más fiel al detalle de cada golpe, pero
  duplicaría el coste del camino granular ya existente y volvería a exigir
  conocer los eventos del `Source`. El filtrado resonante es la misma física
  vista como función de transferencia en lugar de como síntesis por evento.

---

## `atenuacion-distancia` — Atenuación y absorción por distancia

_(Modelo del motor de composición, `Modifier` de distancia.)_

### Modelo

Atenuación y distancia son, en la práctica, el mismo concepto
(`openspec/project.md`), así que el modelo los expresa juntos —y tienen que ir
juntos, porque aplicar solo el primero suena a bajar el volumen, no a
alejarse—:

1. **Ley del inverso del cuadrado**: el nivel cae 6 dB por cada duplicación de
   la distancia. En presión sonora, la ganancia lineal es `d_ref / d`.
2. **Absorción atmosférica**: el aire se lleva las frecuencias altas, y lo
   hace aproximadamente con el cuadrado de la frecuencia. Se modela como un
   pasa-bajos cuyo corte cae con la raíz de la distancia:

```text
α_aire(f) ≈ 0.0025 · (f/1000)²   [dB/m]
f_c(d) = 1000 · √( presupuesto_dB / (0.0025 · d) )
```

Por eso una fuente lejana no solo suena más floja: suena **apagada**. Ese es
el rasgo que hace que se perciba como distancia y no como volumen.

Que el `Modifier` sea dos parámetros rampables sobre la propia señal del
`Source` es también lo que lo hace **autocontenido** en el sentido que exige
la capacidad `ambient-modifiers`: mover la distancia en el tiempo es rampar
esos dos valores, sin leer el estado de ningún otro `Source` de la escena. Un
`Source` que se acerca o se aleja es este `Modifier` variando su valor, no una
interacción entre componentes.

### Parámetros

| Parámetro                | Símbolo | Unidad | Rango   | Justificación                                                                                                                                                                                    |
| ------------------------ | ------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Distancia                | `d`     | m      | 1 – 200 | Por debajo de 1 m no se amplifica (la referencia es la distancia mínima); por encima de 200 m la absorción deja la lluvia por debajo de los 400 Hz útiles y deja de ser reconocible como lluvia. |
| Distancia de referencia  | `d_ref` | m      | 1       | Distancia a la que la ganancia es unitaria.                                                                                                                                                      |
| Presupuesto de absorción | —       | dB     | 3       | Cuántos dB de absorción atmosférica marcan la frecuencia de corte. 3 dB es el punto de media potencia, coherente con cómo se define el corte del resto de filtros del proyecto.                  |

### Fuente y fundamento

Ley del inverso del cuadrado para propagación en campo libre; coeficientes de
absorción atmosférica del orden de magnitud de la norma ISO 9613-1 (_Acoustics
— Attenuation of sound during propagation outdoors_) a 20 °C y 50% de humedad
relativa.

### Alternativas consideradas

- **Solo atenuación de nivel, sin filtrado.** Es el modelo ingenuo de
  "distancia = volumen". Descartado: la fracción de energía en agudos no
  cambiaría, y el resultado se percibe como alguien bajando el mando, no como
  una fuente que se aleja. La verificación de este modelo (`compositionStages.signal.test.ts`)
  mide justamente esa fracción, no el nivel, para que la diferencia quede
  demostrada y no supuesta.
- **Retardo de propagación con la distancia.** Físicamente real (~3 ms por
  metro), pero inaudible sin un evento visual con el que compararlo y sin una
  segunda fuente a otra distancia. Fuera de alcance mientras el piloto tenga
  un solo `Source`; se reconsiderará con varios `Source` a distancias
  distintas.
- **Humedad y temperatura como parámetros declarables.** La absorción real
  depende de ambas. Se fijan en condiciones estándar porque exponerlas
  añadiría dos controles cuyo efecto audible sobre ruido de banda ancha es muy
  inferior al de la propia distancia.

---

## Criterios de aceptación

### Criterios espectrales por ambiente

Los cuatro ambientes de esta entrega están calibrados sobre su render real
(tareas 9.4 y 10.4). El criterio se expresa como fracción de energía dentro
de la banda declarada sobre una ventana de análisis de 131072 muestras (FFT
radix-2) tomada del centro de un render — es la magnitud que los tests de
señal miden de verdad, en lugar de una forma de "planitud en dB" más difícil
de verificar de forma robusta sobre ruido de banda ancha.

| Ambiente | Banda de energía dominante                        | Medido | Umbral |
| -------- | ------------------------------------------------- | ------ | ------ |
| `rain`   | 800 Hz – 6 kHz (cuerpo + goteo)                   | 74–76% | ≥ 60%  |
| `wind`   | 150 Hz – 3 kHz                                    | ~49%   | ≥ 40%  |
| `river`  | 150 Hz – 5 kHz                                    | ~76%   | ≥ 70%  |
| `ocean`  | 100 Hz – 4 kHz (cuerpo grave + estallidos agudos) | ~55%   | ≥ 45%  |

`wind` concentra menos energía en su banda declarada de lo que se esperaba
al escribir el criterio la primera vez: el ruido marrón tiene un contenido
natural muy fuerte por debajo de 150 Hz (pendiente de -6 dB/oct desde muy
baja frecuencia, sin que el filtro pasa-bajos lo atenúe — un pasa-bajos no
toca nada por debajo de su corte). El umbral se ajustó al valor medido en
lugar de forzar el diseño a una banda que no es la que el ruido marrón
produce de forma natural; queda para la validación perceptual (tarea 10.5)
si ese grave adicional se oye bien o hace falta un pasa-altos suave.

### Criterio espectral para ruido de color

`white-noise`, `pink-noise` y `brown-noise` son de espectro completo por
definición: "fracción de energía en una banda" no es el criterio correcto
—ocuparían toda banda razonable por igual o por pendiente, nunca
concentrada— así que en vez de eso se mide la **pendiente del espectro de
magnitud en dB/octava**, por regresión lineal sobre `log(frecuencia)` vs.
`log(magnitud)` en una banda de análisis de 100 Hz a 8 kHz (fuera de esa
banda el ruido de muestreo de la FFT y la respuesta del filtro transparente
de 20 kHz distorsionan la pendiente medida sin aportar información real).

| Ambiente      | Pendiente esperada | Medido | Tolerancia |
| ------------- | ------------------ | ------ | ---------- |
| `white-noise` | 0 dB/oct           | 0.026  | ± 1 dB/oct |
| `pink-noise`  | −3 dB/oct          | −2.936 | ± 1 dB/oct |
| `brown-noise` | −6 dB/oct          | −5.728 | ± 1 dB/oct |

La tolerancia de ±1 dB/oct es deliberadamente holgada: el filtro económico
de 3 polos de `pink-noise` es una aproximación, no una PSD `1/f` exacta, y
exigir precisión mayor penalizaría la elección consciente de la alternativa
más barata (ver "Alternativas consideradas" del modelo `ruido-de-color`).

La ausencia de periodicidad es trivial para los tres —ruido puro sin ninguna
componente periódica por construcción— y la compatibilidad mono se hereda
del mismo mecanismo de decorrelación de canales que el resto de capas
continuas (`stereo.width: 1`), sin necesidad de un caso especial.

### Umbral de periodicidad

Sobre la autocorrelación normalizada de la envolvente de energía (RMS en
ventanas de 50 ms) de un render de al menos 150 s, **excluyendo el primer
segundo de desplazamiento**: ningún pico SHALL superar **0.4** de
correlación normalizada.

**La exclusión del primer segundo es metodológica, no un ajuste laxo**: la
suavidad natural de cualquier envolvente que varía lentamente —deseable,
no un defecto— ya produce autocorrelación alta a desplazamientos muy
cortos, sin que eso sea el ciclo perceptible que este criterio existe para
detectar. Se descubrió calibrando `rain`: incluso un paseo aleatorio puro
(sin ninguna componente periódica) mostraba ~0.6 de correlación a 2
segundos de desplazamiento, simplemente porque tarda unos segundos en
decorrelarse consigo mismo. El umbral se aplica al primer pico _después_
de ese margen.

**Medido con esta metodología (tarea 9.4/10.4):**

| Ambiente | Periodicidad medida                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| `rain`   | 0.146                                                                                                        |
| `wind`   | 0.062                                                                                                        |
| `river`  | 0.148 (refinamiento del catálogo: bajó de 0.306 tras acortar el periodo de `flujo` y añadir el cuerpo grave) |

**`ocean` es un caso distinto y no usa este mismo criterio.** El oleaje
tiene un ritmo auténtico —las olas reales tienen periodo— así que "ausencia
de periodicidad" no es lo que hay que verificar: sería pedirle a `ocean` que
deje de sonar a olas. Lo que importa es que un ciclo no sea _idéntico_ al
anterior. Se verifica midiendo la autocorrelación de la envolvente
exactamente en el periodo declarado de la ola (7 s): **medido 0.636**
(refinamiento del catálogo: se profundizó el contraste de la modulación de
`0.3` a `0.12` en el mínimo de gain porque el oleaje no se percibía con
claridad — el valor anterior, 0.587, era con el contraste original),
lejos de 1.0 (que indicaría recurrencia exacta), gracias a la variación
aleatoria del periodo de ciclo a ciclo (`periodJitter`). Umbral: < 0.85, y

> 0.5 (una cota inferior nueva: sin ella, una regresión que aplanara el
> oleaje hasta volverlo irreconocible seguiría pasando el test).

**Hallazgo de la calibración de `rain`**, documentado porque cambió una
decisión de diseño: el modulador compuesto (D5) inicialmente combinaba las
tres senoides inconmensurables con un peso del 65% frente a un 35% de paseo
aleatorio, y ese paseo tenía un paso fijo por muestra (`0.01`) independiente
de la frecuencia de muestreo. Eso le daba al paseo aleatorio una constante
de tiempo de apenas ~2 ms — mucho más rápido que la ventana de análisis de
50 ms — así que quedaba promediado dentro de cada ventana de energía y no
llegaba a competir con la componente periódica a la escala en que se mide la
periodicidad: la autocorrelación de `rain` medía ~0.64, muy por encima de
cualquier umbral razonable. La causa raíz era doble: (a) el paso del paseo
aleatorio no se derivaba de un tiempo físico ni de la frecuencia de muestreo
real (violaba la propia regla de esta referencia sobre unidades físicas), y
(b) el peso del paseo aleatorio era insuficiente frente a la componente
periódica. Corregido subiendo el peso por defecto a **0.8** y derivando el
paso del paseo de una constante de tiempo en segundos (por defecto, el
propio periodo base) dividida por la frecuencia de muestreo real.

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

- **Ambiente individual más exigente**: el tiempo de cómputo de audio por
  bloque de 128 muestras SHALL mantenerse por debajo del **40%** del tiempo
  real disponible para ese bloque a la frecuencia de muestreo del contexto,
  dejando margen para el sistema operativo y la interfaz.
- **Mezcla simultánea**: el conjunto de todas las capas activas SHALL
  mantenerse por debajo del **75%** de ese mismo presupuesto por bloque, para
  no operar al límite y tolerar variabilidad del entorno.

**Medido (tarea 9.6):** renderizar 30 s de `rain` completo (sus tres capas)
tarda ~840 ms de tiempo de reloj — un factor de tiempo real de **~0.028**
(unas 36 veces más rápido que tiempo real) en la máquina de referencia usada
para esta medición. Por capa: `cuerpo` 0.013, `impactos` 0.009, `goteo`
0.004. El cómputo queda muy lejos de ser el factor limitante: incluso un
dispositivo real diez veces más lento que la máquina de referencia seguiría
muy por debajo del presupuesto del 40%.

- **Número máximo de capas**: dado que el coste no es el factor limitante en
  esta medición, el número se fija por **criterio de producto** en lugar de
  por presupuesto agotado: **8** capas simultáneas, un límite pensado para
  que una consola de mezcla siga siendo manejable para una persona, no
  porque el hardware lo exija. Se revisa si una medición en un dispositivo
  real de gama baja (pendiente, requiere hardware — ver tarea 15.5) muestra
  lo contrario.

#### Presupuesto del motor de composición

El motor de composición **no hereda esta medición**: añade una convolución y
un banco de resonadores que el motor de capas no tiene, así que su coste se
midió aparte en lugar de suponerlo (change `add-ambient-composition-engine`,
tarea 8.3).

**Medido** sobre la escena más cargada que el piloto puede montar —`rain`
completa (3 capas) + `Environment` `cabana` + `Occlusion` `techo-madera` con
sus 6 modos + `Modifier` de distancia—, renderizando 30 s de audio:

| Condición de medición                      | Tiempo de reloj | Factor de tiempo real   |
| ------------------------------------------ | --------------- | ----------------------- |
| Test aislado                               | ~1.35 s         | ~0.045 (22× más rápido) |
| Con la suite de señal completa en paralelo | ~2.42 s         | ~0.081 (12× más rápido) |

Se registran las dos porque la diferencia no es ruido de medida: la suite
corre varios renders concurrentes en el mismo Chromium, así que la segunda
cifra es la pesimista y la primera la representativa de una máquina
dedicándose a esto. Comparado con los ~0.028 de `rain` sola por el motor
actual, la escena completa del motor nuevo cuesta aproximadamente **1.6×**
—el precio de la convolución y los seis resonadores—. Sigue muy lejos de ser
el factor limitante: incluso un dispositivo diez veces más lento quedaría por
debajo del presupuesto del 40%.

- **Cota del banco resonante**: el número de modos lo declara cada
  `Occlusion` (`modeCount`, 4–8), no lo decide el runtime — es la cota
  explícita del coste de ese camino, verificada por test.
- **El límite de 8 capas simultáneas no aplica al motor nuevo**: no compone
  capas, compone componentes (un `Source`, un `Environment`, una `Occlusion`,
  un `Modifier`). El límite que sí tiene esta entrega es de arquitectura, no
  de presupuesto: como mucho uno de cada.

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

### 2026-08-02 — rain, ocean, river, wind (app instalada, uso real)

Validación del propietario del proyecto con la aplicación instalada
(Windows), en uso real a lo largo de varias sesiones de esta ronda de
refinamiento del catálogo — no la sesión aislada de 3 minutos por altavoz
que describe el protocolo formal, pero cubre lo que el protocolo existe
para detectar: reconocibilidad, ausencia de artefactos, evolución en el
tiempo.

- **Reconocibilidad y artefactos**: se identificaron tres defectos
  concretos, cada uno corregido y vuelto a verificar sobre el render real:
  - `rain`: la capa `impactos` (mezcla impacto/burbuja al 50/50) se
    percibía como un disparo o láser → corregido con `bubbleMix` (0.15 en
    `impactos`, 0.25 en `goteo`).
  - `ocean`: oleaje poco reconocible y el estallido de `rompiente`
    percibido como "una antorcha apagándose" → corregido profundizando la
    modulación de oleaje y filtrando el estallido en banda.
  - `river`: se percibía como una mezcla de viento y océano, no como agua
    corriendo → corregido añadiendo la capa de cuerpo grave que faltaba.
- **Resultado tras aplicar las tres correcciones**: confirmación textual
  del usuario, "se oye todo mejor".
- **Defecto aceptado conscientemente**: la comparación A/B de esta entrada
  es contra el estado inicial de esta ronda de refinamiento, no contra el
  prototipo original pre-`procedural-audio-foundation` — esa comparación ya
  se registró al portar cada ambiente (tareas 8.4/10.4).

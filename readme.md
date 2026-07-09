# Nature Noise Generator

## Descripción

Nature Noise Generator es un generador de ambientes sonoros completamente **offline**, diseñado para producir ruido ambiental natural de forma **procedural**, sin utilizar archivos de audio pregrabados.

El objetivo es generar sonidos continuos y relajantes mediante algoritmos matemáticos, filtros y modulaciones, logrando ambientes naturales como lluvia, viento, mar o ríos con un consumo mínimo de recursos.

El proyecto está pensado como un **MVP** simple, portable y fácilmente extensible.

---

# Objetivos

- Funcionar completamente offline.
- No depender de servicios en la nube.
- No utilizar archivos MP3, WAV u otros recursos de audio.
- Generar el sonido completamente mediante código.
- Tener el menor número posible de dependencias.
- Mantener una arquitectura sencilla y modular.
- Permitir agregar nuevos ambientes fácilmente.

---

# Tecnologías

## Primera versión

- TypeScript
- Web Audio API
- Vite

Sin backend.

Sin base de datos.

Sin librerías de generación de audio.

---

# Plataformas

El proyecto se desarrollará inicialmente como una **PWA (Progressive Web App)**.

Posteriormente podrá empaquetarse como:

- APK (Android)
- Aplicación de escritorio (.exe mediante Tauri o Electron)

La lógica del motor de audio será exactamente la misma para todas las plataformas.

---

# Filosofía

En lugar de reproducir grabaciones de lluvia, mar o viento, el sistema **creará el sonido en tiempo real**.

Cada ambiente será una combinación de:

- Ruido aleatorio
- Filtros
- Modulación
- Variaciones lentas
- Control de volumen

Esto permite:

- Audio infinito
- Sin cortes
- Sin bucles repetitivos
- Bajo tamaño de aplicación

---

# Sonidos planeados

## Ruidos base

- Ruido blanco
- Ruido marrón
- Ruido rosa

---

## Ambientes

- Lluvia suave
- Lluvia intensa
- Viento
- Mar
- Río
- Quebrada
- Bosque (sin fauna)
- Tormenta

Todos los ambientes estarán compuestos únicamente por fenómenos naturales, evitando sonidos de animales, personas o elementos artificiales.

---

# Arquitectura

```text
Application
    │
    ├── Command Interface
    │
    └── Audio Engine
            │
            ├── Noise Generator
            ├── Filters
            ├── Modulators
            ├── Mixer
            ├── Buffer Manager
            └── Output
```

---

# Motor de audio

El motor generará continuamente muestras de audio.

Proceso:

```text
Ruido base
      ↓
Filtros
      ↓
Modulación lenta
      ↓
Control de volumen
      ↓
Salida de audio
```

No se utilizarán archivos de sonido.

Todo será generado matemáticamente.

---

# Generación de ambientes

## Lluvia

- Ruido blanco
- Filtro pasa altos
- Variaciones suaves

---

## Viento

- Ruido marrón
- Filtro pasa bajos
- Oscilación lenta del volumen

---

## Río

- Ruido blanco
- Filtro pasa banda
- Variaciones aleatorias leves

---

## Mar

- Ruido marrón
- Filtro pasa bajos
- Oscilación lenta simulando oleaje

---

## Tormenta

Combinación de:

- Lluvia
- Viento
- Impulsos graves ocasionales

---

# Buffer de audio

El motor siempre mantendrá audio generado por adelantado.

Objetivo inicial:

- Buffer de aproximadamente 10 segundos.

Mientras una parte del buffer se reproduce, el siguiente segmento será generado en segundo plano para evitar interrupciones.

---

# Inicio y finalización

Todos los sonidos deberán iniciar y finalizar mediante transiciones suaves (fade in / fade out), evitando clics o cortes abruptos.

---

# Interfaz

La primera versión no tendrá interfaz gráfica compleja.

El control será mediante comandos.

Ejemplos:

```text
play rain

play wind

play river

play ocean

play storm

stop

volume 0.6

list
```

En versiones futuras podrá añadirse una interfaz gráfica sin modificar el motor de audio.

---

# Estructura del proyecto

```text
src/
│
├── audio/
│   ├── engine.ts
│   ├── noise.ts
│   ├── filters.ts
│   ├── modulation.ts
│   ├── mixer.ts
│   ├── buffer.ts
│   └── output.ts
│
├── commands/
│   └── parser.ts
│
├── types/
│
└── main.ts
```

---

# Principios del proyecto

- Offline First.
- Código simple y mantenible.
- Arquitectura modular.
- Sin dependencias innecesarias.
- Audio procedural.
- Bajo consumo de memoria.
- Fácil portabilidad a escritorio y Android.

---

# Roadmap

## MVP

- Motor de audio.
- Ruido blanco.
- Ruido marrón.
- Lluvia.
- Viento.
- Río.
- Mar.
- Buffer continuo.
- Comandos básicos.
- Fade In / Fade Out.

## Versión 2

- Presets.
- Mezcla de ambientes.
- Configuración persistente.
- Exportación de perfiles.

## Versión 3

- APK.
- Aplicación de escritorio.
- Interfaz gráfica.
- Automatización y programación de sesiones.

---

# Licencia

Pendiente de definir.

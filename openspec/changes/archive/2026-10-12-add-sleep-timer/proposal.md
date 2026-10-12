# Change: Temporizador de apagado

## Why

Quien duerme con un ambiente sonoro no quiere dejarlo sonando toda la noche, ni
levantarse a detenerlo. Hoy la única forma de apagar es `stop` a mano. El
propietario lo pidió tomando como modelo el "Suspend playback" de IMP
(apagar a una hora elegida o dentro de un tiempo) y pidió además que el
apagado no sea un corte seco.

## What Changes

- Se añade la capacidad `sleep-timer`: un único temporizador de apagado por
  sesión, que desvanece la reproducción y la deja detenida (con la composición
  conservada, igual que `stop`).
- Dos formas de fijarlo: **dentro de un tiempo** (`30m`, `1h30m`, `0:27:00`) y
  **a una hora** (`at 23:30`, próxima ocurrencia de esa hora).
- El apagado alcanza el silencio **en el instante elegido**: el desvanecimiento
  (20 s) empieza antes, no después.
- Comando de consola `timer`: fijar, consultar y cancelar.
- Control en el modo visual y cuenta atrás visible en la barra de estado, con
  botón para cancelar.
- Sin cambios de formato persistido: el temporizador **no** sobrevive a recargar
  la página (ver design.md D3).

## Impact

- Affected specs: `sleep-timer` (nueva), `command-console` (comando `timer`,
  acceso táctil y cuenta atrás en el panel de estado).
- Affected code: `src/domain/sleepTimer.ts` (nuevo, puro),
  `src/platform/sleepTimer.ts` (nuevo, store con reloj inyectable),
  `src/commands/commands.ts`, `src/ui/StatusBar.tsx`,
  `src/ui/VisualControls.tsx`, `src/ui/App.tsx`.
- Sin dependencias nuevas. El núcleo de audio no cambia: se usa
  `CompositionEngine.stop(fadeSeconds)`, que ya existe.

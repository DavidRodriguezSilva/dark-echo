## Context

`CompositionEngine.stop(fadeSeconds)` ya desvanece y conserva la escena. El
temporizador solo decide **cuándo** llamarlo. No necesita tocar `audio/`.

## Decisions

### D1. Reparto por capas

- `domain/sleepTimer.ts` (puro, sin dependencias): `parseTimerSpec(texto, ahora)`
  → `{ kind: "in" | "at", endAt: number }` o error. Determinista y probable en
  Node.
- `platform/sleepTimer.ts`: store observable (`subscribe`/`getSnapshot`) con
  reloj y programador inyectables. Recibe un callback `onExpire(fadeSeconds)`
  que ui/ conecta a `engine.stop`. Mismo patrón que `AppearanceStore`.
- `commands/` recibe un `SleepTimerController` inyectado como interfaz
  (igual que `SceneController`), sin importar `platform/`.

### D2. Se apaga **en** la hora elegida

El desvanecimiento dura 20 s y termina en `endAt`: `stop` se invoca en
`endAt - 20 s`. Si al fijar el temporizador quedan menos de 20 s, se desvanece
en lo que quede. Razón: "a las 23:30" se lee como "a las 23:30 ya no suena".

### D3. No persiste entre cargas

Un temporizador guardado en `localStorage` podría apagar el sonido de alguien
horas después, sin que lo recuerde. Es más seguro que recargar lo cancele.
Alternativa descartada: persistir `endAt`. Se reconsidera si se pide.

### D4. Hora de pared, no contador

`endAt` es una marca absoluta (`Date.now()`); el store compara contra el reloj
cada segundo y al volver la pestaña a primer plano (`visibilitychange`). Los
navegadores móviles frenan los temporizadores de pestañas ocultas, pero el audio
sigue sonando; con marca absoluta el retraso máximo es el del frenado (hasta
~1 min en segundo plano), nunca acumulado. Se documenta como límite conocido.
Alternativa descartada: automatizar la ganancia con el reloj de `AudioContext`
(exacto en segundo plano) — obliga a tocar `audio/` y se deja para un change
posterior si el retraso molesta.

### D5. Cancelación implícita

El temporizador se cancela si la reproducción deja de estar `playing` (el
usuario detuvo o vació la escena). No se rearma al volver a reproducir.

### D6. Un solo temporizador, tope de 12 h

Fijar uno nuevo sustituye al anterior. Rango: 1 s a 12 h. `at HH:MM` usa 24 h y
la próxima ocurrencia: si la hora ya pasó hoy, es mañana.

## Risks

- Pestaña oculta y retraso de hasta ~1 min (D4). Aceptado.
- `at` depende del reloj y la zona del dispositivo; un cambio de hora (DST)
  entre medias puede mover el apagado 1 h. Aceptado, el uso es de horas.

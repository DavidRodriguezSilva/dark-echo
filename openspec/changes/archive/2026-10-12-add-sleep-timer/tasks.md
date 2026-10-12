## 1. Dominio (design.md D1, D6)

- [x] 1.1 Crear `src/domain/sleepTimer.ts`: `parseTimerSpec(texto, ahora)` con duración (`30m`, `1h30m`, `H:MM:SS`) y hora `at HH:MM` (próxima ocurrencia), rango 1 s–12 h, mensajes de error con el formato válido.
- [x] 1.2 Test en Node: formatos válidos, hora ya pasada → mañana, límites (0, 12 h, 13 h), texto ilegible.

## 2. Store con reloj inyectable (design.md D1–D5)

- [x] 2.1 Crear `src/platform/sleepTimer.ts`: `subscribe`/`getSnapshot`/`set`/`cancel`, reloj y programador inyectables, `onExpire(fadeSeconds)` inyectado.
- [x] 2.2 Desvanecimiento de 20 s que termina en `endAt`; con menos de 20 s restantes, desvanece lo que quede (D2).
- [x] 2.3 Revisar contra la marca absoluta cada segundo y en `visibilitychange` (D4).
- [x] 2.4 Cancelar si la reproducción deja de estar `playing`, sin rearmar al reanudar (D5); rechazar fijar si nada suena.
- [x] 2.5 Tests en Node con reloj falso: sustituir, cancelar, expirar con desvanecimiento, pestaña oculta, no persiste.

## 3. Comando de consola

- [x] 3.1 Definir `SleepTimerController` en `src/commands/commands.ts` y registrar `timer` (`<duración>`, `at <HH:MM>`, `off`, sin argumento) con su ayuda.
- [x] 3.2 Conectar en `App.tsx` el store con `engine.stop` y la inyección al registro.
- [x] 3.3 Tests del comando: fijar, consultar, cancelar, error de formato.

## 4. Interfaz

- [x] 4.1 Cuenta atrás y cancelar en `StatusBar.tsx` (ambos modos), por `useSyncExternalStore`.
- [x] 4.2 Sección de temporizador en `VisualControls.tsx`: 15/30/60/120 min, duración personalizada, hora.
- [x] 4.3 Objetivos táctiles de 44 px y etiquetas accesibles; tokens de apariencia (`pnpm check:tokens`).

## 5. Verificación

- [x] 5.1 `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm check:tokens`.
- [x] 5.2 Prueba manual en navegador: fijar 1 min, oír el desvanecimiento y el silencio exacto al minuto; recargar cancela.
- [x] 5.3 Documentar el temporizador en `readme.md` y `help`.

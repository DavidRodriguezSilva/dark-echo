# Change: Modo de interfaz visual, organizado según la jerarquía de composición

## Why

La aplicación tiene hoy una sola forma real de operarse: escribir comandos. El
panel de `TouchControls` que revela el botón de la barra de estado no es una
alternativa, es un remiendo — una fila de iconos con play/detener, volumen
maestro, tema y esquema, que no alcanza a nada de lo que el motor de
composición sabe hacer. Con él no se puede incorporar un `Source`, ni alejarlo,
ni poner una barrera, ni elegir el recinto. Quien no quiera —o no pueda—
escribir comandos no tiene acceso al producto, solo a su botón de encendido.

Eso ya es un incumplimiento en potencia de la requirement "Operación sin
teclado físico" de `command-console`: las "acciones esenciales" que esa
requirement enumera se fijaron cuando el sistema solo sabía sonar y callar. Con
el motor de composición, la escena tiene cuatro niveles —`Source`, sus
`Modifiers`, la `Occlusion` y el `Environment`— y ninguno es alcanzable sin
teclado.

Hay además un segundo motivo, de descubribilidad. La jerarquía de composición
es el modelo mental central del producto y hoy no se ve en ninguna parte: hay
que deducirla leyendo la ayuda de `compose` o el código del motor. El propio
propietario, al pedir este change, dijo no recordar la jerarquía exacta. Una
interfaz cuya disposición **es** la jerarquía la enseña sin necesidad de
documentarla aparte, y esa es la mitad del valor de este trabajo.

## What Changes

- **BREAKING (interfaz)**: el botón de la esquina inferior derecha de
  `StatusBar` deja de mostrar y ocultar un panel auxiliar y pasa a ser un
  **conmutador de modo de interfaz**. Sus dos estados son excluyentes: o se ve
  la consola, o se ve el modo visual — nunca los dos a la vez.
- El **modo consola es el predeterminado**. Sin preferencia registrada, la
  aplicación arranca exactamente como hoy: la consola a pantalla completa, con
  la línea de entrada enfocada.
- Se añade el **modo visual**: una superficie de paneles con controles
  gráficos, organizada **según la jerarquía de composición real del motor**
  (`Source` → `Modifiers` de ese `Source` → `Occlusion` de escena →
  `Environment` de escena → maestro), con las escenas guardadas como sección
  aparte —no como paso de la cadena— y con el transporte (reproducir/detener) y
  los volúmenes al final.
- El **mensaje de bienvenida cambia**: desaparece la línea "Todo se controla
  escribiendo comandos, como en una terminal" —lo que la pantalla ya dice de sí
  misma no hace falta escribirlo— y en su lugar se indica que existe un modo
  visual y dónde está el botón que lo abre.
- **BREAKING (componente)**: `TouchControls` se elimina. Todo lo que ofrecía
  —play/detener, volumen maestro, tema y esquema— queda absorbido por el modo
  visual, que es un superconjunto estricto. Mantener las dos superficies dejaría
  dos caminos táctiles distintos hacia el mismo estado y un botón con dos
  significados.
- **BREAKING (formato persistido)**: `UserConfig` incorpora el modo de interfaz
  elegido y sube a la versión 2, con migración desde la 1 que asume modo
  consola. Ningún usuario pierde su volumen maestro.
- El modo elegido se sincroniza con el motor por `useSyncExternalStore`, igual
  que ya hace `StatusBar`: el modo visual **no guarda copia** del estado de la
  escena, así que no puede mostrar algo distinto de lo que suena.

## Impact

- Affected specs:
  - `command-console` — se añade el modo de interfaz conmutable y la
    organización jerárquica del modo visual; se modifican "Operación sin
    teclado físico" (las acciones esenciales pasan a ser las cuatro etapas de
    la composición), "Panel de estado del sistema" (permanente en ambos modos y
    sede del conmutador) e "Identidad visual de terminal" (deja de describir la
    aplicación entera para describir el modo consola).
  - `theming` — se modifica "Selección de tema en caliente": el control
    accionable por toque deja de vivir en un panel auxiliar y pasa a vivir en
    el modo visual.
  - `session-persistence` — se modifica "Persistencia de la configuración del
    usuario" para incluir el modo de interfaz.
- Affected code: `src/ui/App.tsx`, `src/ui/StatusBar.tsx`, `src/ui/Console.tsx`
  (mensaje de bienvenida), `src/ui/TouchControls.tsx` (eliminado),
  `src/platform/config.ts` (versión 2 + migración), `src/ui/` (componentes
  nuevos del modo visual), `scripts/check-tokens.ts` (sin cambios, pero es la
  verja que el código nuevo tiene que pasar).
- **Depende de `retire-legacy-engine`.** El modo visual se construye contra el
  snapshot del motor de composición —`sources[]` con su `modifier`,
  `occlusion`, `environment`— y contra el ciclo de reproducción unificado que
  aquel change le entrega. Implementarlo antes obligaría a escribir dos veces
  los mismos paneles, uno por motor.
- **Reversión**: revertir devuelve la consola como interfaz única y el panel
  `TouchControls`. No hay pérdida de datos: una configuración en versión 2
  leída por el código de la versión 1 se acepta y se reescribe ignorando el
  campo sobrante (`readVersioned` no descarta versiones superiores), así que el
  volumen maestro sobrevive a la reversión.

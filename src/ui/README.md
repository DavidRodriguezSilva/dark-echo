# ui

React y las primitivas de shadcn/ui copiadas al repositorio. Usa
`commands/` para ejecutar acciones, un store observable propio para
reflejar el estado del audio (ver design.md D7), y `styles/` a través de
clases de utilidad — nunca valores literales (ver `scripts/check-tokens.ts`).

## Dos modos de interfaz

La aplicación tiene dos superficies **excluyentes**, no una principal y un
panel auxiliar:

- **Consola** (`Console.tsx`) — la superficie completa. Todo lo que el sistema
  sabe hacer se alcanza escribiendo. Es la única con historial, autocompletado
  y ayuda.
- **Modo visual** (`VisualControls.tsx`) — cubre lo frecuente, no lo
  exhaustivo: componer la escena, ajustar volúmenes y distancias, guardar y
  cargar escenas, y cambiar la apariencia, sin teclado.

`StatusBar.tsx` queda fuera de la alternancia: es la única superficie común y
la sede del conmutador.

**Qué vive en cada modo.** Si una capacidad no tiene equivalente en comando,
no entra al modo visual — la interfaz da forma gráfica a lo que el motor ya
expone, no inventa capacidades. Y si una capacidad es de uso poco frecuente o
necesita escribir texto libre, se queda solo en la consola.

El modo inicial lo decide el dispositivo (`platform/config.ts`): visual con
puntero grueso, consola con puntero fino. En cuanto el usuario conmuta, su
elección queda registrada y manda.

## Estado

Ningún componente guarda una copia del estado del audio: todos leen el
snapshot del motor con `useSyncExternalStore` y escriben llamando al motor, de
modo que lo mostrado no puede diferir de lo que suena. La apariencia se
consume por contexto (`AppearanceContext.tsx`), que transporta el store — no
una copia de su valor — por la misma razón.

La excepción son las **escenas guardadas**: son persistencia, no audio, y
`SceneStore` no es observable, así que el modo visual sí mantiene una copia
local del listado y la refresca tras cada operación.

# dark-echo

Generador de ambientes sonoros **procedurales** y completamente **offline**:
lluvia, viento, río y mar sintetizados en tiempo real a partir de modelos
físicos —no de grabaciones—, para que la escucha prolongada no revele un
patrón repetido. Se controla desde una consola de comandos con identidad de
terminal, funciona instalado como PWA sin conexión a la red, y recuerda tu
configuración y tus escenas entre sesiones.

> **Estado**: el cambio arquitectónico `procedural-audio-foundation` (ver
> `openspec/changes/procedural-audio-foundation/`) está en curso. Este
> documento describe la arquitectura vigente al momento de leerlo; algunas
> piezas (retirar el motor antiguo, la documentación final de `openspec/`)
> siguen abiertas en ese change.

## Cómo suena cada ambiente

Cada fenómeno se sintetiza a partir de un modelo físico documentado en
[`docs/synthesis-reference.md`](docs/synthesis-reference.md): resonancia de
Minnaert para gotas e impactos, ruido filtrado con modulación compuesta para
ráfagas de aire y flujo turbulento, envolvente asimétrica para el oleaje. Ese
documento es la fuente de verdad de parámetros, unidades y criterios de
aceptación — no se duplica aquí.

## Arquitectura

El código está organizado por capas con dependencias en una sola dirección
(`openspec/changes/procedural-audio-foundation/design.md`, decisión D6):

```text
domain/    tipos, catálogo de ambientes, modelo de escena     (sin dependencias)
dsp/       primitivas puras: PRNG, ruido, envolventes, voces  (sin dependencias)
audio/     runtime: contexto, compilador de capas, worklet    (usa domain + dsp)
commands/  gramática, registro, ejecución                     (usa domain, habla con audio por interfaz)
platform/  puertos: almacenamiento, apariencia, actualización de la PWA
styles/    tokens de apariencia y temas                       (CSS, sin lógica)
ui/        React + primitivas de shadcn/ui                    (usa commands + estado observable + styles)
```

Esa dirección se hace cumplir con una regla de ESLint
(`no-restricted-imports` en `eslint.config.js`): `domain/`, `dsp/` y `audio/`
no pueden importar nada de `ui/`, y `commands/` no conoce `platform/` ni
`ui/` — quien necesita un puerto de plataforma o un store de UI lo recibe
inyectado como interfaz (ver `commands/commands.ts`).

El motor de audio compila cada capa declarada en `domain/` a un subgrafo de
`AudioWorklet` y nodos nativos de Web Audio (`audio/layerCompiler.ts`); el
`AmbientMixer` (`audio/ambientMixer.ts`) es la fuente de verdad observable
del estado de reproducción, con la que la UI se sincroniza vía
`useSyncExternalStore` — nunca puede mostrar algo distinto de lo que
realmente suena.

## Mínimas dependencias, aplicado al núcleo de audio

El principio original de este proyecto —el menor número posible de
dependencias— se mantiene intacto donde importa: `domain/`, `dsp/` y
`audio/` no dependen de ninguna librería externa, solo de las APIs
estándar del navegador (Web Audio, `crypto.getRandomValues`). Es lo que
permite que sus tests corran en Node sin un doble de Web Audio y que el
comportamiento sea determinista bajo semilla.

La interfaz sí depende de Tailwind v4 y de primitivas de shadcn/ui,
**copiadas al repositorio** en `ui/primitives/` en lugar de instaladas como
librería (design.md, decisión D12): aporta accesibilidad de teclado/foco ya
resuelta y un sistema de temas basado en variables CSS, sin arrastrar el
núcleo de audio ni quedar a merced de un cambio aguas arriba. El principio
se reformula así: **mínimas dependencias en el núcleo de audio**, no cero
dependencias en toda la aplicación.

## Cómo levantar el proyecto

Requiere Node 24 (ver `.node-version`) y pnpm.

```bash
pnpm install
pnpm dev       # servidor de desarrollo
pnpm build     # build de producción (tsc --noEmit + vite build)
pnpm preview   # sirve el build de producción localmente
```

## Cómo testear

```bash
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint . (incluye la regla de direccion de dependencias)
pnpm format:check  # prettier --check .
pnpm test          # vitest — logica pura y deterministica, corre en Node
pnpm test:signal   # vitest en modo navegador (Chromium real vía Playwright):
                    #   renderiza cada ambiente con OfflineAudioContext y
                    #   verifica los criterios de docs/synthesis-reference.md
pnpm check:tokens  # falla si algun componente de ui/ usa un color, radio o
                    #   sombra literal en vez de un token de styles/tokens.css
```

`pnpm test:signal` necesita un Chromium real (vía `playwright`) porque
`AudioWorkletNode` no existe en Node — es la única forma de que "suena
bien" sea una afirmación comprobable en vez de opinable (design.md,
decisión D8). El workflow de CI (`.github/workflows/ci.yml`) corre todo lo
anterior salvo `test:signal`, que exige un binario de Chromium instalado.

## Cómo añadir un ambiente nuevo

1. Investigar y documentar el modelo físico en
   [`docs/synthesis-reference.md`](docs/synthesis-reference.md): parámetros
   en unidad física con rango y justificación, fuente, y criterios de
   aceptación (perfil espectral, umbral de periodicidad). Ver la sección
   "Regla general" de ese documento antes de empezar.
2. Declarar el ambiente en `domain/ambients/<nombre>.ts` como datos puros —
   sin tocar `audio/` ni `commands/` —, referenciando el modelo por su id
   (p. ej. `"impacto-gota"`). Cada capa (`ContinuousLayerDeclaration`,
   `GranularLayerDeclaration` o `SparseLayerDeclaration`, ver
   `domain/layer.ts`) declara su tipo de ruido, filtro, modulación, ganancia
   e imagen estéreo:

   ```ts
   export const miAmbiente: AmbientDeclaration = {
     id: "mi-ambiente",
     label: "Mi ambiente",
     layers: {
       cuerpo: {
         kind: "continuous",
         model: "flujo-turbulento",
         noise: "white",
         filter: { type: "bandpass", frequencyHz: 1200, q: 0.7 },
         gain: 0.5,
         stereo: { pan: 0, width: 0.6 },
       },
     },
   };
   ```

3. Añadirlo al catálogo en `domain/catalog.ts` (única fuente de verdad: el
   listado de la consola y los argumentos válidos de `play`/`add` se derivan
   de ahí, no se declaran por separado).
4. Añadir el test de señal (`domain/ambients/<nombre>.signal.test.ts`) que
   verifica los criterios declarados en el paso 1 sobre el render real.
5. Escuchar el resultado sin interrupción durante varios minutos y confirmar
   que no revela un patrón perceptible — el protocolo de validación
   perceptual completo está en `docs/synthesis-reference.md`.

## Cómo añadir un tema

La apariencia es un archivo de tokens (`styles/tokens.css`), no código: un
conjunto base en OKLCH con el esquema oscuro como valor por defecto de
`:root` (la clase `.light` sobreescribe al esquema claro), más capas de tema
que redefinen solo lo que las distingue.

1. Añadir un bloque `[data-theme="mi-tema"]` en `styles/tokens.css` con los
   tokens que ese tema cambia frente al base (normalmente `--primary`,
   `--ring` y poco más — todo lo que no se declara se hereda del base). Si
   el tema debe verse distinto también en esquema claro, añadir además
   `[data-theme="mi-tema"].light`.
2. Registrar `{ id: "mi-tema", label: "Mi tema" }` en `domain/themes.ts`: el
   selector de temas y el comando `theme` derivan su listado de ahí.
3. `styles/tokens.contrast.test.ts` verifica automáticamente el contraste AA
   de cada par superficie/texto del tema nuevo, en ambos esquemas — declara
   qué cubre y qué no (no reemplaza revisarlo también a ojo).

## Consola

La interfaz es una consola de comandos con historial, autocompletado y un
panel de estado sincronizado con lo que realmente suena. Comandos
principales (`help` en la aplicación lista todos con su sintaxis exacta):

| Comando                             | Qué hace                                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `play [ambiente]`                   | Reproduce un ambiente sustituyendo la mezcla; sin argumento, reanuda lo conservado tras `stop` |
| `add <ambiente>`                    | Incorpora un ambiente a la mezcla activa sin retirar lo que suena                              |
| `remove <capa>`                     | Retira una capa o un ambiente completo de la mezcla                                            |
| `stop` / `reset`                    | Desvanece conservando la composición / vacía la mezcla                                         |
| `volume [capa] <valor>`             | Fija el volumen maestro o el de una capa concreta                                              |
| `list` / `status`                   | Catálogo de ambientes / mezcla activa y sus volúmenes                                          |
| `scene save / load / list / delete` | Guarda, carga, lista o elimina escenas con nombre                                              |
| `theme` / `scheme`                  | Selecciona tema visual / esquema claro-oscuro                                                  |
| `update`                            | Aplica una actualización de la aplicación, si hay alguna pendiente                             |

Los prefijos `/` y `.` funcionan como forma abreviada de invocación.

## Persistencia y modo offline

Configuración, escenas y la última mezcla se guardan localmente
(`localStorage`, con un sobre versionado `{ version, data }` — ver
`platform/storage.ts`) y nunca salen del dispositivo. Tras la primera carga,
la aplicación arranca y reproduce sin conexión a red; las actualizaciones no
interrumpen una reproducción en curso, se aplican solas cuando no hay nada
sonando y se avisan (comando `update`) cuando sí lo hay.

## Licencia

[MIT](LICENSE).

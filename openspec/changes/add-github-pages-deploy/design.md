## Context

El repositorio ya tiene `ci.yml` (typecheck, lint, format, tests, tests de
señal, contrato de tokens, build) disparado en push a cualquier rama y en
PR. Falta el paso de publicación. El propietario ya:

- Activó GitHub Pages en el repositorio con "Source: GitHub Actions".

Se intentó dominio propio (`darkecho.qd.je`, gratuito vía DigitalPlat) con un
`CNAME darkecho → davidrodriguezsilva.github.io.` (TTL 300s). El registro
nunca resolvió: consultado directo contra los nameservers autoritativos de
DigitalPlat (`dns1`/`dns2.digitalplat.org`) y contra 1.1.1.1/8.8.8.8, la
respuesta fue siempre "sin registros" — ni con el TTL declarado, ni 8 horas
después, ni tras forzar un reintento desde su panel ("eliminación en cola y
registro en cola" quedó atascado). Se abandonó el dominio propio; el sitio
vive en `davidrodriguezsilva.github.io/dark-echo/`.

La rama principal del repo es `main` (no `master`, que es lo que asumía el
snippet de partida).

## Goals / Non-Goals

- Goals: pipeline de deploy que reutiliza la verificación de `ci.yml` como
  puerta, build con la ruta base correcta para la URL de proyecto de GitHub
  Pages, publicación vía Actions oficiales de GitHub Pages.
- Non-Goals: automatizar versionado, exponer la versión en la UI, dominio
  propio (abandonado — ver Context).

## Decisions

- **Decision**: `ci.yml` como workflow reusable (`workflow_call`), invocado
  por `deploy.yml` antes de construir. Alternativas consideradas:
  `workflow_run` (dispara tras que CI termine en `main` — relación indirecta,
  más difícil de leer en la UI de Actions y de depurar si falla) y un
  `deploy.yml` autocontenido que repite los pasos de verificación (duplica
  mantenimiento, se desincroniza de `ci.yml` con el tiempo). Reusable
  workflow es la opción sin duplicación y con la relación CI→Deploy explícita
  en el grafo de jobs.
- **Decision**: la ruta base de Vite es `/dark-echo/`, fijada por
  `VITE_BASE_PATH` en el build de `deploy.yml` y leída en `vite.config.ts`
  (default `/` sin la variable, para desarrollo local). Se consideró dejarla
  en `/` cuando el plan era dominio propio — con dominio propio en la raíz
  cualquier base distinta de `/` rompe rutas absolutas — pero el dominio se
  abandonó (ver Context) y sin él GitHub Pages solo sirve bajo
  `/dark-echo/`. La base alimenta también `scope`/`start_url` e íconos del
  manifest de la PWA (antes hardcodeados a `/`); las `og:image`/
  `twitter:image` de `index.html` se hicieron absolutas a mano porque Vite
  solo reescribe `src`/`href` de las etiquetas que reconoce en `index.html`,
  no el atributo `content` de `<meta>`.
- **Decision**: trigger de deploy en push a `main` (rama real del repo), no
  `master`.
- **Decision**: versionado fuera de alcance salvo el proceso manual ya
  existente (bump de `package.json` + tag de git antes de publicar). No se
  añade automatización ni superficie en la interfaz en este change.

## Risks / Trade-offs

- Reusar `ci.yml` como workflow_call implica que un cambio futuro a `ci.yml`
  afecta también al gate de deploy; es el comportamiento deseado (evita
  desincronización) pero hay que tenerlo presente al tocar ese archivo.
- Si en el futuro se retoma un dominio propio, hay que revertir: base a `/`
  en `vite.config.ts` (quitar `VITE_BASE_PATH` de `deploy.yml`), `og:image`/
  `twitter:image` de vuelta a ruta relativa, y volver a configurar el
  dominio en Settings → Pages.

## Migration Plan

No aplica — no hay pipeline de deploy previo que migrar.

## Open Questions

- Ninguna abierta.

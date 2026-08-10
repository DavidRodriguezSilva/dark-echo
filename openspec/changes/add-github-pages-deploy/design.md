## Context

El repositorio ya tiene `ci.yml` (typecheck, lint, format, tests, tests de
señal, contrato de tokens, build) disparado en push a cualquier rama y en
PR. Falta el paso de publicación. El propietario ya:

- Activó GitHub Pages en el repositorio con "Source: GitHub Actions".
- Configuró el dominio personalizado `darkecho.qd.je` en Settings → Pages.
- Creó un registro DNS `CNAME darkecho → davidrodriguezsilva.github.io.`
  (TTL 300s) en el proveedor del dominio.

La rama principal del repo es `main` (no `master`, que es lo que asumía el
snippet de partida).

## Goals / Non-Goals

- Goals: pipeline de deploy que reutiliza la verificación de `ci.yml` como
  puerta, build con la ruta base correcta para dominio propio, publicación
  vía Actions oficiales de GitHub Pages.
- Non-Goals: automatizar versionado, exponer la versión en la UI, resolver
  la propagación DNS de `darkecho.qd.je` (ajeno al código).

## Decisions

- **Decision**: `ci.yml` como workflow reusable (`workflow_call`), invocado
  por `deploy.yml` antes de construir. Alternativas consideradas:
  `workflow_run` (dispara tras que CI termine en `main` — relación indirecta,
  más difícil de leer en la UI de Actions y de depurar si falla) y un
  `deploy.yml` autocontenido que repite los pasos de verificación (duplica
  mantenimiento, se desincroniza de `ci.yml` con el tiempo). Reusable
  workflow es la opción sin duplicación y con la relación CI→Deploy explícita
  en el grafo de jobs.
- **Decision**: la ruta base de Vite se queda en `/` (default), sin
  `VITE_BASE_PATH`. Con dominio propio en la raíz, cualquier base distinta de
  `/` rompe rutas absolutas (`/favicon.svg`, `/pwa-*.png`, manifest
  `scope`/`start_url`). El `/dark-echo/` del snippet de ChatGPT solo aplica
  si se sirviera en `usuario.github.io/dark-echo/` sin dominio propio.
- **Decision**: trigger de deploy en push a `main` (rama real del repo), no
  `master`.
- **Decision**: versionado fuera de alcance salvo el proceso manual ya
  existente (bump de `package.json` + tag de git antes de publicar). No se
  añade automatización ni superficie en la interfaz en este change.

## Risks / Trade-offs

- El primer deploy puede tardar en quedar accesible por `darkecho.qd.je`
  hasta que el CNAME resuelva — no bloquea el merge de este change, sí la
  verificación final en el dominio propio. Mientras tanto, el sitio queda
  accesible en `davidrodriguezsilva.github.io/dark-echo/` (el dominio
  default de Pages, con su propia base — no la que usa `darkecho.qd.je`).
- Reusar `ci.yml` como workflow_call implica que un cambio futuro a `ci.yml`
  afecta también al gate de deploy; es el comportamiento deseado (evita
  desincronización) pero hay que tenerlo presente al tocar ese archivo.

## Migration Plan

No aplica — no hay pipeline de deploy previo que migrar.

## Open Questions

- Ninguna abierta tras esta ronda; el propietario resuelve la propagación
  DNS por su cuenta en paralelo.

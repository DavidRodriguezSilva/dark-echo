# Change: Publicar dark echo en GitHub Pages con dominio propio

## Why

dark echo no tiene hoy ningún camino de publicación: existe `ci.yml`, que
verifica cada push, pero nada construye y despliega el sitio. Sin eso, la PWA
—pensada para instalarse y usarse sin conexión— no es alcanzable por nadie
fuera de una máquina de desarrollo. El dueño del proyecto ya reservó
`darkecho.qd.je` como dominio propio y activó GitHub Pages con dominio
personalizado en la configuración del repositorio; falta el workflow que
construya y publique en cada push a `main`.

## What Changes

- **`ci.yml` gana un trigger `workflow_call`**, sin tocar sus pasos: pasa a
  poder invocarse como workflow reusable además de dispararse por push/PR
  como hoy.
- **Nuevo `deploy.yml`**: en push a `main` (o `workflow_dispatch`), invoca
  `ci.yml` como puerta de verificación y, solo si pasa, construye con
  `pnpm build` y publica con `actions/configure-pages` +
  `actions/upload-pages-artifact` + `actions/deploy-pages`.
- **Sin cambio en la ruta base de Vite**: se mantiene la raíz (`/`), el
  default de Vite. El snippet de partida (de ChatGPT) fijaba
  `VITE_BASE_PATH: /dark-echo/`, correcto solo para un *project site* servido
  en `usuario.github.io/dark-echo/`; con dominio propio en la raíz, esa base
  rompería todas las rutas absolutas del `index.html`, el manifest de la PWA
  (`scope`/`start_url: "/"`) y el service worker.
- **Versionado**: sin automatización ni superficie en la interfaz por ahora.
  El release sigue siendo bump manual de `version` en `package.json` + tag de
  git antes de empujar a `main`. Fuera de alcance de este change: mostrar la
  versión en la app o automatizar el bump (`changesets` u otra herramienta).

## Impact

- Affected specs: ninguna — change de infraestructura/tooling, sin
  capacidades de producto nuevas ni modificadas.
- Affected code: `.github/workflows/ci.yml` (trigger nuevo, sin cambios de
  pasos), `.github/workflows/deploy.yml` (nuevo).
- Fuera de este change: la resolución DNS de `darkecho.qd.je` — el registro
  CNAME está configurado pero no resuelve todavía desde ningún resolver
  externo probado; es un problema del lado del proveedor de DNS, no del
  código ni del workflow.

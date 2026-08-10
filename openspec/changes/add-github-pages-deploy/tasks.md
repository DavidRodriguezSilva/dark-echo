## 1. CI reusable

- [x] 1.1 Añadir el trigger `workflow_call` a `ci.yml` sin modificar sus jobs/pasos.

## 2. Workflow de deploy

- [x] 2.1 Crear `.github/workflows/deploy.yml`: trigger en push a `main` y `workflow_dispatch`, permisos (`contents: read`, `pages: write`, `id-token: write`), `concurrency` con grupo `pages`.
- [x] 2.2 Job `ci`: `uses: ./.github/workflows/ci.yml` como puerta previa.
- [x] 2.3 Job `build` (needs `ci`): checkout, pnpm/Node (mismas versiones que `ci.yml`, vía `.node-version`), `pnpm install --frozen-lockfile`, `pnpm build` con `VITE_BASE_PATH: /dark-echo/`, `actions/configure-pages`, `actions/upload-pages-artifact` con `path: ./dist`.
- [x] 2.4 Job `deploy` (needs `build`): `environment: github-pages`, `actions/deploy-pages` como único paso.

## 3. Base de proyecto (dominio propio abandonado)

- [x] 3.1 `vite.config.ts`: `base` desde `VITE_BASE_PATH` (default `/`), manifest de la PWA (`scope`, `start_url`, íconos) derivado de esa misma base.
- [x] 3.2 `index.html`: `og:image`/`twitter:image` como URL absoluta a `davidrodriguezsilva.github.io/dark-echo/...`.
- [x] 3.3 Ajustar el environment `github-pages` en Settings para que permita desplegar desde `main` (bloqueaba con "Branch main is not allowed to deploy... environment protection rules").
- [ ] 3.4 Quitar el dominio personalizado `darkecho.qd.je` de Settings → Pages, ya abandonado.

## 4. Verificación

- [x] 4.1 Push a `main` y confirmar que `deploy.yml` corre en verde (CI → build → deploy) en la pestaña Actions.
- [ ] 4.2 Confirmar que el sitio publicado carga en `davidrodriguezsilva.github.io/dark-echo/`, que el manifest/service worker se registran con `scope: "/dark-echo/"` y que la app es instalable.

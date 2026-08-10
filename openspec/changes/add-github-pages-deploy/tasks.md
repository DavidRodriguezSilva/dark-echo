## 1. CI reusable

- [x] 1.1 Añadir el trigger `workflow_call` a `ci.yml` sin modificar sus jobs/pasos.

## 2. Workflow de deploy

- [x] 2.1 Crear `.github/workflows/deploy.yml`: trigger en push a `main` y `workflow_dispatch`, permisos (`contents: read`, `pages: write`, `id-token: write`), `concurrency` con grupo `pages`.
- [x] 2.2 Job `ci`: `uses: ./.github/workflows/ci.yml` como puerta previa.
- [x] 2.3 Job `build` (needs `ci`): checkout, pnpm/Node (mismas versiones que `ci.yml`, vía `.node-version`), `pnpm install --frozen-lockfile`, `pnpm build` (sin `VITE_BASE_PATH`, base raíz), `actions/configure-pages`, `actions/upload-pages-artifact` con `path: ./dist`.
- [x] 2.4 Job `deploy` (needs `build`): `environment: github-pages`, `actions/deploy-pages` como único paso.

## 3. Verificación

- [ ] 3.1 Push a `main` y confirmar que `deploy.yml` corre en verde (CI → build → deploy) en la pestaña Actions.
- [ ] 3.2 Confirmar que el sitio publicado carga en `davidrodriguezsilva.github.io/dark-echo/` (URL default de Pages) mientras se resuelve el DNS.
- [ ] 3.3 Una vez `darkecho.qd.je` resuelva, confirmar que carga ahí también, que el manifest/service worker se registran con `scope: "/"` y que la app es instalable.

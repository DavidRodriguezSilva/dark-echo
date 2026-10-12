# Change: Publicar dark echo en GitHub Pages

## Why

dark echo no tiene hoy ningún camino de publicación: existe `ci.yml`, que
verifica cada push, pero nada construye y despliega el sitio. Sin eso, la PWA
—pensada para instalarse y usarse sin conexión— no es alcanzable por nadie
fuera de una máquina de desarrollo. Se intentó publicar bajo dominio propio
(`darkecho.qd.je`, gratuito vía DigitalPlat), pero se abandonó por el DNS
descrito en "What Changes"; el sitio queda en la URL de proyecto por defecto
de GitHub Pages.

## What Changes

- **`ci.yml` gana un trigger `workflow_call`**, sin tocar sus pasos: pasa a
  poder invocarse como workflow reusable además de dispararse por push/PR
  como hoy.
- **Nuevo `deploy.yml`**: en push a `main` (o `workflow_dispatch`), invoca
  `ci.yml` como puerta de verificación y, solo si pasa, construye con
  `pnpm build` y publica con `actions/configure-pages` +
  `actions/upload-pages-artifact` + `actions/deploy-pages`.
- **Ruta base de Vite fijada a `/dark-echo/`** vía `VITE_BASE_PATH` en el
  build de `deploy.yml`, leída en `vite.config.ts` (default `/` para
  desarrollo local, sin la variable). El dominio propio (`darkecho.qd.je`) se
  intentó primero — con él la base debía quedarse en la raíz — pero el
  registro CNAME nunca llegó a resolver desde el proveedor (DigitalPlat,
  dominio gratuito `.qd.je`) ni siquiera después de 8 horas y de forzar un
  reintento desde su panel, así que se abandonó y el sitio pasa a vivir en
  `davidrodriguezsilva.github.io/dark-echo/`, la URL de proyecto por defecto.
  Eso obliga a: `scope`/`start_url` del manifest de la PWA derivados de esa
  misma base (antes hardcodeados a `/`), rutas de íconos del manifest con el
  prefijo, y las `og:image`/`twitter:image` de `index.html` como URL
  absoluta (Vite no reescribe el atributo `content` de `<meta>`, solo
  `src`/`href` de las etiquetas que reconoce).
- **Versionado**: sin automatización ni superficie en la interfaz por ahora.
  El release sigue siendo bump manual de `version` en `package.json` + tag de
  git antes de empujar a `main`. Fuera de alcance de este change: mostrar la
  versión en la app o automatizar el bump (`changesets` u otra herramienta).

## Impact

- Affected specs: ninguna — change de infraestructura/tooling, sin
  capacidades de producto nuevas ni modificadas.
- Affected code: `.github/workflows/ci.yml` (trigger nuevo, sin cambios de
  pasos), `.github/workflows/deploy.yml` (nuevo), `vite.config.ts` (base +
  manifest de la PWA derivados de `VITE_BASE_PATH`), `index.html`
  (`og:image`/`twitter:image` absolutas).
- Fuera de este change: `darkecho.qd.je` queda sin usar — su registro CNAME
  nunca resolvió desde los nameservers de DigitalPlat pese a esperar y
  reintentar desde su panel. Si en el futuro se retoma un dominio propio, hay
  que revertir la base a `/` (ver `design.md`) y quitar el dominio en
  Settings → Pages si sigue configurado.

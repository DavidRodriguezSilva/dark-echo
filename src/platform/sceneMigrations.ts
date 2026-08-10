import type { Migration } from "./storage";

/**
 * Historia del formato de escena (session-persistence, "Formato almacenado
 * versionado"), compartida por las escenas guardadas y por el recuerdo de la
 * ultima mezcla, que persisten la misma forma de dato.
 *
 * - **v1** — `{ layers: Record<"<ambiente>.<capa>", volumen> }`, el formato del
 *   motor de ambientes retirado.
 * - **v2** — anade `environment`, `occlusion` y `modifiers`, los componentes de
 *   escena del motor de composicion (change `retire-legacy-engine`).
 *
 * La migracion v1 -> v2 es la **identidad**, y conviene decir por que en vez de
 * dejarlo como una curiosidad: el id de capa `"<ambiente>.<capa>"` es identico
 * en los dos motores, porque el motor de composicion reutiliza las mismas
 * declaraciones de `domain/ambients/`. Los tres campos nuevos son opcionales,
 * asi que una escena v1 ya *es* una escena v2 sin componentes de escena. No hay
 * nada que transformar; lo unico que hacia falta era declarar que la version
 * anterior sigue siendo legible, para que `readVersioned` no la descarte.
 */
export const SCENE_FORMAT_VERSION = 2;

export const SCENE_MIGRATIONS: Migration[] = [{ fromVersion: 1, migrate: (data) => data }];

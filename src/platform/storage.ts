/**
 * Puerto de almacenamiento local (design.md D9, session-persistence): un
 * sobre versionado `{ version, data }` por cada registro. Un almacenamiento
 * ausente, ilegible o de escritura denegada MUST NOT impedir que la
 * aplicacion arranque (session-persistence, "Tolerancia a almacenamiento
 * dañado o no disponible") — de ahi que ambas operaciones nunca lancen.
 *
 * `readFromStorage`/`writeToStorage` cubren el caso simple sin migracion
 * (historial de comandos, apariencia). `readVersioned` anade migracion en
 * cadena entre versiones para los registros de la tarea 14 (configuracion,
 * escenas, ultima mezcla), que sí pueden evolucionar de formato.
 */

export interface StorageEnvelope<T> {
  version: number;
  data: T;
}

export function readFromStorage<T>(key: string, currentVersion: number): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;

    const envelope = JSON.parse(raw) as Partial<StorageEnvelope<T>>;
    if (envelope.version !== currentVersion || envelope.data === undefined) {
      return undefined;
    }
    return envelope.data;
  } catch {
    return undefined;
  }
}

export function writeToStorage<T>(key: string, currentVersion: number, data: T): boolean {
  try {
    const envelope: StorageEnvelope<T> = { version: currentVersion, data };
    localStorage.setItem(key, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

/**
 * Migra un dato de una version anterior a la vigente (session-persistence,
 * "Formato almacenado versionado"). `fromVersion` es la version que esta
 * migracion sabe transformar; se aplican en cadena hasta alcanzar la
 * version actual o hasta que ninguna migracion siga la cadena.
 */
export interface Migration {
  fromVersion: number;
  /** Devuelve `unknown` porque una migracion intermedia en la cadena no produce necesariamente el tipo final. */
  migrate: (data: unknown) => unknown;
}

export type ReadOutcome<T> =
  | { status: "absent" }
  | { status: "ok"; data: T }
  | { status: "migrated"; data: T }
  | { status: "discarded" };

/**
 * Lee un registro versionado aplicando migraciones en cadena cuando la
 * version guardada es anterior a la vigente. Si no hay migracion que la
 * alcance, el dato se descarta (session-persistence, "Version no
 * migrable"): quien llama decide como informar de ese descarte.
 */
export function readVersioned<T>(
  key: string,
  currentVersion: number,
  migrations: Migration[] = []
): ReadOutcome<T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { status: "absent" };

    const envelope = JSON.parse(raw) as { version?: unknown; data?: unknown };
    if (envelope.data === undefined || typeof envelope.version !== "number") {
      return { status: "discarded" };
    }

    if (envelope.version === currentVersion) {
      return { status: "ok", data: envelope.data as T };
    }

    let version: number = envelope.version;
    let data: unknown = envelope.data;
    while (version < currentVersion) {
      const migration = migrations.find((m) => m.fromVersion === version);
      if (!migration) return { status: "discarded" };
      data = migration.migrate(data);
      version += 1;
    }

    writeToStorage(key, currentVersion, data as T);
    return { status: "migrated", data: data as T };
  } catch {
    return { status: "discarded" };
  }
}

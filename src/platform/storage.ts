/**
 * Puerto de almacenamiento local (design.md D9, session-persistence): un
 * sobre versionado `{ version, data }` por cada registro. Un almacenamiento
 * ausente, ilegible o de escritura denegada MUST NOT impedir que la
 * aplicacion arranque (session-persistence, "Tolerancia a almacenamiento
 * dañado o no disponible") — de ahi que ambas operaciones nunca lancen.
 *
 * Version minima, adelantada a la tarea 14.1 porque el historial de
 * comandos (tarea 12.3) ya necesita persistir algo: cubre lectura/escritura
 * con el sobre versionado, sin migracion entre versiones todavia (eso es
 * competencia completa de la tarea 14.6, cuando existan datos de un formato
 * anterior que migrar).
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

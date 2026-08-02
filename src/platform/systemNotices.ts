/**
 * Avisos del sistema que no son respuesta directa a un comando: datos de
 * almacenamiento ausentes, corruptos o de escritura denegada
 * (session-persistence, "Tolerancia a almacenamiento dañado o no
 * disponible") y actualizaciones disponibles (offline-playback,
 * "Actualización no disruptiva"). Este store observable (design.md D7) es
 * el canal — la consola se suscribe y muestra cada aviso como una linea
 * mas, igual que cualquier otro mensaje del sistema.
 *
 * `pushOnce` evita repetir el mismo aviso en cada cambio: la escritura
 * denegada no cambia de una vez a la siguiente dentro de una misma sesion.
 */
type Listener = () => void;

export class SystemNoticeStore {
  private notices: string[] = [];
  private readonly listeners = new Set<Listener>();
  private readonly warnedKeys = new Set<string>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): string[] => this.notices;

  push(message: string): void {
    this.notices = [...this.notices, message];
    for (const listener of this.listeners) listener();
  }

  pushOnce(key: string, message: string): void {
    if (this.warnedKeys.has(key)) return;
    this.warnedKeys.add(key);
    this.push(message);
  }
}

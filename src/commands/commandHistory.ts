/**
 * Historial de comandos navegable (command-console, "Historial de comandos
 * navegable y persistente"): logica pura, sin DOM ni almacenamiento — quien
 * la use decide como persistirla (ver platform/storage.ts) y como
 * conectarla al teclado.
 */
export class CommandHistory {
  private entries: string[];
  private readonly maxEntries: number;
  // null: el usuario esta en su borrador actual, no navegando.
  private cursor: number | null = null;
  private draft = "";

  constructor(initialEntries: string[] = [], maxEntries = 200) {
    this.maxEntries = maxEntries;
    this.entries = initialEntries.slice(-maxEntries);
  }

  /** Registra un comando ejecutado. Entradas consecutivas identicas no se duplican. */
  push(command: string): void {
    if (this.entries[this.entries.length - 1] !== command) {
      this.entries.push(command);
      if (this.entries.length > this.maxEntries) this.entries.shift();
    }
    this.cursor = null;
    this.draft = "";
  }

  /** Navega hacia atras (mas antiguo). `currentDraft` es lo que el usuario tenia escrito. */
  navigateBack(currentDraft: string): string | null {
    if (this.entries.length === 0) return null;

    if (this.cursor === null) {
      this.draft = currentDraft;
      this.cursor = this.entries.length - 1;
    } else if (this.cursor > 0) {
      this.cursor--;
    }

    return this.entries[this.cursor];
  }

  /** Navega hacia adelante (mas reciente); mas alla del ultimo, vuelve al borrador. */
  navigateForward(): string | null {
    if (this.cursor === null) return null;

    if (this.cursor >= this.entries.length - 1) {
      this.cursor = null;
      return this.draft;
    }

    this.cursor++;
    return this.entries[this.cursor];
  }

  getEntries(): readonly string[] {
    return this.entries;
  }
}

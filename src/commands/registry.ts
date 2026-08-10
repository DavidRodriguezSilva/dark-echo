import type { CommandDescriptor } from "./types";

/** Distancia de edicion (Levenshtein) para sugerir comandos ante un nombre desconocido. */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[a.length][b.length];
}

export class CommandRegistry {
  private readonly byName = new Map<string, CommandDescriptor>();

  register(descriptor: CommandDescriptor): void {
    this.byName.set(descriptor.name, descriptor);
    for (const alias of descriptor.aliases) this.byName.set(alias, descriptor);
  }

  find(name: string): CommandDescriptor | undefined {
    return this.byName.get(name);
  }

  /** Comandos declarados, sin duplicar por cada alias que apunte al mismo. */
  list(): CommandDescriptor[] {
    return [...new Set(this.byName.values())];
  }

  /** Comandos existentes mas proximos a `name` por distancia de edicion. */
  findClosest(name: string, maxDistance = 2): CommandDescriptor[] {
    return this.list()
      .map((descriptor) => ({ descriptor, distance: editDistance(name, descriptor.name) }))
      .filter(({ distance }) => distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .map(({ descriptor }) => descriptor);
  }
}

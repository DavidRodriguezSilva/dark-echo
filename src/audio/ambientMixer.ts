import type { AmbientDeclaration } from "../domain/ambient";
import { findAmbient, listAmbients } from "../domain/catalog";
import type { Scene } from "../domain/scene";
import { MAX_SIMULTANEOUS_LAYERS, WorkletEngine } from "./workletEngine";

/**
 * Mezclador por ambientes (command-console, "Vocabulario de comandos y
 * semantica de la mezcla"): traduce `play`/`add`/`remove`/`stop`/`reset` a
 * operaciones sobre `WorkletEngine`, que solo conoce capas individuales, no
 * ambientes. Cada capa se direcciona como `"<ambiente>.<capa>"` para que dos
 * ambientes con una capa del mismo nombre (p. ej. "cuerpo") no colisionen.
 *
 * Es tambien la fuente de verdad observable del estado de reproduccion
 * (design.md D7): expone `subscribe`/`getSnapshot` para `useSyncExternalStore`,
 * de modo que el panel de estado nunca pueda desincronizarse del audio real.
 */

export interface MixerResult {
  ok: boolean;
  message: string;
}

export interface LayerSnapshot {
  id: string;
  volume: number;
}

/**
 * Estado de reposo explicito (command-console, "Panel de estado del
 * sistema"): distingue "nunca hubo nada" de "detenido, listo para reanudar"
 * de "sonando" de "suspendido por el entorno" (offline-playback, "Suspension
 * impuesta por el entorno") — capas activas cuyo contexto de audio esta
 * suspendido no estan sonando, aunque siguen registradas.
 */
export type MixSnapshot =
  | { kind: "empty" }
  | { kind: "stopped"; layers: LayerSnapshot[] }
  | { kind: "playing"; layers: LayerSnapshot[] }
  | { kind: "suspended"; layers: LayerSnapshot[] };

export interface PlaybackSnapshot {
  mix: MixSnapshot;
  masterVolume: number;
}

type Listener = () => void;

/** Composicion inicial para restaurar al construir (session-persistence, "Restauracion de la ultima mezcla"). */
export interface InitialMix {
  masterVolume?: number;
  composition?: Record<string, number>;
}

export class AmbientMixer {
  private readonly engine = new WorkletEngine();
  // Snapshot tomado en `stop()` o restaurado al construir: id de capa ->
  // volumen, para que `play` sin argumento reanude exactamente esa
  // composicion (command-console, "stop conserva la composicion"; y
  // session-persistence, "Restauracion de la ultima mezcla" — arranca en
  // estado detenido y una sola accion basta para reanudarla).
  private conservedComposition: Map<string, number> | null = null;
  private readonly listeners = new Set<Listener>();
  private snapshot: PlaybackSnapshot = { mix: { kind: "empty" }, masterVolume: 0.5 };

  constructor(initial?: InitialMix) {
    if (initial?.masterVolume !== undefined) {
      this.engine.setMasterVolume(initial.masterVolume);
    }
    if (initial?.composition && Object.keys(initial.composition).length > 0) {
      this.conservedComposition = new Map(Object.entries(initial.composition));
    }
    this.publish();

    // Al recuperar la visibilidad, el estado mostrado debe coincidir con lo
    // que realmente suena (offline-playback, "Recuperacion de la
    // visibilidad"): esto no cambia nada por si solo, solo vuelve a publicar
    // por si el entorno suspendio el contexto mientras la pagina no era
    // visible. Perder la visibilidad MUST NOT detener nada por decision
    // propia, así que no hay handler para ese lado del evento.
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === "visible") {
      this.publish();
    }
  };

  private layerId(ambientId: string, layerKey: string): string {
    return `${ambientId}.${layerKey}`;
  }

  private seedFor(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return hash || 1;
  }

  private unknownAmbientMessage(ambientId: string): string {
    const ids = listAmbients()
      .map((a) => a.id)
      .join(", ");
    return `"${ambientId}" no existe. Disponibles: ${ids}.`;
  }

  private currentLayers(): LayerSnapshot[] {
    return this.engine.activeLayerIds.map((id) => ({
      id,
      volume: this.engine.getLayerVolume(id) ?? 0,
    }));
  }

  private layerDeclaration(id: string) {
    const [ambientId, layerKey] = id.split(".");
    return findAmbient(ambientId)?.layers[layerKey];
  }

  private publish(): void {
    const layers = this.currentLayers();
    const mix: MixSnapshot =
      layers.length > 0
        ? { kind: this.engine.getContextState() === "suspended" ? "suspended" : "playing", layers }
        : this.conservedComposition
          ? {
              kind: "stopped",
              layers: [...this.conservedComposition].map(([id, volume]) => ({ id, volume })),
            }
          : { kind: "empty" };

    this.snapshot = { mix, masterVolume: this.engine.getMasterVolume() };
    for (const listener of this.listeners) listener();
  }

  /** Para `useSyncExternalStore`: se suscribe a cada cambio de estado. */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Para `useSyncExternalStore`: la referencia solo cambia cuando el estado cambia. */
  getSnapshot = (): PlaybackSnapshot => this.snapshot;

  private async addAmbientLayers(
    ambient: AmbientDeclaration,
    ambientId: string
  ): Promise<MixerResult> {
    const keys = Object.keys(ambient.layers).filter(
      (key) => !this.engine.activeLayerIds.includes(this.layerId(ambientId, key))
    );

    if (this.engine.activeLayerIds.length + keys.length > MAX_SIMULTANEOUS_LAYERS) {
      return {
        ok: false,
        message: `No hay sitio: "${ambientId}" necesita ${keys.length} capa(s) mas y el limite es ${MAX_SIMULTANEOUS_LAYERS}.`,
      };
    }

    for (const key of keys) {
      const id = this.layerId(ambientId, key);
      const result = await this.engine.addLayer(id, ambient.layers[key], this.seedFor(id));
      if (!result.ok) {
        this.publish();
        return { ok: false, message: result.reason };
      }
    }

    this.publish();
    return { ok: true, message: `${ambientId} sonando.` };
  }

  async play(ambientId?: string): Promise<MixerResult> {
    if (!ambientId) {
      if (this.engine.activeLayerIds.length > 0 && this.engine.getContextState() === "suspended") {
        return this.resumeSuspended();
      }
      return this.resume();
    }

    const ambient = findAmbient(ambientId);
    if (!ambient) {
      return { ok: false, message: this.unknownAmbientMessage(ambientId) };
    }

    for (const id of this.engine.activeLayerIds) {
      this.engine.removeLayer(id);
    }
    this.conservedComposition = null;

    const result = await this.addAmbientLayers(ambient, ambientId);
    if (!result.ok) return result;

    return { ok: true, message: `Reproduciendo ${ambientId}: sustituyó la mezcla anterior.` };
  }

  async add(ambientId: string): Promise<MixerResult> {
    const ambient = findAmbient(ambientId);
    if (!ambient) {
      return { ok: false, message: this.unknownAmbientMessage(ambientId) };
    }
    return this.addAmbientLayers(ambient, ambientId);
  }

  remove(target: string): MixerResult {
    const ambient = findAmbient(target);
    if (ambient) {
      const ids = Object.keys(ambient.layers).map((key) => this.layerId(target, key));
      const activeIds = ids.filter((id) => this.engine.activeLayerIds.includes(id));
      if (activeIds.length === 0) {
        return { ok: false, message: `"${target}" no está sonando.` };
      }
      for (const id of activeIds) this.engine.removeLayer(id);
      this.publish();
      return { ok: true, message: `${target} retirado.` };
    }

    if (!this.engine.activeLayerIds.includes(target)) {
      return { ok: false, message: `La capa "${target}" no está activa.` };
    }
    this.engine.removeLayer(target);
    this.publish();
    return { ok: true, message: `${target} retirado.` };
  }

  stop(): MixerResult {
    const active = this.engine.activeLayerIds;
    if (active.length === 0) {
      return { ok: false, message: "No hay nada sonando." };
    }

    this.conservedComposition = new Map(
      active.map((id) => [id, this.engine.getLayerVolume(id) ?? 1])
    );
    this.engine.stopAll();
    this.publish();

    return {
      ok: true,
      message: 'Reproducción detenida. La mezcla se conserva; "play" la reanuda.',
    };
  }

  private async resume(): Promise<MixerResult> {
    if (!this.conservedComposition || this.conservedComposition.size === 0) {
      return { ok: false, message: "No hay mezcla que reanudar." };
    }

    const snapshot = this.conservedComposition;
    const ambientIds = new Set([...snapshot.keys()].map((id) => id.split(".")[0]));

    for (const ambientId of ambientIds) {
      const ambient = findAmbient(ambientId);
      if (!ambient) continue;
      const result = await this.addAmbientLayers(ambient, ambientId);
      if (!result.ok) return result;
    }

    for (const [id, volume] of snapshot) {
      this.engine.setLayerVolume(id, volume);
    }

    this.conservedComposition = null;
    this.publish();
    return { ok: true, message: "Reproducción reanudada." };
  }

  /**
   * La unica accion que hace falta para reanudar tras una suspension
   * impuesta por el entorno (offline-playback, "Suspension impuesta por el
   * entorno"): las capas siguen registradas, solo el contexto necesita
   * reanudarse. `play()` sin argumento la invoca automaticamente.
   */
  async resumeSuspended(): Promise<MixerResult> {
    const result = await this.engine.resumeIfSuspended();
    if (!result.ok) return { ok: false, message: result.reason };
    this.publish();
    return { ok: true, message: "Reproducción reanudada." };
  }

  reset(): MixerResult {
    for (const id of this.engine.activeLayerIds) this.engine.removeLayer(id);
    this.conservedComposition = null;
    this.publish();
    return { ok: true, message: "Mezcla vaciada." };
  }

  /**
   * La composicion vigente (sonando o conservada tras `stop`), para guardar
   * como escena o para el recuerdo de la ultima mezcla (session-persistence).
   * `null` cuando no hay nada que guardar.
   */
  getComposition(): Scene | null {
    const { mix } = this.snapshot;
    if (mix.kind === "empty") return null;
    return { layers: Object.fromEntries(mix.layers.map((l) => [l.id, l.volume])) };
  }

  /**
   * Sustituye la mezcla activa por la composicion exacta de una escena
   * (session-persistence, "Guardado y recarga de una escena"): a diferencia
   * de `play`/`resume`, que agrupan por ambiente completo, esto añade
   * exactamente las capas declaradas — necesario porque una escena puede
   * conservar un subconjunto de las capas de un ambiente. El retiro y la
   * incorporacion comparten el mismo desvanecimiento sin clics que ya usan
   * `add`/`remove` (tarea 7.9), así que la transicion entre mezclas es
   * suave y sin corte audible (tarea 14.4).
   */
  async loadComposition(scene: Scene): Promise<MixerResult> {
    const entries = Object.entries(scene.layers);
    if (entries.length > MAX_SIMULTANEOUS_LAYERS) {
      return {
        ok: false,
        message: `La escena necesita ${entries.length} capas y el límite es ${MAX_SIMULTANEOUS_LAYERS}.`,
      };
    }

    for (const id of this.engine.activeLayerIds) {
      this.engine.removeLayer(id);
    }
    this.conservedComposition = null;

    for (const [id] of entries) {
      const declaration = this.layerDeclaration(id);
      if (!declaration) continue;
      const result = await this.engine.addLayer(id, declaration, this.seedFor(id));
      if (!result.ok) {
        this.publish();
        return { ok: false, message: result.reason };
      }
    }

    for (const [id, volume] of entries) {
      this.engine.setLayerVolume(id, volume);
    }

    this.publish();
    return { ok: true, message: "Escena cargada." };
  }

  setMasterVolume(value: number): MixerResult {
    const result = this.engine.setMasterVolume(value);
    if (!result.ok) return { ok: false, message: result.reason };
    this.publish();
    return { ok: true, message: `Volumen maestro: ${value}` };
  }

  setLayerVolume(target: string, value: number): MixerResult {
    if (value < 0 || value > 1) {
      return { ok: false, message: "El volumen debe estar entre 0 y 1." };
    }

    const ambient = findAmbient(target);
    if (ambient) {
      const ids = Object.keys(ambient.layers)
        .map((key) => this.layerId(target, key))
        .filter((id) => this.engine.activeLayerIds.includes(id));
      if (ids.length === 0) {
        return { ok: false, message: `"${target}" no está sonando.` };
      }
      for (const id of ids) this.engine.setLayerVolume(id, value);
      this.publish();
      return { ok: true, message: `Volumen de ${target}: ${value}` };
    }

    if (!this.engine.activeLayerIds.includes(target)) {
      return { ok: false, message: `La capa "${target}" no está activa.` };
    }
    this.engine.setLayerVolume(target, value);
    this.publish();
    return { ok: true, message: `Volumen de ${target}: ${value}` };
  }

  status(): string {
    const { mix } = this.snapshot;
    if (mix.kind === "playing") {
      return `Sonando: ${mix.layers.map((l) => l.id).join(", ")}`;
    }
    if (mix.kind === "suspended") {
      return `Suspendido por el sistema: ${mix.layers.map((l) => l.id).join(", ")}. "play" la reanuda.`;
    }
    if (mix.kind === "stopped") {
      return `Detenido. Mezcla conservada: ${mix.layers.map((l) => l.id).join(", ")}`;
    }
    return "No hay reproducción en curso.";
  }

  get activeLayerIds(): string[] {
    return this.engine.activeLayerIds;
  }
}

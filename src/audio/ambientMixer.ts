import type { AmbientDeclaration } from "../domain/ambient";
import { findAmbient, listAmbients } from "../domain/catalog";
import { MAX_SIMULTANEOUS_LAYERS, WorkletEngine } from "./workletEngine";

/**
 * Mezclador por ambientes (command-console, "Vocabulario de comandos y
 * semantica de la mezcla"): traduce `play`/`add`/`remove`/`stop`/`reset` a
 * operaciones sobre `WorkletEngine`, que solo conoce capas individuales, no
 * ambientes. Cada capa se direcciona como `"<ambiente>.<capa>"` para que dos
 * ambientes con una capa del mismo nombre (p. ej. "cuerpo") no colisionen.
 */

export interface MixerResult {
  ok: boolean;
  message: string;
}

export class AmbientMixer {
  private readonly engine = new WorkletEngine();
  // Snapshot tomado en `stop()`: id de capa -> volumen, para que `play` sin
  // argumento reanude exactamente la misma composicion (command-console,
  // "stop conserva la composicion").
  private conservedComposition: Map<string, number> | null = null;

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
        return { ok: false, message: result.reason };
      }
    }

    return { ok: true, message: `${ambientId} sonando.` };
  }

  async play(ambientId?: string): Promise<MixerResult> {
    if (!ambientId) {
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
      return { ok: true, message: `${target} retirado.` };
    }

    if (!this.engine.activeLayerIds.includes(target)) {
      return { ok: false, message: `La capa "${target}" no está activa.` };
    }
    this.engine.removeLayer(target);
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
    return { ok: true, message: "Reproducción reanudada." };
  }

  reset(): MixerResult {
    for (const id of this.engine.activeLayerIds) this.engine.removeLayer(id);
    this.conservedComposition = null;
    return { ok: true, message: "Mezcla vaciada." };
  }

  setMasterVolume(value: number): MixerResult {
    const result = this.engine.setMasterVolume(value);
    return result.ok
      ? { ok: true, message: `Volumen maestro: ${value}` }
      : { ok: false, message: result.reason };
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
      return { ok: true, message: `Volumen de ${target}: ${value}` };
    }

    if (!this.engine.activeLayerIds.includes(target)) {
      return { ok: false, message: `La capa "${target}" no está activa.` };
    }
    this.engine.setLayerVolume(target, value);
    return { ok: true, message: `Volumen de ${target}: ${value}` };
  }

  status(): string {
    const active = this.engine.activeLayerIds;
    if (active.length > 0) {
      return `Sonando: ${active.join(", ")}`;
    }
    if (this.conservedComposition) {
      return `Detenido. Mezcla conservada: ${[...this.conservedComposition.keys()].join(", ")}`;
    }
    return "No hay reproducción en curso.";
  }

  get activeLayerIds(): string[] {
    return this.engine.activeLayerIds;
  }
}

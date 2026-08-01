import type { LayerDeclaration } from "../domain/layer";
import { getAudioContext } from "./context";
import { compileLayer, type CompiledLayer } from "./layerCompiler";
import { rampToValue } from "./transitions";

/**
 * Motor de audio sobre `AudioWorklet` (capacidad `audio-engine`). Convive en
 * paralelo con `AudioEngine` (design.md D11) hasta que `rain` pase los tests
 * de senal (tarea 9.5) y los ambientes restantes queden portados (tarea
 * 10.7): en ese momento este motor sustituye al antiguo.
 */

// synthesis-reference, "Presupuesto de coste de computo" (tarea 9.6): el
// computo mide muy por debajo del presupuesto, asi que el limite es un
// criterio de producto (una consola manejable), no una cota de hardware.
export const MAX_SIMULTANEOUS_LAYERS = 8;

const DEFAULT_FADE_SECONDS = 1.5;
const VOLUME_FADE_SECONDS = 0.05;

export type EngineResult = { ok: true } | { ok: false; reason: string };

interface LayerEntry {
  compiled: CompiledLayer;
  volume: number;
}

export class WorkletEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private masterVolume = 0.5;
  private readonly layers = new Map<string, LayerEntry>();

  private async ensureGraph(): Promise<EngineResult> {
    const result = await getAudioContext();
    if (!result.ok) return result;
    this.context = result.context;

    if (!this.master) {
      const context = this.context;

      this.master = context.createGain();
      this.master.gain.value = this.masterVolume;

      // Protege contra distorsion por recorte cuando la suma de capas
      // excede el rango valido (audio-engine, "Salida acotada sin
      // distorsion"): atenua los picos en lugar de recortarlos.
      this.limiter = context.createDynamicsCompressor();
      this.limiter.threshold.value = -1;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.1;

      this.master.connect(this.limiter);
      this.limiter.connect(context.destination);
    }

    return { ok: true };
  }

  async addLayer(
    id: string,
    declaration: LayerDeclaration,
    seed: number,
    fadeSeconds = DEFAULT_FADE_SECONDS
  ): Promise<EngineResult> {
    const ready = await this.ensureGraph();
    if (!ready.ok) return ready;

    const context = this.context!;

    if (this.layers.has(id)) {
      this.disposeLayerImmediately(id);
    }

    if (this.layers.size >= MAX_SIMULTANEOUS_LAYERS) {
      return {
        ok: false,
        reason: `Limite de ${MAX_SIMULTANEOUS_LAYERS} capas simultaneas alcanzado.`,
      };
    }

    const compiled = compileLayer(context, declaration, seed);
    compiled.output.connect(this.master!);
    this.layers.set(id, { compiled, volume: declaration.gain });

    rampToValue(compiled.output.gain, context, declaration.gain, fadeSeconds);

    return { ok: true };
  }

  removeLayer(id: string, fadeSeconds = DEFAULT_FADE_SECONDS): EngineResult {
    const entry = this.layers.get(id);
    if (!entry || !this.context) {
      return { ok: false, reason: `La capa "${id}" no esta activa.` };
    }

    rampToValue(entry.compiled.output.gain, this.context, 0, fadeSeconds);
    this.layers.delete(id);

    // Se dispone del nodo cuando el fade termina, no antes: cortarlo a
    // mitad de rampa produciria el corte que la transicion evita.
    setTimeout(() => entry.compiled.dispose(), fadeSeconds * 1000 + 50);

    return { ok: true };
  }

  private disposeLayerImmediately(id: string): void {
    this.layers.get(id)?.compiled.dispose();
    this.layers.delete(id);
  }

  setLayerVolume(id: string, value: number, fadeSeconds = VOLUME_FADE_SECONDS): EngineResult {
    const entry = this.layers.get(id);
    if (!entry || !this.context) {
      return { ok: false, reason: `La capa "${id}" no esta activa.` };
    }

    entry.volume = value;
    rampToValue(entry.compiled.output.gain, this.context, value, fadeSeconds);

    return { ok: true };
  }

  setMasterVolume(value: number): EngineResult {
    if (value < 0 || value > 1) {
      return { ok: false, reason: "El volumen maestro debe estar entre 0 y 1." };
    }

    this.masterVolume = value;
    if (this.master && this.context) {
      rampToValue(this.master.gain, this.context, value, VOLUME_FADE_SECONDS);
    }

    return { ok: true };
  }

  stopAll(fadeSeconds = DEFAULT_FADE_SECONDS): void {
    for (const id of [...this.layers.keys()]) {
      this.removeLayer(id, fadeSeconds);
    }
  }

  get activeLayerIds(): string[] {
    return [...this.layers.keys()];
  }

  getLayerVolume(id: string): number | undefined {
    return this.layers.get(id)?.volume;
  }
}

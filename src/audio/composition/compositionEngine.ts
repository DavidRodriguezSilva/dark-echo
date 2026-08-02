import { findAmbient } from "../../domain/catalog";
import { deriveLayerSeed, randomSeed } from "../../dsp/prng";
import { getAudioContext } from "../context";
import { compileLayer, type CompiledLayer } from "../layerCompiler";
import { rampToValue } from "../transitions";

/**
 * Motor de composición (capacidad `ambient-composition-engine`, design.md D1):
 * coexiste con `WorkletEngine`/`AmbientMixer` sin sustituirlos — comparte el
 * mismo `AudioContext` (una sola vez por página, `audio/context.ts`), pero
 * mantiene su propio bus de salida y su propio registro de estado, para que
 * ninguna operación de un motor pueda afectar al otro.
 *
 * Alcance de esta entrega (design.md D8): un único `Source` (`rain`), sin
 * `Environment`, `Occlusion` ni `Modifiers` todavía. El `sceneBus` es el
 * punto de enganche deliberado para esas piezas — hoy es un paso directo de
 * ganancia unitaria, y las próximas entregas insertan ahí, no reemplazan
 * esto (design.md D2, D7).
 */

const PILOT_SOURCE_IDS = ["rain"] as const;
type PilotSourceId = (typeof PILOT_SOURCE_IDS)[number];

function isPilotSourceId(id: string): id is PilotSourceId {
  return (PILOT_SOURCE_IDS as readonly string[]).includes(id);
}

/** Los `Source` que el motor de composición admite en esta entrega (`ambient-composition-engine`, "Alcance del piloto limitado a `rain`"). */
export function listCompositionSourceIds(): string[] {
  return [...PILOT_SOURCE_IDS];
}

const DEFAULT_FADE_SECONDS = 1.5;

export type CompositionResult = { ok: true; message: string } | { ok: false; message: string };

export interface CompositionSnapshot {
  source: { id: string } | null;
}

type Listener = () => void;

export class CompositionEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  // Bus de escena compartido: hoy solo enruta el Source hacia el master; es
  // el punto donde Environment/Occlusion se insertarán en changes futuros.
  private sceneBus: GainNode | null = null;

  private readonly sessionSeed = randomSeed();
  private readonly sourceLayers = new Map<string, CompiledLayer>();
  private activeSourceId: string | null = null;

  private readonly listeners = new Set<Listener>();
  private snapshot: CompositionSnapshot = { source: null };

  private async ensureGraph(): Promise<{ ok: true } | { ok: false; reason: string }> {
    const result = await getAudioContext();
    if (!result.ok) return result;
    this.context = result.context;

    if (!this.master) {
      const context = this.context;

      this.sceneBus = context.createGain();
      this.master = context.createGain();

      // Mismo esquema de protección contra recorte que WorkletEngine
      // (audio-engine, "Salida acotada sin distorsión"): el motor nuevo
      // asume la misma garantía de mezcla, no una más débil.
      this.limiter = context.createDynamicsCompressor();
      this.limiter.threshold.value = -1;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.1;

      this.sceneBus.connect(this.master);
      this.master.connect(this.limiter);
      this.limiter.connect(context.destination);
    }

    return { ok: true };
  }

  private publish(): void {
    this.snapshot = { source: this.activeSourceId ? { id: this.activeSourceId } : null };
    for (const listener of this.listeners) listener();
  }

  /** Para `useSyncExternalStore`, igual que `AmbientMixer`. */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): CompositionSnapshot => this.snapshot;

  private teardownSource(fadeSeconds: number): void {
    if (!this.context) {
      this.sourceLayers.clear();
      this.activeSourceId = null;
      return;
    }

    for (const compiled of this.sourceLayers.values()) {
      rampToValue(compiled.output.gain, this.context, 0, fadeSeconds);
      setTimeout(() => compiled.dispose(), fadeSeconds * 1000 + 50);
    }
    this.sourceLayers.clear();
    this.activeSourceId = null;
  }

  /**
   * Activa un `Source` (alcance de esta entrega: únicamente `rain`,
   * capacidad `ambient-composition-engine`, "Alcance del piloto limitado a
   * `rain`"). Reutiliza las capas ya validadas de `domain/ambients/rain.ts`
   * sin modificarlas — el mismo `AmbientDeclaration` que usa el motor actual.
   */
  async activateSource(id: string): Promise<CompositionResult> {
    if (!isPilotSourceId(id)) {
      return {
        ok: false,
        message: `"${id}" no está disponible como Source del motor de composición en esta entrega. Disponible: ${PILOT_SOURCE_IDS.join(", ")}.`,
      };
    }

    const ambient = findAmbient(id);
    if (!ambient) {
      return { ok: false, message: `"${id}" no existe en el catálogo.` };
    }

    const ready = await this.ensureGraph();
    if (!ready.ok) return { ok: false, message: ready.reason };

    this.teardownSource(DEFAULT_FADE_SECONDS);

    const context = this.context!;
    for (const [key, declaration] of Object.entries(ambient.layers)) {
      const seed = deriveLayerSeed(this.sessionSeed, `${id}.${key}`);
      const compiled = compileLayer(context, declaration, seed);
      compiled.output.connect(this.sceneBus!);
      rampToValue(compiled.output.gain, context, declaration.gain, DEFAULT_FADE_SECONDS);
      this.sourceLayers.set(key, compiled);
    }

    this.activeSourceId = id;
    this.publish();
    return { ok: true, message: `${id} sonando por el motor de composición.` };
  }

  deactivateSource(fadeSeconds = DEFAULT_FADE_SECONDS): CompositionResult {
    if (!this.activeSourceId) {
      return { ok: false, message: "No hay ningún Source activo en el motor de composición." };
    }
    this.teardownSource(fadeSeconds);
    this.publish();
    return { ok: true, message: "Source retirado." };
  }

  /** Desmonta la escena completa. Hoy equivale a retirar el Source; groups futuros añaden Environment/Occlusion/Modifiers aquí. */
  stop(): CompositionResult {
    if (!this.activeSourceId) {
      return { ok: false, message: "No hay nada sonando en el motor de composición." };
    }
    return this.deactivateSource();
  }

  status(): string {
    return this.activeSourceId
      ? `Source activo: ${this.activeSourceId}`
      : "Motor de composición: sin nada activo.";
  }

  get activeSource(): string | null {
    return this.activeSourceId;
  }
}

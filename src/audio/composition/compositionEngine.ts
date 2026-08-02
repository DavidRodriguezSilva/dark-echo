import {
  affinityWarning,
  scoreOcclusionAgainstEnvironment,
} from "../../domain/composition/compatibility";
import { findEnvironment, findModifier, findOcclusion } from "../../domain/composition/catalog";
import { findAmbient } from "../../domain/catalog";
import { deriveLayerSeed, randomSeed } from "../../dsp/prng";
import { getAudioContext } from "../context";
import { compileLayer, type CompiledLayer } from "../layerCompiler";
import { rampToValue } from "../transitions";
import { EnvironmentStage } from "./environmentStage";
import { ModifierStage } from "./modifierStage";
import { OcclusionStage } from "./occlusionStage";

/**
 * Motor de composición (capacidad `ambient-composition-engine`, design.md D1):
 * coexiste con `WorkletEngine`/`AmbientMixer` sin sustituirlos — comparte el
 * mismo `AudioContext` (una sola vez por página, `audio/context.ts`), pero
 * mantiene su propio bus de salida y su propio registro de estado, para que
 * ninguna operación de un motor pueda afectar al otro.
 *
 * Cadena de la escena, en el orden en que ocurren los fenómenos físicos:
 *
 *   Source (lluvia) → Modifier (distancia) → Occlusion (barrera) → Environment (recinto) → master
 *
 * Ese orden no es arbitrario: la distancia actúa sobre el trayecto hasta la
 * barrera, la barrera transmite y resuena, y el recinto colorea todo lo que
 * ya entró en él. Las tres etapas están permanentemente en el grafo en
 * estado neutro, así que activar o retirar un componente nunca reconecta
 * nodos — solo cruza ganancias, que es lo que mantiene la garantía de
 * transiciones sin artefactos de `audio-engine`.
 *
 * Alcance de esta entrega (design.md D8): un único `Source` (`rain`).
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

export interface CompositionResult {
  ok: boolean;
  message: string;
  /** Advertencia de afinidad baja; nunca impide que la operación se aplique. */
  warning?: string;
}

export interface CompositionSnapshot {
  source: { id: string } | null;
  environment: { id: string } | null;
  occlusion: { id: string } | null;
  modifier: { id: string; distanceMeters: number } | null;
}

type Listener = () => void;

export class CompositionEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private sourceBus: GainNode | null = null;

  private modifierStage: ModifierStage | null = null;
  private occlusionStage: OcclusionStage | null = null;
  private environmentStage: EnvironmentStage | null = null;

  private readonly sessionSeed = randomSeed();
  private readonly sourceLayers = new Map<string, CompiledLayer>();
  private activeSourceId: string | null = null;

  private readonly listeners = new Set<Listener>();
  private snapshot: CompositionSnapshot = {
    source: null,
    environment: null,
    occlusion: null,
    modifier: null,
  };

  private async ensureGraph(): Promise<{ ok: true } | { ok: false; reason: string }> {
    const result = await getAudioContext();
    if (!result.ok) return result;
    this.context = result.context;

    if (!this.master) {
      const context = this.context;

      this.sourceBus = context.createGain();
      this.modifierStage = new ModifierStage(context);
      this.occlusionStage = new OcclusionStage(context);
      this.environmentStage = new EnvironmentStage(context, this.sessionSeed);
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

      this.sourceBus.connect(this.modifierStage.input);
      this.modifierStage.output.connect(this.occlusionStage.input);
      this.occlusionStage.output.connect(this.environmentStage.input);
      this.environmentStage.output.connect(this.master);
      this.master.connect(this.limiter);
      this.limiter.connect(context.destination);
    }

    return { ok: true };
  }

  private publish(): void {
    const modifierId = this.modifierStage?.activeId ?? null;
    this.snapshot = {
      source: this.activeSourceId ? { id: this.activeSourceId } : null,
      environment: this.environmentStage?.activeId ? { id: this.environmentStage.activeId } : null,
      occlusion: this.occlusionStage?.activeId ? { id: this.occlusionStage.activeId } : null,
      modifier: modifierId
        ? { id: modifierId, distanceMeters: this.modifierStage!.distanceMeters }
        : null,
    };
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
      compiled.output.connect(this.sourceBus!);
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

  /**
   * Activa un `Environment`. Como mucho uno por escena
   * (capacidad `ambient-environment`): activar otro sustituye al anterior sin
   * interrumpir los `Source` activos.
   */
  async activateEnvironment(id: string): Promise<CompositionResult> {
    const declaration = findEnvironment(id);
    if (!declaration) {
      return { ok: false, message: `"${id}" no existe como Environment.` };
    }

    const ready = await this.ensureGraph();
    if (!ready.ok) return { ok: false, message: ready.reason };

    this.environmentStage!.activate(declaration);
    this.publish();

    // Cambiar de entorno puede dejar por debajo del umbral una oclusión que
    // ya estaba activa y que sí encajaba en el entorno anterior: se advierte
    // igual, y tampoco aquí se bloquea nada.
    const occlusionId = this.occlusionStage!.activeId;
    const occlusion = occlusionId ? findOcclusion(occlusionId) : undefined;
    const warning = occlusion
      ? (affinityWarning(
          occlusion,
          declaration,
          scoreOcclusionAgainstEnvironment(occlusion, declaration)
        ) ?? undefined)
      : undefined;

    return { ok: true, message: `Environment "${id}" activo.`, warning };
  }

  deactivateEnvironment(): CompositionResult {
    if (!this.environmentStage?.activeId) {
      return { ok: false, message: "No hay ningún Environment activo." };
    }
    this.environmentStage.deactivate();
    this.publish();
    return { ok: true, message: "Environment retirado." };
  }

  /**
   * Activa una `Occlusion`. Como mucho una por escena
   * (capacidad `ambient-occlusion`). Una combinación de afinidad baja
   * **se activa igualmente** y solo produce advertencia
   * (capacidad `ambient-compatibility`, design.md D5).
   */
  async activateOcclusion(id: string): Promise<CompositionResult> {
    const declaration = findOcclusion(id);
    if (!declaration) {
      return { ok: false, message: `"${id}" no existe como Occlusion.` };
    }

    const ready = await this.ensureGraph();
    if (!ready.ok) return { ok: false, message: ready.reason };

    const environmentId = this.environmentStage!.activeId;
    const environment = environmentId ? (findEnvironment(environmentId) ?? null) : null;
    const affinity = scoreOcclusionAgainstEnvironment(declaration, environment);

    this.occlusionStage!.activate(declaration);
    this.publish();

    return {
      ok: true,
      message: `Occlusion "${id}" activa.`,
      warning: affinityWarning(declaration, environment, affinity) ?? undefined,
    };
  }

  deactivateOcclusion(): CompositionResult {
    if (!this.occlusionStage?.activeId) {
      return { ok: false, message: "No hay ninguna Occlusion activa." };
    }
    this.occlusionStage.deactivate();
    this.publish();
    return { ok: true, message: "Occlusion retirada." };
  }

  /**
   * Activa el `Modifier` de distancia sobre el `Source`, opcionalmente con un
   * valor inicial. Llamarlo de nuevo con otro valor mueve la distancia — es
   * así como se produce el movimiento aparente, sin necesitar un segundo
   * `Source` (capacidad `ambient-modifiers`).
   */
  async activateModifier(id: string, meters?: number): Promise<CompositionResult> {
    const declaration = findModifier(id);
    if (!declaration) {
      return { ok: false, message: `"${id}" no existe como Modifier.` };
    }

    const ready = await this.ensureGraph();
    if (!ready.ok) return { ok: false, message: ready.reason };

    this.modifierStage!.activate(declaration, meters);
    this.publish();
    return {
      ok: true,
      message: `Modifier "${id}" activo a ${this.modifierStage!.distanceMeters} m.`,
    };
  }

  deactivateModifier(): CompositionResult {
    if (!this.modifierStage?.activeId) {
      return { ok: false, message: "No hay ningún Modifier activo." };
    }
    this.modifierStage.deactivate();
    this.publish();
    return { ok: true, message: "Modifier retirado." };
  }

  /** Desmonta la escena completa: `Source` y los tres componentes moduladores. */
  stop(): CompositionResult {
    // `?? null` no es cosmetico: antes de que exista el grafo las etapas son
    // `null`, y `undefined !== null` habria dado "hay algo activo" con el
    // motor recien construido.
    const hadSomething =
      this.activeSourceId !== null ||
      (this.environmentStage?.activeId ?? null) !== null ||
      (this.occlusionStage?.activeId ?? null) !== null ||
      (this.modifierStage?.activeId ?? null) !== null;

    if (!hadSomething) {
      return { ok: false, message: "No hay nada sonando en el motor de composición." };
    }

    if (this.activeSourceId) this.teardownSource(DEFAULT_FADE_SECONDS);
    this.environmentStage?.deactivate();
    this.occlusionStage?.deactivate();
    this.modifierStage?.deactivate();
    this.publish();

    return { ok: true, message: "Escena desmontada." };
  }

  status(): string {
    const { source, environment, occlusion, modifier } = this.snapshot;
    if (!source && !environment && !occlusion && !modifier) {
      return "Motor de composición: sin nada activo.";
    }

    const parts = [
      `Source: ${source?.id ?? "—"}`,
      `Environment: ${environment?.id ?? "—"}`,
      `Occlusion: ${occlusion?.id ?? "—"}`,
      modifier ? `Modifier: ${modifier.id} (${modifier.distanceMeters} m)` : "Modifier: —",
    ];
    return parts.join(" | ");
  }

  get activeSource(): string | null {
    return this.activeSourceId;
  }
}

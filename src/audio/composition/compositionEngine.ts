import {
  affinityWarning,
  scoreOcclusionAgainstEnvironment,
} from "../../domain/composition/compatibility";
import { findEnvironment, findModifier, findOcclusion } from "../../domain/composition/catalog";
import { findAmbient, listAmbients } from "../../domain/catalog";
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
 * Cadena de la escena, en el orden en que ocurren los fenómenos físicos, con
 * una etapa de `Modifier` por `Source` y las dos etapas de escena
 * compartidas aguas abajo de la suma:
 *
 *   Source_a (capas) → ModifierStage_a ─┐
 *   Source_b (capas) → ModifierStage_b ─┼→ sceneBus → Occlusion → Environment → master
 *   Source_c (capas) → ModifierStage_c ─┘
 *
 * Ese reparto no es arbitrario. La distancia actúa sobre el trayecto de *un*
 * `Source` hasta la barrera, así que su etapa tiene que quedar antes de que
 * las señales se sumen — es lo que hace que alejar un `Source` no mueva a los
 * demás (`ambient-modifiers`, "Un `Modifier` pertenece a un `Source`, no a la
 * escena"). La barrera y el recinto sí son propiedades de la escena: todo lo
 * que suena dentro los atraviesa, así que van después de la suma y una sola
 * vez.
 *
 * Las etapas compartidas están permanentemente en el grafo en estado neutro,
 * así que activar o retirar un componente nunca reconecta nodos — solo cruza
 * ganancias, que es lo que mantiene la garantía de transiciones sin
 * artefactos de `audio-engine`.
 */

/**
 * Límite de capas simultáneas del motor de composición.
 *
 * No se hereda de `MAX_SIMULTANEOUS_LAYERS` del motor actual (8): son motores
 * con costes distintos por componente, y `synthesis-reference` exige que este
 * presupuesto se mida para este motor en vez de copiarse. El valor sale de la
 * medición registrada en `docs/synthesis-reference.md`, y cubre el catálogo
 * completo — sus siete ambientes suman exactamente 12 capas.
 *
 * Se expresa en capas y no en número de `Source` porque el coste lo
 * determinan las capas: `wind` aporta una y `rain` tres.
 */
export const MAX_COMPOSITION_LAYERS = 12;

/** Los `Source` que el motor de composición admite: todo el catálogo de ambientes. */
export function listCompositionSourceIds(): string[] {
  return listAmbients().map((ambient) => ambient.id);
}

const DEFAULT_FADE_SECONDS = 1.5;

export interface CompositionResult {
  ok: boolean;
  message: string;
  /** Advertencia de afinidad baja; nunca impide que la operación se aplique. */
  warning?: string;
}

export interface CompositionSourceSnapshot {
  id: string;
  /** Los `Modifiers` pertenecen al `Source`, no a la escena. */
  modifier: { id: string; distanceMeters: number } | null;
}

export interface CompositionSnapshot {
  sources: CompositionSourceSnapshot[];
  environment: { id: string } | null;
  occlusion: { id: string } | null;
}

/**
 * Un `Source` activo con todo lo que le pertenece. Las capas van anidadas
 * bajo el `Source` y no en un mapa plano con claves compuestas: retirar un
 * `Source` es descartar su entrada, sin filtrar por prefijo de cadena.
 */
interface ActiveSource {
  readonly id: string;
  readonly layers: Map<string, CompiledLayer>;
  readonly modifier: ModifierStage;
}

type Listener = () => void;

export class CompositionEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  /**
   * Punto donde se suman todos los `Source` ya modificados. Antes se llamaba
   * `sourceBus`, cuando había un solo `Source`; con varios deja de ser el bus
   * de uno para ser el de la escena.
   */
  private sceneBus: GainNode | null = null;

  private occlusionStage: OcclusionStage | null = null;
  private environmentStage: EnvironmentStage | null = null;

  /**
   * Volumen maestro, con el mismo valor por defecto que `AmbientMixer`.
   *
   * No es un detalle de conveniencia: dejar el nodo maestro en su ganancia por
   * defecto (1.0) hacia que el motor nuevo sonara al doble que el actual con
   * el mismo material, y las capas de `rain` suman 1.35 de ganancia
   * declarada. Ademas el comando `volume`, que opera sobre `AmbientMixer`, no
   * llegaba hasta aqui, asi que no habia forma de bajarlo.
   */
  private masterVolume = 0.5;

  private readonly sessionSeed = randomSeed();
  private readonly sources = new Map<string, ActiveSource>();

  /**
   * Límite efectivo de capas. Es parametrizable porque el valor por defecto
   * está fijado para que el catálogo entero quepa justo, así que con el
   * catálogo actual la guarda no puede dispararse — y una guarda que ningún
   * test puede ejercitar es una guarda que nadie sabe si funciona. El
   * parámetro existe para poder probarla; en producción nadie lo pasa.
   */
  private readonly maxLayers: number;

  constructor(maxLayers: number = MAX_COMPOSITION_LAYERS) {
    this.maxLayers = maxLayers;
  }

  private readonly listeners = new Set<Listener>();
  private snapshot: CompositionSnapshot = {
    sources: [],
    environment: null,
    occlusion: null,
  };

  private async ensureGraph(): Promise<{ ok: true } | { ok: false; reason: string }> {
    const result = await getAudioContext();
    if (!result.ok) return result;
    this.context = result.context;

    if (!this.master) {
      const context = this.context;

      this.sceneBus = context.createGain();
      this.occlusionStage = new OcclusionStage(context);
      this.environmentStage = new EnvironmentStage(context, this.sessionSeed);
      this.master = context.createGain();
      this.master.gain.value = this.masterVolume;

      // Mismo esquema de protección contra recorte que WorkletEngine
      // (audio-engine, "Salida acotada sin distorsión"): el motor nuevo
      // asume la misma garantía de mezcla, no una más débil.
      this.limiter = context.createDynamicsCompressor();
      this.limiter.threshold.value = -1;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.1;

      this.sceneBus.connect(this.occlusionStage.input);
      this.occlusionStage.output.connect(this.environmentStage.input);
      this.environmentStage.output.connect(this.master);
      this.master.connect(this.limiter);
      this.limiter.connect(context.destination);
    }

    return { ok: true };
  }

  private publish(): void {
    this.snapshot = {
      sources: [...this.sources.values()].map((source) => ({
        id: source.id,
        modifier: source.modifier.activeId
          ? { id: source.modifier.activeId, distanceMeters: source.modifier.distanceMeters }
          : null,
      })),
      environment: this.environmentStage?.activeId ? { id: this.environmentStage.activeId } : null,
      occlusion: this.occlusionStage?.activeId ? { id: this.occlusionStage.activeId } : null,
    };
    for (const listener of this.listeners) listener();
  }

  /** Para `useSyncExternalStore`, igual que `AmbientMixer`. */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): CompositionSnapshot => this.snapshot;

  private activeLayerCount(): number {
    let total = 0;
    for (const source of this.sources.values()) total += source.layers.size;
    return total;
  }

  /**
   * Retira un `Source`: desvanece sus capas y destruye su `ModifierStage` con
   * él. La etapa se libera con un margen sobre el desvanecido, porque
   * desconectarla antes de que las capas hayan llegado a cero cortaría la cola
   * del desvanecido — justo el clic que `audio-engine` prohíbe.
   */
  private teardownSource(source: ActiveSource, fadeSeconds: number): void {
    if (!this.context) {
      this.sources.delete(source.id);
      return;
    }

    for (const compiled of source.layers.values()) {
      rampToValue(compiled.output.gain, this.context, 0, fadeSeconds);
      setTimeout(() => compiled.dispose(), fadeSeconds * 1000 + 50);
    }
    setTimeout(() => source.modifier.dispose(), fadeSeconds * 1000 + 100);
    source.layers.clear();
    this.sources.delete(source.id);
  }

  /**
   * Incorpora un `Source` a la escena, acumulando sobre los que ya suenan
   * (`ambient-composition-engine`, "Varios `Source` simultáneos en una
   * escena"). Reutiliza las capas ya validadas de `domain/ambients/` sin
   * modificarlas — las mismas declaraciones que usa el motor actual.
   */
  async activateSource(id: string): Promise<CompositionResult> {
    const ambient = findAmbient(id);
    if (!ambient) {
      const ids = listCompositionSourceIds().join(", ");
      return { ok: false, message: `"${id}" no existe en el catálogo. Disponibles: ${ids}.` };
    }

    if (this.sources.has(id)) {
      return { ok: false, message: `"${id}" ya está sonando en el motor de composición.` };
    }

    const incoming = Object.keys(ambient.layers).length;
    if (this.activeLayerCount() + incoming > this.maxLayers) {
      return {
        ok: false,
        message: `No hay sitio: "${id}" necesita ${incoming} capa(s) más y el límite es ${this.maxLayers} (activas: ${this.activeLayerCount()}).`,
      };
    }

    const ready = await this.ensureGraph();
    if (!ready.ok) return { ok: false, message: ready.reason };

    const context = this.context!;
    const modifier = new ModifierStage(context);
    modifier.output.connect(this.sceneBus!);

    const layers = new Map<string, CompiledLayer>();
    for (const [key, declaration] of Object.entries(ambient.layers)) {
      // La semilla incluye el id del `Source`, así que dos ambientes con una
      // capa homónima —`cuerpo` la comparten cuatro— no derivan la misma.
      const seed = deriveLayerSeed(this.sessionSeed, `${id}.${key}`);
      const compiled = compileLayer(context, declaration, seed);
      compiled.output.connect(modifier.input);
      rampToValue(compiled.output.gain, context, declaration.gain, DEFAULT_FADE_SECONDS);
      layers.set(key, compiled);
    }

    this.sources.set(id, { id, layers, modifier });
    this.publish();
    return { ok: true, message: `${id} sonando por el motor de composición.` };
  }

  /**
   * Retira un `Source` concreto, o todos si no se nombra ninguno. Los demás
   * `Source` y los componentes de escena quedan intactos.
   */
  deactivateSource(id?: string, fadeSeconds = DEFAULT_FADE_SECONDS): CompositionResult {
    if (id === undefined) {
      if (this.sources.size === 0) {
        return { ok: false, message: "No hay ningún Source activo en el motor de composición." };
      }
      const count = this.sources.size;
      for (const source of [...this.sources.values()]) {
        this.teardownSource(source, fadeSeconds);
      }
      this.publish();
      return { ok: true, message: `${count} Source(s) retirado(s).` };
    }

    const source = this.sources.get(id);
    if (!source) {
      return { ok: false, message: `"${id}" no está sonando en el motor de composición.` };
    }
    this.teardownSource(source, fadeSeconds);
    this.publish();
    return { ok: true, message: `${id} retirado.` };
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
   * Activa el `Modifier` de distancia sobre un `Source` concreto,
   * opcionalmente con un valor inicial. Llamarlo de nuevo con otro valor mueve
   * la distancia de *ese* `Source` — es así como se produce el movimiento
   * aparente, sin necesitar un segundo `Source` (capacidad
   * `ambient-modifiers`).
   *
   * El `Source` destinatario es explícito a propósito: deducirlo del estado
   * (p. ej. "el último activado") daría una orden cuyo efecto depende de algo
   * que el usuario no ve.
   */
  async activateModifier(
    sourceId: string,
    id: string,
    meters?: number
  ): Promise<CompositionResult> {
    const source = this.sources.get(sourceId);
    if (!source) {
      const active = [...this.sources.keys()];
      const available =
        active.length > 0 ? ` Activos: ${active.join(", ")}.` : " No hay ningún Source activo.";
      return { ok: false, message: `"${sourceId}" no está sonando.${available}` };
    }

    const declaration = findModifier(id);
    if (!declaration) {
      return { ok: false, message: `"${id}" no existe como Modifier.` };
    }

    const ready = await this.ensureGraph();
    if (!ready.ok) return { ok: false, message: ready.reason };

    source.modifier.activate(declaration, meters);
    this.publish();
    return {
      ok: true,
      message: `Modifier "${id}" activo sobre ${sourceId} a ${source.modifier.distanceMeters} m.`,
    };
  }

  deactivateModifier(sourceId: string): CompositionResult {
    const source = this.sources.get(sourceId);
    if (!source) {
      return { ok: false, message: `"${sourceId}" no está sonando.` };
    }
    if (!source.modifier.activeId) {
      return { ok: false, message: `"${sourceId}" no tiene ningún Modifier activo.` };
    }
    source.modifier.deactivate();
    this.publish();
    return { ok: true, message: `Modifier retirado de ${sourceId}.` };
  }

  /** Desmonta la escena completa: todos los `Source` y los componentes de escena. */
  stop(): CompositionResult {
    // `?? null` no es cosmetico: antes de que exista el grafo las etapas son
    // `null`, y `undefined !== null` habria dado "hay algo activo" con el
    // motor recien construido.
    const hadSomething =
      this.sources.size > 0 ||
      (this.environmentStage?.activeId ?? null) !== null ||
      (this.occlusionStage?.activeId ?? null) !== null;

    if (!hadSomething) {
      return { ok: false, message: "No hay nada sonando en el motor de composición." };
    }

    for (const source of [...this.sources.values()]) {
      this.teardownSource(source, DEFAULT_FADE_SECONDS);
    }
    this.environmentStage?.deactivate();
    this.occlusionStage?.deactivate();
    this.publish();

    return { ok: true, message: "Escena desmontada." };
  }

  status(): string {
    const { sources, environment, occlusion } = this.snapshot;
    if (sources.length === 0 && !environment && !occlusion) {
      return "Motor de composición: sin nada activo.";
    }

    const scene = `Environment: ${environment?.id ?? "—"} | Occlusion: ${occlusion?.id ?? "—"}`;
    if (sources.length === 0) return `${scene}\nSources: —`;

    const lines = sources.map((source) => {
      const modifier = source.modifier
        ? `${source.modifier.id} (${source.modifier.distanceMeters} m)`
        : "—";
      return `  ${source.id} — Modifier: ${modifier}`;
    });
    return [scene, "Sources:", ...lines].join("\n");
  }

  /**
   * Fija el volumen maestro del motor de composicion. Es independiente del de
   * `AmbientMixer`: cada motor tiene su propia cadena de salida (design.md
   * D1), asi que tambien su propio maestro.
   */
  setMasterVolume(value: number): CompositionResult {
    if (value < 0 || value > 1) {
      return { ok: false, message: "El volumen debe estar entre 0 y 1." };
    }
    this.masterVolume = value;
    if (this.master && this.context) {
      rampToValue(this.master.gain, this.context, value, 0.05);
    }
    return { ok: true, message: `Volumen del motor de composición: ${value}` };
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  get activeSourceIds(): string[] {
    return [...this.sources.keys()];
  }

  get activeLayers(): number {
    return this.activeLayerCount();
  }
}

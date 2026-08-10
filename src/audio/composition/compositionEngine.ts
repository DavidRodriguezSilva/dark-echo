import {
  affinityWarning,
  scoreOcclusionAgainstEnvironment,
} from "../../domain/composition/compatibility";
import { findEnvironment, findModifier, findOcclusion } from "../../domain/composition/catalog";
import { sceneSentence } from "../../domain/composition/sceneSentence";
import { findAmbient, listAmbients } from "../../domain/catalog";
import type { Scene } from "../../domain/scene";
import { deriveLayerSeed, randomSeed } from "../../dsp/prng";
import { getAudioContext } from "../context";
import { compileLayer, type CompiledLayer } from "../layerCompiler";
import { rampToValue } from "../transitions";
import { EnvironmentStage } from "./environmentStage";
import { ModifierStage } from "./modifierStage";
import { OcclusionStage } from "./occlusionStage";

/**
 * Motor de composición (capacidad `ambient-composition-engine`): **el único
 * motor de audio del sistema** desde que se retiró el motor de ambientes
 * (change `retire-legacy-engine`). Es también la única fuente de verdad
 * observable del estado de reproducción, con la que la UI se sincroniza vía
 * `useSyncExternalStore` — nunca puede mostrar algo distinto de lo que
 * realmente suena.
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
 * Medido para este motor, no heredado del que se retiró: el valor sale de la
 * medición registrada en `docs/synthesis-reference.md`, y cubre el catálogo
 * completo — sus siete ambientes suman exactamente 12 capas.
 *
 * Se expresa en capas y no en número de `Source` porque el coste lo
 * determinan las capas: `wind` aporta una y `rain` tres.
 */
export const MAX_COMPOSITION_LAYERS = 12;

/** Los `Source` que el motor admite: todo el catálogo de ambientes. */
export function listCompositionSourceIds(): string[] {
  return listAmbients().map((ambient) => ambient.id);
}

const DEFAULT_FADE_SECONDS = 1.5;
const VOLUME_FADE_SECONDS = 0.05;

export interface CompositionResult {
  ok: boolean;
  message: string;
  /** Advertencia de afinidad baja; nunca impide que la operación se aplique. */
  warning?: string;
}

export interface LayerSnapshot {
  /** Id compuesto `"<source>.<capa>"`. */
  id: string;
  volume: number;
}

/**
 * Estado de reposo explicito (command-console, "Panel de estado del
 * sistema"): distingue "nunca hubo nada" de "detenido, listo para reanudar"
 * de "sonando" de "suspendido por el entorno" (offline-playback, "Suspension
 * impuesta por el entorno") — capas activas cuyo contexto de audio esta
 * suspendido no estan sonando, aunque sigan registradas.
 */
export type MixSnapshot =
  | { kind: "empty" }
  | { kind: "stopped"; layers: LayerSnapshot[] }
  | { kind: "playing"; layers: LayerSnapshot[] }
  | { kind: "suspended"; layers: LayerSnapshot[] };

export interface CompositionSourceSnapshot {
  id: string;
  /** Los `Modifiers` pertenecen al `Source`, no a la escena. */
  modifier: { id: string; distanceMeters: number } | null;
}

export interface PlaybackSnapshot {
  mix: MixSnapshot;
  masterVolume: number;
  sources: CompositionSourceSnapshot[];
  environment: { id: string } | null;
  occlusion: { id: string } | null;
}

interface ActiveLayer {
  compiled: CompiledLayer;
  volume: number;
}

/**
 * Un `Source` activo con todo lo que le pertenece. Las capas van anidadas
 * bajo el `Source` y no en un mapa plano con claves compuestas: retirar un
 * `Source` es descartar su entrada, sin filtrar por prefijo de cadena.
 */
interface ActiveSource {
  readonly id: string;
  readonly layers: Map<string, ActiveLayer>;
  readonly modifier: ModifierStage;
}

type Listener = () => void;

/** Composicion inicial para restaurar al construir (session-persistence). */
export interface InitialMix {
  masterVolume?: number;
  composition?: Scene;
}

export class CompositionEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  /** Punto donde se suman todos los `Source` ya modificados. */
  private sceneBus: GainNode | null = null;

  private occlusionStage: OcclusionStage | null = null;
  private environmentStage: EnvironmentStage | null = null;

  private masterVolume = 0.5;

  private readonly sessionSeed = randomSeed();
  private readonly sources = new Map<string, ActiveSource>();

  /**
   * Escena conservada tras `stop()` o restaurada al construir. Guarda capas,
   * volumenes **y** componentes de escena, para que reanudar devuelva la
   * escena completa y no solo los sonidos.
   */
  private conserved: Scene | null = null;

  private readonly maxLayers: number;

  private readonly listeners = new Set<Listener>();
  private snapshot: PlaybackSnapshot = {
    mix: { kind: "empty" },
    masterVolume: 0.5,
    sources: [],
    environment: null,
    occlusion: null,
  };

  constructor(initial?: InitialMix, maxLayers: number = MAX_COMPOSITION_LAYERS) {
    this.maxLayers = maxLayers;
    if (initial?.masterVolume !== undefined) {
      this.masterVolume = initial.masterVolume;
    }
    if (initial?.composition && Object.keys(initial.composition.layers).length > 0) {
      this.conserved = initial.composition;
    }
    this.publish();

    // Al recuperar la visibilidad, el estado mostrado debe coincidir con lo
    // que realmente suena (offline-playback, "Recuperacion de la
    // visibilidad"): esto no cambia nada por si solo, solo vuelve a publicar
    // por si el entorno suspendio el contexto mientras la pagina no era
    // visible. Perder la visibilidad MUST NOT detener nada por decision
    // propia, asi que no hay handler para ese lado del evento.
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === "visible") {
      this.publish();
    }
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

      // Mismo esquema de protección contra recorte que exige `audio-engine`
      // ("Salida acotada sin distorsión").
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
      this.limiter.connect(result.output);
    }

    return { ok: true };
  }

  private layerId(sourceId: string, layerKey: string): string {
    return `${sourceId}.${layerKey}`;
  }

  private currentLayers(): LayerSnapshot[] {
    const layers: LayerSnapshot[] = [];
    for (const source of this.sources.values()) {
      for (const [key, layer] of source.layers) {
        layers.push({ id: this.layerId(source.id, key), volume: layer.volume });
      }
    }
    return layers;
  }

  private sourceSnapshots(): CompositionSourceSnapshot[] {
    return [...this.sources.values()].map((source) => ({
      id: source.id,
      modifier: source.modifier.activeId
        ? { id: source.modifier.activeId, distanceMeters: source.modifier.distanceMeters }
        : null,
    }));
  }

  private publish(): void {
    const layers = this.currentLayers();
    const suspended = this.context?.state === "suspended";
    const mix: MixSnapshot =
      layers.length > 0
        ? { kind: suspended ? "suspended" : "playing", layers }
        : this.conserved
          ? {
              kind: "stopped",
              layers: Object.entries(this.conserved.layers).map(([id, volume]) => ({ id, volume })),
            }
          : { kind: "empty" };

    this.snapshot = {
      mix,
      masterVolume: this.masterVolume,
      sources: this.sourceSnapshots(),
      environment: this.environmentStage?.activeId ? { id: this.environmentStage.activeId } : null,
      occlusion: this.occlusionStage?.activeId ? { id: this.occlusionStage.activeId } : null,
    };
    for (const listener of this.listeners) listener();
  }

  /** Para `useSyncExternalStore`. */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): PlaybackSnapshot => this.snapshot;

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

    for (const layer of source.layers.values()) {
      rampToValue(layer.compiled.output.gain, this.context, 0, fadeSeconds);
      setTimeout(() => layer.compiled.dispose(), fadeSeconds * 1000 + 50);
    }
    setTimeout(() => source.modifier.dispose(), fadeSeconds * 1000 + 100);
    source.layers.clear();
    this.sources.delete(source.id);
  }

  private teardownAllSources(fadeSeconds = DEFAULT_FADE_SECONDS): void {
    for (const source of [...this.sources.values()]) {
      this.teardownSource(source, fadeSeconds);
    }
  }

  /**
   * Monta un `Source` con las capas indicadas (todas, si no se acotan) y los
   * volúmenes indicados (el declarado de cada capa, si no se dan). Es el
   * primitivo sobre el que se apoyan `add`, `play` y `loadComposition`: una
   * escena guardada puede conservar solo un subconjunto de las capas de un
   * ambiente, así que montar no puede asumir "todas".
   */
  private async mountSource(
    id: string,
    layerKeys?: string[],
    volumes?: Record<string, number>
  ): Promise<CompositionResult> {
    const ambient = findAmbient(id);
    if (!ambient) {
      const ids = listCompositionSourceIds().join(", ");
      return { ok: false, message: `"${id}" no existe en el catálogo. Disponibles: ${ids}.` };
    }

    if (this.sources.has(id)) {
      return { ok: false, message: `"${id}" ya está sonando.` };
    }

    const keys = (layerKeys ?? Object.keys(ambient.layers)).filter((key) => key in ambient.layers);
    if (keys.length === 0) {
      return { ok: false, message: `"${id}" no tiene ninguna capa que reproducir.` };
    }

    if (this.activeLayerCount() + keys.length > this.maxLayers) {
      return {
        ok: false,
        message: `No hay sitio: "${id}" necesita ${keys.length} capa(s) más y el límite es ${this.maxLayers} (activas: ${this.activeLayerCount()}).`,
      };
    }

    const ready = await this.ensureGraph();
    if (!ready.ok) return { ok: false, message: ready.reason };

    const context = this.context!;
    const modifier = new ModifierStage(context);
    modifier.output.connect(this.sceneBus!);

    const layers = new Map<string, ActiveLayer>();
    for (const key of keys) {
      const declaration = ambient.layers[key];
      // La semilla incluye el id del `Source`, así que dos ambientes con una
      // capa homónima —`cuerpo` la comparten cuatro— no derivan la misma.
      const seed = deriveLayerSeed(this.sessionSeed, this.layerId(id, key));
      const compiled = compileLayer(context, declaration, seed);
      const volume = volumes?.[this.layerId(id, key)] ?? declaration.gain;
      compiled.output.connect(modifier.input);
      rampToValue(compiled.output.gain, context, volume, DEFAULT_FADE_SECONDS);
      layers.set(key, { compiled, volume });
    }

    this.sources.set(id, { id, layers, modifier });
    return { ok: true, message: `${id} sonando.` };
  }

  /**
   * Incorpora un `Source` acumulando sobre los que ya suenan
   * (`command-console`, "`add` acumula sobre la mezcla").
   */
  async add(id: string): Promise<CompositionResult> {
    const result = await this.mountSource(id);
    if (result.ok) this.publish();
    return result;
  }

  /** Alias histórico de `add`, conservado para los tests del motor. */
  async activateSource(id: string): Promise<CompositionResult> {
    return this.add(id);
  }

  /**
   * Con argumento, sustituye la escena por ese ambiente. Sin argumento,
   * reanuda: si el entorno suspendió el contexto basta con reanudarlo, y si
   * no, se restaura la escena conservada tras `stop`
   * (`command-console`, "`stop` conserva la composición").
   */
  async play(id?: string): Promise<CompositionResult> {
    if (!id) {
      if (this.sources.size > 0 && this.context?.state === "suspended") {
        return this.resumeSuspended();
      }
      return this.resume();
    }

    if (!findAmbient(id)) {
      const ids = listCompositionSourceIds().join(", ");
      return { ok: false, message: `"${id}" no existe en el catálogo. Disponibles: ${ids}.` };
    }

    this.teardownAllSources();
    this.conserved = null;

    const result = await this.mountSource(id);
    if (!result.ok) {
      this.publish();
      return result;
    }

    this.publish();
    return { ok: true, message: `Reproduciendo ${id}: sustituyó la mezcla anterior.` };
  }

  private async resume(): Promise<CompositionResult> {
    if (!this.conserved || Object.keys(this.conserved.layers).length === 0) {
      return { ok: false, message: "No hay mezcla que reanudar." };
    }
    const scene = this.conserved;
    const result = await this.loadComposition(scene);
    if (!result.ok) return result;
    this.conserved = null;
    this.publish();
    return { ok: true, message: "Reproducción reanudada." };
  }

  /**
   * La única acción que hace falta para reanudar tras una suspensión impuesta
   * por el entorno (offline-playback): las capas siguen registradas, solo el
   * contexto necesita reanudarse.
   */
  async resumeSuspended(): Promise<CompositionResult> {
    const ready = await this.ensureGraph();
    if (!ready.ok) return { ok: false, message: ready.reason };
    this.publish();
    return { ok: true, message: "Reproducción reanudada." };
  }

  /**
   * Retira un `Source` completo o una capa suelta, según lo que nombre
   * `target` (`command-console`, "`remove <capa>`").
   */
  removeTarget(target: string, fadeSeconds = DEFAULT_FADE_SECONDS): CompositionResult {
    const source = this.sources.get(target);
    if (source) {
      this.teardownSource(source, fadeSeconds);
      this.publish();
      return { ok: true, message: `${target} retirado.` };
    }

    for (const active of this.sources.values()) {
      for (const [key, layer] of active.layers) {
        if (this.layerId(active.id, key) !== target) continue;

        if (this.context) {
          rampToValue(layer.compiled.output.gain, this.context, 0, fadeSeconds);
          setTimeout(() => layer.compiled.dispose(), fadeSeconds * 1000 + 50);
        }
        active.layers.delete(key);
        // Un `Source` sin capas ya no suena: se retira entero, con su etapa.
        if (active.layers.size === 0) this.teardownSource(active, fadeSeconds);
        this.publish();
        return { ok: true, message: `${target} retirado.` };
      }
    }

    return { ok: false, message: `"${target}" no está sonando.` };
  }

  /** Retira todos los `Source`, conservando los componentes de escena. */
  deactivateSource(id?: string, fadeSeconds = DEFAULT_FADE_SECONDS): CompositionResult {
    if (id === undefined) {
      if (this.sources.size === 0) {
        return { ok: false, message: "No hay ningún Source activo." };
      }
      const count = this.sources.size;
      this.teardownAllSources(fadeSeconds);
      this.publish();
      return { ok: true, message: `${count} Source(s) retirado(s).` };
    }
    return this.removeTarget(id, fadeSeconds);
  }

  /**
   * Desvanece la reproducción **conservando** la escena completa —capas,
   * volúmenes y componentes de escena—, para que `play` sin argumento la
   * devuelva entera.
   */
  stop(fadeSeconds = DEFAULT_FADE_SECONDS): CompositionResult {
    if (this.sources.size === 0) {
      return { ok: false, message: "No hay nada sonando." };
    }

    this.conserved = this.getComposition();
    this.teardownAllSources(fadeSeconds);
    this.environmentStage?.deactivate();
    this.occlusionStage?.deactivate();
    this.publish();

    return {
      ok: true,
      message: 'Reproducción detenida. La escena se conserva; "play" la reanuda.',
    };
  }

  /** Vacía la escena sin conservar nada. */
  reset(): CompositionResult {
    this.teardownAllSources();
    this.environmentStage?.deactivate();
    this.occlusionStage?.deactivate();
    this.conserved = null;
    this.publish();
    return { ok: true, message: "Mezcla vaciada." };
  }

  /**
   * La escena vigente (sonando o conservada tras `stop`), para guardarla o
   * para el recuerdo de la última mezcla. `null` cuando no hay nada.
   */
  getComposition(): Scene | null {
    if (this.sources.size === 0) return this.conserved;

    const layers: Record<string, number> = {};
    const modifiers: Record<string, { id: string; meters: number }> = {};
    for (const source of this.sources.values()) {
      for (const [key, layer] of source.layers) {
        layers[this.layerId(source.id, key)] = layer.volume;
      }
      if (source.modifier.activeId) {
        modifiers[source.id] = {
          id: source.modifier.activeId,
          meters: source.modifier.distanceMeters,
        };
      }
    }

    return {
      layers,
      environment: this.environmentStage?.activeId ?? null,
      occlusion: this.occlusionStage?.activeId ?? null,
      modifiers,
    };
  }

  /**
   * Sustituye la escena activa por la de una escena guardada. A diferencia de
   * `play`, que monta un ambiente entero, esto monta exactamente las capas
   * declaradas — una escena puede conservar un subconjunto de las capas de un
   * ambiente. Los campos de componentes son opcionales: ausentes, la escena es
   * del formato anterior y se carga sin recinto, barrera ni modificadores
   * (design.md D2).
   */
  async loadComposition(scene: Scene): Promise<CompositionResult> {
    const entries = Object.entries(scene.layers);
    if (entries.length > this.maxLayers) {
      return {
        ok: false,
        message: `La escena necesita ${entries.length} capas y el límite es ${this.maxLayers}.`,
      };
    }

    this.teardownAllSources();
    this.conserved = null;

    // Agrupa las capas por `Source` para montarlas de una vez por ambiente.
    const bySource = new Map<string, string[]>();
    for (const [id] of entries) {
      const separator = id.indexOf(".");
      if (separator < 0) continue;
      const sourceId = id.slice(0, separator);
      const layerKey = id.slice(separator + 1);
      const keys = bySource.get(sourceId) ?? [];
      keys.push(layerKey);
      bySource.set(sourceId, keys);
    }

    const volumes = Object.fromEntries(entries);
    for (const [sourceId, keys] of bySource) {
      const result = await this.mountSource(sourceId, keys, volumes);
      if (!result.ok) {
        this.publish();
        return result;
      }
    }

    const ready = await this.ensureGraph();
    if (ready.ok) {
      if (scene.environment) {
        const declaration = findEnvironment(scene.environment);
        if (declaration) this.environmentStage!.activate(declaration);
      } else {
        this.environmentStage?.deactivate();
      }

      if (scene.occlusion) {
        const declaration = findOcclusion(scene.occlusion);
        if (declaration) this.occlusionStage!.activate(declaration);
      } else {
        this.occlusionStage?.deactivate();
      }

      for (const [sourceId, modifier] of Object.entries(scene.modifiers ?? {})) {
        const source = this.sources.get(sourceId);
        const declaration = findModifier(modifier.id);
        if (source && declaration) source.modifier.activate(declaration, modifier.meters);
      }
    }

    this.publish();
    return { ok: true, message: "Escena cargada." };
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
   * (capacidad `ambient-compatibility`).
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
   * Activa el `Modifier` de distancia sobre un `Source` concreto. El `Source`
   * destinatario es explícito a propósito: deducirlo del estado (p. ej. "el
   * último activado") daría una orden cuyo efecto depende de algo que el
   * usuario no ve.
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

  setMasterVolume(value: number): CompositionResult {
    if (value < 0 || value > 1) {
      return { ok: false, message: "El volumen debe estar entre 0 y 1." };
    }
    this.masterVolume = value;
    if (this.master && this.context) {
      rampToValue(this.master.gain, this.context, value, VOLUME_FADE_SECONDS);
    }
    this.publish();
    return { ok: true, message: `Volumen maestro: ${value}` };
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Fija el volumen de un `Source` completo o de una capa suelta, según lo que
   * nombre `target` (`command-console`, "`volume <capa> <valor>`").
   */
  setLayerVolume(target: string, value: number): CompositionResult {
    if (value < 0 || value > 1) {
      return { ok: false, message: "El volumen debe estar entre 0 y 1." };
    }

    const source = this.sources.get(target);
    if (source) {
      for (const layer of source.layers.values()) {
        layer.volume = value;
        if (this.context) {
          rampToValue(layer.compiled.output.gain, this.context, value, VOLUME_FADE_SECONDS);
        }
      }
      this.publish();
      return { ok: true, message: `Volumen de ${target}: ${value}` };
    }

    for (const active of this.sources.values()) {
      for (const [key, layer] of active.layers) {
        if (this.layerId(active.id, key) !== target) continue;
        layer.volume = value;
        if (this.context) {
          rampToValue(layer.compiled.output.gain, this.context, value, VOLUME_FADE_SECONDS);
        }
        this.publish();
        return { ok: true, message: `Volumen de ${target}: ${value}` };
      }
    }

    return { ok: false, message: `"${target}" no está sonando.` };
  }

  /**
   * La primera línea es la lectura de escena compartida
   * (`command-console`, "Lectura de la escena en lenguaje natural"): la
   * misma frase que encabeza el modo visual y que resume la barra de
   * reproducción en curso, para que `status` no pueda contar una historia
   * distinta de la que el resto de la interfaz muestra. Las líneas que
   * siguen son el detalle técnico —capas y volúmenes— que la lectura, por
   * ser lenguaje natural, no lleva.
   */
  status(): string {
    const { mix, environment, occlusion, sources } = this.snapshot;

    if (mix.kind === "empty" && !environment && !occlusion) {
      return "No hay reproducción en curso.";
    }

    const lines: string[] = [];
    if (mix.kind === "suspended") {
      lines.push('Suspendido por el sistema. "play" la reanuda.');
    } else if (mix.kind === "stopped") {
      lines.push("Detenido. Escena conservada.");
    }

    lines.push(
      sceneSentence({
        sources: sources.map((source) => ({ id: source.id, modifier: source.modifier })),
        environmentId: environment?.id ?? null,
        occlusionId: occlusion?.id ?? null,
      })
    );

    if (mix.kind !== "empty") {
      for (const source of sources) {
        const layers = mix.layers
          .filter((l) => l.id.startsWith(`${source.id}.`))
          .map((l) => `${l.id.slice(source.id.length + 1)} ${l.volume}`)
          .join(", ");
        if (layers) lines.push(`  ${source.id}: ${layers}`);
      }
    }

    return lines.join("\n");
  }

  get activeSourceIds(): string[] {
    return [...this.sources.keys()];
  }

  get activeLayerIds(): string[] {
    return this.currentLayers().map((layer) => layer.id);
  }

  get activeLayers(): number {
    return this.activeLayerCount();
  }
}

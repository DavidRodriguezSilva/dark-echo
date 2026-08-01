import type {
  ContinuousLayerDeclaration,
  GranularLayerDeclaration,
  LayerDeclaration,
  SparseLayerDeclaration,
} from "../domain/layer";
import { mulberry32 } from "../dsp/prng";
import { createPoissonEvents } from "../dsp/eventProcess";
import {
  DENSE_GRANULAR_PROCESSOR_NAME,
  MODULATOR_PROCESSOR_NAME,
  NOISE_PROCESSOR_NAME,
} from "./context";
import { LookaheadScheduler } from "./lookaheadScheduler";
import { SparseVoicePlayer } from "./sparseVoicePlayer";

/**
 * Compilador de capas (design.md D1/D6): el unico lugar que traduce una
 * declaracion de `domain/` al subgrafo de nodos nativos mas worklets que la
 * reproduce. Nada aguas abajo de aqui conoce `LayerDeclaration`; nada aguas
 * arriba conoce `AudioNode`.
 */

export interface CompiledLayer {
  /** Nodo de salida de la capa: quien la use solo conecta esto al bus de mezcla. */
  readonly output: GainNode;
  /** Desconecta y libera todos los nodos de la capa, y detiene su planificador si tenia uno. */
  dispose(): void;
}

/**
 * Deriva tres semillas bien distintas entre si a partir de una semilla base,
 * sumando constantes primas grandes (evita que semillas consecutivas —1, 2,
 * 3— produzcan un sesgo perceptible entre voces).
 */
function deriveSeeds(base: number): { shared: number; left: number; right: number } {
  return {
    shared: (base + 0x9e3779b9) >>> 0,
    left: (base + 0x85ebca6b) >>> 0,
    right: (base + 0xc2b2ae35) >>> 0,
  };
}

function compileContinuousLayer(
  context: BaseAudioContext,
  declaration: ContinuousLayerDeclaration,
  seed: number
): CompiledLayer {
  const seeds = deriveSeeds(seed);

  const noise = new AudioWorkletNode(context, NOISE_PROCESSOR_NAME, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    processorOptions: {
      seedShared: seeds.shared,
      seedLeft: seeds.left,
      seedRight: seeds.right,
      color: declaration.noise,
      width: declaration.stereo.width,
    },
  });

  const filter = context.createBiquadFilter();
  filter.type = declaration.filter.type;
  filter.Q.value = declaration.filter.q ?? 1;

  let modulatorNode: AudioWorkletNode | null = null;
  if (declaration.modulation) {
    // El AudioParam suma su valor intrinseco al de cualquier entrada
    // conectada: en 0, el modulador queda como unica fuente de la frecuencia.
    filter.frequency.value = 0;
    modulatorNode = new AudioWorkletNode(context, MODULATOR_PROCESSOR_NAME, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: {
        seed: (seed + 0x27d4eb2f) >>> 0,
        minHz: declaration.modulation.minHz,
        maxHz: declaration.modulation.maxHz,
        basePeriodSeconds: declaration.modulation.basePeriodSeconds,
      },
    });
    modulatorNode.connect(filter.frequency);
  } else {
    filter.frequency.value = declaration.filter.frequencyHz;
  }

  const panner = context.createStereoPanner();
  panner.pan.value = declaration.stereo.pan;

  // Arranca en silencio: el motor controla el fade de entrada (audio-engine,
  // "Transiciones sin artefactos").
  const output = context.createGain();
  output.gain.value = 0;

  noise.connect(filter);
  filter.connect(panner);
  panner.connect(output);

  return {
    output,
    dispose() {
      noise.disconnect();
      filter.disconnect();
      panner.disconnect();
      output.disconnect();
      modulatorNode?.disconnect();
    },
  };
}

function compileGranularLayer(
  context: BaseAudioContext,
  declaration: GranularLayerDeclaration,
  seed: number
): CompiledLayer {
  const node = new AudioWorkletNode(context, DENSE_GRANULAR_PROCESSOR_NAME, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    processorOptions: {
      seed,
      rateHz: declaration.rateHz,
      radiusRange: declaration.radiusRange,
      bubbleDecayRange: declaration.bubbleDecayRange,
      pitchDrift: declaration.pitchDrift,
      impactDurationRange: declaration.impactDurationRange,
      bubbleProbability: declaration.bubbleProbability,
    },
  });

  const output = context.createGain();
  output.gain.value = 0;
  node.connect(output);

  return {
    output,
    dispose() {
      node.disconnect();
      output.disconnect();
    },
  };
}

// Cuanto tiempo por delante del reloj de audio se planifica un evento
// esporadico, y cada cuanto se revisa (design.md D2). No son parametros del
// fenomeno sonoro, son ajuste del planificador: viven aqui y no en domain/.
const SPARSE_LOOKAHEAD_SECONDS = 2;
const SPARSE_POLL_INTERVAL_MS = 250;

function compileSparseLayer(
  context: BaseAudioContext,
  declaration: SparseLayerDeclaration,
  seed: number
): CompiledLayer {
  const output = context.createGain();
  output.gain.value = 0;

  const rng = mulberry32(seed);
  const player = new SparseVoicePlayer(
    context,
    rng,
    {
      radiusRange: declaration.radiusRange,
      bubbleDecayRange: declaration.bubbleDecayRange,
      pitchDrift: declaration.pitchDrift,
      impactDurationRange: declaration.impactDurationRange,
      bubbleProbability: declaration.bubbleProbability,
      renderDurationSeconds: declaration.renderDurationSeconds,
    },
    output
  );

  const nextInterval = createPoissonEvents(rng, { rateHz: declaration.rateHz });
  const scheduler = new LookaheadScheduler(context, nextInterval, (time) => player.playAt(time), {
    lookaheadSeconds: SPARSE_LOOKAHEAD_SECONDS,
    pollIntervalMs: SPARSE_POLL_INTERVAL_MS,
  });
  scheduler.start();

  return {
    output,
    dispose() {
      scheduler.stop();
      output.disconnect();
    },
  };
}

export function compileLayer(
  context: BaseAudioContext,
  declaration: LayerDeclaration,
  seed: number
): CompiledLayer {
  switch (declaration.kind) {
    case "continuous":
      return compileContinuousLayer(context, declaration, seed);
    case "granular":
      return compileGranularLayer(context, declaration, seed);
    case "sparse":
      return compileSparseLayer(context, declaration, seed);
  }
}

import type { LayerDeclaration } from "../domain/layer";
import { MODULATOR_PROCESSOR_NAME, NOISE_PROCESSOR_NAME } from "./context";

/**
 * Compilador de capas (design.md D1/D6): el unico lugar que traduce una
 * declaracion de `domain/` al subgrafo de nodos nativos mas worklets que la
 * reproduce. Nada aguas abajo de aqui conoce `LayerDeclaration`; nada aguas
 * arriba conoce `AudioNode`.
 */

export interface CompiledLayer {
  /** Nodo de salida de la capa: quien la use solo conecta esto al bus de mezcla. */
  readonly output: GainNode;
  /** Desconecta y libera todos los nodos de la capa. */
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

export function compileLayer(
  context: AudioContext,
  declaration: LayerDeclaration,
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

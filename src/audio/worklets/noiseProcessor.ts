import { mulberry32, type Rng } from "../../dsp/prng";
import { BrownNoise, whiteNoise } from "../../dsp/noise";

function createSource(color: "white" | "brown", rng: Rng): () => number {
  if (color === "brown") {
    const brown = new BrownNoise(rng);
    return () => brown.next();
  }
  return () => whiteNoise(rng);
}

/**
 * Fuente de ruido continua en el hilo de audio (design.md D1: los nodos
 * nativos no saben generar ruido con espectro controlado; el worklet solo
 * hace eso, el filtrado lo hace un `BiquadFilterNode` aguas abajo).
 *
 * La anchura estereo se realiza mezclando un flujo compartido con dos flujos
 * independientes por canal, nunca desfasando uno solo (D16): anchura 0 deja
 * los canales identicos (compatible con mono por construccion); anchura 1
 * los deja completamente decorrelados.
 */
class NoiseProcessor extends AudioWorkletProcessor {
  private readonly shared: () => number;
  private readonly independentLeft: () => number;
  private readonly independentRight: () => number;
  private readonly width: number;

  constructor(options?: AudioWorkletNodeOptions) {
    super(options);

    const data = (options?.processorOptions ?? {}) as {
      seedShared?: number;
      seedLeft?: number;
      seedRight?: number;
      color?: "white" | "brown";
      width?: number;
    };
    const color = data.color ?? "white";
    this.width = Math.max(0, Math.min(1, data.width ?? 1));

    this.shared = createSource(color, mulberry32(data.seedShared ?? 1));
    this.independentLeft = createSource(color, mulberry32(data.seedLeft ?? 2));
    this.independentRight = createSource(color, mulberry32(data.seedRight ?? 3));
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0];
    const left = output[0];
    const right = output[1] ?? output[0];
    const width = this.width;

    for (let i = 0; i < left.length; i++) {
      const shared = this.shared();
      left[i] = shared * (1 - width) + this.independentLeft() * width;
      right[i] = shared * (1 - width) + this.independentRight() * width;
    }

    return true;
  }
}

registerProcessor("dark-echo-noise-processor", NoiseProcessor);

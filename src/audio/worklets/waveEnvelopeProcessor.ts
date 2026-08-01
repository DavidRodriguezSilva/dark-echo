import { mulberry32 } from "../../dsp/prng";
import { createAsymmetricEnvelope } from "../../dsp/asymmetricEnvelope";

/**
 * Salida de la envolvente asimetrica (synthesis-reference, `oleaje`) como
 * senal de audio, para conectarla a un `AudioParam` nativo -- misma idea que
 * `modulatorProcessor.ts`, pero para la modulacion de oleaje en lugar de la
 * compuesta de senoides.
 */
class WaveEnvelopeProcessor extends AudioWorkletProcessor {
  private readonly envelope: () => number;

  constructor(options?: AudioWorkletNodeOptions) {
    super(options);

    const data = (options?.processorOptions ?? {}) as {
      seed?: number;
      minHz?: number;
      maxHz?: number;
      periodSeconds?: number;
      riseFraction?: number;
      periodJitter?: number;
    };

    this.envelope = createAsymmetricEnvelope(mulberry32(data.seed ?? 1), {
      min: data.minHz ?? 0,
      max: data.maxHz ?? 1,
      periodSeconds: data.periodSeconds ?? 8,
      riseFraction: data.riseFraction ?? 0.35,
      periodJitter: data.periodJitter,
      sampleRate,
    });
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0][0];

    for (let i = 0; i < output.length; i++) {
      output[i] = this.envelope();
    }

    return true;
  }
}

registerProcessor("dark-echo-wave-envelope-processor", WaveEnvelopeProcessor);

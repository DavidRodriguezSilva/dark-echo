import { mulberry32 } from "../../dsp/prng";
import { createModulator } from "../../dsp/modulator";

/**
 * Salida del modulador compuesto (D5) como senal de audio, para conectarla
 * directamente a un `AudioParam` nativo (p. ej. la frecuencia de corte de un
 * `BiquadFilterNode`) sin paso de mensajes. Mono: un `AudioParam` solo
 * necesita un valor por muestra.
 */
class ModulatorProcessor extends AudioWorkletProcessor {
  private readonly modulator: (time: number) => number;
  private frame = 0;

  constructor(options?: AudioWorkletNodeOptions) {
    super(options);

    const data = (options?.processorOptions ?? {}) as {
      seed?: number;
      minHz?: number;
      maxHz?: number;
      basePeriodSeconds?: number;
    };

    this.modulator = createModulator(mulberry32(data.seed ?? 1), {
      min: data.minHz ?? 0,
      max: data.maxHz ?? 1,
      basePeriodSeconds: data.basePeriodSeconds ?? 10,
    });
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0][0];

    for (let i = 0; i < output.length; i++) {
      output[i] = this.modulator(this.frame / sampleRate);
      this.frame++;
    }

    return true;
  }
}

registerProcessor("dark-echo-modulator-processor", ModulatorProcessor);

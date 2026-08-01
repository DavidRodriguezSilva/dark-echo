import type { SoundGenerator, SoundsType } from "../domain/types";
import { mulberry32, randomSeed, type Rng } from "../dsp/prng";
import { createSound } from "./sounds";

export class AudioEngine {
  private context: AudioContext | null = null;
  private node: ScriptProcessorNode | null = null;
  private gain: GainNode | null = null;

  // Cada sesion de reproduccion parte de un estado distinto (D4): la semilla
  // se deriva una sola vez por instancia de motor, no por sonido reproducido.
  private readonly rng: Rng = mulberry32(randomSeed());

  private currentGenerator: SoundGenerator = createSound("rain", this.rng);
  private volume = 0.5;
  private time = 0;
  private sampleRate = 44100;

  async start(type: SoundsType) {
    this.currentGenerator = createSound(type, this.rng);

    if (!this.context) {
      this.context = new AudioContext();
      this.sampleRate = this.context.sampleRate;

      this.gain = this.context.createGain();
      this.gain.gain.value = 0;

      this.node = this.context.createScriptProcessor(4096, 1, 1);

      this.node.onaudioprocess = (event) => {
        const output = event.outputBuffer.getChannelData(0);

        for (let i = 0; i < output.length; i++) {
          output[i] = this.currentGenerator.nextSample(this.time, this.sampleRate);

          this.time += 1 / this.sampleRate;
        }
      };

      this.node.connect(this.gain);
      this.gain.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    const now = this.context.currentTime;
    this.gain!.gain.cancelScheduledValues(now);
    this.gain!.gain.setValueAtTime(0, now);
    this.gain!.gain.linearRampToValueAtTime(this.volume, now + 1.5);
  }

  stop() {
    if (!this.context || !this.gain) return;

    const now = this.context.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.linearRampToValueAtTime(0, now + 1.5);
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));

    if (this.context && this.gain) {
      this.gain.gain.setValueAtTime(this.volume, this.context.currentTime);
    }
  }
}

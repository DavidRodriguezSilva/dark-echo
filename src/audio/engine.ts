import type { SoundGenerator, SoundsType } from "./types";
import { createSound } from "./sounds";

export class AudioEngine {
  private context: AudioContext | null = null;
  private node: ScriptProcessorNode | null = null;
  private gain: GainNode | null = null;

  private currentGenerator: SoundGenerator = createSound("rain");
  private volume = 0.5;
  private time = 0;
  private sampleRate = 44100;

  async start(type: SoundsType) {
    this.currentGenerator = createSound(type);

    if (!this.context) {
      this.context = new AudioContext();
      this.sampleRate = this.context.sampleRate;

      this.gain = this.context.createGain();
      this.gain.gain.value = 0;

      this.node = this.context.createScriptProcessor(4096, 1, 1);

      this.node.onaudioprocess = (event) => {
        const output = event.outputBuffer.getChannelData(0);

        for (let i = 0; i < output.length; i++) {
          output[i] = this.currentGenerator.nextSample(
            this.time,
            this.sampleRate
          );

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

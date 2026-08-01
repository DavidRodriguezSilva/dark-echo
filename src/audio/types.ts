export type SoundsType = "rain" | "wind" | "river" | "ocean"

export interface SoundGenerator {
  nextSample(time: number, sampleRate: number): number
}

import type { Rng } from "./prng";

export function clamp(value: number, min = -1, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function lfo(time: number, speed: number, min: number, max: number): number {
  const normalized = (Math.sin(time * speed) + 1) / 2;
  return min + normalized * (max - min);
}

export function smoothRandom(previous: number, rng: Rng, amount = 0.005): number {
  const target = rng() * 2 - 1;
  return previous + (target - previous) * amount;
}

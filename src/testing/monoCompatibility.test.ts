import { describe, expect, it } from "vitest";
import { mulberry32 } from "../dsp/prng";
import { whiteNoise } from "../dsp/noise";
import { monoCompatibilityRatio } from "./monoCompatibility";

describe("monoCompatibilityRatio", () => {
  it("vale 1 cuando los dos canales son identicos", () => {
    const rng = mulberry32(1);
    const signal = Float64Array.from({ length: 1000 }, () => whiteNoise(rng));
    expect(monoCompatibilityRatio(signal, signal)).toBeCloseTo(1, 6);
  });

  it("colapsa hacia 0 cuando un canal es la inversion de fase exacta del otro", () => {
    const rng = mulberry32(2);
    const left = Float64Array.from({ length: 1000 }, () => whiteNoise(rng));
    const right = left.map((v) => -v);

    expect(monoCompatibilityRatio(left, right)).toBeCloseTo(0, 6);
  });

  it("dos flujos independientes no colapsan: la decorrelacion no cancela", () => {
    const rngLeft = mulberry32(10);
    const rngRight = mulberry32(20);
    const left = Float64Array.from({ length: 5000 }, () => whiteNoise(rngLeft));
    const right = Float64Array.from({ length: 5000 }, () => whiteNoise(rngRight));

    expect(monoCompatibilityRatio(left, right)).toBeGreaterThan(0.5);
  });
});

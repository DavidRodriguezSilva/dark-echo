import { describe, expect, it } from "vitest";
import { onePoleLowpassResponseAt } from "./coefficients";

describe("onePoleLowpassResponseAt", () => {
  it("produce el corte de -3 dB (~0.707) en la frecuencia de corte declarada", () => {
    const response = onePoleLowpassResponseAt(400, 400, 44100);
    expect(response).toBeCloseTo(0.7071, 2);
  });

  it("el mismo parametro fisico produce la misma respuesta a 44,1 y 48 kHz", () => {
    for (const cutoffHz of [150, 400, 1000, 3000]) {
      const at44_1 = onePoleLowpassResponseAt(cutoffHz, cutoffHz, 44100);
      const at48 = onePoleLowpassResponseAt(cutoffHz, cutoffHz, 48000);

      expect(at44_1).toBeCloseTo(at48, 2);
    }
  });

  it("atenua mas por encima de la frecuencia de corte que por debajo", () => {
    const cutoffHz = 500;
    const below = onePoleLowpassResponseAt(cutoffHz / 2, cutoffHz, 44100);
    const above = onePoleLowpassResponseAt(cutoffHz * 4, cutoffHz, 44100);

    expect(above).toBeLessThan(below);
  });
});

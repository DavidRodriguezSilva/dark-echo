import { describe, expect, it } from "vitest";

describe("arnes de render (smoke)", () => {
  it("OfflineAudioContext esta disponible en el navegador de la suite de senal", () => {
    expect(typeof OfflineAudioContext).toBe("function");
  });

  it("renderiza un tono puro y produce una senal no silenciosa", async () => {
    const context = new OfflineAudioContext(1, 44100, 44100);
    const oscillator = context.createOscillator();
    oscillator.frequency.value = 440;
    oscillator.connect(context.destination);
    oscillator.start();

    const buffer = await context.startRendering();
    const data = buffer.getChannelData(0);

    expect(data.some((sample) => Math.abs(sample) > 0.01)).toBe(true);
  });
});

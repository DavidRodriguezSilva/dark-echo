import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

// Suite de senal (design.md D8): renderiza el grafo real de Web Audio con
// OfflineAudioContext en un navegador de verdad -- necesario porque
// AudioWorkletNode no existe en Node. Separada de la suite rapida porque es
// mas lenta y depende de un binario de Chromium.
export default defineConfig({
  test: {
    include: ["src/**/*.signal.test.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
});

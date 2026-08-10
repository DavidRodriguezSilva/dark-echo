import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

// Suite de senal (design.md D8): renderiza el grafo real de Web Audio con
// OfflineAudioContext en un navegador de verdad -- necesario porque
// AudioWorkletNode no existe en Node. Separada de la suite rapida porque es
// mas lenta y depende de un binario de Chromium.
//
// `--autoplay-policy=no-user-gesture-required`: sin este flag, un
// AudioContext en vivo (usado por WorkletEngine/AmbientMixer, a diferencia
// de OfflineAudioContext) queda suspendido indefinidamente en Chromium
// headless porque no hay gesto de usuario real que lo desbloquee. Es el
// flag estandar para probar codigo de audio automatizado.
export default defineConfig({
  test: {
    include: ["src/**/*.signal.test.ts"],
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: {
          args: ["--autoplay-policy=no-user-gesture-required"],
        },
      }),
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
});

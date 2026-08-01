import { defineConfig } from "vitest/config";

// Suite rapida: logica determinista y primitivas de DSP, en Node.
// Los tests de senal viven aparte porque necesitan un navegador real
// para renderizar el grafo de Web Audio (ver design.md D8).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.signal.test.ts", "node_modules/**"],
    passWithNoTests: true,
  },
});

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "dev-dist", "node_modules", "test-results", "playwright-report"] },

  // Base: todo el codigo fuente es TypeScript de navegador.
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // El nucleo de DSP declara constantes derivadas; un argumento sin usar
      // debe marcarse explicitamente con guion bajo para que se vea.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      eqeqeq: ["error", "always"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Los procesadores de AudioWorklet corren en el AudioWorkletGlobalScope,
  // que no es ni ventana ni worker: sus globales se declaran a mano.
  {
    files: ["src/audio/worklets/**/*.ts"],
    languageOptions: {
      globals: {
        AudioWorkletProcessor: "readonly",
        registerProcessor: "readonly",
        currentFrame: "readonly",
        currentTime: "readonly",
        sampleRate: "readonly",
      },
    },
  },

  // Configuracion y scripts corren en Node.
  {
    files: ["*.config.{js,ts}", "scripts/**/*.{js,ts}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // Prettier manda en formato: se desactivan las reglas de estilo que chocan.
  prettier
);

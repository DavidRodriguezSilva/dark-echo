import type { AmbientMixer } from "../audio/ambientMixer";
import { listAmbients } from "../domain/catalog";
import { CommandRegistry } from "./registry";
import type { CommandDescriptor, CommandResult } from "./types";
import { commandHelp, generalHelp } from "./help";

function fromMixerResult(result: { ok: boolean; message: string }): CommandResult {
  return { kind: result.ok ? "response" : "error", message: result.message };
}

/**
 * Lo que los comandos `theme`/`scheme` necesitan de la apariencia, sin que
 * `commands/` dependa de `platform/` directamente (design.md D6): quien
 * construye el registro (ui/) inyecta un adaptador sobre el store real.
 */
export interface AppearanceController {
  list(): { id: string; label: string }[];
  getCurrent(): { themeId: string; scheme: "dark" | "light" };
  set(preference: { themeId: string; scheme: "dark" | "light" }): void;
}

/**
 * Construye el registro de comandos con sus handlers reales, sobre un
 * `AmbientMixer` (command-console, "Vocabulario de comandos y semantica de
 * la mezcla") y un `AppearanceController` (theming, "Selección de tema en
 * caliente"). `scene` queda fuera: depende de session-persistence (tarea 14).
 */
export function createCommandRegistry(
  mixer: AmbientMixer,
  appearance: AppearanceController
): CommandRegistry {
  const registry = new CommandRegistry();
  const ambientIds = listAmbients().map((a) => a.id);
  const themeIds = appearance.list().map((t) => t.id);

  const descriptors: CommandDescriptor[] = [
    {
      name: "play",
      aliases: [],
      description:
        "Reproduce un ambiente, sustituyendo la mezcla activa; sin argumento, reanuda la mezcla conservada tras stop.",
      forms: [{ args: [] }, { args: [{ name: "ambiente", type: "enum", values: ambientIds }] }],
      handler: async (args) =>
        fromMixerResult(await mixer.play(args.ambiente as string | undefined)),
    },
    {
      name: "add",
      aliases: [],
      description: "Incorpora un ambiente a la mezcla activa sin retirar lo que ya suena.",
      forms: [{ args: [{ name: "ambiente", type: "enum", values: ambientIds }] }],
      handler: async (args) => fromMixerResult(await mixer.add(args.ambiente as string)),
    },
    {
      name: "remove",
      aliases: [],
      description: "Retira una capa o un ambiente completo de la mezcla activa.",
      forms: [{ args: [{ name: "capa", type: "string" }] }],
      handler: (args) => fromMixerResult(mixer.remove(args.capa as string)),
    },
    {
      name: "stop",
      aliases: [],
      description: "Desvanece la reproducción, conservando la composición de la mezcla.",
      forms: [{ args: [] }],
      handler: () => fromMixerResult(mixer.stop()),
    },
    {
      name: "reset",
      aliases: [],
      description: "Vacía la mezcla activa.",
      forms: [{ args: [] }],
      handler: () => fromMixerResult(mixer.reset()),
    },
    {
      name: "volume",
      aliases: [],
      description: "Fija el volumen maestro, o el de una capa o ambiente concreto.",
      forms: [
        { args: [{ name: "valor", type: "number", range: [0, 1] }] },
        {
          args: [
            { name: "capa", type: "string" },
            { name: "valor", type: "number", range: [0, 1] },
          ],
        },
      ],
      handler: (args) =>
        fromMixerResult(
          "capa" in args
            ? mixer.setLayerVolume(args.capa as string, args.valor as number)
            : mixer.setMasterVolume(args.valor as number)
        ),
    },
    {
      name: "list",
      aliases: [],
      description: "Muestra el catálogo de ambientes disponibles.",
      forms: [{ args: [] }],
      handler: () => ({
        kind: "response",
        message: listAmbients()
          .map((a) => `${a.id} — ${a.label}`)
          .join("\n"),
      }),
    },
    {
      name: "status",
      aliases: [],
      description: "Muestra la mezcla activa y sus volúmenes.",
      forms: [{ args: [] }],
      handler: () => ({ kind: "response", message: mixer.status() }),
    },
    {
      name: "clear",
      aliases: [],
      description: "Vacía la salida de la consola sin afectar a la reproducción.",
      forms: [{ args: [] }],
      handler: () => ({ kind: "response", message: "", effect: "clear" }),
    },
    {
      name: "theme",
      aliases: [],
      description: "Selecciona el tema visual, o lista los disponibles sin argumento.",
      forms: [{ args: [] }, { args: [{ name: "tema", type: "enum", values: themeIds }] }],
      handler: (args) => {
        if (!("tema" in args)) {
          return {
            kind: "response",
            message: appearance
              .list()
              .map((t) => `${t.id} — ${t.label}`)
              .join("\n"),
          };
        }
        const current = appearance.getCurrent();
        appearance.set({ themeId: args.tema as string, scheme: current.scheme });
        return { kind: "response", message: `Tema: ${args.tema}` };
      },
    },
    {
      name: "scheme",
      aliases: [],
      description: "Selecciona el esquema claro u oscuro.",
      forms: [{ args: [{ name: "esquema", type: "enum", values: ["dark", "light"] }] }],
      handler: (args) => {
        const current = appearance.getCurrent();
        appearance.set({ themeId: current.themeId, scheme: args.esquema as "dark" | "light" });
        return { kind: "response", message: `Esquema: ${args.esquema}` };
      },
    },
    {
      name: "help",
      aliases: ["?"],
      description: "Muestra la ayuda general, o la de un comando concreto.",
      forms: [{ args: [] }, { args: [{ name: "comando", type: "string" }] }],
      handler: (args) => {
        if ("comando" in args) {
          const target = registry.find(args.comando as string);
          if (!target) {
            return { kind: "error", message: `No existe el comando "${args.comando}".` };
          }
          return { kind: "response", message: commandHelp(target) };
        }
        return { kind: "response", message: generalHelp(registry.list()) };
      },
    },
  ];

  for (const descriptor of descriptors) registry.register(descriptor);

  return registry;
}

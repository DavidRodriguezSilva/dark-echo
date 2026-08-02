import type { AmbientMixer } from "../audio/ambientMixer";
import {
  listCompositionSourceIds,
  type CompositionEngine,
} from "../audio/composition/compositionEngine";
import { listAmbients } from "../domain/catalog";
import { listEnvironments, listModifiers, listOcclusions } from "../domain/composition/catalog";
import { CommandRegistry } from "./registry";
import type { CommandDescriptor, CommandResult } from "./types";
import { commandHelp, generalHelp } from "./help";

function fromMixerResult(result: { ok: boolean; message: string }): CommandResult {
  return { kind: result.ok ? "response" : "error", message: result.message };
}

/**
 * Igual que `fromMixerResult`, pero adjunta la advertencia de afinidad baja
 * del motor de composición cuando la hay (capacidad `command-console`,
 * "Advertencia de compatibilidad no bloqueante").
 *
 * La advertencia acompaña a la confirmación de que la orden se ejecutó: no
 * es un `kind: "error"` ni una segunda confirmación, porque la combinación
 * de baja afinidad **sí se aplica** — el sistema informa, no impide
 * (design.md D5).
 */
function fromCompositionResult(result: {
  ok: boolean;
  message: string;
  warning?: string;
}): CommandResult {
  if (!result.ok) return { kind: "error", message: result.message };
  return {
    kind: "response",
    message: result.warning ? `${result.message}\n${result.warning}` : result.message,
  };
}

/**
 * Lo que los comandos `theme`/`scheme` necesitan de la apariencia, sin que
 * `commands/` dependa de `platform/` directamente (design.md D6): quien
 * construye el registro (ui/) inyecta un adaptador sobre el store real.
 */
export interface AppearanceController {
  list(): { id: string; label: string }[];
  getCurrent(): { themeId: string; scheme: "dark" | "light" | "auto" };
  set(preference: { themeId: string; scheme: "dark" | "light" | "auto" }): void;
}

/**
 * Lo que el comando `scene` necesita de la persistencia de escenas
 * (session-persistence, "Gestion de escenas sonoras"), inyectado por ui/
 * igual que `AppearanceController`, para que `commands/` no dependa de
 * `platform/` directamente.
 */
export interface SceneController {
  list(): string[];
  save(name: string, overwrite: boolean): { ok: boolean; message: string };
  load(name: string): Promise<{ ok: boolean; message: string }>;
  remove(name: string): { ok: boolean; message: string };
}

/**
 * Lo que el comando `update` necesita de la actualizacion de la aplicacion
 * (offline-playback, "Actualizacion no disruptiva"), inyectado por ui/
 * igual que los demas controladores.
 */
export interface UpdateController {
  isAvailable(): boolean;
  apply(): void;
}

/**
 * Construye el registro de comandos con sus handlers reales, sobre un
 * `AmbientMixer` (command-console, "Vocabulario de comandos y semantica de
 * la mezcla"), un `AppearanceController` (theming, "Selección de tema en
 * caliente"), un `SceneController` (session-persistence, "Gestion de
 * escenas sonoras") y un `UpdateController` (offline-playback,
 * "Actualizacion no disruptiva").
 */
export function createCommandRegistry(
  mixer: AmbientMixer,
  appearance: AppearanceController,
  scenes: SceneController,
  update: UpdateController,
  composition: CompositionEngine
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
      name: "compose",
      aliases: [],
      description:
        'Motor de composición (piloto): "compose source|environment|occlusion|modifier <id|off>" activa o retira cada componente, "compose distance <metros>" mueve la distancia, "compose list" muestra los componentes disponibles, "compose status" la escena activa y "compose stop" la desmonta. Distinto de "play"/"add"/"remove", que operan el motor actual.',
      forms: [
        { args: [{ name: "accion", type: "enum", values: ["status", "stop", "list"] }] },
        {
          args: [
            { name: "accion", type: "enum", values: ["source"] },
            { name: "id", type: "enum", values: [...listCompositionSourceIds(), "off"] },
          ],
        },
        {
          args: [
            { name: "accion", type: "enum", values: ["environment"] },
            {
              name: "id",
              type: "enum",
              values: [...listEnvironments().map((e) => e.id), "off"],
            },
          ],
        },
        {
          args: [
            { name: "accion", type: "enum", values: ["occlusion"] },
            { name: "id", type: "enum", values: [...listOcclusions().map((o) => o.id), "off"] },
          ],
        },
        {
          args: [
            { name: "accion", type: "enum", values: ["modifier"] },
            { name: "id", type: "enum", values: [...listModifiers().map((m) => m.id), "off"] },
          ],
        },
        {
          args: [
            { name: "accion", type: "enum", values: ["distance"] },
            { name: "metros", type: "number", range: [1, 200] },
          ],
        },
      ],
      handler: async (args) => {
        const accion = args.accion as string;

        if (accion === "status") {
          return { kind: "response", message: composition.status() };
        }

        if (accion === "stop") {
          return fromCompositionResult(composition.stop());
        }

        if (accion === "list") {
          const section = (title: string, items: { id: string; label: string }[]) =>
            `${title}:\n${items.map((i) => `  ${i.id} — ${i.label}`).join("\n")}`;
          return {
            kind: "response",
            message: [
              section(
                "Sources",
                listCompositionSourceIds().map((id) => ({ id, label: id }))
              ),
              section("Environments", listEnvironments()),
              section("Occlusions", listOcclusions()),
              section("Modifiers", listModifiers()),
            ].join("\n"),
          };
        }

        if (accion === "distance") {
          return fromCompositionResult(
            await composition.activateModifier("distancia", args.metros as number)
          );
        }

        const id = args.id as string;
        const off = id === "off";

        if (accion === "source") {
          return fromCompositionResult(
            off ? composition.deactivateSource() : await composition.activateSource(id)
          );
        }
        if (accion === "environment") {
          return fromCompositionResult(
            off ? composition.deactivateEnvironment() : await composition.activateEnvironment(id)
          );
        }
        if (accion === "occlusion") {
          return fromCompositionResult(
            off ? composition.deactivateOcclusion() : await composition.activateOcclusion(id)
          );
        }
        return fromCompositionResult(
          off ? composition.deactivateModifier() : await composition.activateModifier(id)
        );
      },
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
      description: 'Selecciona el esquema claro u oscuro, o "auto" para seguir el del sistema.',
      forms: [{ args: [{ name: "esquema", type: "enum", values: ["dark", "light", "auto"] }] }],
      handler: (args) => {
        const current = appearance.getCurrent();
        const esquema = args.esquema as "dark" | "light" | "auto";
        appearance.set({ themeId: current.themeId, scheme: esquema });
        return {
          kind: "response",
          message: esquema === "auto" ? "Esquema: auto (sigue al sistema)." : `Esquema: ${esquema}`,
        };
      },
    },
    {
      name: "scene",
      aliases: [],
      description:
        'Guarda, carga, lista o elimina escenas con nombre. Guardar sobre un nombre existente exige confirmar con "scene save <nombre> confirmar".',
      forms: [
        { args: [{ name: "accion", type: "enum", values: ["list"] }] },
        {
          args: [
            { name: "accion", type: "enum", values: ["save", "load", "delete"] },
            { name: "nombre", type: "string" },
          ],
        },
        {
          args: [
            { name: "accion", type: "enum", values: ["save"] },
            { name: "nombre", type: "string" },
            { name: "confirmacion", type: "enum", values: ["confirmar"] },
          ],
        },
      ],
      handler: async (args) => {
        const accion = args.accion as string;

        if (accion === "list") {
          const names = scenes.list();
          return {
            kind: "response",
            message: names.length > 0 ? names.join(", ") : "No hay escenas guardadas.",
          };
        }

        const nombre = args.nombre as string;

        if (accion === "save") {
          return fromMixerResult(scenes.save(nombre, "confirmacion" in args));
        }

        if (accion === "load") {
          return fromMixerResult(await scenes.load(nombre));
        }

        return fromMixerResult(scenes.remove(nombre));
      },
    },
    {
      name: "update",
      aliases: [],
      description: "Aplica la actualización pendiente de la aplicación, si hay alguna disponible.",
      forms: [{ args: [] }],
      handler: () => {
        if (!update.isAvailable()) {
          return { kind: "response", message: "No hay ninguna actualización pendiente." };
        }
        update.apply();
        return { kind: "response", message: "Aplicando actualización…" };
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

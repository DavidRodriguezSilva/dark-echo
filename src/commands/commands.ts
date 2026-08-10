import {
  listCompositionSourceIds,
  type CompositionEngine,
} from "../audio/composition/compositionEngine";
import { listAmbients } from "../domain/catalog";
import { listEnvironments, listModifiers, listOcclusions } from "../domain/composition/catalog";
import { suggestNext, type SuggestionGroup } from "../domain/composition/suggestions";
import type { Scene } from "../domain/scene";
import { CommandRegistry } from "./registry";
import type { CommandDescriptor, CommandResult } from "./types";
import { commandHelp, generalHelp } from "./help";

/**
 * Registro de comandos sobre el motor único (`retire-legacy-engine`).
 *
 * El reparto de verbos sigue la decisión D1 de ese change: `play`, `add`,
 * `remove`, `stop`, `reset` y `volume` gobiernan **los sonidos** —qué suena y
 * a qué volumen—, mientras que `compose …` gobierna **el espacio donde
 * suenan**. Ninguna acción es alcanzable por dos caminos: no hay
 * `compose source` que duplique a `add`, ni `compose stop` que duplique a
 * `stop`.
 */

function fromResult(result: { ok: boolean; message: string }): CommandResult {
  return { kind: result.ok ? "response" : "error", message: result.message };
}

/**
 * Formatea la sugerencia contextual (`command-console`, "Sugerencia
 * contextual de composición").
 *
 * Las opciones de baja afinidad se marcan pero no se ocultan (design.md D6):
 * si el sistema las acepta, esconderlas contradiría la decisión de advertir
 * sin bloquear.
 */
function formatSuggestion(groups: SuggestionGroup[]): string {
  if (groups.length === 0) return "";

  const lines = groups.map((group, index) => {
    const prefix = index === 0 ? "siguiente ·" : "          ·";
    const options = group.options
      .map((option) => {
        if (option.fits === true) return `${option.id} ✓`;
        if (option.fits === false) return `${option.id} (${option.note ?? "poco afín"})`;
        return option.id;
      })
      .join(", ");
    const usage = group.hint ? `${group.command} ${group.hint}` : group.command;
    return `${prefix} ${usage}\n              ${options}`;
  });

  return lines.join("\n");
}

/**
 * Adjunta la sugerencia a una respuesta. Se usa **solo** en las órdenes que
 * cambian la composición de la escena (design.md D7): sugerir en cada línea
 * —incluidas `help`, `list` o `clear`, que no cambian qué suena— convertiría
 * el aviso en ruido, y el ruido se deja de leer.
 */
function withSuggestion(
  result: { ok: boolean; message: string; warning?: string },
  composition: CompositionEngine
): CommandResult {
  if (!result.ok) return { kind: "error", message: result.message };

  const snapshot = composition.getSnapshot();
  const suggestion = formatSuggestion(
    suggestNext({
      sourceIds: snapshot.sources.map((source) => source.id),
      environmentId: snapshot.environment?.id ?? null,
      occlusionId: snapshot.occlusion?.id ?? null,
      modifiedSourceIds: snapshot.sources.filter((s) => s.modifier).map((s) => s.id),
    })
  );

  const parts = [result.message];
  if (result.warning) parts.push(result.warning);
  if (suggestion) parts.push("", suggestion);

  return { kind: "response", message: parts.join("\n") };
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
 * igual que `AppearanceController`.
 */
export interface SceneController {
  list(): string[];
  save(name: string, overwrite: boolean): { ok: boolean; message: string };
  load(name: string): Promise<{ ok: boolean; message: string }>;
  remove(name: string): { ok: boolean; message: string };
  /**
   * Lee una escena guardada sin aplicarla al motor (`update-interface-design`,
   * design.md D9): permite comparar la composición activa con la escena de la
   * que se cargó, para distinguir una escena guardada de una con cambios sin
   * guardar, sin efecto secundario sobre lo que suena.
   */
  peek(name: string): Scene | undefined;
}

/**
 * Lo que el comando `update` necesita de la actualizacion de la aplicacion
 * (offline-playback, "Actualizacion no disruptiva").
 */
export interface UpdateController {
  isAvailable(): boolean;
  apply(): void;
}

export function createCommandRegistry(
  composition: CompositionEngine,
  appearance: AppearanceController,
  scenes: SceneController,
  update: UpdateController
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
        withSuggestion(await composition.play(args.ambiente as string | undefined), composition),
    },
    {
      name: "add",
      aliases: [],
      description: "Incorpora un ambiente a la mezcla activa sin retirar lo que ya suena.",
      forms: [{ args: [{ name: "ambiente", type: "enum", values: ambientIds }] }],
      handler: async (args) =>
        withSuggestion(await composition.add(args.ambiente as string), composition),
    },
    {
      name: "remove",
      aliases: [],
      description: "Retira una capa o un ambiente completo de la mezcla activa.",
      forms: [{ args: [{ name: "capa", type: "string" }] }],
      handler: (args) => withSuggestion(composition.removeTarget(args.capa as string), composition),
    },
    {
      name: "stop",
      aliases: [],
      description: "Desvanece la reproducción, conservando la composición de la escena.",
      forms: [{ args: [] }],
      handler: () => fromResult(composition.stop()),
    },
    {
      name: "reset",
      aliases: [],
      description: "Vacía la escena activa sin conservar nada.",
      forms: [{ args: [] }],
      handler: () => withSuggestion(composition.reset(), composition),
    },
    {
      name: "compose",
      aliases: [],
      description:
        'Componentes de la escena — dónde suena la mezcla, frente a "play"/"add"/"remove", que gobiernan qué suena. "compose environment <id|off>" fija el recinto, "compose occlusion <id|off>" la barrera, "compose modifier <sonido> <tipo|off>" y "compose distance <sonido> <metros>" actúan sobre un sonido concreto, "compose list" muestra los componentes disponibles y "compose status" la escena activa.',
      forms: [
        { args: [{ name: "accion", type: "enum", values: ["status", "list"] }] },
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
            { name: "source", type: "enum", values: listCompositionSourceIds() },
            { name: "id", type: "enum", values: [...listModifiers().map((m) => m.id), "off"] },
          ],
        },
        {
          args: [
            { name: "accion", type: "enum", values: ["distance"] },
            { name: "source", type: "enum", values: listCompositionSourceIds() },
            { name: "metros", type: "number", range: [1, 200] },
          ],
        },
      ],
      handler: async (args) => {
        const accion = args.accion as string;

        if (accion === "status") {
          return { kind: "response", message: composition.status() };
        }

        if (accion === "list") {
          const section = (title: string, items: { id: string; label: string }[]) =>
            `${title}:\n${items.map((i) => `  ${i.id} — ${i.label}`).join("\n")}`;
          return {
            kind: "response",
            message: [
              section("Recintos", listEnvironments()),
              section("Barreras", listOcclusions()),
              section("Modificadores", listModifiers()),
            ].join("\n"),
          };
        }

        if (accion === "distance") {
          return withSuggestion(
            await composition.activateModifier(
              args.source as string,
              "distancia",
              args.metros as number
            ),
            composition
          );
        }

        const id = args.id as string;
        const off = id === "off";

        if (accion === "environment") {
          return withSuggestion(
            off ? composition.deactivateEnvironment() : await composition.activateEnvironment(id),
            composition
          );
        }
        if (accion === "occlusion") {
          return withSuggestion(
            off ? composition.deactivateOcclusion() : await composition.activateOcclusion(id),
            composition
          );
        }

        const sourceId = args.source as string;
        return withSuggestion(
          off
            ? composition.deactivateModifier(sourceId)
            : await composition.activateModifier(sourceId, id),
          composition
        );
      },
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
        fromResult(
          "capa" in args
            ? composition.setLayerVolume(args.capa as string, args.valor as number)
            : composition.setMasterVolume(args.valor as number)
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
      description: "Muestra la escena activa, sus volúmenes y sus componentes.",
      forms: [{ args: [] }],
      handler: () => ({ kind: "response", message: composition.status() }),
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
          return fromResult(scenes.save(nombre, "confirmacion" in args));
        }

        if (accion === "load") {
          // Cargar una escena sí cambia la composición: lleva sugerencia.
          return withSuggestion(await scenes.load(nombre), composition);
        }

        return fromResult(scenes.remove(nombre));
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

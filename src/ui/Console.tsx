import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CommandRegistry } from "../commands/registry";
import { autocomplete } from "../commands/autocomplete";
import { CommandHistory } from "../commands/commandHistory";
import { executeCommand } from "../commands/executeCommand";
import { commandHelp } from "../commands/help";
import { parseInput } from "../commands/parseInput";
import { readFromStorage, writeToStorage } from "../platform/storage";
import type { SystemNoticeStore } from "../platform/systemNotices";
import { prefersReducedMotion } from "./lib/reducedMotion";
import { Wordmark } from "./Wordmark";

const HISTORY_KEY = "dark-echo.command-history";
const HISTORY_VERSION = 1;
const MAX_OUTPUT_LINES = 500;
// Distancia (px) al final por debajo de la cual se considera "en el fondo".
const FOLLOW_THRESHOLD_PX = 16;
// Sin historial (primer uso), la linea de entrada arranca con un ejemplo
// listo para ejecutar en vez de en blanco -- el usuario tiene algo con lo
// que empezar en vez de una pantalla vacia.
const STARTER_COMMAND = "play rain";
// Intervalo (ms) entre lineas de la introduccion progresiva
// (command-console, "Bienvenida que da a conocer el modo visual").
const INTRO_STEP_MS = 90;

interface OutputLine {
  kind: "mark" | "echo" | "response" | "error" | "lead";
  text: string;
}

/**
 * Introduccion de la consola, en el orden que exige la capacidad
 * (`command-console`, "Bienvenida que da a conocer el modo visual"): marca,
 * bienvenida, que hace la aplicacion, los dos modos con la posicion del
 * conmutador, y como empezar con los comandos.
 *
 * No se dice que la aplicacion "se controla escribiendo comandos, como en
 * una terminal": se ve que lo es, asi que decirlo gastaba una linea sin
 * informar. Tampoco se repite aqui que el modo visual es el arranque por
 * defecto -- quien lee esto ya conmuto desde el, así que lo relevante es
 * cómo volver, no que exista.
 */
const WELCOME_LINES: OutputLine[] = [
  { kind: "mark", text: "dark echo" },
  { kind: "lead", text: "Bienvenido a la consola." },
  {
    kind: "response",
    text: "Genera ambientes sonoros procedurales —lluvia, viento, río y mar— completamente offline, sin grabaciones ni conexión.",
  },
  {
    kind: "response",
    text: "Esta es la consola de comandos; también existe un modo visual con los sonidos como fichas táctiles. Vuelve a él con el icono de la esquina inferior derecha, junto al volumen.",
  },
  {
    kind: "response",
    text: '"play", "add" y "remove" gobiernan qué suena; "compose", dónde suena. Escribe "help" para ver todos los comandos, o prueba "play rain" para empezar.',
  },
];

function lineClassName(kind: OutputLine["kind"]): string {
  if (kind === "lead") return "text-base text-foreground";
  if (kind === "echo") return "font-semibold text-terminal-echo";
  if (kind === "error") return "text-terminal-error";
  return "text-terminal-response";
}

/**
 * Explicación y variaciones del comando que se está escribiendo (si el
 * primer token ya resuelve a uno conocido), para que el usuario sepa qué
 * más puede hacer sin tener que ejecutar `help` aparte.
 */
function commandHintFor(input: string, registry: CommandRegistry): string | null {
  const parsed = parseInput(input);
  if (!parsed) return null;
  const descriptor = registry.find(parsed.command);
  return descriptor ? commandHelp(descriptor) : null;
}

export function Console({
  registry,
  notices,
}: {
  registry: CommandRegistry;
  notices: SystemNoticeStore;
}) {
  const historyRef = useRef<CommandHistory | null>(null);
  if (!historyRef.current) {
    const persisted = readFromStorage<string[]>(HISTORY_KEY, HISTORY_VERSION) ?? [];
    historyRef.current = new CommandHistory(persisted);
  }
  const initialValue = historyRef.current.getEntries().length === 0 ? STARTER_COMMAND : "";

  // Introduccion progresiva (command-console, "Bienvenida que da a conocer
  // el modo visual"): con movimiento reducido, todo de una vez.
  const [lines, setLines] = useState<OutputLine[]>(() =>
    prefersReducedMotion() ? WELCOME_LINES : []
  );
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<string[]>(
    () => autocomplete(initialValue, registry).candidates
  );
  const [commandHint, setCommandHint] = useState<string | null>(() =>
    commandHintFor(initialValue, registry)
  );
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Sigue el final salvo que el usuario haya desplazado la salida hacia
  // atras (command-console, "Seguimiento automatico de la ultima linea").
  const followingRef = useRef(true);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let index = 0;
    const id = setInterval(() => {
      index++;
      setLines(WELCOME_LINES.slice(0, index));
      if (index >= WELCOME_LINES.length) clearInterval(id);
    }, INTRO_STEP_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (followingRef.current && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  // Foco inicial en la linea de entrada (command-console, "Identidad de
  // terminal"): un `ref` + `focus()` explicito es mas fiable que el
  // atributo `autoFocus` solo. `Console` solo se monta al entrar en el modo
  // consola -- ya no en el arranque, que ahora ocurre en el modo visual --
  // asi que este efecto ya enfoca exactamente en el momento correcto. Si hay
  // un comando de ejemplo precargado, tambien se selecciona entero para que
  // escribir cualquier cosa lo reemplace de inmediato.
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Avisos del sistema (persistencia degradada, actualizaciones
  // disponibles): se muestran como una linea mas en cuanto aparecen, sin
  // repetir los ya mostrados.
  const pendingNotices = useSyncExternalStore(notices.subscribe, notices.getSnapshot);
  const shownNoticesRef = useRef(0);
  useEffect(() => {
    if (pendingNotices.length > shownNoticesRef.current) {
      const fresh = pendingNotices.slice(shownNoticesRef.current);
      shownNoticesRef.current = pendingNotices.length;
      setLines((previous) => [
        ...previous,
        ...fresh.map((text): OutputLine => ({ kind: "error", text })),
      ]);
    }
  }, [pendingNotices]);

  function handleScroll() {
    const el = outputRef.current;
    if (!el) return;
    followingRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_THRESHOLD_PX;
  }

  // Un clic en cualquier parte de la consola —la salida, el listado de
  // `help`, las sugerencias— devuelve el foco a la linea de entrada: en una
  // terminal el punto de escritura es siempre el mismo, sin importar donde
  // se haya hecho clic. La excepcion es un clic que deja texto
  // seleccionado, porque ese clic era para copiar y enfocar la entrada
  // descartaria la seleccion.
  function handleConsoleMouseUp(event: React.MouseEvent) {
    if (event.target === inputRef.current) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    inputRef.current?.focus();
  }

  function updateValue(next: string) {
    setValue(next);
    setSuggestions(autocomplete(next, registry).candidates);
    setCommandHint(commandHintFor(next, registry));
  }

  /**
   * Acepta una candidata tocada (command-console, "Autocompletado y
   * sugerencias", "Aceptar una candidata sin teclado"): a diferencia de
   * `Tab`, que completa hasta el prefijo comun cuando hay varias, tocar una
   * candidata concreta completa exactamente a ella -- es una eleccion
   * inequivoca, asi que no hace falta detenerse en el prefijo comun.
   */
  function acceptSuggestion(candidate: string) {
    const endsWithSpace = /\s$/.test(value);
    const parts = value.split(/\s+/).filter(Boolean);
    const completingCommandName = parts.length === 0 || (parts.length === 1 && !endsWithSpace);

    if (completingCommandName) {
      const quickPrefix = parts[0]?.match(/^[/.]/)?.[0] ?? "";
      updateValue(`${quickPrefix}${candidate} `);
    } else {
      const tokens = endsWithSpace ? parts : parts.slice(0, -1);
      updateValue(`${[...tokens, candidate].join(" ")} `);
    }
    inputRef.current?.focus();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const command = value;
    setValue("");
    setSuggestions([]);
    setCommandHint(null);

    const result = await executeCommand(command, registry);
    if (!result) return;

    const history = historyRef.current!;
    history.push(command.trim());
    writeToStorage(HISTORY_KEY, HISTORY_VERSION, [...history.getEntries()]);

    if (result.effect === "clear") {
      setLines([]);
      return;
    }

    setLines((previous) => {
      const next: OutputLine[] = [
        ...previous,
        { kind: "echo", text: command },
        { kind: result.kind, text: result.message },
      ];
      return next.length > MAX_OUTPUT_LINES ? next.slice(next.length - MAX_OUTPUT_LINES) : next;
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const previous = historyRef.current!.navigateBack(value);
      if (previous !== null) updateValue(previous);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = historyRef.current!.navigateForward();
      if (next !== null) updateValue(next);
    } else if (event.key === "Tab") {
      event.preventDefault();
      const result = autocomplete(value, registry);
      setValue(result.completed);
      setSuggestions(result.candidates);
      setCommandHint(commandHintFor(result.completed, registry));
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" onMouseUp={handleConsoleMouseUp}>
      <div
        ref={outputRef}
        onScroll={handleScroll}
        className="flex-1 space-y-1 overflow-y-auto px-4 py-3 font-mono text-sm whitespace-pre-wrap"
      >
        {lines.map((line, index) =>
          line.kind === "mark" ? (
            <Wordmark key={index} size="lg" className="py-2" />
          ) : (
            <p key={index} className={lineClassName(line.kind)}>
              {line.kind === "echo" ? `> ${line.text}` : line.text}
            </p>
          )
        )}
      </div>

      {commandHint && (
        <div className="flex flex-col gap-0.5 px-4 pb-1 text-xs whitespace-pre-wrap">
          {commandHint.split("\n").map((part, index) =>
            index === 0 ? (
              <p key={index} className="text-terminal-response">
                {part}
              </p>
            ) : (
              <p key={index} className="font-mono text-foreground">
                {part}
              </p>
            )
          )}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-1.5">
          {suggestions.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => acceptSuggestion(candidate)}
              className="min-h-8 rounded-sm border border-border px-2 py-1 font-mono text-xs text-terminal-response transition-colors hover:border-input hover:text-foreground"
            >
              {candidate}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border px-4 py-2"
      >
        <span
          aria-hidden="true"
          className="animate-pulse text-terminal-cursor motion-reduce:animate-none"
        >
          ▋
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => updateValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escriba un comando..."
          className="w-full bg-transparent font-mono text-sm text-foreground outline-none"
        />
      </form>
    </section>
  );
}

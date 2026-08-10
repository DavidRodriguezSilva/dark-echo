import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CommandRegistry } from "../commands/registry";
import { autocomplete } from "../commands/autocomplete";
import { CommandHistory } from "../commands/commandHistory";
import { executeCommand } from "../commands/executeCommand";
import { commandHelp } from "../commands/help";
import { parseInput } from "../commands/parseInput";
import { readFromStorage, writeToStorage } from "../platform/storage";
import type { SystemNoticeStore } from "../platform/systemNotices";

const HISTORY_KEY = "dark-echo.command-history";
const HISTORY_VERSION = 1;
const MAX_OUTPUT_LINES = 500;
// Distancia (px) al final por debajo de la cual se considera "en el fondo".
const FOLLOW_THRESHOLD_PX = 16;
// Sin historial (primer uso), la linea de entrada arranca con un ejemplo
// listo para ejecutar en vez de en blanco -- el usuario tiene algo con lo
// que empezar en vez de una pantalla vacia.
const STARTER_COMMAND = "play rain";

interface OutputLine {
  kind: "echo" | "response" | "error";
  text: string;
}

const WELCOME_LINES: OutputLine[] = [
  "dark-echo genera ambientes sonoros procedurales —lluvia, viento, río y mar— completamente offline, sin grabaciones.",
  "Todo se controla escribiendo comandos, como en una terminal.",
  'Escribí "help" para ver la lista completa, o "help <comando>" para el detalle de uno.',
].map((text) => ({ kind: "response", text }));

function lineClassName(kind: OutputLine["kind"]): string {
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

  const [lines, setLines] = useState<OutputLine[]>(WELCOME_LINES);
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
    if (followingRef.current && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  // Foco inicial en la linea de entrada (command-console, "Identidad de
  // terminal"): un `ref` + `focus()` explicito es mas fiable que el
  // atributo `autoFocus` solo, sobre todo tras el splash de arranque. Si
  // hay un comando de ejemplo precargado, tambien se selecciona entero
  // para que escribir cualquier cosa lo reemplace de inmediato.
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
        {lines.map((line, index) => (
          <p key={index} className={lineClassName(line.kind)}>
            {line.kind === "echo" ? `> ${line.text}` : line.text}
          </p>
        ))}
      </div>

      {commandHint && (
        <p className="px-4 pb-1 text-xs whitespace-pre-wrap text-terminal-response">
          {commandHint}
        </p>
      )}

      {suggestions.length > 0 && (
        <p className="truncate px-4 pb-1 text-xs text-terminal-response">
          {suggestions.join("  ")}
        </p>
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

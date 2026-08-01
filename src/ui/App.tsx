import { useRef, useState } from "react";
import { AmbientMixer } from "../audio/ambientMixer";
import { createCommandRegistry } from "../commands/commands";
import { executeCommand } from "../commands/executeCommand";

interface OutputLine {
  kind: "echo" | "response" | "error";
  text: string;
}

const WELCOME_LINES = [
  "play rain",
  "play wind",
  "play river",
  "play ocean",
  "add <ambiente>",
  "stop",
  "volume 0.5",
  "help",
];

export function App() {
  const mixerRef = useRef<AmbientMixer | null>(null);
  if (!mixerRef.current) {
    mixerRef.current = new AmbientMixer();
  }
  const registryRef = useRef(createCommandRegistry(mixerRef.current));

  const [lines, setLines] = useState<OutputLine[]>(
    WELCOME_LINES.map((text) => ({ kind: "response", text }))
  );
  const [value, setValue] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const command = value;
    setValue("");

    const result = await executeCommand(command, registryRef.current);
    if (!result) return;

    if (result.effect === "clear") {
      setLines([]);
      return;
    }

    setLines((previous) => [
      ...previous,
      { kind: "echo", text: command },
      { kind: result.kind, text: result.message },
    ]);
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-lg font-semibold text-foreground">dark-echo</h1>

      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <div className="min-h-[300px] space-y-1 font-mono text-sm whitespace-pre-wrap">
          {lines.map((line, index) => (
            <p
              key={index}
              className={
                line.kind === "echo"
                  ? "font-semibold text-terminal-echo"
                  : line.kind === "error"
                    ? "text-terminal-error"
                    : "text-terminal-response"
              }
            >
              {line.kind === "echo" ? `> ${line.text}` : line.text}
            </p>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Escriba un comando..."
            autoFocus
            className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
      </section>
    </main>
  );
}

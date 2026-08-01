import { useRef, useState } from "react";
import { AudioEngine } from "../audio/engine";
import { executeCommand } from "../commands/parser";

interface OutputLine {
  kind: "echo" | "response";
  text: string;
}

const HELP_LINES = [
  "play rain",
  "play wind",
  "play river",
  "play ocean",
  "stop",
  "volume 0.5",
  "list",
];

export function App() {
  const engineRef = useRef<AudioEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new AudioEngine();
  }

  const [lines, setLines] = useState<OutputLine[]>(
    HELP_LINES.map((text) => ({ kind: "response", text }))
  );
  const [value, setValue] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const command = value;
    const response = executeCommand(command, engineRef.current!);

    setLines((previous) => [
      ...previous,
      { kind: "echo", text: command },
      { kind: "response", text: response },
    ]);
    setValue("");
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-lg font-semibold text-foreground">dark-echo</h1>

      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <div className="min-h-[300px] space-y-1 font-mono text-sm">
          {lines.map((line, index) => (
            <p
              key={index}
              className={
                line.kind === "echo" ? "text-terminal-echo font-semibold" : "text-terminal-response"
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

import { useRef } from "react";
import { AmbientMixer } from "../audio/ambientMixer";
import { createCommandRegistry } from "../commands/commands";
import { Console } from "./Console";
import { StatusPanel } from "./StatusPanel";

export function App() {
  const mixerRef = useRef<AmbientMixer | null>(null);
  if (!mixerRef.current) {
    mixerRef.current = new AmbientMixer();
  }
  const registryRef = useRef(createCommandRegistry(mixerRef.current));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-lg font-semibold text-foreground">dark-echo</h1>

      <Console registry={registryRef.current} />
      <StatusPanel mixer={mixerRef.current} />
    </main>
  );
}

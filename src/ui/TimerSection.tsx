import { useState } from "react";
import { Timer } from "lucide-react";
import type { SleepTimerController } from "../commands/commands";
import { formatRemaining } from "../domain/sleepTimer";
import type { SleepTimerStore } from "../platform/sleepTimer";
import { useSleepTimer } from "./lib/useSleepTimer";
import { cn } from "./lib/utils";
import { Button } from "./primitives/button";
import { Switch } from "./primitives/switch";
import { TimeInput } from "./primitives/time-input";

/**
 * Temporizador de apagado en el modo visual (`sleep-timer`). El interruptor
 * despliega las opciones; con el temporizador en marcha las opciones se
 * sustituyen por la cuenta atrás y apagar el interruptor lo cancela. Lo que se
 * ve sale del store, no de una copia local: solo se guardan aquí el borrador de
 * la hora o la duración que aún no se han iniciado.
 */

type Kind = "in" | "at";

const PRESET_MINUTES = [15, 30, 60, 120];

function clockLabel(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

function inOneHour(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function presetValue(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}:00`;
}

export function TimerSection({
  controller,
  store,
}: {
  controller: SleepTimerController;
  store: SleepTimerStore;
}) {
  const { state, remainingMs } = useSleepTimer(store);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("in");
  const [duration, setDuration] = useState("0:30:00");
  const [clock, setClock] = useState(inOneHour);
  const [error, setError] = useState<string | null>(null);

  const running = state !== null;
  const expanded = open || running;

  function handleSwitch(checked: boolean) {
    setError(null);
    if (!checked) controller.cancel();
    setOpen(checked);
  }

  function start() {
    const result = kind === "in" ? controller.setIn(duration) : controller.setAt(clock);
    setError(result.ok ? null : result.message);
  }

  const tab = (id: Kind, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={kind === id}
      onClick={() => setKind(id)}
      className={cn(
        "min-h-8 rounded-md px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
        kind === id ? "bg-background text-foreground shadow-xs" : "text-terminal-response"
      )}
    >
      {label}
    </button>
  );

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wide text-terminal-response uppercase">
          <Timer className="size-3.5" aria-hidden="true" />
          Temporizador
        </h2>
        <Switch
          checked={expanded}
          onCheckedChange={handleSwitch}
          aria-label="Activar el temporizador de apagado"
        />
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-panel p-3">
          {running ? (
            <div className="flex items-center justify-between gap-3" role="timer" aria-live="off">
              <div className="flex flex-col">
                <span className="font-mono text-2xl leading-none text-foreground tabular-nums">
                  {formatRemaining(remainingMs)}
                </span>
                <span className="mt-1 text-xs text-terminal-response">
                  {state.fading ? "Apagando…" : `Se apaga a las ${clockLabel(state.endAt)}`}
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-9 text-xs"
                onClick={() => controller.cancel()}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div
                  role="tablist"
                  aria-label="Cómo fijar el apagado"
                  className="flex gap-0.5 rounded-md bg-muted p-0.5"
                >
                  {tab("in", "Dentro de")}
                  {tab("at", "A las")}
                </div>

                {kind === "in" && (
                  <div className="flex gap-1.5">
                    {PRESET_MINUTES.map((minutes) => {
                      const selected = duration === presetValue(minutes);
                      return (
                        <Button
                          key={minutes}
                          type="button"
                          size="sm"
                          variant={selected ? "default" : "secondary"}
                          className="h-7 px-2.5 text-xs"
                          aria-pressed={selected}
                          onClick={() => setDuration(presetValue(minutes))}
                        >
                          {minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}
                        </Button>
                      );
                    })}
                  </div>
                )}

                {kind === "in" ? (
                  // Una duración no es una hora del día: el campo nativo la
                  // mostraría en 12 h según el idioma ("12:30:00 AM"), así que
                  // es texto con la misma apariencia y acepta "45m" o "1:30:00".
                  <TimeInput
                    type="text"
                    inputMode="numeric"
                    value={duration}
                    placeholder="0:30:00"
                    aria-label="Duración hasta el apagado"
                    className="w-24 text-center"
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => setDuration(event.target.value)}
                  />
                ) : (
                  <TimeInput
                    value={clock}
                    aria-label="Hora de apagado"
                    onChange={(event) => setClock(event.target.value)}
                  />
                )}

                <Button
                  type="button"
                  size="sm"
                  className="ml-auto min-h-9 px-5 text-xs"
                  disabled={(kind === "in" ? duration : clock).trim() === ""}
                  onClick={start}
                >
                  Iniciar
                </Button>
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="text-xs text-terminal-error">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

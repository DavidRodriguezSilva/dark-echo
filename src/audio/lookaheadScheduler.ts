import { scheduleUpToHorizon } from "../dsp/scheduler";

/**
 * Planificador de anticipacion para eventos esporadicos (design.md D2): se
 * ejecuta en el hilo principal, programando cada evento con tiempo absoluto
 * de `AudioContext` por delante del reloj de audio. Si el hilo principal se
 * bloquea mas que `lookaheadSeconds`, un evento puede llegar tarde -- las
 * capas continuas no se ven afectadas porque viven en el hilo de audio
 * (trade-off aceptado explicitamente en design.md D2).
 */
export interface LookaheadSchedulerOptions {
  /** Cuanto tiempo por delante del reloj de audio se programa, en segundos. */
  lookaheadSeconds: number;
  /** Cada cuanto se revisa si hace falta programar mas, en milisegundos. */
  pollIntervalMs: number;
}

export class LookaheadScheduler {
  private readonly context: AudioContext;
  private readonly nextInterval: () => number;
  private readonly onSchedule: (timeSeconds: number) => void;
  private readonly options: LookaheadSchedulerOptions;
  private nextEventTime: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    context: AudioContext,
    nextInterval: () => number,
    onSchedule: (timeSeconds: number) => void,
    options: LookaheadSchedulerOptions
  ) {
    this.context = context;
    this.nextInterval = nextInterval;
    this.onSchedule = onSchedule;
    this.options = options;
    this.nextEventTime = context.currentTime + nextInterval();
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.options.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const horizon = this.context.currentTime + this.options.lookaheadSeconds;
    this.nextEventTime = scheduleUpToHorizon(
      this.nextEventTime,
      horizon,
      this.nextInterval,
      this.onSchedule
    );
  }
}

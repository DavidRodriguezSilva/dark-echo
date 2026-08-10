import type { DistanceModifierDeclaration } from "../../domain/composition/modifier";
import { airAbsorptionCutoffHz, distanceGain } from "../../dsp/acoustics";
import { rampToValue } from "../transitions";

/**
 * Etapa de `Modifier` de distancia (capacidad `ambient-modifiers`).
 *
 *   input ─┬→ bypassGain ───────────────────────────→ output
 *          └→ airAbsorptionFilter → distanceGain ───→ output
 *
 * El camino de derivacion no es decorativo: un biquad "transparente" no lo es.
 * La primera version dejaba el pasa-bajos permanentemente en la cadena con su
 * corte en 20 kHz -- un 0.9 de Nyquist a 44.1 kHz --, donde la distorsion de
 * fase de un biquad es grande aunque su magnitud sea plana. Medido sobre el
 * render real, con el `Modifier` *inactivo* eso ya subia el pico y el factor
 * de cresta un 13% a igual RMS, y dejaba una senal de diferencia a -21.9 dB
 * frente a la cadena directa. Una etapa inactiva tiene que ser
 * bit-transparente, no casi transparente.
 *
 * Eso es tambien lo que la hace **autocontenida** en el sentido que exige la
 * capacidad: mover la distancia en el tiempo es rampar estos dos parametros,
 * sin leer el estado de ningun otro `Source` de la escena. Un `Source`
 * alejandose es este `Modifier` variando su valor, no una interaccion entre
 * componentes.
 *
 * Los dos parametros van juntos porque el fenomeno es uno solo: la distancia
 * baja el nivel (inverso del cuadrado) *y* se lleva los agudos (absorcion
 * atmosferica). Aplicar solo lo primero suena a bajar el volumen, no a
 * alejarse.
 */

const RAMP_SECONDS = 0.5;

export class ModifierStage {
  readonly input: GainNode;
  readonly output: GainNode;

  private readonly context: BaseAudioContext;
  private readonly bypassGain: GainNode;
  private readonly airAbsorptionFilter: BiquadFilterNode;
  private readonly distanceGain: GainNode;
  private active: DistanceModifierDeclaration | null = null;
  private currentMeters = 0;

  constructor(context: BaseAudioContext) {
    this.context = context;

    this.input = context.createGain();
    this.output = context.createGain();
    this.bypassGain = context.createGain();
    this.bypassGain.gain.value = 1;
    this.distanceGain = context.createGain();
    this.distanceGain.gain.value = 0;

    this.airAbsorptionFilter = context.createBiquadFilter();
    this.airAbsorptionFilter.type = "lowpass";
    this.airAbsorptionFilter.Q.value = 0.5;
    this.airAbsorptionFilter.frequency.value = this.transparentCutoffHz();

    this.input.connect(this.bypassGain);
    this.bypassGain.connect(this.output);

    this.input.connect(this.airAbsorptionFilter);
    this.airAbsorptionFilter.connect(this.distanceGain);
    this.distanceGain.connect(this.output);
  }

  get activeId(): string | null {
    return this.active?.id ?? null;
  }

  get distanceMeters(): number {
    return this.currentMeters;
  }

  /** Corte que deja pasar toda la banda audible: el estado neutro de la etapa. */
  private transparentCutoffHz(): number {
    return Math.min(20000, this.context.sampleRate / 2);
  }

  activate(declaration: DistanceModifierDeclaration, meters?: number): void {
    this.active = declaration;
    rampToValue(this.bypassGain.gain, this.context, 0, RAMP_SECONDS);
    this.setDistance(meters ?? declaration.defaultMeters);
  }

  /**
   * Fija la distancia. Llamarlo repetidamente con valores distintos es lo que
   * produce el movimiento aparente: cada llamada rampa desde el valor
   * instantaneo vigente, asi que una secuencia de valores se oye como un
   * desplazamiento continuo y no como saltos.
   */
  setDistance(meters: number): void {
    if (!this.active) return;

    const clamped = Math.min(this.active.maxMeters, Math.max(this.active.minMeters, meters));
    this.currentMeters = clamped;

    rampToValue(
      this.distanceGain.gain,
      this.context,
      distanceGain(clamped, this.active.minMeters),
      RAMP_SECONDS
    );
    rampToValue(
      this.airAbsorptionFilter.frequency,
      this.context,
      Math.min(airAbsorptionCutoffHz(clamped), this.transparentCutoffHz()),
      RAMP_SECONDS
    );
  }

  deactivate(): void {
    this.active = null;
    this.currentMeters = 0;
    rampToValue(this.bypassGain.gain, this.context, 1, RAMP_SECONDS);
    rampToValue(this.distanceGain.gain, this.context, 0, RAMP_SECONDS);
    rampToValue(
      this.airAbsorptionFilter.frequency,
      this.context,
      this.transparentCutoffHz(),
      RAMP_SECONDS
    );
  }

  dispose(): void {
    this.input.disconnect();
    this.bypassGain.disconnect();
    this.airAbsorptionFilter.disconnect();
    this.distanceGain.disconnect();
    this.output.disconnect();
  }
}

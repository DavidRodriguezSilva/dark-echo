import type { OcclusionDeclaration } from "../../domain/composition/occlusion";
import { massLawResponse, plateModes, surfaceMassKgPerSquareMeter } from "../../dsp/acoustics";
import { rampToValue } from "../transitions";

/**
 * Etapa de `Occlusion` (capacidad `ambient-occlusion`): barrera compartida de
 * escena, con dos caminos que representan dos fenomenos fisicos distintos
 * (design.md D9).
 *
 *   input ─┬→ bypassGain ─────────────────────────────→ output
 *          ├→ massLawFilter → transmissionGain ───────→ output
 *          ├→ flankingGain (plano) ───────────────────→ output
 *          └→ modo_1..modo_n (banda) → resonanceGain ─→ output
 *
 * - **Transmision**: lo que atraviesa la barrera. La ley de masas es, en el
 *   rango audible, una caida de 6 dB/octava, es decir exactamente un
 *   pasa-bajos de un polo cuyo corte fija la masa superficial
 *   (`massLawCutoffHz`). De ahi que lo ocluido suene apagado y no solo mas
 *   flojo, y que una variante gruesa atenue 6 dB mas sin declarar nada nuevo.
 * - **Resonancia propia**: la barrera devolviendo su propio sonido al ser
 *   golpeada por el `Source` -- la lluvia sobre el techo. Es un banco de
 *   filtros de banda en los modos propios de la placa, excitado por la senal
 *   del `Source`. Por construccion cumple los tres requisitos de la
 *   capacidad: depende del `Source`, escala con su intensidad (mas energia
 *   incidente, mas excitacion) y es **muda sin `Source`**, porque un filtro
 *   sin entrada no produce salida.
 *
 * Igual que `EnvironmentStage`, la etapa esta siempre en el grafo y se activa
 * cruzando ganancias, sin reconectar nodos.
 */

const CROSSFADE_SECONDS = 1.2;

/**
 * Corte del pasa-altos que limpia el camino de transmision, en Hz.
 *
 * Bloquea la continua que una cadena de pasa-bajos en serie puede acumular, y
 * recorta el infrasonido que ni el `Source` modela ni ningun altavoz
 * reproduce. Tiene que quedar **por debajo** del corte de la ley de masas
 * (`MASS_LAW_VALIDITY_FLOOR_HZ`): si lo superara, los dos filtros se cruzarian
 * y formarian un pasa-banda estrecho en lugar de una caida monotona -- un
 * error que se cometio y se detecto midiendo, porque dejaba un pico
 * resonante a 65 Hz que no corresponde a ningun fenomeno.
 */
const TRANSMISSION_HIGHPASS_HZ = 45;

/**
 * Corte del pasa-altos que alimenta el banco resonante, en Hz.
 *
 * Lo que excita a la placa es el **impacto** de cada gota -- una fuerza
 * transitoria y de banda ancha -- no el campo acustico continuo de la masa de
 * lluvia. Alimentar los resonadores con la senal completa metia tambien la
 * capa `cuerpo`, un ruido continuo y sostenido, y un resonador alimentado sin
 * pausa deja de sonar a placa golpeada para sonar a tono. Filtrando por
 * encima de la banda del cuerpo, al banco le llega sobre todo el contenido
 * transitorio de `impactos` y `goteo`: cada golpe produce su repique y se
 * apaga, que es el fenomeno que se quiere.
 */
const RESONANCE_EXCITATION_HIGHPASS_HZ = 1500;

export class OcclusionStage {
  readonly input: GainNode;
  readonly output: GainNode;

  private readonly context: BaseAudioContext;
  private readonly bypassGain: GainNode;
  private readonly massLawFilter: BiquadFilterNode;
  private readonly transmissionHighpass: BiquadFilterNode;
  private readonly transmissionGain: GainNode;
  private readonly flankingGain: GainNode;
  private readonly excitationHighpass: BiquadFilterNode;
  private readonly resonanceGain: GainNode;
  private modeFilters: BiquadFilterNode[] = [];
  private active: OcclusionDeclaration | null = null;

  constructor(context: BaseAudioContext) {
    this.context = context;

    this.input = context.createGain();
    this.output = context.createGain();
    this.bypassGain = context.createGain();
    this.transmissionGain = context.createGain();
    this.flankingGain = context.createGain();
    this.resonanceGain = context.createGain();

    this.massLawFilter = context.createBiquadFilter();
    this.massLawFilter.type = "lowpass";
    // Q por debajo de 1/sqrt(2) evita el pico de resonancia del biquad en el
    // corte: la ley de masas es una caida monotona, sin realce.
    this.massLawFilter.Q.value = 0.5;
    this.massLawFilter.frequency.value = context.sampleRate / 2;

    this.transmissionHighpass = context.createBiquadFilter();
    this.transmissionHighpass.type = "highpass";
    this.transmissionHighpass.Q.value = 0.5;
    this.transmissionHighpass.frequency.value = TRANSMISSION_HIGHPASS_HZ;

    this.excitationHighpass = context.createBiquadFilter();
    this.excitationHighpass.type = "highpass";
    this.excitationHighpass.Q.value = 0.5;
    this.excitationHighpass.frequency.value = RESONANCE_EXCITATION_HIGHPASS_HZ;

    this.bypassGain.gain.value = 1;
    this.transmissionGain.gain.value = 0;
    this.flankingGain.gain.value = 0;
    this.resonanceGain.gain.value = 0;

    this.input.connect(this.bypassGain);
    this.bypassGain.connect(this.output);

    this.input.connect(this.massLawFilter);
    this.massLawFilter.connect(this.transmissionHighpass);
    this.transmissionHighpass.connect(this.transmissionGain);
    this.transmissionGain.connect(this.output);

    // Camino indirecto: plano en frecuencia, sin pasar por el filtro de la
    // ley de masas -- por definicion es el sonido que rodea la barrera.
    this.input.connect(this.flankingGain);
    this.flankingGain.connect(this.output);

    // Los modos se conectan a la salida del pasa-altos de excitacion, no
    // directamente a la entrada de la etapa.
    this.input.connect(this.excitationHighpass);
    this.resonanceGain.connect(this.output);
  }

  get activeId(): string | null {
    return this.active?.id ?? null;
  }

  activate(declaration: OcclusionDeclaration): void {
    const mass = surfaceMassKgPerSquareMeter(
      declaration.densityKgPerCubicMeter,
      declaration.thicknessMeters
    );

    // El corte se situa en el suelo de validez de la ley de masas, y la
    // ganancia es la que la ley predice justo ahi: por encima reproduce la ley
    // exactamente (6 dB/octava desde el nivel correcto), por debajo se aplana
    // en vez de seguir subiendo. La dependencia con la masa vive entera en la
    // ganancia, asi que una barrera del doble de masa sigue atenuando 6 dB mas.
    const { cutoffHz, gain: transmission, flankingGain } = massLawResponse(mass);
    this.massLawFilter.frequency.value = cutoffHz;

    this.rebuildResonance(declaration);

    this.active = declaration;
    rampToValue(this.bypassGain.gain, this.context, 0, CROSSFADE_SECONDS);
    rampToValue(this.transmissionGain.gain, this.context, transmission, CROSSFADE_SECONDS);
    rampToValue(this.flankingGain.gain, this.context, flankingGain, CROSSFADE_SECONDS);
    rampToValue(
      this.resonanceGain.gain,
      this.context,
      declaration.resonance?.mix ?? 0,
      CROSSFADE_SECONDS
    );
  }

  deactivate(): void {
    this.active = null;
    rampToValue(this.bypassGain.gain, this.context, 1, CROSSFADE_SECONDS);
    rampToValue(this.transmissionGain.gain, this.context, 0, CROSSFADE_SECONDS);
    rampToValue(this.flankingGain.gain, this.context, 0, CROSSFADE_SECONDS);
    rampToValue(this.resonanceGain.gain, this.context, 0, CROSSFADE_SECONDS);
  }

  /** Frecuencias modales compiladas de la barrera activa; vacio si no aporta sonido propio. */
  get activeModeFrequenciesHz(): number[] {
    return this.modeFilters.map((filter) => filter.frequency.value);
  }

  private rebuildResonance(declaration: OcclusionDeclaration): void {
    for (const filter of this.modeFilters) filter.disconnect();
    this.modeFilters = [];

    const resonance = declaration.resonance;
    if (!resonance) return;

    const modes = plateModes(
      resonance.geometry,
      resonance.material,
      resonance.modeCount,
      resonance.modalBandHz
    );

    for (const mode of modes) {
      const filter = this.context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = mode.frequencyHz;
      filter.Q.value = mode.q;
      this.excitationHighpass.connect(filter);
      filter.connect(this.resonanceGain);
      this.modeFilters.push(filter);
    }
  }

  dispose(): void {
    this.input.disconnect();
    this.bypassGain.disconnect();
    this.massLawFilter.disconnect();
    this.transmissionHighpass.disconnect();
    this.transmissionGain.disconnect();
    this.flankingGain.disconnect();
    this.excitationHighpass.disconnect();
    for (const filter of this.modeFilters) filter.disconnect();
    this.resonanceGain.disconnect();
    this.output.disconnect();
  }
}

import type { EnvironmentDeclaration } from "../../domain/composition/environment";
import { sabineReverbTimePerBand } from "../../dsp/acoustics";
import { generateImpulseResponse } from "../../dsp/impulseResponse";
import { mulberry32 } from "../../dsp/prng";
import { rampToValue } from "../transitions";

/**
 * Etapa de `Environment` (capacidad `ambient-environment`): bus compartido de
 * escena, no una capa de ningun `Source` (design.md D2).
 *
 * La etapa esta *siempre* presente en el grafo, con dos caminos en paralelo
 * entre su entrada y su salida:
 *
 *   input ─┬→ dryGain ───────────────────→ output
 *          └→ convolver → wetGain ───────→ output
 *
 * Sin entorno activo, `wetGain` esta en 0 y `dryGain` en 1: la etapa es
 * transparente. Activar un entorno es cargar la respuesta al impulso
 * sintetizada y cruzar las dos ganancias, sin reconectar ningun nodo -- una
 * reconexion a mitad de reproduccion produciria el clic que `audio-engine`
 * prohibe. El intercambio de la respuesta al impulso ocurre con `wetGain` ya
 * en 0, de modo que nunca es audible.
 *
 * Que el entorno solo procese lo que se le entrega es tambien lo que hace
 * cierto, por construccion, el requisito "Un `Environment` colorea, no genera
 * sonido por si mismo": sin `Source` conectado no hay nada que convolucionar.
 */

const CROSSFADE_SECONDS = 1.2;

export class EnvironmentStage {
  readonly input: GainNode;
  readonly output: GainNode;

  private readonly context: BaseAudioContext;
  private readonly seed: number;
  private readonly dryGain: GainNode;
  private readonly wetGain: GainNode;
  private readonly convolver: ConvolverNode;
  private active: EnvironmentDeclaration | null = null;

  constructor(context: BaseAudioContext, seed: number) {
    this.context = context;
    this.seed = seed;

    this.input = context.createGain();
    this.output = context.createGain();
    this.dryGain = context.createGain();
    this.wetGain = context.createGain();
    this.convolver = context.createConvolver();
    // La respuesta se genera ya normalizada a energia unitaria; dejar que el
    // nodo vuelva a normalizarla enmascararia la diferencia de nivel entre
    // entornos, que es informacion real del modelo.
    this.convolver.normalize = false;

    this.dryGain.gain.value = 1;
    this.wetGain.gain.value = 0;

    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    this.input.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.output);
  }

  get activeId(): string | null {
    return this.active?.id ?? null;
  }

  /**
   * Activa un entorno, sustituyendo al anterior si lo habia. La sustitucion
   * no interrumpe a los `Source` activos: solo cambia lo que hay entre la
   * entrada y la salida de esta etapa.
   */
  activate(declaration: EnvironmentDeclaration): void {
    const reverbTimeSeconds = sabineReverbTimePerBand(
      declaration.volumeCubicMeters,
      declaration.surfaceAreaSquareMeters,
      declaration.absorption
    );

    const longest = Math.max(reverbTimeSeconds.low, reverbTimeSeconds.mid, reverbTimeSeconds.high);

    // Un entorno sin recinto (campo abierto) no tiene cola que sintetizar:
    // se queda en seco, que es el resultado fisicamente correcto, en vez de
    // fabricarle una reverberacion que no existe.
    if (longest <= 0 || declaration.reverberantFraction <= 0) {
      this.active = declaration;
      this.crossfade(0);
      return;
    }

    const channels = generateImpulseResponse(mulberry32(this.seed), {
      reverbTimeSeconds,
      sampleRate: this.context.sampleRate,
      channels: 2,
    });

    const buffer = this.context.createBuffer(
      channels.length,
      channels[0].length,
      this.context.sampleRate
    );
    for (let channel = 0; channel < channels.length; channel++) {
      buffer.getChannelData(channel).set(channels[channel]);
    }

    this.convolver.buffer = buffer;
    this.active = declaration;
    this.crossfade(declaration.reverberantFraction);
  }

  /** Retira el entorno activo: la etapa vuelve a ser transparente. */
  deactivate(): void {
    this.active = null;
    this.crossfade(0);
  }

  /**
   * Cruza seco y humedo conservando la potencia total: con ganancias
   * proporcionales a la raiz de cada fraccion, la suma de potencias se
   * mantiene constante y el nivel percibido no salta al activar el entorno.
   */
  private crossfade(wetFraction: number): void {
    const wet = Math.sqrt(Math.max(0, Math.min(1, wetFraction)));
    const dry = Math.sqrt(1 - Math.max(0, Math.min(1, wetFraction)));
    rampToValue(this.wetGain.gain, this.context, wet, CROSSFADE_SECONDS);
    rampToValue(this.dryGain.gain, this.context, dry, CROSSFADE_SECONDS);
  }

  dispose(): void {
    this.input.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.convolver.disconnect();
    this.output.disconnect();
  }
}

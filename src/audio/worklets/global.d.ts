/**
 * El `AudioWorkletGlobalScope` no es ni `window` ni un `Worker`: es un
 * ambito global propio que TypeScript no declara en `lib.dom.d.ts`. Estas
 * son las declaraciones ambientales minimas que necesitan los procesadores
 * de este directorio.
 */

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: AudioWorkletNodeOptions);
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new (options?: AudioWorkletNodeOptions) => AudioWorkletProcessor
): void;

declare const sampleRate: number;
declare const currentFrame: number;
declare const currentTime: number;

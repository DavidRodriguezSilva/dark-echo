import type { EnvironmentDeclaration } from "../environment";

/**
 * `campo-abierto`: intemperie, sin recinto (docs/synthesis-reference.md,
 * `reverberacion-sabine`).
 *
 * Un espacio abierto no encierra volumen, asi que Sabine no le asigna cola
 * reverberante: `volumeCubicMeters: 0` hace que el RT60 de las tres bandas
 * salga cero, y con `reverberantFraction: 0` el entorno queda practicamente
 * transparente. Eso es deliberado y correcto -- a la intemperie no hay
 * reverberacion que anadir, solo la reflexion del suelo -- y es tambien la
 * demostracion de que un `Environment` puede ser casi neutro sin dejar de
 * ser un componente valido.
 *
 * Su otro papel es estructural: al no declarar ninguna superficie construida
 * es el contraejemplo con el que se verifica la Decision D6 (una oclusion de
 * techo no tiene nada que la sostenga aqui, y por eso puntua bajo).
 */
export const campoAbierto: EnvironmentDeclaration = {
  id: "campo-abierto",
  label: "Campo abierto",
  model: "reverberacion-sabine",
  volumeCubicMeters: 0,
  surfaceAreaSquareMeters: 0,
  absorption: { low: 0, mid: 0, high: 0 },
  reverberantFraction: 0,
  surfaces: ["suelo"],
  traits: ["natural", "abierto"],
};

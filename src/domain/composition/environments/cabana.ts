import type { EnvironmentDeclaration } from "../environment";

/**
 * `cabana`: recinto pequeno de madera (docs/synthesis-reference.md,
 * `reverberacion-sabine`). Geometria de una cabana de 4 x 5 x 3 m:
 * V = 60 m3, superficie interior 2*(4*5) + 2*(4*3) + 2*(5*3) = 94 m2.
 *
 * Los coeficientes de absorcion son los de entablado de madera sobre
 * rastreles, con el aporte del mobiliario y los textiles que un espacio
 * habitado tiene de verdad. La madera absorbe mas en graves que en medios
 * -- el panel resonando contra su camara de aire -- de modo que el RT60 de
 * la banda baja sale mas corto que el de la media: la cabana suena calida
 * sin retumbar, que es justo lo que la distingue de un recinto de obra.
 */
export const cabana: EnvironmentDeclaration = {
  id: "cabana",
  label: "Cabaña de madera",
  model: "reverberacion-sabine",
  volumeCubicMeters: 60,
  surfaceAreaSquareMeters: 94,
  absorption: { low: 0.25, mid: 0.2, high: 0.22 },
  // Un Source exterior entra por toda la envolvente a la vez, no por un
  // punto: la llegada es difusa y domina el campo reverberante.
  reverberantFraction: 0.65,
  surfaces: ["techo", "pared", "abertura", "suelo"],
  traits: ["construido", "rustico"],
};

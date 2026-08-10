/**
 * Comprobacion de compatibilidad mono (audio-engine, "Compatibilidad con
 * reproduccion mono"; design.md D16): la decorrelacion por flujos
 * independientes no debe cancelar al sumarse a mono. Se compara la energia
 * de la suma a mono contra la energia media de los dos canales; un
 * desfase/inversion de fase real colapsaria este ratio hacia 0.
 */
export function monoCompatibilityRatio(left: ArrayLike<number>, right: ArrayLike<number>): number {
  const n = Math.min(left.length, right.length);
  let monoEnergy = 0;
  let stereoEnergy = 0;

  for (let i = 0; i < n; i++) {
    const mono = (left[i] + right[i]) / 2;
    monoEnergy += mono * mono;
    stereoEnergy += (left[i] * left[i] + right[i] * right[i]) / 2;
  }

  return stereoEnergy === 0 ? 1 : Math.sqrt(monoEnergy / stereoEnergy);
}

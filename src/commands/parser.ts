import { AudioEngine } from "../audio/engine";
import { type SoundsType } from "../domain/types";

const validSounds: SoundsType[] = ["rain", "wind", "river", "ocean"];

export function executeCommand(command: string, engine: AudioEngine): string {
  const args = command.trim().toLowerCase().split(" ");
  const action = args[0];
  const value = args[1];

  if (action === "play") {
    if (!validSounds.includes(value as SoundsType)) {
      return `Sonido no válido. Use: ${validSounds.join(", ")}`;
    }

    engine.start(value as SoundsType);
    return `Reproduciendo: ${value}`;
  }

  if (action === "stop") {
    engine.stop();
    return "Sonido detenido suavemente.";
  }

  if (action === "volume") {
    const volume = Number(value);

    if (Number.isNaN(volume) || volume < 0 || volume > 1) {
      return "Volumen inválido. Use un valor entre 0 y 1.";
    }

    engine.setVolume(volume);
    return `Volumen ajustado a ${volume}`;
  }

  if (action === "list") {
    return `Sonidos disponibles: ${validSounds.join(", ")}`;
  }

  return "Comando no reconocido.";
}

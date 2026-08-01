import { type SoundGenerator, type SoundsType } from "../../domain/types";
import type { Rng } from "../../dsp/prng";
import { RainSound } from "./rain";
import { WindSound } from "./wind";
import { RiverSound } from "./river";
import { OceanSound } from "./ocean";

export function createSound(type: SoundsType, rng: Rng): SoundGenerator {
  switch (type) {
    case "rain":
      return new RainSound(rng);
    case "wind":
      return new WindSound(rng);
    case "river":
      return new RiverSound(rng);
    case "ocean":
      return new OceanSound(rng);
  }
}

export { type SoundGenerator, type SoundsType } from "../../domain/types";

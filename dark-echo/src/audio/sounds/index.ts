import { type SoundGenerator, type SoundsType } from "../types";
import { RainSound } from "./rain";
import { WindSound } from "./wind";
import { RiverSound } from "./river";
import { OceanSound } from "./ocean";

export function createSound(type: SoundsType): SoundGenerator {
  switch (type) {
    case "rain":
      return new RainSound();
    case "wind":
      return new WindSound();
    case "river":
      return new RiverSound();
    case "ocean":
      return new OceanSound();
  }
}

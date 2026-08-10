import "./styles/index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { UpdateStore } from "./platform/update";
import { App } from "./ui/App";

const updateStore = new UpdateStore();

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App updateStore={updateStore} />
  </StrictMode>
);

// registerType: "prompt" (offline-playback, "Actualizacion no disruptiva"):
// una version nueva no se activa sola. `onNeedRefresh` solo registra que
// esta disponible; `ui/App.tsx` decide, con el estado de la mezcla en
// mano, si la aplica enseguida o espera al comando `update`.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateStore.markAvailable(() => updateSW(true));
  },
});

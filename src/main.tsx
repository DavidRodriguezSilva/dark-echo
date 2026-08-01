import "./styles/index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./ui/App";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

registerSW({
  immediate: true,
});

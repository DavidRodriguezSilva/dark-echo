import "./styles/index.css";
import { AudioEngine } from "./audio/engine";
import { executeCommand } from "./commands/parser";

const engine = new AudioEngine();

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main>
    <h1>Nature Noise Generator</h1>

    <section class="terminal">
      <div id="output">
        <p>Comandos disponibles:</p>
        <p>play rain</p>
        <p>play wind</p>
        <p>play river</p>
        <p>play ocean</p>
        <p>stop</p>
        <p>volume 0.5</p>
        <p>list</p>
      </div>

      <input id="command" placeholder="Escriba un comando..." autofocus />
    </section>
  </main>
`;

const input = document.querySelector<HTMLInputElement>("#command")!;
const output = document.querySelector<HTMLDivElement>("#output")!;

input.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  const command = input.value;
  const response = executeCommand(command, engine);

  output.innerHTML += `<p><strong>&gt; ${command}</strong></p>`;
  output.innerHTML += `<p>${response}</p>`;

  input.value = "";
});
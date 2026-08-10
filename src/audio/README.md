# audio

Runtime de audio: ciclo de vida del `AudioContext`, el compilador que
traduce una capa declarada en `domain/` a un subgrafo de nodos, y los
`AudioWorkletProcessor` propios. Usa `domain/` y `dsp/`; no conoce
`commands/` ni `ui/`.

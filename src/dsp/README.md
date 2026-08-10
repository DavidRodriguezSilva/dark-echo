# dsp

Primitivas puras de procesamiento de señal: PRNG, generadores de ruido,
envolventes y voces. Funciones y clases sin dependencias del entorno, lo que
permite testearlas en Node sin arrancar un `AudioContext`.

No conoce `domain/` ni `audio/`: quien la usa le pasa los números que
necesita.

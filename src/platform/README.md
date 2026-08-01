# platform

Puertos hacia el entorno de ejecución: almacenamiento local, ciclo de vida
de la página (visibilidad, suspensión) y registro del service worker. Existe
para que una decisión de empaquetado (PWA/TWA hoy) no se filtre a
`domain/`, `dsp/`, `audio/` ni `commands/`: si cambia, se sustituyen
adaptadores de esta capa y no el dominio.

Aún sin implementaciones — se añaden en la tarea 14.1 (persistencia).

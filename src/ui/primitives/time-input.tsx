import * as React from "react";
import { cn } from "../lib/utils";

/**
 * Campo de hora (shadcn, "time picker"): `<input type="time">` con segundos, con
 * el icono del selector del navegador oculto, para que se vea igual que un
 * campo de texto de la interfaz. El valor siempre es `HH:MM:SS` en 24 h, aunque
 * el navegador lo muestre en 12 h.
 */
function TimeInput({ className, type = "time", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      step={type === "time" ? "1" : undefined}
      data-slot="input"
      className={cn(
        "h-9 w-fit appearance-none rounded-md border border-border bg-background px-2.5 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
        className
      )}
      {...props}
    />
  );
}

export { TimeInput };

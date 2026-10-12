import * as React from "react";
import { cn } from "../lib/utils";

/**
 * Interruptor accesible sin dependencias (`role="switch"` sobre un botón
 * nativo): el estado lo decide quien lo usa, igual que `Slider` con `value`.
 */
function Switch({
  checked,
  onCheckedChange,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-slot="switch"
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform motion-reduce:transition-none",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

export { Switch };

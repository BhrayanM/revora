"use client";

import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  useTheme,
  type ThemePreference,
} from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const options: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}> = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle() {
  const { mounted, resolvedTheme, setTheme, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTheme = mounted ? theme : "system";
  const TriggerIcon =
    mounted && theme !== "system"
      ? resolvedTheme === "dark"
        ? Moon
        : Sun
      : Monitor;

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-muted-foreground outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        aria-label="Change theme"
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <TriggerIcon className="size-4" aria-hidden="true" />
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-full z-50 mt-2 w-40 rounded-xl border border-border bg-surface-elevated p-1.5 shadow-xl"
          role="menu"
          aria-label="Theme"
        >
          {options.map(({ value, label, icon: Icon }) => {
            const selected = activeTheme === value;

            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-primary",
                  selected
                    ? "bg-accent-surface text-primary"
                    : "text-foreground",
                )}
              >
                <Icon
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="flex-1">{label}</span>
                {selected && (
                  <Check className="size-4 text-primary" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

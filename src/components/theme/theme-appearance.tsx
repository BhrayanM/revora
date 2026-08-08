"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useRef } from "react";

import {
  useTheme,
  type ThemePreference,
} from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const options: Array<{
  value: ThemePreference;
  title: string;
  description: string;
  icon: typeof Monitor;
}> = [
  {
    value: "system",
    title: "System",
    description: "Auto — match your device",
    icon: Monitor,
  },
  {
    value: "light",
    title: "Light",
    description: "Bright, low-glare",
    icon: Sun,
  },
  {
    value: "dark",
    title: "Dark",
    description: "Graphite and calm",
    icon: Moon,
  },
];

export function ThemeAppearance() {
  const { mounted, setTheme, theme } = useTheme();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeTheme = mounted ? theme : "system";

  const selectTheme = (value: ThemePreference, index: number) => {
    setTheme(value);
    optionRefs.current[index]?.focus();
  };

  return (
    <section
      aria-labelledby="appearance-heading"
      className="mt-8 border-t border-border pt-8"
    >
      <div className="mb-5">
        <h4
          id="appearance-heading"
          className="text-base font-semibold text-foreground"
        >
          Appearance
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how AI Growth looks on this device.
        </p>
      </div>

      <div
        className="grid gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Theme preference"
      >
        {options.map(({ value, title, description, icon: Icon }, index) => {
          const selected = activeTheme === value;

          return (
            <button
              key={value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => selectTheme(value, index)}
              onKeyDown={(event) => {
                if (
                  !["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(
                    event.key,
                  )
                ) {
                  return;
                }

                event.preventDefault();
                const direction =
                  event.key === "ArrowDown" || event.key === "ArrowRight"
                    ? 1
                    : -1;
                const nextIndex =
                  (index + direction + options.length) % options.length;
                selectTheme(options[nextIndex]!.value, nextIndex);
              }}
              className={cn(
                "group flex min-h-28 flex-col items-start rounded-xl border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                selected
                  ? "border-primary bg-accent-surface shadow-sm"
                  : "border-border bg-surface-secondary/70 hover:border-border-strong hover:bg-surface-hover",
              )}
            >
              <span
                className={cn(
                  "mb-4 flex size-9 items-center justify-center rounded-lg ring-1",
                  selected
                    ? "bg-primary/15 text-primary ring-primary/20"
                    : "bg-surface-elevated text-muted-foreground ring-border",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-foreground">
                {title}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

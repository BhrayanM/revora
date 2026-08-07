import { cn } from "@/lib/utils";

interface BackgroundPatternProps {
  variant?: "dots" | "grid" | "gradient";
  className?: string;
}

export function BackgroundPattern({
  variant = "dots",
  className,
}: BackgroundPatternProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 -z-10", className)}
      aria-hidden="true"
    >
      {variant === "dots" && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgb(99 102 241 / 0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      )}
      {variant === "grid" && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgb(99 102 241 / 0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(99 102 241 / 0.05) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      )}
      {variant === "gradient" && (
        <>
          <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
        </>
      )}
    </div>
  );
}

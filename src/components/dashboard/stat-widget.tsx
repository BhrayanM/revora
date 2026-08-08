import { cn } from "@/lib/utils";

interface StatWidgetProps {
  label: string;
  value: string | number;
  change: number;
  changeLabel?: string;
  icon: React.ReactNode;
  className?: string;
  accentColor?: string;
}

const accentBorders: Record<string, string> = {
  primary: "border-t-primary/40",
  success: "border-t-success/40",
  accent: "border-t-accent/40",
  secondary: "border-t-secondary/40",
};

export function StatWidget({
  label,
  value,
  change,
  changeLabel = "vs last month",
  icon,
  className,
  accentColor = "primary",
}: StatWidgetProps) {
  const borderClass = accentBorders[accentColor] ?? accentBorders.primary;
  const isPositive = change >= 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md",
        "border-t-2",
        borderClass,
        className,
      )}
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-secondary ring-1 ring-border">
            {icon}
          </div>
        </div>
        <p className="mt-3 text-[1.75rem] font-bold leading-none tracking-tight text-foreground">
          {value}
        </p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold",
              isPositive
                ? "bg-success/10 text-success"
                : "bg-error/10 text-error",
            )}
          >
            {isPositive ? "+" : ""}
            {change}%
          </span>
          <span className="text-xs text-muted-foreground">{changeLabel}</span>
        </div>
      </div>
    </div>
  );
}

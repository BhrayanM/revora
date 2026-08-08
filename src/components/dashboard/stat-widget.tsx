import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatWidgetProps {
  label: string;
  value: string | number;
  change: number;
  changeLabel?: string;
  icon: React.ReactNode;
  className?: string;
}

export function StatWidget({
  label,
  value,
  change,
  changeLabel = "vs last month",
  icon,
  className,
}: StatWidgetProps) {
  const isPositive = change >= 0;

  return (
    <Card
      className={cn(
        "transition-shadow duration-200 hover:shadow-md",
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
            {icon}
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
          {value}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <Badge variant={isPositive ? "success" : "error"} size="sm">
            {isPositive ? "+" : ""}
            {change}%
          </Badge>
          <span className="text-xs text-muted">{changeLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}

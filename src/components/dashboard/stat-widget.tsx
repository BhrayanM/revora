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
    <Card className={cn("transition-all hover:shadow-md", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            {icon}
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
        <div className="mt-2 flex items-center gap-1.5">
          <Badge variant={isPositive ? "success" : "error"} size="sm">
            {isPositive ? "+" : ""}
            {change}%
          </Badge>
          <span className="text-xs text-zinc-400">{changeLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from "@/components/ui/card";

export default function TeamManagementLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-tertiary" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-surface-tertiary" />
      </div>
      <Card>
        <CardContent className="space-y-4 py-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <div className="size-10 animate-pulse rounded-full bg-surface-tertiary" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-40 max-w-full animate-pulse rounded bg-surface-tertiary" />
                <div className="h-3 w-56 max-w-full animate-pulse rounded bg-surface-tertiary" />
              </div>
              <div className="hidden h-7 w-20 animate-pulse rounded bg-surface-tertiary sm:block" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

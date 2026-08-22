import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

export default function CalendarLoading() {
  return (
    <Container className="max-w-none px-0" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading calendar</span>
      <div className="mb-6 space-y-2">
        <div className="h-8 w-36 animate-pulse rounded bg-surface-secondary" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-surface-secondary" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        {[1, 2].map((item) => (
          <Card key={item}>
            <CardContent className="h-80 animate-pulse bg-surface-secondary/40" />
          </Card>
        ))}
      </div>
    </Container>
  );
}

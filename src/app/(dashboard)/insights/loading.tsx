import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

export default function InsightsLoading() {
  return (
    <Container className="max-w-none px-0" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading AI Insights</span>
      <div className="mb-6 space-y-2">
        <div className="h-8 w-40 animate-pulse rounded bg-surface-secondary" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-surface-secondary" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item}>
            <CardContent className="h-28 animate-pulse bg-surface-secondary/40" />
          </Card>
        ))}
      </div>
    </Container>
  );
}

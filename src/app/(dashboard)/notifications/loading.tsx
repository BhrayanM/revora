import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

export default function NotificationsLoading() {
  return (
    <Container className="max-w-none px-0" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading activity</span>
      <div className="mb-6 space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-secondary" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-surface-secondary" />
      </div>
      <Card>
        <CardContent className="space-y-4 py-5">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="size-10 animate-pulse rounded-xl bg-surface-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-surface-secondary" />
                <div className="h-3 w-64 max-w-full animate-pulse rounded bg-surface-secondary" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
}

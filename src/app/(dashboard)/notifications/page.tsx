import { BellOff } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

export default function NotificationsPage() {
  return (
    <Container className="max-w-none px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stay updated on your leads and pipeline.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <BellOff className="size-6 text-muted" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-foreground">
            No notifications yet
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Notifications will appear here when leads are created, updated, or
            when automations run.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}

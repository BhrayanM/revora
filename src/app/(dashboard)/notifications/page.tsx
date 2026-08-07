import { Bell, BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

export default function NotificationsPage() {
  return (
    <Container className="max-w-none px-0">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Stay updated on your leads and pipeline.
          </p>
        </div>
        <Button variant="ghost" size="sm">
          <Bell className="size-3.5" /> Settings
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <BellOff className="size-6 text-zinc-400" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-foreground">
            No notifications yet
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Notifications will appear here when leads are created, updated, or
            when automations run.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}

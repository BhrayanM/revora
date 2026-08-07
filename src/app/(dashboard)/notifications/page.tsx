import {
  Bell,
  BellOff,
  Calendar,
  Check,
  Mail,
  MessageSquare,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const notifications = [
  {
    id: "1",
    title: "New lead qualified",
    description: "AI scored Sarah Johnson at 85/100 — moved to Qualified",
    time: "2 minutes ago",
    read: false,
    icon: Users,
    iconColor: "text-primary bg-primary/10",
  },
  {
    id: "2",
    title: "Meeting booked",
    description: "David Park confirmed demo for Friday at 2:00 PM EST",
    time: "1 hour ago",
    read: false,
    icon: Calendar,
    iconColor: "text-success bg-success/10",
  },
  {
    id: "3",
    title: "Campaign completed",
    description: "Email sequence 'Summer Outreach' finished — 43% open rate",
    time: "3 hours ago",
    read: false,
    icon: Mail,
    iconColor: "text-secondary bg-secondary/10",
  },
  {
    id: "4",
    title: "Integration sync",
    description: "HubSpot contacts synchronized — 1,247 records updated",
    time: "5 hours ago",
    read: true,
    icon: MessageSquare,
    iconColor: "text-accent bg-accent/10",
  },
  {
    id: "5",
    title: "Weekly report ready",
    description: "Your weekly analytics report is available for review",
    time: "Yesterday",
    read: true,
    icon: Calendar,
    iconColor: "text-warning bg-warning/10",
  },
  {
    id: "6",
    title: "API rate limit warning",
    description: "OpenAI API usage at 85% of monthly limit",
    time: "2 days ago",
    read: true,
    icon: BellOff,
    iconColor: "text-error bg-error/10",
  },
];

export default function NotificationsPage() {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Container className="max-w-none px-0">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-zinc-500">
            You have {unreadCount} unread notifications.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Check className="size-3.5" />
            Mark All Read
          </Button>
          <Button variant="ghost" size="sm">
            <Bell className="size-3.5" />
            Settings
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "flex gap-4 p-4 transition-colors hover:bg-surface-secondary",
                !notification.read && "bg-primary/[0.02]",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  notification.iconColor,
                )}
              >
                <notification.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <Badge variant="default" size="sm">
                      New
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-zinc-600">
                  {notification.description}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {notification.time}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
}

import {
  Calendar,
  CheckCircle,
  Mail,
  MessageSquare,
  UserPlus,
} from "lucide-react";

import { cn } from "@/lib/utils";

const activities = [
  {
    id: "1",
    type: "lead_created" as const,
    title: "New lead created",
    description: "Sarah Johnson from TechCorp submitted a contact form",
    timestamp: "2 minutes ago",
    icon: UserPlus,
    iconColor: "text-primary bg-primary/10",
  },
  {
    id: "2",
    type: "email_sent" as const,
    title: "Automated email sent",
    description: "Welcome sequence sent to Marcus Lee (GrowthLabs)",
    timestamp: "15 minutes ago",
    icon: Mail,
    iconColor: "text-secondary bg-secondary/10",
  },
  {
    id: "3",
    type: "lead_updated" as const,
    title: "Lead qualified",
    description: "AI scored Elena Martinez at 92/100 — moved to Qualified",
    timestamp: "1 hour ago",
    icon: CheckCircle,
    iconColor: "text-success bg-success/10",
  },
  {
    id: "4",
    type: "sms_sent" as const,
    title: "SMS campaign triggered",
    description: "Follow-up texts sent to 43 leads in West Coast region",
    timestamp: "3 hours ago",
    icon: MessageSquare,
    iconColor: "text-accent bg-accent/10",
  },
  {
    id: "5",
    type: "meeting_booked" as const,
    title: "Meeting booked automatically",
    description: "David Park (TechFlow) booked a demo for Friday 2pm",
    timestamp: "5 hours ago",
    icon: Calendar,
    iconColor: "text-warning bg-warning/10",
  },
];

export function RecentActivity({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              activity.iconColor,
            )}
          >
            <activity.icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {activity.title}
            </p>
            <p className="mt-0.5 text-xs text-zinc-600 truncate">
              {activity.description}
            </p>
            <p className="mt-1 text-xs text-zinc-400">{activity.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

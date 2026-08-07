"use client";

import {
  Bell,
  Globe,
  Key,
  Link2,
  Palette,
  Shield,
  User,
  Webhook,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const sections = [
  { id: "general", label: "General", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "security", label: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "api", label: "API & Webhooks", icon: Webhook },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("general");

  return (
    <Container className="max-w-none px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-3">
            <nav className="space-y-0.5">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    activeSection === section.id
                      ? "bg-primary/10 text-primary"
                      : "text-zinc-600 hover:bg-surface-secondary hover:text-foreground",
                  )}
                >
                  <section.icon className="size-4" />
                  {section.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-zinc-400" />
              <h3 className="text-base font-semibold text-foreground">
                General Settings
              </h3>
            </div>
            <p className="text-sm text-zinc-500">
              Update your organization information.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Organization Name"
                defaultValue="AI Growth Platform"
              />
              <Input
                label="Website"
                defaultValue="https://aigrowthplatform.com"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Default Timezone" defaultValue="America/New_York" />
              <Input label="Language" defaultValue="English (US)" />
            </div>
            <div>
              <Input
                label="Company Email"
                defaultValue="admin@aigrowthplatform.com"
              />
            </div>
            <div className="flex justify-end">
              <Button>Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="lg:ml-[calc(25%+1.5rem)] lg:w-[75%]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="size-4 text-zinc-400" />
              <h3 className="text-base font-semibold text-foreground">
                API Keys
              </h3>
            </div>
            <p className="text-sm text-zinc-500">
              Manage API keys for external integrations.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                name: "Production API Key",
                key: "pk_live_••••••••••••••••",
                created: "Aug 1, 2026",
              },
              {
                name: "Development API Key",
                key: "pk_test_••••••••••••••••",
                created: "Jul 15, 2026",
              },
            ].map((apiKey) => (
              <div
                key={apiKey.name}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {apiKey.name}
                  </p>
                  <p className="text-xs text-zinc-500">{apiKey.key}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Created {apiKey.created}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Revoke
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm">
              Generate New Key
            </Button>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

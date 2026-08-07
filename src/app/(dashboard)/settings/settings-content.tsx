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
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import type { Database } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

import { updateOrgSettings } from "./actions";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

const sections = [
  { id: "general", label: "General", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "security", label: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "api", label: "API & Webhooks", icon: Webhook },
];

export function SettingsContent({ org }: { org: Organization | null }) {
  const [activeSection, setActiveSection] = useState("general");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const orgSettings = (org?.settings as Record<string, unknown>) ?? {};

  const handleSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateOrgSettings(formData);
      setMessage(result.error ? result.error : "Settings saved.");
    });
  };

  return (
    <Container className="max-w-none px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your account settings.
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
              <Globe className="size-4 text-zinc-500" />
              <h3 className="text-base font-semibold text-foreground">
                General Settings
              </h3>
            </div>
            <p className="text-sm text-zinc-500">
              Update your organization information.
            </p>
          </CardHeader>
          <CardContent>
            {message && (
              <Alert
                variant={message === "Settings saved." ? "success" : "error"}
                className="mb-4"
              >
                {message}
              </Alert>
            )}
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Organization Name"
                  name="org_name"
                  defaultValue={
                    (orgSettings.org_name as string) ?? org?.name ?? ""
                  }
                />
                <Input
                  label="Website"
                  name="website"
                  defaultValue={(orgSettings.website as string) ?? ""}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Default Timezone"
                  name="timezone"
                  defaultValue={
                    (orgSettings.timezone as string) ?? "America/New_York"
                  }
                />
                <Input
                  label="Language"
                  name="language"
                  defaultValue={
                    (orgSettings.language as string) ?? "English (US)"
                  }
                />
              </div>
              <Input
                label="Contact Email"
                name="email"
                defaultValue={(orgSettings.email as string) ?? ""}
              />
              <div className="flex justify-end">
                <Button type="submit" loading={isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="lg:ml-[calc(25%+1.5rem)] lg:w-[75%]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="size-4 text-zinc-500" />
              <h3 className="text-base font-semibold text-foreground">
                API Keys
              </h3>
            </div>
            <p className="text-sm text-zinc-500">
              Manage API keys for external integrations.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-zinc-500">
                API key management will be available in a future update.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

"use client";

import { Bell, Key, Plug, Shield, User } from "lucide-react";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { ThemeAppearance } from "@/components/theme/theme-appearance";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import type { Database } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

import { updateOrgSettings } from "./actions";
import { APIKeysPanel } from "./api-keys-panel";
import { IntegrationsPanel } from "./integrations-panel";
import { SecurityPanel } from "./security-panel";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

const sections = [
  { id: "general", label: "General", icon: User },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
] as const;

type SettingsSection = (typeof sections)[number]["id"];

function isSettingsSection(
  value: string | undefined,
): value is SettingsSection {
  return sections.some((section) => section.id === value);
}

export function SettingsContent({
  org,
  initialSection,
  marketplaceInstallRequiresAuthorization = false,
}: {
  org: Organization | null;
  initialSection?: string;
  marketplaceInstallRequiresAuthorization?: boolean;
}) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    isSettingsSection(initialSection) ? initialSection : "general",
  );
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
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your organization workspace and personal preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="h-fit lg:col-span-1">
          <CardContent className="p-2.5">
            <nav className="space-y-0.5">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                    activeSection === section.id
                      ? "bg-foreground text-canvas shadow-sm"
                      : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground",
                  )}
                >
                  <section.icon className="size-4 shrink-0" />
                  {section.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          {activeSection === "general" && (
            <>
              <CardHeader>
                <h3 className="text-base font-semibold text-foreground">
                  General Settings
                </h3>
                <p className="text-sm text-muted-foreground">
                  Update your organization information.
                </p>
              </CardHeader>
              <CardContent>
                {message && (
                  <Alert
                    variant={
                      message === "Settings saved." ? "success" : "error"
                    }
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
                <ThemeAppearance />
              </CardContent>
            </>
          )}

          {activeSection === "integrations" && (
            <>
              <CardHeader>
                <h3 className="text-base font-semibold text-foreground">
                  Integrations
                </h3>
                <p className="text-sm text-muted-foreground">
                  Connect your CRM, Slack, and automation tools.
                </p>
              </CardHeader>
              <CardContent>
                {marketplaceInstallRequiresAuthorization && (
                  <Alert
                    variant="info"
                    title="Marketplace installation complete"
                    className="mb-4"
                  >
                    To securely link this CRM location to your Revora
                    organization, click Connect on GoHighLevel below.
                  </Alert>
                )}
                <IntegrationsPanel />
              </CardContent>
            </>
          )}

          {activeSection === "api-keys" && (
            <>
              <CardHeader>
                <h3 className="text-base font-semibold text-foreground">
                  API Keys
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manage API keys for external lead ingestion.
                </p>
              </CardHeader>
              <CardContent>
                <APIKeysPanel />
              </CardContent>
            </>
          )}

          {activeSection === "notifications" && (
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-secondary ring-1 ring-border mb-4">
                <Bell className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Notification preferences
              </p>
              <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
            </CardContent>
          )}

          {activeSection === "security" && <SecurityPanel />}
        </Card>
      </div>
    </Container>
  );
}

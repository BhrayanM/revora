"use client";

import { CheckCircle, Plug, XCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  deleteIntegration,
  saveIntegration,
  testIntegration,
} from "./integrations-actions";

type Provider = "hubspot" | "gohighlevel" | "slack" | "n8n";

const PROVIDER_META: Record<
  Provider,
  {
    label: string;
    desc: string;
    fields: Record<string, { label: string; type: string }>;
  }
> = {
  hubspot: {
    label: "HubSpot",
    desc: "Sync contacts to HubSpot CRM",
    fields: { access_token: { label: "Access Token", type: "password" } },
  },
  gohighlevel: {
    label: "GoHighLevel",
    desc: "Sync contacts to GoHighLevel CRM",
    fields: {
      api_key: { label: "API Key", type: "password" },
      location_id: { label: "Location ID", type: "text" },
    },
  },
  slack: {
    label: "Slack",
    desc: "Send HOT lead notifications to Slack",
    fields: { webhook_url: { label: "Webhook URL", type: "password" } },
  },
  n8n: {
    label: "n8n",
    desc: "Workflow automation webhook endpoint",
    fields: {
      webhook_url: { label: "Webhook URL", type: "text" },
      webhook_secret: { label: "Webhook Secret", type: "password" },
    },
  },
};

function IntegrationCard({
  provider,
  configured,
  onConfigure,
}: {
  provider: Provider;
  configured: boolean;
  onConfigure: () => void;
}) {
  const meta = PROVIDER_META[provider];
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testIntegration(provider);
    setTestResult(
      result.success
        ? "Connection successful"
        : (result.error ?? "Connection failed"),
    );
    setTesting(false);
  };

  const handleDisconnect = () => {
    startDelete(async () => {
      await deleteIntegration(provider);
    });
  };

  return (
    <Card className={configured ? "border-success/30" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Plug className="size-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {meta.label}
                </p>
                {configured && (
                  <Badge variant="success" size="sm">
                    Connected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{meta.desc}</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {configured && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTest}
                  loading={testing}
                >
                  Test
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  loading={deleting}
                >
                  Disconnect
                </Button>
              </>
            )}
            {!configured && (
              <Button variant="outline" size="sm" onClick={onConfigure}>
                <Plug className="size-3.5" /> Connect
              </Button>
            )}
          </div>
        </div>
        {testResult && (
          <div className="mt-3 flex items-center gap-1.5">
            {testResult.startsWith("Connection") ? (
              <CheckCircle className="size-3.5 text-success" />
            ) : (
              <XCircle className="size-3.5 text-error" />
            )}
            <span className="text-xs text-muted-foreground">{testResult}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectForm({
  provider,
  onClose,
}: {
  provider: Provider;
  onClose: () => void;
}) {
  const meta = PROVIDER_META[provider];
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const creds: Record<string, unknown> = {};
    for (const key of Object.keys(meta.fields)) {
      creds[key] = formData.get(key) as string;
    }

    startTransition(async () => {
      const result = await saveIntegration(provider, creds);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(onClose, 1000);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold">Connect {meta.label}</h3>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}
        {saved && (
          <Alert variant="success" className="mb-4">
            Connected successfully
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          {Object.entries(meta.fields).map(([key, field]) => (
            <Input
              key={key}
              label={field.label}
              name={key}
              type={field.type}
              inputSize="sm"
              required
            />
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isPending}>
              Connect
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function IntegrationsPanel() {
  const providers: Provider[] = ["hubspot", "gohighlevel", "slack", "n8n"];
  const [configuring, setConfiguring] = useState<Provider | null>(null);

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <div key={provider}>
          <IntegrationCard
            provider={provider}
            configured={false}
            onConfigure={() => setConfiguring(provider)}
          />
          {configuring === provider && (
            <div className="mt-3 ml-0">
              <ConnectForm
                provider={provider}
                onClose={() => setConfiguring(null)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

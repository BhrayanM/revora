"use client";

import { CheckCircle, ExternalLink, Plug, XCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { ProviderLogo } from "@/components/integrations/provider-logo";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  INTEGRATION_PROVIDERS,
  PROVIDER_CATEGORIES,
  getProviderById,
} from "@/lib/integrations/providers";
import type {
  IntegrationConnection,
  IntegrationProviderId,
  IntegrationStatus,
} from "@/lib/integrations/types";

import {
  deleteIntegration,
  disconnectGoogleWorkspace,
  disconnectHubSpot,
  disconnectGHL,
  disconnectSlack,
  disconnectTally,
  disconnectTwilio,
  getOrganizationIntegrations,
  saveAutomationWebhookIntegration,
  saveIntegration,
  saveTwilioIntegration,
  startGHLOAuth,
  startGoogleWorkspaceOAuth,
  startHubSpotOAuth,
  startSlackOAuth,
  testGHL,
  testGmail,
  testGoogleCalendar,
  testHubSpot,
  testIntegration,
  testSlack,
  testTally,
  testTwilio,
} from "./integrations-actions";
import { TallyConnectForm } from "./tally-connect-form";

function statusBadge(status: IntegrationStatus) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="success" size="sm">
          Connected
        </Badge>
      );
    case "error":
      return (
        <Badge variant="error" size="sm">
          Error
        </Badge>
      );
    case "reauth_required":
      return (
        <Badge variant="warning" size="sm">
          Reauth Required
        </Badge>
      );
    case "degraded":
      return (
        <Badge variant="warning" size="sm">
          Degraded
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" size="sm">
          Not Connected
        </Badge>
      );
  }
}

function IntegrationCard({
  providerId,
  connection,
  onConfigure,
  onRefresh,
}: {
  providerId: IntegrationProviderId;
  connection: IntegrationConnection | null;
  onConfigure: () => void;
  onRefresh: () => void;
}) {
  const provider = getProviderById(providerId);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testSucceeded, setTestSucceeded] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [deleting, startDelete] = useTransition();

  if (!provider) return null;

  const configured =
    connection !== null &&
    (connection.status === "connected" || connection.status === "degraded");

  const handleConnect = async () => {
    setConnecting(true);
    setTestSucceeded(false);
    try {
      if (providerId === "hubspot") {
        const result = await startHubSpotOAuth();
        if (result.url) window.location.href = result.url;
        else setTestResult(result.error ?? "OAuth setup failed");
      } else if (providerId === "gohighlevel") {
        const result = await startGHLOAuth();
        if (result.url) window.location.href = result.url;
        else setTestResult(result.error ?? "OAuth setup failed");
      } else if (providerId === "slack") {
        const result = await startSlackOAuth();
        if (result.url) window.location.href = result.url;
        else setTestResult(result.error ?? "OAuth setup failed");
      } else if (providerId === "google-calendar" || providerId === "gmail") {
        const result = await startGoogleWorkspaceOAuth();
        if (result.url) window.location.href = result.url;
        else setTestResult(result.error ?? "OAuth setup failed");
      } else {
        onConfigure();
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    let success: boolean;
    let errorMsg: string | undefined;
    if (providerId === "hubspot") {
      const r = (await testHubSpot()) as { success: boolean; error?: string };
      success = r.success;
      errorMsg = r.error;
    } else if (providerId === "twilio") {
      const r = (await testTwilio()) as { success: boolean; error?: string };
      success = r.success;
      errorMsg = r.error;
    } else if (providerId === "gohighlevel") {
      const r = (await testGHL()) as { success: boolean; error?: string };
      success = r.success;
      errorMsg = r.error;
    } else if (providerId === "slack") {
      const r = (await testSlack()) as { success: boolean; error?: string };
      success = r.success;
      errorMsg = r.error;
    } else if (providerId === "tally") {
      const r = await testTally();
      success = r.success;
      errorMsg = r.error ?? undefined;
    } else if (providerId === "google-calendar") {
      const r = await testGoogleCalendar();
      success = "success" in r && r.success === true;
      errorMsg = r.error;
    } else if (providerId === "gmail") {
      const r = await testGmail();
      success = "success" in r && r.success === true;
      errorMsg = r.error;
    } else {
      const r = await testIntegration(providerId);
      success = "success" in r && r.success === true;
      errorMsg = r.error;
    }
    setTestResult(
      success ? "Connection successful" : (errorMsg ?? "Connection failed"),
    );
    setTestSucceeded(success);
    setTesting(false);
  };

  const handleDisconnect = () => {
    startDelete(async () => {
      setTestResult(null);
      let result: unknown;
      try {
        if (providerId === "hubspot") result = await disconnectHubSpot();
        else if (providerId === "gohighlevel") result = await disconnectGHL();
        else if (providerId === "slack") result = await disconnectSlack();
        else if (providerId === "twilio") result = await disconnectTwilio();
        else if (providerId === "tally") result = await disconnectTally();
        else if (providerId === "google-calendar" || providerId === "gmail") {
          result = await disconnectGoogleWorkspace();
        } else result = await deleteIntegration(providerId);
      } catch {
        result = { error: "Integration could not be disconnected." };
      }
      const feedback =
        result && typeof result === "object"
          ? (result as { error?: unknown; warning?: unknown })
          : {};
      if (typeof feedback.error === "string" && feedback.error) {
        setTestSucceeded(false);
        setTestResult(feedback.error);
      } else if (typeof feedback.warning === "string" && feedback.warning) {
        setTestSucceeded(false);
        setTestResult(feedback.warning);
      } else {
        setTestSucceeded(true);
        setTestResult("Disconnected successfully");
      }
      onRefresh();
    });
  };

  return (
    <Card className={configured ? "border-success/30" : ""}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <ProviderLogo providerId={providerId} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {provider.displayName}
                </p>
                {configured && statusBadge(connection.status)}
                {connection && !configured && statusBadge(connection.status)}
              </div>
              <p className="text-xs text-muted-foreground">
                {provider.description}
              </p>
              {connection?.externalAccountName && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Account: {connection.externalAccountName}
                </p>
              )}
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-1.5 sm:w-auto sm:justify-end">
            {configured && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTest}
                  loading={testing}
                  disabled={deleting || connecting}
                  className="min-h-11 flex-1 sm:min-h-0 sm:flex-none"
                >
                  Test
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  loading={deleting}
                  disabled={testing || connecting}
                  className="min-h-11 flex-1 sm:min-h-0 sm:flex-none"
                >
                  Disconnect
                </Button>
              </>
            )}
            {!configured && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnect}
                loading={connecting}
                className="min-h-11 w-full sm:min-h-0 sm:w-auto"
              >
                <Plug className="size-3.5" /> Connect
              </Button>
            )}
          </div>
        </div>
        {testResult && (
          <div
            className="mt-3 flex items-center gap-1.5"
            role="status"
            aria-live="polite"
          >
            {testSucceeded ? (
              <CheckCircle className="size-3.5 text-success" />
            ) : (
              <XCircle className="size-3.5 text-error" />
            )}
            <span className="text-xs text-muted-foreground">{testResult}</span>
          </div>
        )}
        {provider.docsUrl && (
          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3" /> Documentation
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectForm({
  providerId,
  onClose,
  onSaved,
}: {
  providerId: IntegrationProviderId;
  onClose: () => void;
  onSaved: () => void;
}) {
  const provider = getProviderById(providerId);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!provider) return null;

  if (provider.id === "tally") {
    return <TallyConnectForm onClose={onClose} onSaved={onSaved} />;
  }

  if (provider.id === "google-calendar" || provider.id === "gmail") {
    return null;
  }

  const fields: Record<
    string,
    { label: string; type: string; required?: boolean }
  > = {};
  const automationWebhookProvider = ["n8n", "zapier", "make"].includes(
    provider.id,
  );

  if (automationWebhookProvider) {
    fields["webhook_url"] = {
      label:
        provider.id === "zapier"
          ? "Catch Hook URL"
          : provider.id === "make"
            ? "Custom Webhook URL"
            : "Production Webhook URL",
      type: "url",
    };
  } else if (
    provider.id !== "twilio" &&
    (provider.supportsApiKey || provider.authType === "api_key")
  ) {
    fields["api_key"] = { label: "API Key", type: "password" };
  }

  if (provider.id === "hubspot") {
    fields["access_token"] = { label: "Access Token", type: "password" };
  }

  if (provider.id === "gohighlevel") {
    fields["location_id"] = { label: "Location ID", type: "text" };
  }

  if (
    !automationWebhookProvider &&
    provider.id !== "slack" &&
    provider.supportsWebhooks
  ) {
    fields["webhook_url"] = { label: "Webhook URL", type: "text" };
  }

  if (provider.id === "n8n") {
    fields["webhook_secret"] = {
      label: "Header Authentication Secret",
      type: "password",
    };
  }

  if (provider.id === "make") {
    fields["api_key"] = { label: "Webhook API Key", type: "password" };
  }

  if (provider.id === "twilio") {
    fields["account_sid"] = { label: "Account SID", type: "text" };
    fields["auth_token"] = { label: "Auth Token", type: "password" };
    fields["phone_number"] = {
      label: "Source Phone Number (optional)",
      type: "tel",
      required: false,
    };
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const creds: Record<string, unknown> = {};
    for (const key of Object.keys(fields)) {
      creds[key] = formData.get(key) as string;
    }

    startTransition(async () => {
      const result = automationWebhookProvider
        ? await saveAutomationWebhookIntegration(
            providerId as "n8n" | "zapier" | "make",
            creds,
          )
        : providerId === "twilio"
          ? await saveTwilioIntegration(creds)
          : await saveIntegration(providerId, creds);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => {
          onSaved();
          onClose();
        }, 1000);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold">
          Connect {provider.displayName}
        </h3>
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
          {Object.entries(fields).map(([key, field]) => (
            <Input
              key={key}
              label={field.label}
              name={key}
              type={field.type}
              inputSize="sm"
              required={field.required !== false}
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
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState<IntegrationProviderId | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchConnections = async () => {
    const result = await getOrganizationIntegrations();
    return result.data ?? [];
  };

  useEffect(() => {
    let cancelled = false;
    fetchConnections().then((data) => {
      if (!cancelled) {
        setConnections(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const connectionMap = new Map(connections.map((c) => [c.provider, c]));

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="h-14 animate-pulse rounded-lg bg-surface-secondary" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {PROVIDER_CATEGORIES.map((category) => {
        const providers = INTEGRATION_PROVIDERS.filter(
          (p) => p.category === category.key,
        );
        if (providers.length === 0) return null;

        return (
          <div key={category.key}>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {category.label}
            </h3>
            <div className="space-y-3">
              {providers.map((provider) => (
                <div key={provider.id}>
                  <IntegrationCard
                    providerId={provider.id}
                    connection={connectionMap.get(provider.id) ?? null}
                    onConfigure={() => setConfiguring(provider.id)}
                    onRefresh={() => {
                      setRefreshKey((k) => k + 1);
                    }}
                  />
                  {configuring === provider.id && (
                    <div className="mt-3 ml-0">
                      <ConnectForm
                        providerId={provider.id}
                        onClose={() => setConfiguring(null)}
                        onSaved={() => setRefreshKey((k) => k + 1)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

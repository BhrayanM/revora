"use client";

import { Building2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { syncLeadToHubSpot } from "../sync-actions";

export function HubSpotSyncButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await syncLeadToHubSpot(leadId);
      if (res.error) {
        setError(res.error);
      } else {
        setMessage(
          (res as { contactId: string; created: boolean }).created
            ? `Contact created in HubSpot`
            : `Contact updated in HubSpot`,
        );
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSync}
        loading={isPending}
        variant="outline"
        size="sm"
      >
        <Building2 className="size-3.5" />
        Sync to HubSpot
      </Button>
      {message && <p className="text-xs text-success">{message}</p>}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

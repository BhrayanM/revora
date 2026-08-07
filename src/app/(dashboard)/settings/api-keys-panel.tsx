"use client";

import { Copy, Key, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  createSourceApiKey,
  listSourceApiKeys,
  revokeSourceApiKey,
} from "./api-keys-actions";

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  tally: "Tally",
  n8n: "n8n",
  api: "API",
};

export function APIKeysPanel() {
  const [keys, setKeys] = useState<
    Array<{
      id: string;
      source: string;
      label: string;
      is_active: boolean;
      last_used_at: string | null;
      created_at: string;
    }>
  >([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  const loadKeys = () => {
    startLoad(async () => {
      const result = await listSourceApiKeys();
      if (result.data) setKeys(result.data);
      else setError(result.error);
    });
  };

  if (keys.length === 0 && !loading) loadKeys();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          API keys authenticate external services (Tally, n8n, website forms).
        </p>
        <Button
          size="sm"
          onClick={() => {
            setShowCreate(true);
            setNewKey(null);
          }}
        >
          <Plus className="size-3.5" /> Create Key
        </Button>
      </div>

      {showCreate && (
        <CreateKeyForm
          onCreated={(raw) => {
            setNewKey(raw);
            loadKeys();
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {newKey && (
        <Card className="border-success/30">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-success mb-1">
              Key created successfully
            </p>
            <div className="flex items-center gap-2 rounded-md bg-surface-secondary p-2 font-mono text-sm">
              <Key className="size-4 text-zinc-500 shrink-0" />
              <span className="text-foreground break-all">{newKey}</span>
              <button
                onClick={() => navigator.clipboard.writeText(newKey)}
                className="ml-auto rounded p-1 text-zinc-500 hover:text-foreground shrink-0"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
            <p className="mt-2 text-xs text-error font-medium">
              The full key will not be shown again. Copy it now.
            </p>
          </CardContent>
        </Card>
      )}

      {keys.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Key className="size-8 text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-500">No API keys yet</p>
          <p className="text-xs text-zinc-400 mt-1">
            Create your first key to start ingesting leads
          </p>
        </div>
      ) : (
        keys.map((key) => (
          <div
            key={key.id}
            className="flex items-center justify-between rounded-lg border border-border p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {key.label}
                </span>
                <Badge variant="outline" size="sm">
                  {SOURCE_LABELS[key.source] ?? key.source}
                </Badge>
                {!key.is_active && (
                  <Badge variant="error" size="sm">
                    Revoked
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Created {new Date(key.created_at).toLocaleDateString()}
                {key.last_used_at &&
                  ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
              </p>
            </div>
            {key.is_active && (
              <RevokeButton keyId={key.id} onRevoked={() => loadKeys()} />
            )}
          </div>
        ))
      )}
    </div>
  );
}

function CreateKeyForm({
  onCreated,
  onClose,
}: {
  onCreated: (raw: string) => void;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const label = formData.get("label") as string;
    const source = formData.get("source") as
      "website" | "tally" | "n8n" | "api";

    startTransition(async () => {
      const result = await createSourceApiKey(label, source);
      if (result.error) setError(result.error);
      else if (result.data) onCreated(result.data.key);
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        {error && (
          <Alert variant="error" className="mb-3">
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="Label"
            name="label"
            placeholder="Production API"
            inputSize="sm"
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Source
            </label>
            <select
              name="source"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
              defaultValue="api"
            >
              <option value="website">Website</option>
              <option value="tally">Tally</option>
              <option value="n8n">n8n</option>
              <option value="api">API</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isPending}>
              Generate Key
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RevokeButton({
  keyId,
  onRevoked,
}: {
  keyId: string;
  onRevoked: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirm) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
        <Trash2 className="size-3.5" /> Revoke
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-error">Are you sure?</span>
      <Button
        variant="destructive"
        size="sm"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            await revokeSourceApiKey(keyId);
            onRevoked();
          })
        }
      >
        Yes, revoke
      </Button>
    </div>
  );
}

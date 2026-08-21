"use client";

import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  TallyFieldMapping,
  TallyFieldOption,
  TallyFormSummary,
} from "@/lib/integrations/tally-contract";

import {
  connectTally,
  discoverTallyForms,
  inspectTallyForm,
} from "./integrations-actions";

type TallyStep = "credentials" | "form" | "mapping";
type MappingKey = keyof TallyFieldMapping;

const MAPPING_FIELDS: Array<{
  key: MappingKey;
  label: string;
  hint: string;
}> = [
  { key: "name", label: "Name", hint: "Optional" },
  { key: "email", label: "Email", hint: "Email or phone required" },
  { key: "phone", label: "Phone", hint: "Email or phone required" },
  { key: "company", label: "Company", hint: "Optional" },
  { key: "message", label: "Message", hint: "Optional" },
];

export function TallyConnectForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<TallyStep>("credentials");
  const [apiKey, setApiKey] = useState("");
  const [forms, setForms] = useState<TallyFormSummary[]>([]);
  const [formId, setFormId] = useState("");
  const [fields, setFields] = useState<TallyFieldOption[]>([]);
  const [mapping, setMapping] = useState<TallyFieldMapping>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const availableForms = forms.filter(
    (form) => form.status === "PUBLISHED" && !form.isClosed,
  );

  const closeSafely = () => {
    setApiKey("");
    setMapping({});
    onClose();
  };

  const handleDiscover = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await discoverTallyForms(apiKey);
      if (result.error || !result.data) {
        setError(result.error ?? "Tally forms could not be loaded.");
        return;
      }
      const usableForms = result.data.forms.filter(
        (form) => form.status === "PUBLISHED" && !form.isClosed,
      );
      if (usableForms.length === 0) {
        setError("No open, published Tally forms were found.");
        return;
      }
      setForms(result.data.forms);
      setFormId(usableForms[0]?.id ?? "");
      setStep("form");
    });
  };

  const handleInspect = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!formId) {
      setError("Select a Tally form.");
      return;
    }
    startTransition(async () => {
      const result = await inspectTallyForm(apiKey, formId);
      if (result.error || !result.data) {
        setError(result.error ?? "Tally form fields could not be loaded.");
        return;
      }
      setFields(result.data.fields);
      setMapping(result.data.suggestedMapping);
      setStep("mapping");
    });
  };

  const updateMapping = (key: MappingKey, value: string) => {
    setMapping((current) => {
      const next = { ...current };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  };

  const handleConnect = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!mapping.email && !mapping.phone) {
      setError("Map at least an email or phone field.");
      return;
    }
    startTransition(async () => {
      const result = await connectTally({ apiKey, formId, mapping });
      if (result.error) {
        setError(result.error);
        return;
      }
      setApiKey("");
      setSaved(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <h3 className="text-base font-semibold">Connect Tally</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Step {step === "credentials" ? 1 : step === "form" ? 2 : 3} of 3
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}
        {saved && (
          <Alert variant="success" className="mb-4">
            Tally connected successfully.
          </Alert>
        )}

        {step === "credentials" && !saved && (
          <form onSubmit={handleDiscover} className="space-y-3">
            <Input
              label="Tally API Key"
              name="tally_api_key"
              type="password"
              autoComplete="off"
              inputSize="sm"
              required
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The key is used only to configure your form and is encrypted on
              connection.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeSafely}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={isPending}>
                Load forms
              </Button>
            </div>
          </form>
        )}

        {step === "form" && !saved && (
          <form onSubmit={handleInspect} className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Tally form
              <select
                className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                value={formId}
                onChange={(event) => setFormId(event.target.value)}
                required
              >
                {availableForms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("credentials")}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeSafely}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={isPending}>
                Map fields
              </Button>
            </div>
          </form>
        )}

        {step === "mapping" && !saved && (
          <form onSubmit={handleConnect} className="space-y-3">
            {MAPPING_FIELDS.map(({ key, label, hint }) => (
              <label
                key={key}
                className="block text-sm font-medium text-foreground"
              >
                <span className="flex items-center justify-between gap-3">
                  {label}
                  <span className="text-xs font-normal text-muted-foreground">
                    {hint}
                  </span>
                </span>
                <select
                  className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                  value={mapping[key] ?? ""}
                  onChange={(event) => updateMapping(key, event.target.value)}
                >
                  <option value="">Not mapped</option>
                  {fields.map((field) => {
                    const selectedElsewhere = Object.entries(mapping).some(
                      ([mappedKey, fieldId]) =>
                        mappedKey !== key && fieldId === field.id,
                    );
                    return (
                      <option
                        key={field.id}
                        value={field.id}
                        disabled={selectedElsewhere}
                      >
                        {field.label} ({field.type})
                      </option>
                    );
                  })}
                </select>
              </label>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("form")}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeSafely}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={isPending}>
                Connect Tally
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

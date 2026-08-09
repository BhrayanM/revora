"use client";

import { Brain, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { QualificationResult } from "@/lib/ai/qualification";

import { aiQualifyLead } from "./actions";

interface AIQualificationPanelProps {
  leadId: string;
  existingQualification: Record<string, unknown> | null;
}

export function AIQualificationPanel({
  leadId,
  existingQualification,
}: AIQualificationPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QualificationResult | null>(() => {
    if (existingQualification) {
      return existingQualification as unknown as QualificationResult;
    }
    return null;
  });

  const handleQualify = () => {
    setError(null);
    startTransition(async () => {
      const res = await aiQualifyLead(leadId);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setResult(res.data);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold">AI Lead Qualification</h3>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use AI to analyze this lead and generate a qualification score,
                buying signals, risks, and recommended next actions.
              </p>
              {error && <p className="text-sm text-error">{error}</p>}
              <Button
                onClick={handleQualify}
                loading={isPending}
                className="w-full"
              >
                <Brain className="size-4" />
                AI Qualify Lead
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-surface-secondary px-3 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Score
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {result.score}
                  </span>
                </div>
                <Badge
                  variant={
                    result.temperature === "HOT"
                      ? "error"
                      : result.temperature === "WARM"
                        ? "warning"
                        : "default"
                  }
                  size="md"
                >
                  {result.temperature}
                </Badge>
                {result.confidence > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(result.confidence * 100)}% confidence
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Summary
                </p>
                <p className="text-sm text-foreground">{result.summary}</p>
              </div>

              {result.buyingSignals.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    Buying Signals
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.buyingSignals.map((s) => (
                      <Badge key={s} variant="success" size="sm">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.risks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    Risks
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.risks.map((r) => (
                      <Badge key={r} variant="error" size="sm">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.recommendedAction && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Recommended Action
                  </p>
                  <p className="text-sm text-foreground bg-surface-secondary rounded-lg p-3">
                    {result.recommendedAction}
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-error">{error}</p>}

              <Button
                onClick={handleQualify}
                loading={isPending}
                variant="outline"
                size="sm"
              >
                <Sparkles className="size-3.5" />
                Re-qualify
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

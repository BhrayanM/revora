"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { Turnstile } from "@marsidev/react-turnstile";
import { useCallback, useEffect, useRef, useState } from "react";

const TEST_SITE_KEY = "1x00000000000000000000AA";

function getSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (key && key.length > 0) return key;
  if (process.env.NODE_ENV === "development") return TEST_SITE_KEY;
  return null;
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  onResetReady?: (resetFn: () => void) => void;
}

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  onResetReady,
}: TurnstileWidgetProps) {
  const siteKey = getSiteKey();
  const ref = useRef<TurnstileInstance>(null);
  const [state, setState] = useState<
    "loading" | "verified" | "expired" | "error" | "unavailable"
  >("loading");

  const handleSuccess = useCallback(
    (token: string) => {
      setState("verified");
      onVerify(token);
    },
    [onVerify],
  );

  const handleExpire = useCallback(() => {
    setState("expired");
    onExpire?.();
  }, [onExpire]);

  const handleError = useCallback(
    (error: string) => {
      setState("error");
      onError?.(error);
    },
    [onError],
  );

  const reset = useCallback(() => {
    setState("loading");
    ref.current?.reset();
  }, []);

  useEffect(() => {
    if (onResetReady) onResetReady(reset);
  }, [onResetReady, reset]);

  if (!siteKey) {
    return (
      <div className="flex justify-center">
        <div className="rounded-lg border border-border bg-surface-secondary px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground">
            Security verification is temporarily unavailable.
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/60">
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-surface-secondary/70 p-3 sm:p-4">
      <div className="flex min-h-[65px] w-full justify-center overflow-visible">
        <Turnstile
          ref={ref}
          siteKey={siteKey}
          onSuccess={handleSuccess}
          onExpire={handleExpire}
          onError={handleError}
          options={{
            theme: "auto",
            size: "flexible",
          }}
          className="w-full"
        />
      </div>
      {state === "expired" && (
        <p className="mt-2 text-center text-xs text-warning">
          Security check expired. The widget will refresh.
        </p>
      )}
      {state === "error" && (
        <p className="mt-2 text-center text-xs text-error">
          Security check failed. Please try again.
        </p>
      )}
    </div>
  );
}

export function isTurnstileRequired(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return true;
}

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
  onReset?: (resetFn: () => void) => void;
}

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  onReset,
}: TurnstileWidgetProps) {
  const siteKey = getSiteKey();
  const ref = useRef<TurnstileInstance>(null);
  const [state, setState] = useState<
    "loading" | "verified" | "expired" | "error"
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
    if (onReset) onReset(reset);
  }, [onReset, reset]);

  if (!siteKey) return null;

  return (
    <div className="flex justify-center">
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        onSuccess={handleSuccess}
        onExpire={handleExpire}
        onError={handleError}
        options={{
          theme: "auto",
          size: "normal",
        }}
        className="mx-auto"
      />
      {state === "expired" && (
        <p className="mt-1 text-xs text-warning">
          Security check expired. The widget will refresh.
        </p>
      )}
      {state === "error" && (
        <p className="mt-1 text-xs text-destructive">
          Security check failed. Please try again.
        </p>
      )}
    </div>
  );
}

export function isTurnstileEnabled(): boolean {
  return getSiteKey() !== null;
}

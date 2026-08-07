"use client";

import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
        <AlertCircle className="size-7 text-error" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        Something went wrong
      </h2>
      <p className="text-sm text-zinc-500">
        An unexpected error occurred. Please try again.
      </p>
      <Button variant="outline" onClick={reset}>
        Try Again
      </Button>
    </div>
  );
}

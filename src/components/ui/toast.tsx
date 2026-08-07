"use client";

import { type VariantProps, cva } from "class-variance-authority";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const toastVariants = cva(
  "pointer-events-auto flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg animate-slide-up",
  {
    variants: {
      variant: {
        info: "border-primary/30 bg-surface text-foreground",
        success: "border-success/30 bg-surface text-foreground",
        warning: "border-warning/30 bg-surface text-foreground",
        error: "border-error/30 bg-surface text-foreground",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const variantIconColors = {
  info: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
};

export interface ToastProps extends VariantProps<typeof toastVariants> {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  onDismiss?: (id: string) => void;
}

export function Toast({
  id,
  title,
  description,
  variant = "info",
  duration = 5000,
  onDismiss,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const Icon = icons[variant ?? "info"];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => {
        onDismiss?.(id);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, id, onDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        toastVariants({ variant }),
        isVisible
          ? "animate-slide-up"
          : "animate-fade-out opacity-0 transition-opacity duration-300",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          variantIconColors[variant ?? "info"],
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
        )}
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="ml-auto shrink-0 rounded-md p-0.5 text-zinc-400 opacity-70 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4">
      {children}
    </div>
  );
}

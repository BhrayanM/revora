import { type VariantProps, cva } from "class-variance-authority";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex w-full items-start gap-3 rounded-lg border p-4",
  {
    variants: {
      variant: {
        info: "border-primary/30 bg-primary/5 text-primary-800",
        success: "border-success/30 bg-success/5 text-success-800",
        warning: "border-warning/30 bg-warning/5 text-warning-800",
        error: "border-error/30 bg-error/5 text-error-800",
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

export type AlertProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    title?: string;
    dismissible?: boolean;
    onDismiss?: () => void;
  };

export function Alert({
  className,
  variant = "info",
  title,
  children,
  dismissible = false,
  onDismiss,
  ...props
}: AlertProps) {
  const Icon = icons[variant ?? "info"];

  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant, className }))}
      {...props}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="flex-1">
        {title && <h5 className="mb-1 font-medium">{title}</h5>}
        {children && <div className="text-sm opacity-90">{children}</div>}
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="ml-auto shrink-0 rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

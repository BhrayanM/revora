import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export function SelectField({
  className,
  label,
  error,
  helperText,
  id,
  children,
  "aria-describedby": ariaDescribedBy,
  ...props
}: SelectFieldProps) {
  const selectId = id || label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;
  const describedBy =
    [ariaDescribedBy, error ? errorId : helperText ? helperId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="w-full">
      <label
        htmlFor={selectId}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <select
        id={selectId}
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input-border bg-input px-3 text-sm text-foreground transition-colors duration-200",
          "focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-error focus:border-error/50 focus:ring-error/20",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-error">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}

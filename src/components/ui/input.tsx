import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  inputSize?: "sm" | "md" | "lg";
}

export function Input({
  className,
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  inputSize = "md",
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  const sizeClasses = {
    sm: "h-8 text-xs px-2.5",
    md: "h-10 text-sm px-3",
    lg: "h-12 text-base px-4",
  };

  const iconSizeClasses = {
    sm: "size-3.5",
    md: "size-4",
    lg: "size-5",
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle",
              iconSizeClasses[inputSize],
            )}
          >
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            "flex w-full rounded-lg border border-input-border bg-input text-foreground placeholder:text-subtle transition-colors duration-200",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-error focus:border-error/50 focus:ring-error/20",
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            sizeClasses[inputSize],
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <div
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-subtle",
              iconSizeClasses[inputSize],
            )}
          >
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

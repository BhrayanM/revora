import { type VariantProps, cva } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Spinner } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white shadow-sm hover:bg-primary-600 active:bg-primary-700",
        secondary:
          "bg-surface-secondary text-foreground border border-border hover:bg-surface-tertiary active:bg-surface-tertiary",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-surface-secondary active:bg-surface-tertiary",
        ghost:
          "text-foreground hover:bg-surface-secondary active:bg-surface-tertiary",
        destructive:
          "bg-error text-white shadow-sm hover:bg-error-600 active:bg-error-700",
        success:
          "bg-success text-white shadow-sm hover:bg-success-600 active:bg-success-700",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  };

export function Button({
  className,
  variant,
  size,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : leftIcon ? leftIcon : null}
      {children}
      {!loading && rightIcon ? rightIcon : null}
    </button>
  );
}

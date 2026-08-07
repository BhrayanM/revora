import { type VariantProps, cva } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-xl border border-border bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md",
  {
    variants: {
      variant: {
        default: "",
        elevated: "shadow-md hover:shadow-lg",
        bordered: "border-2",
        ghost:
          "border-transparent bg-transparent shadow-none hover:shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type CardProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants>;

export function Card({ className, variant, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant, className }))} {...props} />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border-b border-border px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-4", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center border-t border-border px-6 py-4",
        className,
      )}
      {...props}
    />
  );
}

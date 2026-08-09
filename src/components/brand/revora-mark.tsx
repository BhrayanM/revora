import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

type BrandMarkProps = Omit<SVGProps<SVGSVGElement>, "role"> & {
  title?: string;
};

/**
 * Original Revora mark: a minimal rising triangular form that represents a
 * revenue signal becoming forward momentum. It uses currentColor so it can
 * remain high-contrast in every supported theme.
 */
export function RevoraMark({ className, title, ...props }: BrandMarkProps) {
  const isDecorative = !title;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={isDecorative || undefined}
      role={isDecorative ? undefined : "img"}
      className={cn("shrink-0", className)}
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M3.5 19.5 12 3.5l8.5 16H3.5Z" />
      <path d="m9.2 14.5 2.8-5.2 2.8 5.2" />
      <path d="M16.4 7.3h3.1v3.1" />
      <path d="m19.5 7.3-4.3 4.3" />
    </svg>
  );
}

export function RevoraLockup({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl bg-foreground text-canvas shadow-sm",
          markClassName,
        )}
      >
        <RevoraMark className="size-[1.15rem]" />
      </span>
      <span
        className={cn(
          "font-semibold tracking-[-0.045em] text-foreground",
          wordmarkClassName,
        )}
      >
        Revora
      </span>
    </span>
  );
}

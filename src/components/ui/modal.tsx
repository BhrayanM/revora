"use client";

import { type VariantProps, cva } from "class-variance-authority";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const overlayVariants = cva(
  "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
  {
    variants: {
      animation: {
        fade: "animate-fade-in",
        scale: "animate-scale-in",
      },
    },
    defaultVariants: {
      animation: "scale",
    },
  },
);

const panelVariants = cva(
  "relative w-full bg-surface shadow-xl animate-scale-in",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        full: "max-w-[calc(100%-2rem)]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface ModalProps extends VariantProps<typeof overlayVariants> {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  size?: VariantProps<typeof panelVariants>["size"];
  showCloseButton?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
  showCloseButton = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className={overlayVariants()}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-description" : undefined}
    >
      <div className={cn(panelVariants({ size }), "rounded-xl", className)}>
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        )}
        {(title || description) && (
          <div className="border-b border-border px-6 py-4">
            {title && (
              <h2
                id="modal-title"
                className="text-lg font-semibold text-foreground"
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id="modal-description"
                className="mt-1 text-sm text-muted-foreground"
              >
                {description}
              </p>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

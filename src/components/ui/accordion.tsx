"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type AccordionItem = {
  value: string;
  icon: ReactNode;
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
};

export function Accordion({
  items,
  className,
}: {
  items: AccordionItem[];
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (value: string) => {
    setOpen((prev) => (prev === value ? null : value));
  };

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const isOpen = open === item.value;

        return (
          <div
            key={item.value}
            className="rounded-xl border border-border bg-surface transition-shadow duration-200 hover:shadow-sm"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
              onClick={() => toggle(item.value)}
            >
              <span className="text-muted-foreground shrink-0">
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {item.title}
                  </span>
                  {item.badge}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground shrink-0 transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 border-t border-border">
                <div className="pt-4">{item.children}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

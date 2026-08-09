"use client";

import { Building2, Check, ChevronDown, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { selectActiveOrganizationAction } from "@/app/(dashboard)/organization-actions";
import type { ActiveOrganizationOption } from "@/lib/organizations/types";
import { cn } from "@/lib/utils";

type OrganizationSwitcherProps = {
  activeOrganization: ActiveOrganizationOption | null;
  organizations: ActiveOrganizationOption[];
  compact?: boolean;
};

function roleLabel(role: ActiveOrganizationOption["role"]): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * A dashboard-only selector. The browser never owns the active tenant state:
 * selecting an option invokes a Server Action that validates active membership
 * before it writes the HttpOnly preference cookie.
 */
export function OrganizationSwitcher({
  activeOrganization,
  organizations,
  compact = false,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!activeOrganization) return null;

  const canSwitch = organizations.length > 1;
  const selectOrganization = (organizationId: string) => {
    if (organizationId === activeOrganization.id || isPending) {
      setOpen(false);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await selectActiveOrganizationAction(organizationId);
      if (result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      // Always return to a context-safe route. This prevents an org-specific
      // detail URL from carrying stale tenant data through the transition.
      router.replace("/dashboard");
      router.refresh();
    });
  };

  if (!canSwitch) {
    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-lg text-sidebar-muted",
          compact ? "justify-center p-2" : "px-2 py-1.5",
        )}
        title={`${activeOrganization.name} — ${roleLabel(activeOrganization.role)}`}
      >
        <Building2 className="size-4 shrink-0 text-sidebar-active" />
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-sidebar-foreground">
              {activeOrganization.name}
            </p>
            <p className="text-[0.6875rem] text-sidebar-muted">
              {roleLabel(activeOrganization.role)}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen((current) => !current);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Switch organization. Current organization: ${activeOrganization.name}, ${roleLabel(activeOrganization.role)}`}
        className={cn(
          "flex w-full min-w-0 items-center gap-2 rounded-lg text-left outline-none transition-colors hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-sidebar-active focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          compact ? "justify-center p-2" : "px-2 py-1.5",
        )}
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-active/15 text-sidebar-active ring-1 ring-sidebar-active/20">
          <Building2 className="size-3.5" />
        </div>
        {!compact && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-sidebar-foreground">
              {activeOrganization.name}
            </p>
            <p className="text-[0.6875rem] text-sidebar-muted">
              {roleLabel(activeOrganization.role)}
            </p>
          </div>
        )}
        {isPending ? (
          <LoaderCircle className="size-3.5 shrink-0 animate-spin text-sidebar-active" />
        ) : (
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-sidebar-muted transition-transform",
              open && "rotate-180",
              compact && "hidden",
            )}
          />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Available organizations"
          className={cn(
            "absolute z-50 mt-2 min-w-56 overflow-hidden rounded-xl border border-sidebar-border bg-sidebar p-1.5 shadow-xl shadow-black/15",
            compact ? "left-full top-0 ml-2" : "left-0 right-0",
          )}
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[0.625rem] font-semibold uppercase tracking-wider text-sidebar-muted">
            Organizations
          </p>
          <div className="space-y-0.5">
            {organizations.map((organization) => {
              const selected = organization.id === activeOrganization.id;
              return (
                <button
                  key={organization.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={isPending}
                  onClick={() => selectOrganization(organization.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-active disabled:cursor-wait disabled:opacity-60",
                    selected
                      ? "bg-sidebar-active-surface text-sidebar-active"
                      : "text-sidebar-foreground hover:bg-sidebar-hover",
                  )}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-active/10 text-sidebar-active">
                    <Building2 className="size-3.5" />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">
                      {organization.name}
                    </span>
                    <span className="block text-[0.6875rem] text-sidebar-muted">
                      {roleLabel(organization.role)}
                    </span>
                  </span>
                  {selected && <Check className="size-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
          {error && (
            <p role="alert" className="px-2.5 pb-1 pt-2 text-xs text-error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

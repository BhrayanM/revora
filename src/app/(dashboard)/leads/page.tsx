import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { getCurrentOrganization } from "@/lib/auth";
import { getLeads } from "@/lib/queries/leads";

import { LeadsTable } from "./leads-table";

export const metadata: Metadata = {
  title: "Leads — AI Growth Platform",
};

export default async function LeadsPage() {
  const org = await getCurrentOrganization();

  if (!org) {
    return (
      <Container className="max-w-none px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track all your leads.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm text-muted-foreground">
            No organization found.
          </p>
          <p className="text-xs text-muted mt-1">Please contact support.</p>
        </div>
      </Container>
    );
  }

  const { data: leads, error } = await getLeads(org.id);

  if (error) {
    return (
      <Container className="max-w-none px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track all your leads.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm text-error">Failed to load leads.</p>
          <p className="text-xs text-muted mt-1">{error}</p>
          <Link
            href="/leads"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 border border-border bg-transparent text-foreground hover:bg-surface-secondary h-8 px-3 text-xs mt-4"
          >
            Retry
          </Link>
        </div>
      </Container>
    );
  }

  return <LeadsTable leads={leads ?? []} />;
}

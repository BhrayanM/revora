"use client";

import { MoreHorizontal, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { Table, type TableColumn } from "@/components/ui/table";
import type { Lead } from "@/lib/queries/leads";

const statusConfig: Record<
  string,
  {
    label: string;
    variant:
      "default" | "success" | "warning" | "error" | "secondary" | "outline";
  }
> = {
  new: { label: "New", variant: "default" },
  contacted: { label: "Contacted", variant: "secondary" },
  qualified: { label: "Qualified", variant: "success" },
  proposal: { label: "Proposal", variant: "warning" },
  negotiation: { label: "Negotiation", variant: "secondary" },
  won: { label: "Won", variant: "success" },
  lost: { label: "Lost", variant: "error" },
};

interface LeadsTableProps {
  leads: Lead[];
}

export function LeadsTable({ leads }: LeadsTableProps) {
  const router = useRouter();

  const columns: TableColumn<Lead>[] = [
    {
      key: "first_name",
      header: "Name",
      sortable: true,
      accessor: (lead) => (
        <Link
          href={`/leads/${lead.id}`}
          className="font-medium text-foreground hover:text-primary"
        >
          {lead.first_name} {lead.last_name}
        </Link>
      ),
    },
    {
      key: "company",
      header: "Company",
      sortable: true,
      accessor: (lead) => (
        <span className="text-zinc-600">{lead.company || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (lead) => {
        const cfg = statusConfig[lead.status] ?? {
          label: lead.status,
          variant: "default" as const,
        };
        return (
          <Badge variant={cfg.variant} size="sm">
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: "score",
      header: "AI Score",
      sortable: true,
      accessor: (lead) => (
        <span
          className={
            lead.score >= 80 ? "text-success font-medium" : "text-zinc-600"
          }
        >
          {lead.score}/100
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      accessor: (lead) => (
        <span className="text-zinc-500 text-xs">
          {new Date(lead.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      accessor: () => (
        <Button variant="ghost" size="sm" className="size-8 p-0">
          <MoreHorizontal className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <Container className="max-w-none px-0">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage and track all your leads.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Search leads..."
              className="pl-9"
              inputSize="sm"
            />
          </div>
          <Button size="sm">Add Lead</Button>
        </div>
      </div>
      <Table
        columns={columns}
        data={leads}
        keyField="id"
        onRowClick={(lead) => router.push(`/leads/${lead.id}`)}
        showPagination
        pageSize={8}
      />
    </Container>
  );
}

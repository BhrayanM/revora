"use client";

import { MoreHorizontal, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { Table, type TableColumn } from "@/components/ui/table";
import type { Lead } from "@/lib/queries/leads";

import { addLead } from "./actions";

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

function AddLeadForm({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await addLead(formData);
      if (result.error) {
        setError(result.error);
      } else {
        form.reset();
        onClose();
      }
    });
  };

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Add Lead</h2>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-500 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      {error && <p className="text-sm text-error mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input
          label="First Name"
          name="first_name"
          placeholder="Sarah"
          inputSize="sm"
          required
        />
        <Input
          label="Last Name"
          name="last_name"
          placeholder="Johnson"
          inputSize="sm"
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="sarah@company.com"
          inputSize="sm"
        />
        <Input
          label="Company"
          name="company"
          placeholder="Company name"
          inputSize="sm"
        />
        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={isPending}>
            Save Lead
          </Button>
        </div>
      </form>
    </div>
  );
}

interface LeadsTableProps {
  leads: Lead[];
}

export function LeadsTable({ leads }: LeadsTableProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = leads.filter((lead) => {
    if (statusFilter !== "all" && lead.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(q) ||
      (lead.email ?? "").toLowerCase().includes(q) ||
      (lead.company ?? "").toLowerCase().includes(q)
    );
  });

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
      header: "Score",
      sortable: true,
      accessor: (lead) => {
        const qual = (lead.metadata as Record<string, unknown> | null)?.[
          "qualification"
        ] as Record<string, unknown> | undefined;
        const temp = qual?.["temperature"] as string | undefined;
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={
                lead.score >= 80 ? "text-success font-medium" : "text-zinc-600"
              }
            >
              {lead.score}/100
            </span>
            {temp && (
              <Badge
                variant={
                  temp === "HOT"
                    ? "error"
                    : temp === "WARM"
                      ? "warning"
                      : "default"
                }
                size="sm"
              >
                {temp}
              </Badge>
            )}
          </div>
        );
      },
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="size-3.5" /> Add Lead
          </Button>
          {(search || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {showForm && <AddLeadForm onClose={() => setShowForm(false)} />}

      <Table
        columns={columns}
        data={filtered}
        keyField="id"
        onRowClick={(lead) => router.push(`/leads/${lead.id}`)}
        showPagination
        pageSize={8}
        emptyMessage={
          search || statusFilter !== "all"
            ? "No leads match your filters"
            : "No leads yet"
        }
      />
    </Container>
  );
}

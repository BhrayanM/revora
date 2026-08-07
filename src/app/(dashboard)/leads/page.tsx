"use client";

import { ArrowUpDown, MoreHorizontal, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { Table, type TableColumn } from "@/components/ui/table";
import type { Lead, LeadSource, LeadStatus } from "@/types";

const statusConfig: Record<
  LeadStatus,
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

const names = [
  "Sarah Johnson",
  "Marcus Lee",
  "Elena Martinez",
  "David Park",
  "Alex Thompson",
  "Rachel Kim",
  "James Wilson",
  "Lisa Chang",
  "Omar Hassan",
  "Priya Patel",
  "Tom Baker",
  "Nina Rodriguez",
];
const statuses: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
  "new",
  "qualified",
  "proposal",
  "won",
  "lost",
];

const mockLeads: Lead[] = Array.from({ length: 12 }, (_, i) => ({
  id: `lead-${i + 1}`,
  name: names[i]!,
  email: `${names[i]!.toLowerCase().replace(" ", ".")}@example.com`,
  company: [
    "TechCorp",
    "GrowthLabs",
    "FinEdge",
    "CloudScale",
    "DataFlow",
    "NeuralAI",
  ][i % 6],
  status: statuses[i]!,
  score: Math.floor(Math.random() * 50) + 50,
  source: (["website", "referral", "linkedin", "email"] as LeadSource[])[
    i % 4
  ]!,
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

export default function LeadsPage() {
  const router = useRouter();
  const columns: TableColumn<Lead>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      accessor: (lead) => (
        <Link
          href={`/leads/${lead.id}`}
          className="font-medium text-foreground hover:text-primary"
        >
          {lead.name}
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
        const cfg = statusConfig[lead.status];
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
      key: "createdAt",
      header: "Created",
      sortable: true,
      accessor: (lead) => (
        <span className="text-zinc-500 text-xs">
          {new Date(lead.createdAt).toLocaleDateString()}
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
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search leads..."
              className="pl-9"
              inputSize="sm"
            />
          </div>
          <Button size="sm">
            <ArrowUpDown className="size-3.5" />
            Add Lead
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={mockLeads}
        keyField="id"
        onRowClick={(lead) => router.push(`/leads/${lead.id}`)}
        showPagination
        pageSize={8}
      />
    </Container>
  );
}

"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export interface TableColumn<T> {
  key: string;
  header: string;
  accessor: (item: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyField: keyof T;
  className?: string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  pageSize?: number;
  showPagination?: boolean;
}

export function Table<T>({
  columns,
  data,
  keyField,
  className,
  onRowClick,
  emptyMessage = "No data found",
  isLoading = false,
  pageSize = 10,
  showPagination = false,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const recordA = a as Record<string, unknown>;
        const recordB = b as Record<string, unknown>;
        const aVal = recordA[sortKey];
        const bVal = recordB[sortKey];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? comparison : -comparison;
      })
    : data;

  const paginatedData = showPagination
    ? sortedData.slice(page * pageSize, (page + 1) * pageSize)
    : sortedData;

  const totalPages = Math.ceil(data.length / pageSize);

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500",
                    col.sortable &&
                      "cursor-pointer select-none hover:text-foreground",
                    col.className,
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="text-zinc-400">
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-border">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-surface-tertiary" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-zinc-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={String(item[keyField])}
                  className={cn(
                    "border-b border-border transition-colors",
                    onRowClick && "cursor-pointer hover:bg-surface-secondary",
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-4 py-3 text-sm", col.className)}
                    >
                      {col.accessor(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm text-zinc-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded-md border border-border px-3 py-1 text-sm transition-colors hover:bg-surface-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-md border border-border px-3 py-1 text-sm transition-colors hover:bg-surface-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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

  const totalPages = Math.ceil(data.length / pageSize);
  const activePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginatedData = showPagination
    ? sortedData.slice(activePage * pageSize, (activePage + 1) * pageSize)
    : sortedData;

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full" aria-busy={isLoading}>
          <caption className="sr-only">
            {isLoading ? "Loading table data" : `${data.length} rows`}
          </caption>
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    col.sortable && sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    col.className,
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="-m-1 flex w-full items-center gap-1 rounded p-1 text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {col.header}
                      <span className="text-subtle">
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
                    </button>
                  ) : (
                    col.header
                  )}
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
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={String(item[keyField])}
                  className="border-b border-border transition-colors hover:bg-surface-secondary/50"
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
          <p className="text-sm text-muted-foreground">
            Page {activePage + 1} of {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage(Math.max(0, activePage - 1))}
              disabled={activePage === 0}
              className="min-h-11 rounded-md border border-border px-3 py-1 text-sm outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages - 1, activePage + 1))}
              disabled={activePage >= totalPages - 1}
              className="min-h-11 rounded-md border border-border px-3 py-1 text-sm outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

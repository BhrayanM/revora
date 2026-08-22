"use client";

import { Search, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useCallback,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";

import { searchWorkspaceLeads } from "@/app/(dashboard)/search-actions";
import { Modal } from "@/components/ui/modal";
import {
  normalizeSearchQuery,
  type LeadSearchResult,
} from "@/lib/product-ux/search";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const router = useRouter();
  const requestSequence = useRef(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LeadSearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) return;

    const normalized = normalizeSearchQuery(query);
    const sequence = ++requestSequence.current;
    const timer = window.setTimeout(() => {
      if (!normalized) {
        setResults([]);
        setError(null);
        setActiveIndex(-1);
        return;
      }
      startTransition(async () => {
        const response = await searchWorkspaceLeads(normalized);
        if (requestSequence.current !== sequence) return;
        setResults(response.results);
        setError(response.error);
        setActiveIndex(response.results.length > 0 ? 0 : -1);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const closeSearch = useCallback(() => {
    requestSequence.current += 1;
    setOpen(false);
    setQuery("");
    setResults([]);
    setError(null);
    setActiveIndex(-1);
  }, []);

  const navigateToResult = (result: LeadSearchResult) => {
    closeSearch();
    router.push(result.href);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const result = results[activeIndex];
      if (result) navigateToResult(result);
    }
  };

  const activeResult =
    activeIndex >= 0 ? `lead-search-${activeIndex}` : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground shadow-sm outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:w-full sm:justify-start sm:px-3"
        aria-label="Search leads"
      >
        <Search className="size-4 shrink-0" />
        <span className="ml-2 hidden text-xs sm:inline">Search leads...</span>
        <kbd className="ml-auto hidden rounded border border-border bg-surface-secondary px-1.5 py-0.5 text-[0.625rem] font-medium sm:inline">
          Ctrl K
        </kbd>
      </button>

      <Modal
        open={open}
        onClose={closeSearch}
        title="Search leads"
        description="Search by name, company, email, or phone."
        size="lg"
        className="mx-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={results.length > 0}
            aria-controls="lead-search-results"
            aria-activedescendant={activeResult}
            placeholder="Type at least 2 characters"
            maxLength={80}
            className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="mt-3 min-h-16" aria-live="polite">
          {isPending && (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Searching...
            </p>
          )}
          {!isPending && error && (
            <p className="px-3 py-4 text-sm text-error">{error}</p>
          )}
          {!isPending &&
            !error &&
            query.length >= 2 &&
            results.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                No matching leads found.
              </p>
            )}
          {!isPending && !error && results.length > 0 && (
            <ul
              id="lead-search-results"
              role="listbox"
              className="max-h-80 space-y-1 overflow-y-auto"
            >
              {results.map((result, index) => (
                <li
                  key={result.id}
                  id={`lead-search-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => navigateToResult(result)}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      activeIndex === index
                        ? "bg-primary/10"
                        : "hover:bg-surface-secondary",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-muted-foreground">
                      <UserRound className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {result.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[result.company, result.email, result.phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs capitalize text-muted-foreground">
                      {result.pipelineStage ?? result.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}

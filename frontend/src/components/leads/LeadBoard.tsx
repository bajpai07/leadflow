"use client";

import { useState } from "react";

import { ErrorNotice } from "@/components/ErrorNotice";
import { LeadList } from "@/components/leads/LeadList";
import { LeadTimelineDialog } from "@/components/leads/LeadTimelineDialog";
import { SearchInput } from "@/components/leads/SearchInput";
import { StatusFilter } from "@/components/leads/StatusFilter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeads } from "@/lib/queries";
import { STATUS_CONFIG } from "@/lib/status";
import { groupLeads } from "@/lib/time";
import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useNow } from "@/lib/useNow";
import { viewState } from "@/lib/viewState";

const SEARCH_DEBOUNCE_MS = 300;

function LeadListSkeleton() {
  return (
    <div
      className="flex flex-col gap-3"
      aria-busy="true"
      aria-label="Loading leads"
    >
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

type EmptyStateProps = {
  status: LeadStatus | undefined;
  query: string;
  onShowAll: () => void;
  onClearFilters: () => void;
};

function EmptyState({
  status,
  query,
  onShowAll,
  onClearFilters,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
      {query ? (
        <>
          <p className="max-w-full break-words [overflow-wrap:anywhere]">
            No leads match &quot;{query}&quot;.
          </p>
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        </>
      ) : status ? (
        <>
          <p>No {STATUS_CONFIG[status].label} leads.</p>
          <Button variant="outline" onClick={onShowAll}>
            Show all
          </Button>
        </>
      ) : (
        <p>No leads yet. Add your first lead.</p>
      )}
    </div>
  );
}

export function LeadBoard() {
  const now = useNow();
  const [status, setStatus] = useState<LeadStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const query = debouncedSearch.trim();
  const { data, error, refetch, isPlaceholderData, isFetching, isPending } =
    useLeads({
      status,
      q: query,
    });
  const state = viewState(data, error, isPending);

  const content = (() => {
    if (state === "error" && error) {
      return <ErrorNotice error={error} onRetry={() => void refetch()} />;
    }
    if (!data || now === null) {
      return <LeadListSkeleton />;
    }
    return (
      <LeadList
        groups={groupLeads(data, now)}
        now={now}
        onSelect={(lead) => setSelectedId(lead.id)}
        emptyState={
          <EmptyState
            status={status}
            query={query}
            onShowAll={() => setStatus(undefined)}
            onClearFilters={() => {
              setSearch("");
              setStatus(undefined);
            }}
          />
        }
      />
    );
  })();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusFilter selected={status} onChange={setStatus} />
        <SearchInput value={search} onChange={setSearch} />
      </div>
      <div
        aria-live="polite"
        aria-busy={isFetching}
        className={cn("transition-opacity", isPlaceholderData && "opacity-60")}
      >
        {content}
      </div>
      {selectedId !== null && now !== null ? (
        <LeadTimelineDialog
          leadId={selectedId}
          now={now}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}

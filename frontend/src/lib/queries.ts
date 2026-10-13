import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchLeads } from "@/lib/api";
import type { LeadStatus } from "@/lib/types";

export const leadKeys = {
  all: ["leads"] as const,
  list: (status: LeadStatus | null) =>
    [...leadKeys.all, "list", { status }] as const,
};

export function useLeads(status?: LeadStatus) {
  return useQuery({
    queryKey: leadKeys.list(status ?? null),
    queryFn: () => fetchLeads(status),
    placeholderData: keepPreviousData,
  });
}

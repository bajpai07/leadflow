import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import {
  createDiscussion,
  createLead,
  fetchDiscussions,
  fetchLead,
  fetchLeads,
  updateLeadStatus,
} from "@/lib/api";
import {
  patchLead,
  patchLeadInList,
  prependDiscussion,
} from "@/lib/cache";
import type {
  Discussion,
  DiscussionCreateInput,
  DiscussionCreateResult,
  Lead,
  LeadFilters,
  LeadStatus,
} from "@/lib/types";

export const leadKeys = {
  all: ["leads"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (filters: LeadFilters) =>
    [
      ...leadKeys.lists(),
      { status: filters.status ?? null, q: filters.q?.trim() ?? "" },
    ] as const,
  detail: (id: number) => [...leadKeys.all, "detail", id] as const,
  discussions: (id: number) =>
    [...leadKeys.detail(id), "discussions"] as const,
};

export type StatusSnapshot = {
  lead: Lead | undefined;
  lists: [QueryKey, Lead[] | undefined][];
};

export function applySavedNote(
  queryClient: QueryClient,
  result: DiscussionCreateResult,
): void {
  const leadId = result.lead.id;
  queryClient.setQueryData<Lead>(leadKeys.detail(leadId), result.lead);
  queryClient.setQueriesData<Lead[]>(
    { queryKey: leadKeys.lists() },
    (list) => patchLeadInList(list, result.lead),
  );
  queryClient.setQueryData<Discussion[]>(
    leadKeys.discussions(leadId),
    (list) => prependDiscussion(list, result.discussion),
  );
}

export function applyStatusPatch(
  queryClient: QueryClient,
  leadId: number,
  status: LeadStatus,
): StatusSnapshot {
  const snapshot: StatusSnapshot = {
    lead: queryClient.getQueryData<Lead>(leadKeys.detail(leadId)),
    lists: queryClient.getQueriesData<Lead[]>({ queryKey: leadKeys.lists() }),
  };
  const patch = { id: leadId, status };
  queryClient.setQueryData<Lead>(leadKeys.detail(leadId), (lead) =>
    patchLead(lead, patch),
  );
  queryClient.setQueriesData<Lead[]>(
    { queryKey: leadKeys.lists() },
    (list) => patchLeadInList(list, patch),
  );
  return snapshot;
}

export function restoreStatusSnapshot(
  queryClient: QueryClient,
  leadId: number,
  snapshot: StatusSnapshot,
): void {
  queryClient.setQueryData<Lead>(leadKeys.detail(leadId), snapshot.lead);
  for (const [key, data] of snapshot.lists) {
    queryClient.setQueryData<Lead[]>(key, data);
  }
}

function findCachedLead(
  queryClient: QueryClient,
  id: number,
): { lead: Lead; updatedAt: number } | undefined {
  const lists = queryClient.getQueriesData<Lead[]>({
    queryKey: leadKeys.lists(),
  });
  for (const [key, data] of lists) {
    const lead = data?.find((candidate) => candidate.id === id);
    if (lead) {
      const updatedAt = queryClient.getQueryState(key)?.dataUpdatedAt ?? 0;
      return { lead, updatedAt };
    }
  }
  return undefined;
}

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: () => fetchLeads(filters),
    placeholderData: keepPreviousData,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() }),
  });
}

export function useLead(id: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: () => fetchLead(id),
    initialData: () => findCachedLead(queryClient, id)?.lead,
    initialDataUpdatedAt: () => findCachedLead(queryClient, id)?.updatedAt,
  });
}

export function useDiscussions(leadId: number) {
  return useQuery({
    queryKey: leadKeys.discussions(leadId),
    queryFn: () => fetchDiscussions(leadId),
  });
}

export function useAddDiscussion(leadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DiscussionCreateInput) =>
      createDiscussion(leadId, input),
    onSuccess: (result) => {
      applySavedNote(queryClient, result);
      void queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

export function useUpdateStatus(leadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: LeadStatus) => updateLeadStatus(leadId, status),
    onMutate: async (status): Promise<StatusSnapshot> => {
      await queryClient.cancelQueries({ queryKey: leadKeys.all });
      return applyStatusPatch(queryClient, leadId, status);
    },
    onError: (_error, _status, snapshot) => {
      if (snapshot) restoreStatusSnapshot(queryClient, leadId, snapshot);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

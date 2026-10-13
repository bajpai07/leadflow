import type { Discussion, Lead } from "@/lib/types";

export type LeadPatch = Pick<Lead, "id"> & Partial<Lead>;

export function patchLead(lead: Lead | undefined, patch: LeadPatch): Lead | undefined {
  if (lead === undefined || lead.id !== patch.id) return lead;
  return { ...lead, ...patch };
}

export function patchLeadInList(
  list: readonly Lead[] | undefined,
  patch: LeadPatch,
): Lead[] | undefined {
  if (list === undefined) return undefined;
  return list.map((lead) => (lead.id === patch.id ? { ...lead, ...patch } : lead));
}

export function prependDiscussion(
  list: readonly Discussion[] | undefined,
  discussion: Discussion,
): Discussion[] | undefined {
  if (list === undefined) return undefined;
  return [discussion, ...list];
}

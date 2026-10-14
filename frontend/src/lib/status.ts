import type { LeadStatus } from "@/lib/types";

export const STATUS_ORDER: readonly LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "won",
  "lost",
];

export const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; badgeClass: string }
> = {
  new: { label: "New", badgeClass: "bg-green-100 text-green-800" },
  contacted: { label: "Contacted", badgeClass: "bg-yellow-100 text-yellow-800" },
  qualified: { label: "Qualified", badgeClass: "bg-blue-100 text-blue-800" },
  proposal_sent: {
    label: "Proposal Sent",
    badgeClass: "bg-purple-100 text-purple-800",
  },
  won: { label: "Won", badgeClass: "bg-gray-200 text-gray-700" },
  lost: { label: "Lost", badgeClass: "bg-red-50 text-red-700" },
};

export function isClosed(status: LeadStatus): boolean {
  return status === "won" || status === "lost";
}

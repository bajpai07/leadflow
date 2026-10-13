import type { LeadStatus } from "@/lib/types";

type StatusConfig = {
  value: LeadStatus;
  label: string;
  badgeClass: string;
};

export const STATUSES: readonly StatusConfig[] = [
  { value: "new", label: "New", badgeClass: "bg-green-100 text-green-800" },
  {
    value: "contacted",
    label: "Contacted",
    badgeClass: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "qualified",
    label: "Qualified",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  {
    value: "proposal_sent",
    label: "Proposal Sent",
    badgeClass: "bg-purple-100 text-purple-800",
  },
  { value: "won", label: "Won", badgeClass: "bg-gray-200 text-gray-600" },
  { value: "lost", label: "Lost", badgeClass: "bg-red-50 text-red-700" },
];

const CLOSED_STATUSES: readonly LeadStatus[] = ["won", "lost"];

export function isClosed(status: LeadStatus): boolean {
  return CLOSED_STATUSES.includes(status);
}

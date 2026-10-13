import { format, isSameDay, parse, parseISO } from "date-fns";

import { isClosed } from "@/lib/status";
import type { Lead } from "@/lib/types";

export type FollowUpGroup = "overdue" | "today" | "rest";

export type GroupedLeads = Record<FollowUpGroup, Lead[]>;

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const FOLLOW_UP_TOLERANCE_MS = MS_PER_MINUTE;

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

export function timeAgo(iso: string, now: Date): string {
  const elapsed = now.getTime() - parseISO(iso).getTime();
  if (elapsed < MS_PER_MINUTE) return "just now";
  if (elapsed < MS_PER_HOUR) {
    return `${Math.floor(elapsed / MS_PER_MINUTE)} min ago`;
  }
  if (elapsed < MS_PER_DAY) {
    return plural(Math.floor(elapsed / MS_PER_HOUR), "hour");
  }
  const days = Math.floor(elapsed / MS_PER_DAY);
  if (days < 7) return plural(days, "day");
  if (days < 30) return plural(Math.floor(days / 7), "week");
  if (days < 365) return plural(Math.floor(days / 30), "month");
  return plural(Math.floor(days / 365), "year");
}

function followUpDate(lead: Lead): Date | null {
  if (isClosed(lead.status) || lead.next_follow_up_at === null) return null;
  return parseISO(lead.next_follow_up_at);
}

export function groupLeads(leads: readonly Lead[], now: Date): GroupedLeads {
  const overdue: { lead: Lead; at: Date }[] = [];
  const today: { lead: Lead; at: Date }[] = [];
  const rest: Lead[] = [];

  for (const lead of leads) {
    const at = followUpDate(lead);
    if (at === null) {
      rest.push(lead);
    } else if (at < now) {
      overdue.push({ lead, at });
    } else if (isSameDay(at, now)) {
      today.push({ lead, at });
    } else {
      rest.push(lead);
    }
  }

  const byFollowUp = (a: { at: Date }, b: { at: Date }) =>
    a.at.getTime() - b.at.getTime();

  return {
    overdue: overdue.sort(byFollowUp).map((entry) => entry.lead),
    today: today.sort(byFollowUp).map((entry) => entry.lead),
    rest,
  };
}

export function formatFollowUpLabel(
  lead: Lead,
  group: FollowUpGroup,
): string | null {
  const at = followUpDate(lead);
  if (at === null) return null;
  const time = format(at, "h:mm a");
  const date = format(at, "MMM d");
  if (group === "today") return `Follow-up today at ${time}`;
  if (group === "overdue") return `Overdue: was due ${date} at ${time}`;
  return `Follow-up ${date} at ${time}`;
}

export function combineLocalDateTime(dateStr: string, timeStr: string): Date {
  return parse(`${dateStr} ${timeStr}`, "yyyy-MM-dd HH:mm", new Date(0));
}

export function formatTimelineStamp(iso: string): string {
  return format(parseISO(iso), "MMM d, h:mm a");
}

export function formatFollowUpChip(iso: string): string {
  return formatTimelineStamp(iso);
}

export function isFollowUpInPast(date: Date, now: Date): boolean {
  return date.getTime() < now.getTime() - FOLLOW_UP_TOLERANCE_MS;
}

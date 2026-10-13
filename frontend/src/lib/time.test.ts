import { describe, expect, it } from "vitest";

import { formatFollowUpLabel, groupLeads, timeAgo } from "@/lib/time";
import type { Lead } from "@/lib/types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const NOW = new Date("2026-10-13T12:00:00Z");

function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

function inFuture(ms: number): string {
  return new Date(NOW.getTime() + ms).toISOString();
}

let nextId = 1;

function makeLead(overrides: Partial<Lead> = {}): Lead {
  const id = nextId++;
  return {
    id,
    name: `Lead ${id}`,
    company: null,
    phone: null,
    status: "new",
    next_follow_up_at: null,
    last_discussion_at: null,
    last_note: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

describe("test environment", () => {
  it("runs in Asia/Kolkata so local-time assertions are deterministic", () => {
    expect(new Date("2026-10-14T05:00:00Z").getHours()).toBe(10);
  });
});

describe("timeAgo", () => {
  it.each([
    ["just now", 30 * 1000, "just now"],
    ["5 minutes", 5 * MINUTE, "5 min ago"],
    ["1 hour", HOUR, "1 hour ago"],
    ["2 hours", 2 * HOUR, "2 hours ago"],
    ["1 day", DAY, "1 day ago"],
    ["6 days", 6 * DAY, "6 days ago"],
    ["7 days", 7 * DAY, "1 week ago"],
    ["21 days", 21 * DAY, "3 weeks ago"],
    ["45 days", 45 * DAY, "1 month ago"],
    ["400 days", 400 * DAY, "1 year ago"],
  ])("formats %s", (_label, elapsed, expected) => {
    expect(timeAgo(ago(elapsed), NOW)).toBe(expected);
  });

  it("treats a future timestamp as just now", () => {
    expect(timeAgo(inFuture(5 * MINUTE), NOW)).toBe("just now");
  });
});

describe("groupLeads", () => {
  it("puts a follow-up from 1 minute ago in overdue", () => {
    const lead = makeLead({ next_follow_up_at: ago(MINUTE) });
    expect(groupLeads([lead], NOW).overdue).toEqual([lead]);
  });

  it("puts a follow-up 1 minute from now in today", () => {
    const lead = makeLead({ next_follow_up_at: inFuture(MINUTE) });
    expect(groupLeads([lead], NOW).today).toEqual([lead]);
  });

  it("puts a follow-up tomorrow in rest", () => {
    const lead = makeLead({ next_follow_up_at: inFuture(DAY) });
    expect(groupLeads([lead], NOW).rest).toEqual([lead]);
  });

  it("puts a lead without a follow-up in rest", () => {
    const lead = makeLead();
    expect(groupLeads([lead], NOW).rest).toEqual([lead]);
  });

  it.each(["won", "lost"] as const)(
    "keeps a %s lead with a past follow-up in rest",
    (status) => {
      const lead = makeLead({ status, next_follow_up_at: ago(DAY) });
      const groups = groupLeads([lead], NOW);
      expect(groups.rest).toEqual([lead]);
      expect(groups.overdue).toEqual([]);
    },
  );

  it("sorts overdue by most overdue first and today by soonest first", () => {
    const recentlyOverdue = makeLead({ next_follow_up_at: ago(HOUR) });
    const longOverdue = makeLead({ next_follow_up_at: ago(3 * DAY) });
    const later = makeLead({ next_follow_up_at: inFuture(3 * HOUR) });
    const sooner = makeLead({ next_follow_up_at: inFuture(MINUTE) });

    const groups = groupLeads(
      [recentlyOverdue, later, longOverdue, sooner],
      NOW,
    );

    expect(groups.overdue).toEqual([longOverdue, recentlyOverdue]);
    expect(groups.today).toEqual([sooner, later]);
  });

  it("keeps backend order in rest and never repeats pinned leads there", () => {
    const first = makeLead();
    const pinned = makeLead({ next_follow_up_at: inFuture(MINUTE) });
    const overdue = makeLead({ next_follow_up_at: ago(MINUTE) });
    const second = makeLead({ next_follow_up_at: inFuture(2 * DAY) });

    const groups = groupLeads([first, pinned, overdue, second], NOW);

    expect(groups.rest).toEqual([first, second]);
    expect(groups.rest).not.toContain(pinned);
    expect(groups.rest).not.toContain(overdue);
  });

  it("uses the local day when the UTC dates differ but the local dates match", () => {
    const now = new Date("2026-10-13T20:00:00Z");
    const lead = makeLead({ next_follow_up_at: "2026-10-14T05:00:00Z" });

    expect(groupLeads([lead], now).today).toEqual([lead]);
  });

  it("uses the local day when the UTC day matches but the local day differs", () => {
    const now = new Date("2026-10-14T01:00:00Z");
    const lead = makeLead({ next_follow_up_at: "2026-10-14T19:00:00Z" });

    const groups = groupLeads([lead], now);

    expect(groups.rest).toEqual([lead]);
    expect(groups.today).toEqual([]);
  });
});

describe("formatFollowUpLabel", () => {
  it("labels a follow-up due today with the time", () => {
    const lead = makeLead({ next_follow_up_at: "2026-10-13T08:30:00Z" });
    expect(formatFollowUpLabel(lead, "today")).toBe(
      "Follow-up today at 2:00 PM",
    );
  });

  it("labels an overdue follow-up with its date and time", () => {
    const lead = makeLead({ next_follow_up_at: "2026-10-12T08:30:00Z" });
    expect(formatFollowUpLabel(lead, "overdue")).toBe(
      "Overdue: was due Oct 12 at 2:00 PM",
    );
  });

  it("labels an upcoming follow-up with its date and time", () => {
    const lead = makeLead({ next_follow_up_at: "2026-10-15T08:30:00Z" });
    expect(formatFollowUpLabel(lead, "rest")).toBe(
      "Follow-up Oct 15 at 2:00 PM",
    );
  });

  it("returns null without a follow-up", () => {
    expect(formatFollowUpLabel(makeLead(), "rest")).toBeNull();
  });

  it.each(["won", "lost"] as const)("returns null for a %s lead", (status) => {
    const lead = makeLead({ status, next_follow_up_at: "2026-10-15T08:30:00Z" });
    expect(formatFollowUpLabel(lead, "rest")).toBeNull();
  });
});

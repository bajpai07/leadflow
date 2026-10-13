import { describe, expect, it } from "vitest";

import { patchLead, patchLeadInList, prependDiscussion } from "@/lib/cache";
import type { Discussion, Lead } from "@/lib/types";

function makeLead(id: number, overrides: Partial<Lead> = {}): Lead {
  return {
    id,
    name: `Lead ${id}`,
    company: null,
    phone: null,
    status: "new",
    next_follow_up_at: null,
    last_discussion_at: null,
    last_note: "Lead created.",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function makeDiscussion(id: number): Discussion {
  return {
    id,
    lead_id: 1,
    note: `Note ${id}`,
    follow_up_at: null,
    created_at: "2026-10-01T00:00:00Z",
  };
}

describe("patchLeadInList", () => {
  it("patches the matching lead and leaves the others untouched", () => {
    const first = makeLead(1);
    const second = makeLead(2);

    const result = patchLeadInList([first, second], {
      id: 2,
      status: "won",
      last_note: "Signed!",
    });

    expect(result).toEqual([first, { ...second, status: "won", last_note: "Signed!" }]);
    expect(result?.[0]).toBe(first);
  });

  it("replaces a lead with a full updated lead", () => {
    const updated = makeLead(1, {
      last_note: "Sent pricing.",
      next_follow_up_at: "2026-10-15T08:30:00Z",
    });

    expect(patchLeadInList([makeLead(1), makeLead(2)], updated)?.[0]).toEqual(
      updated,
    );
  });

  it("is a no-op for an unknown id", () => {
    const list = [makeLead(1), makeLead(2)];
    expect(patchLeadInList(list, { id: 99, status: "won" })).toEqual(list);
  });

  it("does not mutate the input array or its items", () => {
    const list = [makeLead(1)];
    const snapshot = structuredClone(list);

    patchLeadInList(list, { id: 1, status: "lost" });

    expect(list).toEqual(snapshot);
  });

  it("passes through an unloaded cache", () => {
    expect(patchLeadInList(undefined, { id: 1, status: "won" })).toBeUndefined();
  });
});

describe("patchLead", () => {
  it("patches a single lead and ignores a different id", () => {
    const lead = makeLead(1);
    expect(patchLead(lead, { id: 1, status: "won" })).toEqual({
      ...lead,
      status: "won",
    });
    expect(patchLead(lead, { id: 2, status: "won" })).toBe(lead);
    expect(patchLead(undefined, { id: 1, status: "won" })).toBeUndefined();
  });
});

describe("prependDiscussion", () => {
  it("puts the new discussion first without mutating the list", () => {
    const list = [makeDiscussion(1)];

    const result = prependDiscussion(list, makeDiscussion(2));

    expect(result?.map((d) => d.id)).toEqual([2, 1]);
    expect(list).toHaveLength(1);
  });

  it("passes through an unloaded cache", () => {
    expect(prependDiscussion(undefined, makeDiscussion(1))).toBeUndefined();
  });
});

import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";

import {
  applySavedNote,
  applyStatusPatch,
  leadKeys,
  restoreStatusSnapshot,
} from "@/lib/queries";
import type { Discussion, Lead } from "@/lib/types";

function makeLead(id: number, overrides: Partial<Lead> = {}): Lead {
  return {
    id,
    name: `Lead ${id}`,
    company: null,
    phone: null,
    status: "contacted",
    next_follow_up_at: null,
    last_discussion_at: null,
    last_note: "Lead created.",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient();
});

function seedCaches(lead: Lead) {
  const other = makeLead(2, { status: "won" });
  queryClient.setQueryData<Lead[]>(leadKeys.list({}), [lead, other]);
  queryClient.setQueryData<Lead[]>(leadKeys.list({ status: "won" }), [lead, other]);
  queryClient.setQueryData<Lead>(leadKeys.detail(lead.id), lead);
}

describe("query keys", () => {
  it("differ per status and search term", () => {
    const keys = [
      leadKeys.list({}),
      leadKeys.list({ status: "won" }),
      leadKeys.list({ q: "sarah" }),
      leadKeys.list({ status: "won", q: "sarah" }),
    ].map((key) => JSON.stringify(key));

    expect(new Set(keys).size).toBe(4);
  });

  it("treat a blank search like no search", () => {
    expect(leadKeys.list({ q: "  " })).toEqual(leadKeys.list({}));
  });
});

describe("optimistic status patch", () => {
  it("updates the detail cache and every list cache", () => {
    const lead = makeLead(1);
    seedCaches(lead);

    applyStatusPatch(queryClient, 1, "won");

    expect(queryClient.getQueryData<Lead>(leadKeys.detail(1))?.status).toBe("won");
    for (const key of [leadKeys.list({}), leadKeys.list({ status: "won" })]) {
      const list = queryClient.getQueryData<Lead[]>(key);
      expect(list?.find((l) => l.id === 1)?.status).toBe("won");
      expect(list?.find((l) => l.id === 2)?.status).toBe("won");
    }
  });

  it("restores the detail cache and every list cache on rollback", () => {
    const lead = makeLead(1);
    seedCaches(lead);

    const snapshot = applyStatusPatch(queryClient, 1, "lost");
    restoreStatusSnapshot(queryClient, 1, snapshot);

    expect(queryClient.getQueryData<Lead>(leadKeys.detail(1))).toEqual(lead);
    for (const key of [leadKeys.list({}), leadKeys.list({ status: "won" })]) {
      const list = queryClient.getQueryData<Lead[]>(key);
      expect(list?.find((l) => l.id === 1)).toEqual(lead);
    }
  });
});

describe("optimistic status patch with a search cache", () => {
  it("updates and restores the q=sarah list and the unfiltered list", () => {
    const lead = makeLead(1, { name: "Sarah Connor" });
    queryClient.setQueryData<Lead[]>(leadKeys.list({ q: "sarah" }), [lead]);
    queryClient.setQueryData<Lead[]>(leadKeys.list({}), [lead, makeLead(2)]);
    queryClient.setQueryData<Lead>(leadKeys.detail(1), lead);

    const snapshot = applyStatusPatch(queryClient, 1, "won");

    for (const key of [leadKeys.list({ q: "sarah" }), leadKeys.list({})]) {
      const patched = queryClient.getQueryData<Lead[]>(key)?.find((l) => l.id === 1);
      expect(patched?.status).toBe("won");
    }

    restoreStatusSnapshot(queryClient, 1, snapshot);

    for (const key of [leadKeys.list({ q: "sarah" }), leadKeys.list({})]) {
      const restored = queryClient.getQueryData<Lead[]>(key)?.find((l) => l.id === 1);
      expect(restored).toEqual(lead);
    }
  });
});

describe("saved note", () => {
  it("updates the lead everywhere and prepends the discussion", () => {
    const lead = makeLead(1);
    seedCaches(lead);
    const existing: Discussion = {
      id: 1,
      lead_id: 1,
      note: "Lead created.",
      follow_up_at: null,
      created_at: "2026-10-01T00:00:00Z",
    };
    queryClient.setQueryData<Discussion[]>(leadKeys.discussions(1), [existing]);
    const discussion: Discussion = {
      id: 2,
      lead_id: 1,
      note: "Sent pricing.",
      follow_up_at: "2026-10-15T08:30:00Z",
      created_at: "2026-10-13T12:00:00Z",
    };
    const updated = makeLead(1, {
      last_note: "Sent pricing.",
      next_follow_up_at: "2026-10-15T08:30:00Z",
      last_discussion_at: "2026-10-13T12:00:00Z",
    });

    applySavedNote(queryClient, { discussion, lead: updated });

    expect(queryClient.getQueryData<Lead>(leadKeys.detail(1))).toEqual(updated);
    for (const key of [leadKeys.list({}), leadKeys.list({ status: "won" })]) {
      expect(
        queryClient.getQueryData<Lead[]>(key)?.find((l) => l.id === 1),
      ).toEqual(updated);
    }
    expect(
      queryClient
        .getQueryData<Discussion[]>(leadKeys.discussions(1))
        ?.map((d) => d.id),
    ).toEqual([2, 1]);
  });
});

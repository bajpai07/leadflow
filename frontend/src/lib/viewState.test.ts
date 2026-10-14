import { describe, expect, it } from "vitest";

import { viewState } from "@/lib/viewState";

const error = new Error("boom");

describe("viewState", () => {
  it("is loading while the first fetch is pending", () => {
    expect(viewState(undefined, null, true)).toBe("loading");
  });

  it("is error only when there is no data", () => {
    expect(viewState(undefined, error, false)).toBe("error");
  });

  it("is ready when data is present and there is no error", () => {
    expect(viewState([1], null, false)).toBe("ready");
  });

  it("is ready for an empty list without an error", () => {
    expect(viewState([], null, false)).toBe("ready");
  });

  it("is stale when a refetch failed but cached data exists", () => {
    expect(viewState([1], error, false)).toBe("stale");
  });

  it("keeps showing cached data when pending and errored", () => {
    expect(viewState([], error, true)).toBe("stale");
  });
});

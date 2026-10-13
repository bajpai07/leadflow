import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, fetchLeads } from "@/lib/api";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
  }
  throw new Error("Expected an ApiError rejection");
}

describe("fetchLeads", () => {
  it("returns the parsed leads and requests the unfiltered list", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 1 }]));

    const leads = await fetchLeads();

    expect(leads).toEqual([{ id: 1 }]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:8000/leads");
  });

  it("passes the status filter as a query parameter", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await fetchLeads("proposal_sent");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:8000/leads?status=proposal_sent",
    );
  });

  it("trims a trailing slash from the configured base url", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com//");
    vi.resetModules();
    const api = await import("@/lib/api");
    fetchMock.mockResolvedValue(jsonResponse([]));

    await api.fetchLeads();

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.example.com/leads");
  });

  it("builds an ApiError from the backend error shape", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: "Lead not found", code: "lead_not_found" }, 404),
    );

    const error = await rejection(fetchLeads());

    expect(error.status).toBe(404);
    expect(error.code).toBe("lead_not_found");
    expect(error.detail).toBe("Lead not found");
    expect(error.message).toBe("Lead not found");
  });

  it("builds a generic ApiError from a non-JSON error body", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>Bad gateway</html>", { status: 502 }),
    );

    const error = await rejection(fetchLeads());

    expect(error.status).toBe(502);
    expect(error.code).toBe("http_error");
    expect(error.detail).toBe("Request failed with status 502");
  });

  it("builds a network_error ApiError when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await rejection(fetchLeads());

    expect(error.status).toBe(0);
    expect(error.code).toBe("network_error");
    expect(error.detail).toBe("Cannot reach the server");
  });
});

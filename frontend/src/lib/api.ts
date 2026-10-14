import type {
  Discussion,
  DiscussionCreateInput,
  DiscussionCreateResult,
  Lead,
  LeadCreateInput,
  LeadFilters,
  LeadStatus,
} from "@/lib/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;

  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

type RequestInit = { method: "POST" | "PATCH"; body: unknown };

function isErrorBody(body: unknown): body is { detail: string; code: string } {
  return (
    typeof body === "object" &&
    body !== null &&
    "detail" in body &&
    typeof body.detail === "string" &&
    "code" in body &&
    typeof body.code === "string"
  );
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body: unknown = await response.json();
    if (isErrorBody(body)) {
      return new ApiError(response.status, body.code, body.detail);
    }
  } catch {
    // The body was not JSON; fall through to the generic error.
  }
  return new ApiError(
    response.status,
    "http_error",
    `Request failed with status ${response.status}`,
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init ? { "Content-Type": "application/json" } : {}),
      },
      body: init ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network_error", "Cannot reach the server");
  }
  if (!response.ok) {
    throw await toApiError(response);
  }
  return (await response.json()) as T;
}

export function fetchLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  const q = filters.q?.trim();
  if (q) params.set("q", q);
  const query = params.toString();
  return request<Lead[]>(query ? `/leads?${query}` : "/leads");
}

export function createLead(input: LeadCreateInput): Promise<Lead> {
  return request<Lead>("/leads", { method: "POST", body: input });
}

export function fetchLead(id: number): Promise<Lead> {
  return request<Lead>(`/leads/${id}`);
}

export function fetchDiscussions(leadId: number): Promise<Discussion[]> {
  return request<Discussion[]>(`/leads/${leadId}/discussions`);
}

export function createDiscussion(
  leadId: number,
  input: DiscussionCreateInput,
): Promise<DiscussionCreateResult> {
  return request<DiscussionCreateResult>(`/leads/${leadId}/discussions`, {
    method: "POST",
    body: input,
  });
}

export function updateLeadStatus(
  id: number,
  status: LeadStatus,
): Promise<Lead> {
  return request<Lead>(`/leads/${id}`, { method: "PATCH", body: { status } });
}

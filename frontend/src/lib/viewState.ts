export type ViewState = "loading" | "error" | "ready" | "stale";

export function viewState<T>(
  data: T | undefined,
  error: Error | null,
  isPending: boolean,
): ViewState {
  if (data !== undefined) return error ? "stale" : "ready";
  if (error) return "error";
  return isPending ? "loading" : "ready";
}

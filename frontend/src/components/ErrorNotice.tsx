import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";

type ErrorNoticeProps = {
  error: Error;
  onRetry: () => void;
};

export function ErrorNotice({ error, onRetry }: ErrorNoticeProps) {
  const message =
    error instanceof ApiError ? error.detail : "Something went wrong";

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <p>{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str
    code: str


class AppError(Exception):
    status_code: int = 500
    code: str = "app_error"
    detail: str = "Application error"

    def __init__(self, detail: str | None = None) -> None:
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class LeadNotFoundError(AppError):
    status_code = 404
    code = "lead_not_found"
    detail = "Lead not found"


class FollowUpInPastError(AppError):
    status_code = 422
    code = "follow_up_in_past"
    detail = "Follow-up time must not be in the past"


class EmptyUpdateError(AppError):
    status_code = 422
    code = "empty_update"
    detail = "At least one field must be provided"

from datetime import UTC, datetime
from typing import Annotated

from pydantic import AwareDatetime, BaseModel, ConfigDict, StringConstraints, field_validator

from app.schemas.lead import LeadRead

Note = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class DiscussionCreate(BaseModel):
    note: Note
    follow_up_at: AwareDatetime | None = None

    @field_validator("follow_up_at")
    @classmethod
    def normalise_to_utc(cls, value: datetime | None) -> datetime | None:
        return value.astimezone(UTC) if value is not None else None


class DiscussionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    note: str
    follow_up_at: datetime | None
    created_at: datetime


class DiscussionCreateResult(BaseModel):
    discussion: DiscussionRead
    lead: LeadRead

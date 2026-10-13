from datetime import datetime
from typing import Annotated

from pydantic import AwareDatetime, BaseModel, ConfigDict, StringConstraints

from app.schemas.lead import LeadRead

Note = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class DiscussionCreate(BaseModel):
    note: Note
    follow_up_at: AwareDatetime | None = None


class DiscussionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    note: str
    created_at: datetime


class DiscussionCreateResult(BaseModel):
    discussion: DiscussionRead
    lead: LeadRead

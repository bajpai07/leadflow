from datetime import datetime
from typing import Annotated

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    StringConstraints,
    field_validator,
)

from app.models.enums import LeadStatus

LeadName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]


def _blank_to_none(value: object) -> object:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return value


CompanyText = Annotated[str, StringConstraints(max_length=120)]
PhoneText = Annotated[str, StringConstraints(max_length=32)]
OptionalCompany = Annotated[CompanyText | None, BeforeValidator(_blank_to_none)]
OptionalPhone = Annotated[PhoneText | None, BeforeValidator(_blank_to_none)]


class LeadCreate(BaseModel):
    name: LeadName
    company: OptionalCompany = None
    phone: OptionalPhone = None


class LeadUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: LeadName | None = None
    company: OptionalCompany = None
    phone: OptionalPhone = None
    status: LeadStatus | None = None

    @field_validator("name", "status", mode="before")
    @classmethod
    def reject_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("must not be null")
        return value


class LeadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    next_follow_up_at: datetime | None
    last_discussion_at: datetime | None
    last_note: str | None = None
    created_at: datetime
    updated_at: datetime

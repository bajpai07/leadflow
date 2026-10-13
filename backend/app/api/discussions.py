from fastapi import APIRouter

from app.core.database import DbSession
from app.core.errors import ErrorResponse
from app.schemas.discussion import DiscussionCreate, DiscussionCreateResult, DiscussionRead
from app.services import discussions as discussion_service

router = APIRouter(prefix="/leads/{lead_id}/discussions", tags=["discussions"])

NOT_FOUND = {404: {"model": ErrorResponse, "description": "Lead not found"}}


@router.get(
    "",
    response_model=list[DiscussionRead],
    responses=NOT_FOUND,
    summary="List a lead's discussions, newest first",
)
def list_discussions(lead_id: int, db: DbSession) -> list[DiscussionRead]:
    return discussion_service.list_discussions(db, lead_id)


@router.post(
    "",
    response_model=DiscussionCreateResult,
    status_code=201,
    responses=NOT_FOUND,
    summary="Log a discussion and optionally set the next follow-up",
)
def add_discussion(lead_id: int, data: DiscussionCreate, db: DbSession) -> DiscussionCreateResult:
    return discussion_service.add_discussion(db, lead_id, data)

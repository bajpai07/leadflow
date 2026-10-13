from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.database import transaction
from app.core.errors import FollowUpInPastError, LeadNotFoundError
from app.models import Discussion, Lead
from app.schemas.discussion import DiscussionCreate, DiscussionCreateResult, DiscussionRead
from app.services.leads import get_lead

FOLLOW_UP_CLOCK_SKEW = timedelta(seconds=60)


def list_discussions(db: Session, lead_id: int) -> list[DiscussionRead]:
    if db.get(Lead, lead_id) is None:
        raise LeadNotFoundError()
    statement = (
        select(Discussion)
        .where(Discussion.lead_id == lead_id)
        .order_by(Discussion.created_at.desc(), Discussion.id.desc())
    )
    return [DiscussionRead.model_validate(row) for row in db.scalars(statement)]


def add_discussion(db: Session, lead_id: int, data: DiscussionCreate) -> DiscussionCreateResult:
    now = clock.utcnow()
    lead = db.scalar(select(Lead).where(Lead.id == lead_id).with_for_update())
    if lead is None:
        raise LeadNotFoundError()
    if data.follow_up_at is not None and data.follow_up_at < now - FOLLOW_UP_CLOCK_SKEW:
        raise FollowUpInPastError()

    with transaction(db):
        discussion = Discussion(lead_id=lead.id, note=data.note, created_at=now)
        db.add(discussion)
        db.flush()
        lead.last_discussion_at = now
        lead.next_follow_up_at = data.follow_up_at

    return DiscussionCreateResult(
        discussion=DiscussionRead.model_validate(discussion),
        lead=get_lead(db, lead_id),
    )

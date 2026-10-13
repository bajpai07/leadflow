from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.database import transaction
from app.core.errors import EmptyUpdateError, LeadNotFoundError
from app.models import Discussion, Lead, LeadStatus
from app.schemas.lead import LeadCreate, LeadRead, LeadUpdate

LEAD_CREATED_NOTE = "Lead created."


def select_leads_with_last_note() -> Select[tuple[Lead, str | None]]:
    last_note = (
        select(Discussion.note)
        .where(Discussion.lead_id == Lead.id)
        .order_by(Discussion.created_at.desc(), Discussion.id.desc())
        .limit(1)
        .correlate(Lead)
        .scalar_subquery()
    )
    return select(Lead, last_note.label("last_note"))


def to_lead_read(lead: Lead, last_note: str | None) -> LeadRead:
    return LeadRead.model_validate(lead).model_copy(update={"last_note": last_note})


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def list_leads(db: Session, status: LeadStatus | None, q: str | None) -> list[LeadRead]:
    statement = select_leads_with_last_note()
    if status is not None:
        statement = statement.where(Lead.status == status)
    term = q.strip() if q else ""
    if term:
        statement = statement.where(Lead.name.ilike(f"%{_escape_like(term)}%", escape="\\"))
    statement = statement.order_by(
        Lead.last_discussion_at.desc().nulls_last(),
        Lead.created_at.desc(),
        Lead.id.desc(),
    )
    return [to_lead_read(lead, last_note) for lead, last_note in db.execute(statement).all()]


def get_lead(db: Session, lead_id: int) -> LeadRead:
    row = db.execute(select_leads_with_last_note().where(Lead.id == lead_id)).one_or_none()
    if row is None:
        raise LeadNotFoundError()
    return to_lead_read(row[0], row[1])


def create_lead(db: Session, data: LeadCreate) -> LeadRead:
    now = clock.utcnow()
    lead = Lead(
        name=data.name,
        company=data.company,
        phone=data.phone,
        created_at=now,
        updated_at=now,
        last_discussion_at=now,
        discussions=[Discussion(note=LEAD_CREATED_NOTE, created_at=now)],
    )
    with transaction(db):
        db.add(lead)
    return get_lead(db, lead.id)


def update_lead(db: Session, lead_id: int, data: LeadUpdate) -> LeadRead:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise LeadNotFoundError()
    changes = data.model_dump(exclude_unset=True)
    if not changes:
        raise EmptyUpdateError()
    with transaction(db):
        for field, value in changes.items():
            setattr(lead, field, value)
    return get_lead(db, lead_id)

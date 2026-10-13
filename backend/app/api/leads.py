from fastapi import APIRouter

from app.core.database import DbSession
from app.core.errors import ErrorResponse
from app.models import LeadStatus
from app.schemas.lead import LeadCreate, LeadRead, LeadUpdate
from app.services import leads as lead_service

router = APIRouter(prefix="/leads", tags=["leads"])

NOT_FOUND = {404: {"model": ErrorResponse, "description": "Lead not found"}}


@router.get("", response_model=list[LeadRead], summary="List leads")
def list_leads(
    db: DbSession, status: LeadStatus | None = None, q: str | None = None
) -> list[LeadRead]:
    return lead_service.list_leads(db, status, q)


@router.post("", response_model=LeadRead, status_code=201, summary="Create a lead")
def create_lead(data: LeadCreate, db: DbSession) -> LeadRead:
    return lead_service.create_lead(db, data)


@router.get("/{lead_id}", response_model=LeadRead, responses=NOT_FOUND, summary="Get a lead")
def get_lead(lead_id: int, db: DbSession) -> LeadRead:
    return lead_service.get_lead(db, lead_id)


@router.patch(
    "/{lead_id}",
    response_model=LeadRead,
    responses=NOT_FOUND,
    summary="Update a lead's name, company, phone or status",
)
def update_lead(lead_id: int, data: LeadUpdate, db: DbSession) -> LeadRead:
    return lead_service.update_lead(db, lead_id, data)

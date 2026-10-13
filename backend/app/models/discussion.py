from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import clock
from app.core.database import Base
from app.models.lead import Lead
from app.models.types import UTCDateTime


class Discussion(Base):
    __tablename__ = "discussions"
    # The DB check is a last-resort net; Pydantic does the real validation in Phase 2.
    __table_args__ = (CheckConstraint("length(trim(note)) > 0", name="note_not_blank"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"))
    note: Mapped[str] = mapped_column(Text)
    follow_up_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=lambda: clock.utcnow(), server_default=func.now()
    )

    lead: Mapped[Lead] = relationship(back_populates="discussions")


Index(
    "ix_discussions_lead_id_created_at",
    Discussion.lead_id,
    Discussion.created_at.desc(),
)

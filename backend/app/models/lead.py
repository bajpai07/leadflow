from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Enum, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import clock
from app.core.database import Base
from app.models.enums import LeadStatus
from app.models.types import UTCDateTime

if TYPE_CHECKING:
    from app.models.discussion import Discussion


class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        Index("ix_leads_status", "status"),
        Index("ix_leads_next_follow_up_at", "next_follow_up_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    company: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[LeadStatus] = mapped_column(
        Enum(
            LeadStatus,
            name="lead_status",
            native_enum=False,
            create_constraint=True,
            length=20,
            values_callable=lambda enum: [member.value for member in enum],
        ),
        default=LeadStatus.NEW,
        server_default=LeadStatus.NEW.value,
    )
    next_follow_up_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    last_discussion_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=lambda: clock.utcnow(), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        default=lambda: clock.utcnow(),
        onupdate=lambda: clock.utcnow(),
        server_default=func.now(),
    )

    discussions: Mapped[list[Discussion]] = relationship(
        back_populates="lead",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Discussion.created_at.desc(), Discussion.id.desc()",
    )

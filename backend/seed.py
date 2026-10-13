import argparse
import sys
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core import clock
from app.core.database import SessionLocal, transaction
from app.models import Discussion, Lead, LeadStatus

LEAD_CREATED_NOTE = "Lead created."
CLOSED_STATUSES = {LeadStatus.WON, LeadStatus.LOST}


@dataclass(frozen=True)
class SeedNote:
    note: str
    at: datetime
    follow_up_at: datetime | None = None


@dataclass(frozen=True)
class SeedLead:
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    created_at: datetime
    notes: list[SeedNote] = field(default_factory=list)
    next_follow_up_at: datetime | None = None


class SeedInvariantError(RuntimeError):
    pass


def build_seed_leads(now: datetime) -> list[SeedLead]:
    today_follow_up = now + timedelta(minutes=45)
    return [
        SeedLead(
            name="Sarah Connor",
            company="Acme Corp",
            phone="555-0199",
            status=LeadStatus.PROPOSAL_SENT,
            created_at=now - timedelta(days=6),
            notes=[
                SeedNote(
                    "Initial discovery call. They need a CRM for 50 reps. Pain points include "
                    "dropping leads and no follow-up tracking.",
                    now - timedelta(days=5),
                ),
                SeedNote(
                    "Sent pricing tier PDF. Said she would review with her boss.",
                    now - timedelta(days=2),
                    follow_up_at=today_follow_up,
                ),
            ],
            next_follow_up_at=today_follow_up,
        ),
        SeedLead(
            name="Hank Scorpio",
            company="Globex",
            phone="555-0142",
            status=LeadStatus.NEW,
            created_at=now - timedelta(hours=2),
            notes=[SeedNote("Inbound lead from website contact form.", now - timedelta(hours=2))],
        ),
        SeedLead(
            name="Bill Lumbergh",
            company="Initech",
            phone="555-0177",
            status=LeadStatus.CONTACTED,
            created_at=now - timedelta(days=10),
            notes=[SeedNote("Left a voicemail with his assistant.", now - timedelta(weeks=1))],
        ),
        SeedLead(
            name="Bruce Wayne",
            company="Wayne Ent",
            phone="555-0100",
            status=LeadStatus.WON,
            created_at=now - timedelta(weeks=5),
            notes=[SeedNote("Contract signed! Sending welcome package.", now - timedelta(weeks=3))],
        ),
        SeedLead(
            name="Tony Stark",
            company="Stark Industries",
            phone="555-0111",
            status=LeadStatus.QUALIFIED,
            created_at=now - timedelta(days=8),
            notes=[
                SeedNote(
                    "Great technical call. Wants a security review before moving forward.",
                    now - timedelta(days=3),
                    follow_up_at=now - timedelta(days=1),
                )
            ],
            next_follow_up_at=now - timedelta(days=1),
        ),
        SeedLead(
            name="Dwight Schrute",
            company="Dunder Mifflin",
            phone="555-0123",
            status=LeadStatus.CONTACTED,
            created_at=now - timedelta(days=4),
            notes=[
                SeedNote(
                    "Asked for a bulk discount on 200 seats.",
                    now - timedelta(days=1),
                    follow_up_at=now + timedelta(days=1),
                )
            ],
            next_follow_up_at=now + timedelta(days=1),
        ),
        SeedLead(
            name="Michael Scott",
            company="Michael Scott Paper Co",
            phone=None,
            status=LeadStatus.LOST,
            created_at=now - timedelta(weeks=6),
            notes=[
                SeedNote(
                    "Went with a competitor on price.",
                    now - timedelta(weeks=4),
                    follow_up_at=now - timedelta(weeks=3),
                )
            ],
            next_follow_up_at=now - timedelta(weeks=3),
        ),
        SeedLead(
            name="Pam Beesly",
            company=None,
            phone="555-0188",
            status=LeadStatus.NEW,
            created_at=now - timedelta(minutes=20),
        ),
    ]


def _to_lead(seed_lead: SeedLead) -> Lead:
    timeline = [SeedNote(LEAD_CREATED_NOTE, seed_lead.created_at), *seed_lead.notes]
    newest = max(note.at for note in timeline)
    return Lead(
        name=seed_lead.name,
        company=seed_lead.company,
        phone=seed_lead.phone,
        status=seed_lead.status,
        next_follow_up_at=seed_lead.next_follow_up_at,
        last_discussion_at=newest,
        created_at=seed_lead.created_at,
        updated_at=newest,
        discussions=[
            Discussion(note=note.note, follow_up_at=note.follow_up_at, created_at=note.at)
            for note in timeline
        ],
    )


def _verify_last_discussion_invariant(session: Session, leads: Sequence[Lead]) -> None:
    newest_by_lead = dict(
        session.execute(
            select(Discussion.lead_id, func.max(Discussion.created_at)).group_by(Discussion.lead_id)
        ).all()
    )
    mismatched = [
        lead.name for lead in leads if lead.last_discussion_at != newest_by_lead.get(lead.id)
    ]
    if mismatched:
        raise SeedInvariantError(f"last_discussion_at is out of sync for: {', '.join(mismatched)}")


def seed(session: Session, now: datetime) -> list[Lead]:
    leads = [_to_lead(seed_lead) for seed_lead in build_seed_leads(now)]
    session.add_all(leads)
    session.flush()
    _verify_last_discussion_invariant(session, leads)
    return leads


def _follow_up_group(lead: Lead, now: datetime) -> str | None:
    follow_up = lead.next_follow_up_at
    if follow_up is None or lead.status in CLOSED_STATUSES:
        return None
    if follow_up < now:
        return "overdue"
    end_of_today = datetime.combine(now.date(), time.max, tzinfo=now.tzinfo)
    return "today" if follow_up <= end_of_today else "upcoming"


def _print_summary(leads: Sequence[Lead], now: datetime) -> None:
    print(f"{'Name':<18}{'Status':<15}{'Notes':>5}  Next follow-up")
    for lead in leads:
        follow_up = (
            lead.next_follow_up_at.isoformat(timespec="minutes") if lead.next_follow_up_at else "-"
        )
        print(f"{lead.name:<18}{lead.status.value:<15}{len(lead.discussions):>5}  {follow_up}")
    groups = [_follow_up_group(lead, now) for lead in leads]
    print(
        f"\nUTC reference: {groups.count('today')} today, "
        f"{groups.count('overdue')} overdue, {groups.count('upcoming')} upcoming."
    )
    print("The frontend groups follow-ups in the browser's timezone.")


def run(session: Session, now: datetime, reset: bool = False) -> int:
    existing = session.scalar(select(func.count()).select_from(Lead)) or 0
    if existing and not reset:
        print(f"Database already has {existing} leads, skipping. Use --reset to reseed.")
        return 0
    with transaction(session):
        if reset:
            session.execute(delete(Lead))
        leads = seed(session, now)
    _print_summary(leads, now)
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed the LeadFlow database with demo leads.")
    parser.add_argument("--reset", action="store_true", help="delete all leads, then reseed")
    args = parser.parse_args(argv)
    try:
        with SessionLocal() as session:
            return run(session, clock.utcnow(), reset=args.reset)
    except OperationalError:
        print("Database is not ready. Run `alembic upgrade head` first.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

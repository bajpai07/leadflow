from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

import seed
from app.core import clock
from app.core.database import create_db_engine
from app.models import Discussion, Lead, LeadStatus
from tests.conftest import FrozenClock

NOW = datetime(2026, 5, 4, 12, 0, tzinfo=UTC)

EXPECTED_NOTE_COUNTS = {
    "Sarah Connor": 3,
    "Hank Scorpio": 2,
    "Bill Lumbergh": 2,
    "Bruce Wayne": 2,
    "Tony Stark": 2,
    "Dwight Schrute": 2,
    "Michael Scott": 2,
    "Pam Beesly": 1,
}


def lead_count(session: Session) -> int:
    return session.scalar(select(func.count()).select_from(Lead)) or 0


@pytest.fixture
def seeded(session: Session, frozen_clock: FrozenClock) -> Session:
    frozen_clock.now = NOW
    assert seed.run(session, clock.utcnow()) == 0
    session.expire_all()
    return session


def test_seeding_creates_expected_leads_and_discussion_counts(seeded: Session) -> None:
    counts = {lead.name: len(lead.discussions) for lead in seeded.scalars(select(Lead)).all()}

    assert counts == EXPECTED_NOTE_COUNTS


def test_every_lead_has_system_note_and_synced_last_discussion(seeded: Session) -> None:
    for lead in seeded.scalars(select(Lead)).all():
        newest = lead.discussions[0]
        oldest = lead.discussions[-1]

        assert lead.last_discussion_at == newest.created_at
        assert oldest.note == "Lead created."
        assert oldest.created_at == lead.created_at


def test_running_twice_does_not_duplicate(
    session: Session, capsys: pytest.CaptureFixture[str]
) -> None:
    seed.run(session, NOW)
    capsys.readouterr()

    exit_code = seed.run(session, NOW)

    assert exit_code == 0
    assert (
        "Database already has 8 leads, skipping. Use --reset to reseed." in capsys.readouterr().out
    )
    assert lead_count(session) == 8
    assert session.scalar(select(func.count()).select_from(Discussion)) == 16


def test_reset_replaces_data(session: Session) -> None:
    seed.run(session, NOW)
    later = NOW + timedelta(hours=1)

    assert seed.run(session, later, reset=True) == 0
    session.expire_all()

    sarah = session.scalars(select(Lead).where(Lead.name == "Sarah Connor")).one()
    assert lead_count(session) == 8
    assert session.scalar(select(func.count()).select_from(Discussion)) == 16
    assert sarah.created_at == later - timedelta(days=6)


def test_seeded_data_through_the_api(client: TestClient, session: Session) -> None:
    seed.run(session, NOW)

    leads = client.get("/leads").json()
    won = client.get("/leads", params={"status": "won"}).json()
    searched = client.get("/leads", params={"q": "sarah"}).json()
    sarah = searched[0]
    discussions = client.get(f"/leads/{sarah['id']}/discussions").json()
    hank = next(lead for lead in leads if lead["name"] == "Hank Scorpio")
    hank_discussions = client.get(f"/leads/{hank['id']}/discussions").json()

    assert len(leads) == 8
    assert [lead["name"] for lead in won] == ["Bruce Wayne"]
    assert [lead["name"] for lead in searched] == ["Sarah Connor"]
    assert len(discussions) == 3
    assert discussions[0]["follow_up_at"] is not None
    assert discussions[-1]["note"] == "Lead created."
    assert discussions[-1]["follow_up_at"] is None
    assert (
        hank["last_note"]
        == hank_discussions[0]["note"]
        == "Inbound lead from website contact form."
    )


def test_follow_up_demo_groups_with_frozen_clock(seeded: Session) -> None:
    leads = list(seeded.scalars(select(Lead)).all())
    open_leads = [
        lead
        for lead in leads
        if lead.status not in {LeadStatus.WON, LeadStatus.LOST}
        and lead.next_follow_up_at is not None
    ]
    next_midnight = datetime(2026, 5, 5, tzinfo=UTC)
    today = [lead for lead in open_leads if NOW < lead.next_follow_up_at < next_midnight]
    overdue = [lead for lead in open_leads if lead.next_follow_up_at < NOW]
    lost = next(lead for lead in leads if lead.status is LeadStatus.LOST)

    assert [lead.name for lead in today] == ["Sarah Connor"]
    assert [lead.name for lead in overdue] == ["Tony Stark"]
    assert lost.next_follow_up_at is not None
    assert lost.next_follow_up_at < NOW


def test_main_is_importable_and_reports_unprepared_database(
    capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    engine = create_db_engine(f"sqlite:///{tmp_path / 'empty.db'}")
    monkeypatch.setattr(seed, "SessionLocal", sessionmaker(bind=engine))

    exit_code = seed.main([])
    engine.dispose()

    assert exit_code == 1
    assert "alembic upgrade head" in capsys.readouterr().err

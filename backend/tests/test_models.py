import time
from datetime import UTC, datetime, timedelta, timezone

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError, StatementError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import create_db_engine
from app.models import Discussion, Lead, LeadStatus


def test_new_lead_defaults_to_new_with_aware_timestamps(session: Session) -> None:
    lead = Lead(name="Sarah Connor")
    session.add(lead)
    session.commit()
    session.refresh(lead)

    assert lead.status is LeadStatus.NEW
    assert lead.created_at.utcoffset() == timedelta(0)
    assert lead.updated_at.utcoffset() == timedelta(0)


def test_utc_datetime_round_trips_aware_values(session: Session) -> None:
    follow_up = datetime(2026, 5, 6, 14, 0, 0, 123456, tzinfo=UTC)
    lead = Lead(name="Hank Scorpio", next_follow_up_at=follow_up)
    session.add(lead)
    session.commit()
    session.expire_all()

    stored = session.get(Lead, lead.id)
    assert stored is not None
    assert stored.next_follow_up_at == follow_up
    assert stored.next_follow_up_at.tzinfo is not None


def test_utc_datetime_normalises_other_offsets_to_utc(session: Session) -> None:
    ist = timezone(timedelta(hours=5, minutes=30))
    lead = Lead(name="Bill Lumbergh", next_follow_up_at=datetime(2026, 5, 6, 19, 30, tzinfo=ist))
    session.add(lead)
    session.commit()
    session.expire_all()

    stored = session.get(Lead, lead.id)
    assert stored is not None
    assert stored.next_follow_up_at == datetime(2026, 5, 6, 14, 0, tzinfo=UTC)
    assert stored.next_follow_up_at.utcoffset() == timedelta(0)


def test_utc_datetime_rejects_naive_datetime(session: Session) -> None:
    session.add(Lead(name="Bruce Wayne", next_follow_up_at=datetime(2026, 5, 6, 14, 0)))

    with pytest.raises(StatementError) as exc_info:
        session.commit()

    assert isinstance(exc_info.value.orig, ValueError)


def test_invalid_status_is_rejected_by_database(session: Session) -> None:
    lead = Lead(name="Sarah Connor")
    session.add(lead)
    session.commit()

    with pytest.raises(IntegrityError):
        session.execute(
            text("UPDATE leads SET status = 'archived' WHERE id = :id"), {"id": lead.id}
        )


def test_blank_note_is_rejected_by_database(session: Session) -> None:
    lead = Lead(name="Sarah Connor")
    session.add(lead)
    session.commit()

    session.add(Discussion(lead_id=lead.id, note="   "))
    with pytest.raises(IntegrityError):
        session.commit()


def test_deleting_lead_cascades_to_discussions(session: Session) -> None:
    lead = Lead(name="Sarah Connor", discussions=[Discussion(note="Lead created.")])
    session.add(lead)
    session.commit()
    lead_id = lead.id

    session.execute(text("DELETE FROM leads WHERE id = :id"), {"id": lead_id})
    session.commit()

    remaining = session.scalars(select(Discussion).where(Discussion.lead_id == lead_id)).all()
    assert remaining == []


def test_updated_at_changes_after_update(session: Session) -> None:
    lead = Lead(name="Sarah Connor")
    session.add(lead)
    session.commit()
    before = lead.updated_at

    time.sleep(0.01)
    lead.status = LeadStatus.CONTACTED
    session.commit()
    session.refresh(lead)

    assert lead.updated_at > before


def test_discussions_are_ordered_newest_first(session: Session) -> None:
    moment = datetime(2026, 5, 4, 10, 30, tzinfo=UTC)
    lead = Lead(
        name="Sarah Connor",
        discussions=[
            Discussion(note="first", created_at=moment),
            Discussion(note="second", created_at=moment + timedelta(microseconds=1)),
            Discussion(note="third", created_at=moment + timedelta(microseconds=1)),
        ],
    )
    session.add(lead)
    session.commit()
    session.expire_all()

    stored = session.get(Lead, lead.id)
    assert stored is not None
    assert [discussion.note for discussion in stored.discussions] == ["third", "second", "first"]


def test_schema_has_expected_indexes(engine: Engine) -> None:
    inspector = inspect(engine)

    lead_indexes = {index["name"] for index in inspector.get_indexes("leads")}
    discussion_indexes = {index["name"] for index in inspector.get_indexes("discussions")}

    assert {"ix_leads_status", "ix_leads_next_follow_up_at"} <= lead_indexes
    assert "ix_discussions_lead_id_created_at" in discussion_indexes


def test_migration_upgrade_downgrade_upgrade(alembic_config: Config) -> None:
    command.upgrade(alembic_config, "head")
    command.downgrade(alembic_config, "base")
    command.upgrade(alembic_config, "head")


def test_migration_0002_adds_and_removes_discussion_follow_up_at(
    alembic_config: Config,
) -> None:
    engine = create_db_engine(get_settings().database_url)
    try:
        command.upgrade(alembic_config, "head")
        columns = {c["name"] for c in inspect(engine).get_columns("discussions")}
        assert "follow_up_at" in columns

        command.downgrade(alembic_config, "0001")
        columns = {c["name"] for c in inspect(engine).get_columns("discussions")}
        assert "follow_up_at" not in columns
    finally:
        engine.dispose()


def test_downgrade_to_0001_keeps_discussion_constraints_and_index(
    alembic_config: Config,
) -> None:
    command.upgrade(alembic_config, "head")
    command.downgrade(alembic_config, "0001")
    engine = create_db_engine(get_settings().database_url)
    try:
        inspector = inspect(engine)
        check_names = {c["name"] for c in inspector.get_check_constraints("discussions")}
        foreign_keys = inspector.get_foreign_keys("discussions")
        with engine.connect() as connection:
            index_sql = connection.execute(
                text("SELECT sql FROM sqlite_master WHERE name = :name"),
                {"name": "ix_discussions_lead_id_created_at"},
            ).scalar_one()

        assert "ck_discussions_note_not_blank" in check_names
        assert [fk["options"].get("ondelete") for fk in foreign_keys] == ["CASCADE"]
        assert "lead_id, created_at DESC" in index_sql

        with engine.begin() as connection:
            connection.execute(text("INSERT INTO leads (name) VALUES ('Sarah Connor')"))
            connection.execute(
                text("INSERT INTO discussions (lead_id, note) VALUES (1, 'Lead created.')")
            )
            connection.execute(text("DELETE FROM leads WHERE id = 1"))
            remaining = connection.execute(text("SELECT COUNT(*) FROM discussions")).scalar_one()
        assert remaining == 0
    finally:
        engine.dispose()

    command.upgrade(alembic_config, "head")

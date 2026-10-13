from collections.abc import Callable, Iterator
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.models import Discussion, Lead
from tests.conftest import FrozenClock

CreateLead = Callable[..., dict[str, Any]]
AddNote = Callable[..., dict[str, Any]]


def iso(moment: datetime) -> str:
    return moment.isoformat()


def parse(value: str) -> datetime:
    return datetime.fromisoformat(value)


def test_discussions_are_listed_newest_first_with_id_tiebreak(
    client: TestClient, create_lead: CreateLead, add_note: AddNote, frozen_clock: FrozenClock
) -> None:
    lead = create_lead()
    frozen_clock.advance(hours=1)
    add_note(lead["id"], "same instant, first")
    add_note(lead["id"], "same instant, second")

    notes = [d["note"] for d in client.get(f"/leads/{lead['id']}/discussions").json()]

    assert notes == ["same instant, second", "same instant, first", "Lead created."]


def test_list_last_note_matches_first_listed_discussion_for_same_instant_notes(
    client: TestClient, create_lead: CreateLead, add_note: AddNote, frozen_clock: FrozenClock
) -> None:
    lead = create_lead()
    frozen_clock.advance(hours=1)
    add_note(lead["id"], "tie A")
    add_note(lead["id"], "tie B")

    [listed] = client.get("/leads").json()
    first_discussion = client.get(f"/leads/{lead['id']}/discussions").json()[0]

    assert listed["last_note"] == first_discussion["note"] == "tie B"


def test_add_note_with_follow_up_updates_lead_and_returns_it(
    client: TestClient, create_lead: CreateLead, frozen_clock: FrozenClock
) -> None:
    lead = create_lead()
    frozen_clock.advance(hours=1)
    follow_up = frozen_clock.now + timedelta(days=2)

    response = client.post(
        f"/leads/{lead['id']}/discussions",
        json={"note": "  Sent pricing.  ", "follow_up_at": iso(follow_up)},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["discussion"]["note"] == "Sent pricing."
    assert body["discussion"]["lead_id"] == lead["id"]
    assert parse(body["lead"]["next_follow_up_at"]) == follow_up
    assert body["lead"]["last_discussion_at"] == body["discussion"]["created_at"]
    assert body["lead"]["last_note"] == "Sent pricing."
    assert client.get(f"/leads/{lead['id']}").json() == body["lead"]


def test_add_note_without_follow_up_clears_existing_follow_up(
    client: TestClient, create_lead: CreateLead, add_note: AddNote, frozen_clock: FrozenClock
) -> None:
    lead = create_lead()
    add_note(lead["id"], "Set reminder.", follow_up_at=iso(frozen_clock.now + timedelta(days=1)))

    result = add_note(lead["id"], "Handled it.")

    assert result["lead"]["next_follow_up_at"] is None
    assert client.get(f"/leads/{lead['id']}").json()["next_follow_up_at"] is None


def test_follow_up_in_the_past_is_rejected_and_nothing_is_written(
    client: TestClient, create_lead: CreateLead, frozen_clock: FrozenClock
) -> None:
    lead = create_lead()
    before = client.get(f"/leads/{lead['id']}").json()

    response = client.post(
        f"/leads/{lead['id']}/discussions",
        json={"note": "Too late.", "follow_up_at": iso(frozen_clock.now - timedelta(hours=1))},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "follow_up_in_past"
    assert client.get(f"/leads/{lead['id']}").json() == before
    assert len(client.get(f"/leads/{lead['id']}/discussions").json()) == 1


@pytest.mark.parametrize(
    ("seconds_ago", "expected_status"), [(30, 201), (60, 201), (61, 422)], ids=str
)
def test_follow_up_clock_skew_tolerance(
    client: TestClient,
    create_lead: CreateLead,
    frozen_clock: FrozenClock,
    seconds_ago: int,
    expected_status: int,
) -> None:
    lead = create_lead()
    follow_up = frozen_clock.now - timedelta(seconds=seconds_ago)

    response = client.post(
        f"/leads/{lead['id']}/discussions",
        json={"note": "Edge.", "follow_up_at": iso(follow_up)},
    )

    assert response.status_code == expected_status


def test_naive_follow_up_is_rejected(
    client: TestClient, create_lead: CreateLead, frozen_clock: FrozenClock
) -> None:
    lead = create_lead()
    naive = (frozen_clock.now + timedelta(days=1)).replace(tzinfo=None)

    response = client.post(
        f"/leads/{lead['id']}/discussions",
        json={"note": "No zone.", "follow_up_at": naive.isoformat()},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_follow_up_with_offset_is_returned_in_utc(
    create_lead: CreateLead, add_note: AddNote, frozen_clock: FrozenClock
) -> None:
    lead = create_lead()
    ist = timezone(timedelta(hours=5, minutes=30))
    follow_up = datetime(2026, 5, 6, 19, 30, tzinfo=ist)

    result = add_note(lead["id"], "Offset.", follow_up_at=iso(follow_up))

    assert result["lead"]["next_follow_up_at"] == "2026-05-06T14:00:00Z"


@pytest.mark.parametrize("note", ["", "   ", "\n\t", " \n\t "], ids=repr)
def test_blank_note_is_rejected(client: TestClient, create_lead: CreateLead, note: str) -> None:
    lead = create_lead()

    response = client.post(f"/leads/{lead['id']}/discussions", json={"note": note})

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_discussions_of_unknown_lead_return_404(client: TestClient) -> None:
    listing = client.get("/leads/999/discussions")
    creation = client.post("/leads/999/discussions", json={"note": "Hello"})

    assert listing.status_code == creation.status_code == 404
    assert listing.json()["code"] == creation.json()["code"] == "lead_not_found"


def test_note_can_be_added_to_won_lead(
    client: TestClient, create_lead: CreateLead, add_note: AddNote
) -> None:
    lead = create_lead()
    client.patch(f"/leads/{lead['id']}", json={"status": "won"})

    result = add_note(lead["id"], "Welcome package sent.")

    assert result["lead"]["status"] == "won"
    assert result["lead"]["last_note"] == "Welcome package sent."


def snapshot(engine: Engine, lead_id: int) -> tuple[int, datetime | None, datetime | None]:
    with sessionmaker(bind=engine)() as fresh:
        lead = fresh.get(Lead, lead_id)
        assert lead is not None
        count = fresh.scalar(
            select(func.count()).select_from(Discussion).where(Discussion.lead_id == lead_id)
        )
        assert count is not None
        return count, lead.last_discussion_at, lead.next_follow_up_at


@pytest.fixture
def lead_with_follow_up(
    create_lead: CreateLead, add_note: AddNote, frozen_clock: FrozenClock
) -> Iterator[dict[str, Any]]:
    lead = create_lead()
    frozen_clock.advance(hours=1)
    add_note(lead["id"], "Reminder set.", follow_up_at=iso(frozen_clock.now + timedelta(days=1)))
    frozen_clock.advance(hours=1)
    yield lead


def test_commit_failure_after_insert_leaves_no_trace(
    client: TestClient,
    engine: Engine,
    lead_with_follow_up: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    lead_id = lead_with_follow_up["id"]
    before = snapshot(engine, lead_id)

    def failing_commit(self: Session) -> None:
        raise RuntimeError("commit exploded")

    monkeypatch.setattr(Session, "commit", failing_commit)
    response = client.post(f"/leads/{lead_id}/discussions", json={"note": "Will not persist."})

    assert response.status_code == 500
    assert snapshot(engine, lead_id) == before


def test_failure_while_updating_lead_fields_leaves_no_trace(
    client: TestClient, engine: Engine, lead_with_follow_up: dict[str, Any]
) -> None:
    lead_id = lead_with_follow_up["id"]
    before = snapshot(engine, lead_id)

    def explode(*_args: object) -> None:
        raise RuntimeError("lead update exploded")

    event.listen(Lead, "before_update", explode)
    try:
        response = client.post(f"/leads/{lead_id}/discussions", json={"note": "Will not persist."})
    finally:
        event.remove(Lead, "before_update", explode)

    assert response.status_code == 500
    assert snapshot(engine, lead_id) == before

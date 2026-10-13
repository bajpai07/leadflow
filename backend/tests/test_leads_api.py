from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import Engine

from tests.conftest import FrozenClock

pytestmark = pytest.mark.usefixtures("frozen_clock")

CreateLead = Callable[..., dict[str, Any]]
AddNote = Callable[..., dict[str, Any]]


def test_create_lead_defaults_status_and_logs_system_note(create_lead: CreateLead) -> None:
    lead = create_lead("Hank Scorpio")

    assert lead["status"] == "new"
    assert lead["last_note"] == "Lead created."
    assert lead["last_discussion_at"] == lead["created_at"] == "2026-05-04T10:30:00Z"
    assert lead["next_follow_up_at"] is None


def test_create_lead_with_blank_name_returns_standard_validation_error(client: TestClient) -> None:
    response = client.post("/leads", json={"name": "   "})

    assert response.status_code == 422
    body = response.json()
    assert set(body) == {"detail", "code"}
    assert body["code"] == "validation_error"
    assert body["detail"].startswith("name:")


def test_create_lead_stores_blank_company_and_phone_as_null(create_lead: CreateLead) -> None:
    lead = create_lead(company="", phone="   ")

    assert lead["company"] is None
    assert lead["phone"] is None


def test_list_leads_returns_last_note_and_last_discussion_at(
    client: TestClient, create_lead: CreateLead, add_note: AddNote, frozen_clock: FrozenClock
) -> None:
    lead = create_lead("Sarah Connor")
    frozen_clock.advance(hours=1)
    add_note(lead["id"], "Sent pricing PDF.")

    [listed] = client.get("/leads").json()

    assert listed["last_note"] == "Sent pricing PDF."
    assert listed["last_discussion_at"] == "2026-05-04T11:30:00Z"


def test_list_leads_filters_by_status(client: TestClient, create_lead: CreateLead) -> None:
    create_lead("New One")
    contacted = create_lead("Contacted One")
    client.patch(f"/leads/{contacted['id']}", json={"status": "contacted"})

    names = [lead["name"] for lead in client.get("/leads", params={"status": "contacted"}).json()]

    assert names == ["Contacted One"]


def test_list_leads_rejects_invalid_status(client: TestClient) -> None:
    response = client.get("/leads", params={"status": "archived"})

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_search_is_case_insensitive(client: TestClient, create_lead: CreateLead) -> None:
    create_lead("Sarah Connor")
    create_lead("Hank Scorpio")

    names = [lead["name"] for lead in client.get("/leads", params={"q": "SARAH"}).json()]

    assert names == ["Sarah Connor"]


def test_search_treats_wildcards_literally(client: TestClient, create_lead: CreateLead) -> None:
    create_lead("Sarah Connor")
    create_lead("100% Real")
    create_lead("snake_case")

    percent = [lead["name"] for lead in client.get("/leads", params={"q": "%"}).json()]
    underscore = [lead["name"] for lead in client.get("/leads", params={"q": "_"}).json()]

    assert percent == ["100% Real"]
    assert underscore == ["snake_case"]


def test_search_combines_with_status_filter(client: TestClient, create_lead: CreateLead) -> None:
    create_lead("Sarah Connor")
    won = create_lead("Sarah Wayne")
    client.patch(f"/leads/{won['id']}", json={"status": "won"})

    names = [
        lead["name"] for lead in client.get("/leads", params={"q": "sarah", "status": "won"}).json()
    ]

    assert names == ["Sarah Wayne"]


def test_blank_search_term_is_ignored(client: TestClient, create_lead: CreateLead) -> None:
    create_lead("Sarah Connor")
    create_lead("Hank Scorpio")

    assert len(client.get("/leads", params={"q": "   "}).json()) == 2


def test_list_sorts_latest_discussion_first(
    client: TestClient, create_lead: CreateLead, add_note: AddNote, frozen_clock: FrozenClock
) -> None:
    oldest = create_lead("Oldest")
    frozen_clock.advance(hours=1)
    create_lead("Middle")
    frozen_clock.advance(hours=1)
    create_lead("Newest")
    frozen_clock.advance(hours=1)
    add_note(oldest["id"], "Back in touch.")

    names = [lead["name"] for lead in client.get("/leads").json()]

    assert names == ["Oldest", "Newest", "Middle"]


def test_list_puts_leads_without_discussions_last(
    client: TestClient, create_lead: CreateLead, frozen_clock: FrozenClock, engine: Engine
) -> None:
    create_lead("Has Discussion")
    frozen_clock.advance(hours=1)
    quiet = create_lead("Never Discussed")
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE leads SET last_discussion_at = NULL WHERE id = :id"), {"id": quiet["id"]}
        )

    names = [lead["name"] for lead in client.get("/leads").json()]

    assert names == ["Has Discussion", "Never Discussed"]


def test_get_lead_returns_lead(client: TestClient, create_lead: CreateLead) -> None:
    lead = create_lead("Sarah Connor", company="Acme Corp", phone="555-0199")

    response = client.get(f"/leads/{lead['id']}")

    assert response.status_code == 200
    assert response.json()["company"] == "Acme Corp"
    assert response.json()["phone"] == "555-0199"


def test_get_unknown_lead_returns_404(client: TestClient) -> None:
    response = client.get("/leads/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Lead not found", "code": "lead_not_found"}


def test_patch_status_persists_without_touching_follow_up_or_timeline(
    client: TestClient, create_lead: CreateLead, add_note: AddNote, frozen_clock: FrozenClock
) -> None:
    lead = create_lead()
    follow_up = "2026-05-06T14:00:00Z"
    add_note(lead["id"], "Sent pricing.", follow_up_at=follow_up)
    discussions_before = client.get(f"/leads/{lead['id']}/discussions").json()
    frozen_clock.advance(hours=1)

    patched = client.patch(f"/leads/{lead['id']}", json={"status": "proposal_sent"})
    fetched = client.get(f"/leads/{lead['id']}").json()
    discussions_after = client.get(f"/leads/{lead['id']}/discussions").json()

    assert patched.status_code == 200
    assert fetched["status"] == "proposal_sent"
    assert fetched["next_follow_up_at"] == follow_up
    assert fetched["last_discussion_at"] == "2026-05-04T10:30:00Z"
    assert discussions_after == discussions_before


def test_patch_updates_name_company_and_phone(client: TestClient, create_lead: CreateLead) -> None:
    lead = create_lead("Sarah Connor", company="Acme", phone="555-0199")

    response = client.patch(
        f"/leads/{lead['id']}", json={"name": " Sarah C. ", "company": None, "phone": "555-0000"}
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Sarah C."
    assert response.json()["company"] is None
    assert response.json()["phone"] == "555-0000"


def test_patch_with_empty_body_returns_empty_update(
    client: TestClient, create_lead: CreateLead
) -> None:
    lead = create_lead()

    response = client.patch(f"/leads/{lead['id']}", json={})

    assert response.status_code == 422
    assert response.json()["code"] == "empty_update"


def test_patch_rejects_follow_up_fields(client: TestClient, create_lead: CreateLead) -> None:
    lead = create_lead()

    response = client.patch(
        f"/leads/{lead['id']}", json={"next_follow_up_at": "2026-05-06T14:00:00Z"}
    )

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert "next_follow_up_at" in response.json()["detail"]


def test_patch_rejects_null_name_and_status(client: TestClient, create_lead: CreateLead) -> None:
    lead = create_lead()

    for body in ({"name": None}, {"status": None}, {"name": "   "}):
        response = client.patch(f"/leads/{lead['id']}", json=body)
        assert response.status_code == 422, body


def test_patch_unknown_lead_returns_404(client: TestClient) -> None:
    response = client.patch("/leads/999", json={"status": "won"})

    assert response.status_code == 404
    assert response.json()["code"] == "lead_not_found"

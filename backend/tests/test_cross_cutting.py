from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.conftest import FrozenClock

pytestmark = pytest.mark.usefixtures("frozen_clock")

ALLOWED_ORIGIN = "http://localhost:3000"


def assert_error_shape(response: Any, status_code: int, code: str) -> None:
    assert response.status_code == status_code
    body = response.json()
    assert set(body) == {"detail", "code"}
    assert isinstance(body["detail"], str)
    assert body["code"] == code


def test_unknown_route_uses_error_shape(client: TestClient) -> None:
    assert_error_shape(client.get("/nope"), 404, "not_found")


def test_wrong_method_uses_error_shape(client: TestClient) -> None:
    assert_error_shape(client.post("/health"), 405, "method_not_allowed")


def test_validation_error_uses_error_shape(client: TestClient) -> None:
    response = client.post("/leads", json={})

    assert_error_shape(response, 422, "validation_error")
    assert response.json()["detail"] == "name: Field required"


def test_unexpected_error_uses_error_shape_without_leaking_internals(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def explode(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("secret connection string")

    monkeypatch.setattr("app.services.leads.list_leads", explode)

    response = client.get("/leads")

    assert_error_shape(response, 500, "internal_error")
    assert response.json()["detail"] == "Internal server error"
    assert "secret" not in response.text


def datetimes_in(payload: Any) -> list[str]:
    found: list[str] = []
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key.endswith("_at") and isinstance(value, str):
                found.append(value)
            else:
                found.extend(datetimes_in(value))
    elif isinstance(payload, list):
        for item in payload:
            found.extend(datetimes_in(item))
    return found


def test_all_returned_datetimes_end_with_z(
    client: TestClient,
    create_lead: Callable[..., dict[str, Any]],
    frozen_clock: FrozenClock,
) -> None:
    lead = create_lead()
    created = client.post(
        f"/leads/{lead['id']}/discussions",
        json={"note": "Offset.", "follow_up_at": "2026-05-06T19:30:00+05:30"},
    )

    payloads = [
        lead,
        created.json(),
        client.get("/leads").json(),
        client.get(f"/leads/{lead['id']}").json(),
        client.get(f"/leads/{lead['id']}/discussions").json(),
        client.patch(f"/leads/{lead['id']}", json={"status": "contacted"}).json(),
    ]
    values = [value for payload in payloads for value in datetimes_in(payload)]

    assert len(values) >= 15
    assert all(value.endswith("Z") for value in values), values


def test_cors_allows_configured_origin(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": ALLOWED_ORIGIN})

    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN


def test_cors_does_not_allow_other_origins(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": "https://evil.example.com"})

    assert "access-control-allow-origin" not in response.headers

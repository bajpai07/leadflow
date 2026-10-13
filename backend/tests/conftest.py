from collections.abc import Callable, Iterator
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.database import create_db_engine, get_db
from app.main import app

BACKEND_DIR = Path(__file__).resolve().parent.parent


class FrozenClock:
    def __init__(self, now: datetime) -> None:
        self.now = now

    def advance(self, **kwargs: float) -> None:
        self.now += timedelta(**kwargs)


@pytest.fixture
def alembic_config(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Config]:
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
    get_settings.cache_clear()
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    yield config
    get_settings.cache_clear()


@pytest.fixture
def engine(alembic_config: Config) -> Iterator[Engine]:
    command.upgrade(alembic_config, "head")
    db_engine = create_db_engine(get_settings().database_url)
    yield db_engine
    db_engine.dispose()


@pytest.fixture
def session(engine: Engine) -> Iterator[Session]:
    with sessionmaker(bind=engine, expire_on_commit=False)() as db_session:
        yield db_session


@pytest.fixture
def frozen_clock(monkeypatch: pytest.MonkeyPatch) -> FrozenClock:
    frozen = FrozenClock(datetime(2026, 5, 4, 10, 30, tzinfo=UTC))
    monkeypatch.setattr("app.core.clock.utcnow", lambda: frozen.now)
    return frozen


@pytest.fixture
def client(engine: Engine) -> Iterator[TestClient]:
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def override_get_db() -> Iterator[Session]:
        with factory() as db_session:
            yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


@pytest.fixture
def create_lead(client: TestClient) -> Callable[..., dict[str, Any]]:
    def _create_lead(name: str = "Sarah Connor", **fields: Any) -> dict[str, Any]:
        response = client.post("/leads", json={"name": name, **fields})
        assert response.status_code == 201, response.text
        return response.json()

    return _create_lead


@pytest.fixture
def add_note(client: TestClient) -> Callable[..., dict[str, Any]]:
    def _add_note(lead_id: int, note: str = "Called.", **fields: Any) -> dict[str, Any]:
        response = client.post(f"/leads/{lead_id}/discussions", json={"note": note, **fields})
        assert response.status_code == 201, response.text
        return response.json()

    return _add_note

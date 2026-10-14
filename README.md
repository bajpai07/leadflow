# LeadFlow

A single-screen lead management tool: track leads, log every discussion in a per-lead timeline, and schedule follow-ups. Built as a take-home assessment (the brief is in [docs/assignment.md](docs/assignment.md)).

## Overview

A sales rep sees all leads on one screen with status, last note and "time since last discussion". Today's follow-ups are pinned at the top and overdue ones are highlighted in red. Clicking a lead opens a timeline dialog (not a new page) where the rep reads the full history, logs a new note with an optional follow-up date and time, and changes the lead's status. A second dialog adds new leads.

The backend is a FastAPI service on SQLAlchemy 2.0 and Alembic (SQLite by default, Postgres under Docker Compose). The frontend is a Next.js App Router app that talks to it over a small typed client.

## Features

- **Lead list:** name, company, status badge, last note, and time since the last discussion.
- **Status filters:** All, New, Contacted, Qualified, Proposal Sent, Won, Lost.
- **Search by name:** case-insensitive, debounced, combined with the status filter, `%` and `_` matched literally.
- **Today's follow-ups pinned** at the top, computed in the browser's timezone.
- **Overdue follow-ups highlighted in red** in their own section. Won and Lost leads are never shown as overdue.
- **Timeline dialog:** newest first, follow-up chips on the notes that requested one, status select, and a footer form to add a note with an optional follow-up. The list behind the dialog updates immediately.
- **Add New Lead dialog** (name required, company and phone optional, status defaults to New).
- **Optimistic status updates** with rollback on error, and toasts for lead added, note saved and status updated.
- **Docker Compose:** Postgres, API and web with one command.
- **Seed script:** 8 leads with discussions covering today, overdue, upcoming, won and lost cases. Idempotent, with `--reset`.
- **Accessibility pass:** labelled controls, visible focus rings, a polite live region for list updates, reduced-motion support.

## Tech Stack

| Layer | Tools |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0 (typed), Pydantic v2, Alembic, pydantic-settings, pytest, ruff |
| Database | PostgreSQL 16 (Docker Compose), SQLite for local runs and tests |
| Frontend | Next.js (App Router), TypeScript (strict), Tailwind CSS, shadcn/ui, TanStack Query, react-hook-form, zod, date-fns, sonner, Vitest |
| Infra | Docker Compose (db, api, web) |

## Quick Start (Docker)

Requires Docker with Compose v2.

```bash
cp .env.example .env
docker compose up --build
```

If the build fails with a network error, rerun `docker compose up --build`.

Then open:

- Web app: http://localhost:3000
- API: http://localhost:8000 (interactive docs at http://localhost:8000/docs)

The first start runs the Alembic migrations and seeds the demo data (`SEED_ON_START=true`). Restarts skip seeding because the seed is idempotent.

```bash
# reseed from scratch (deletes all leads, then seeds again)
docker compose exec api python seed.py --reset

# stop the stack
docker compose down

# stop and delete the database volume
docker compose down -v
```

Notes:

- The database port is not published to the host. Use `docker compose exec db psql -U leadflow -d leadflow` to inspect it.
- `NEXT_PUBLIC_API_URL` is baked into the web image at build time. After changing it, run `docker compose up --build` again.
- If you put special characters in `POSTGRES_PASSWORD`, URL-encode them, because compose embeds the password in the database URL.

## Manual Setup

Requires Python 3.11+ and Node.js 20+. The backend uses SQLite by default, so no database setup is needed.

### Backend

```bash
cd backend
python -m venv .venv

# activate the virtual environment
source .venv/Scripts/activate     # Windows (Git Bash)
# source .venv/bin/activate       # macOS / Linux

pip install -e ".[dev]"
alembic upgrade head
python seed.py
uvicorn app.main:app --reload --port 8000
```

The API is now at http://localhost:8000. Configuration is read from environment variables or from a `backend/.env` file (copy the root `.env.example` to `backend/.env` to override defaults; unused variables are ignored).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The frontend calls `http://localhost:8000` unless `NEXT_PUBLIC_API_URL` is set (for example in `frontend/.env.local`).

## Environment Variables

All variables are documented in [.env.example](.env.example).

| Variable | Used by | Default | Description |
|---|---|---|---|
| `APP_ENV` | api | `development` | Application environment label. |
| `POSTGRES_USER` | Compose (db, api) | `leadflow` | Postgres user created by the db container. |
| `POSTGRES_PASSWORD` | Compose (db, api) | `leadflow` | Postgres password. Change it for anything beyond local use. |
| `POSTGRES_DB` | Compose (db, api) | `leadflow` | Postgres database name. |
| `DATABASE_URL` | Manual backend runs **only** | `sqlite:///./leadflow.db` | SQLAlchemy URL. Docker Compose ignores this value and builds its own Postgres URL (`postgresql+psycopg://…@db:5432/…`) from the `POSTGRES_*` variables. |
| `BACKEND_CORS_ORIGINS` | api | `http://localhost:3000` | Comma-separated origins allowed by CORS. Never `*`. |
| `NEXT_PUBLIC_API_URL` | web | `http://localhost:8000` | API base URL as seen from the browser (build-time under Docker). |
| `SEED_ON_START` | Compose (api) | `true` | Run the idempotent seed after migrations when the api container starts. |

## API Reference

Base URL: `http://localhost:8000`. Interactive docs: `/docs`. All timestamps are ISO 8601 in UTC with a `Z` suffix.

**Error shape (every error):**

```json
{"detail": "<human message>", "code": "<machine_code>"}
```

| Method and path | Parameters / body | Success | Errors |
|---|---|---|---|
| `GET /health` | none | 200 `{"status": "ok"}` | none |
| `GET /leads` | query `status` (`new`, `contacted`, `qualified`, `proposal_sent`, `won`, `lost`), `q` (name search, blank ignored) | 200, array of leads with `last_note` | 422 `validation_error` (invalid status) |
| `POST /leads` | `name` (required, 1 to 120), `company` (max 120), `phone` (max 32) | 201, the lead (with a "Lead created." note) | 422 `validation_error` |
| `GET /leads/{id}` | none | 200, the lead | 404 `lead_not_found` |
| `PATCH /leads/{id}` | any of `name`, `company`, `phone`, `status` (at least one; unknown fields rejected) | 200, the lead | 404 `lead_not_found`; 422 `empty_update`, `validation_error` |
| `GET /leads/{id}/discussions` | none | 200, discussions newest first | 404 `lead_not_found` |
| `POST /leads/{id}/discussions` | `note` (1 to 2000, trimmed), `follow_up_at` (optional, timezone-aware) | 201, `{"discussion": …, "lead": …}` | 404 `lead_not_found`; 422 `follow_up_in_past`, `validation_error` |

Unknown routes return 404 `not_found`, a wrong method returns 405 `method_not_allowed`, and unexpected failures return 500 `internal_error` without internals.

**Create a lead**

```bash
curl -X POST http://localhost:8000/leads \
  -H "Content-Type: application/json" \
  -d '{"name": "Jim Halpert", "company": "Dunder Mifflin"}'
```

**Add a note with a follow-up**

```bash
curl -X POST http://localhost:8000/leads/1/discussions \
  -H "Content-Type: application/json" \
  -d '{"note": "Sent the proposal.", "follow_up_at": "2030-01-15T10:00:00Z"}'
```

## Business Rules & Design Decisions

The authoritative list is in [CLAUDE.md](CLAUDE.md). In short:

1. **UTC everywhere on the wire.** Timestamps are stored and transmitted in UTC. The browser converts to local time for display and for deciding what "today" means.
2. **The last note is derived, never copied.** `last_note` and "time since last discussion" come from the latest discussion row through a correlated subquery (ordered by `created_at DESC, id DESC`), so there is no denormalised note text on a lead.
3. **Saving a note is one transaction.** It inserts the discussion, sets `last_discussion_at`, and sets `next_follow_up_at` to the provided follow-up or clears it to null. A note without a follow-up means the previous one was handled.
4. **Follow-ups cannot be in the past.** Rejected with 422 on both client and server, with 60 seconds of clock-skew tolerance on the server.
5. **Today's follow-ups** are those later today in the user's local time. They are pinned at the top.
6. **Overdue** means the follow-up time has passed and the lead is not Won or Lost. It has its own red section and takes priority over "today" (a time that already passed today is overdue).
7. **Won and Lost leads** are excluded from pinned and overdue groups and shown muted.
8. **Filter chips** are All, New, Contacted, Qualified, Proposal Sent, Won, Lost.
9. **Search** is case-insensitive on name and combines with the status filter.
10. **Sort order:** the latest discussion first (leads without discussions last), then newest created.
11. **Creating a lead** also inserts a first system note "Lead created.", so every timeline and every last note is non-empty.
12. **Changing status via PATCH** does not create a discussion and does not touch follow-up fields.
13. **Overdue beats Today** (see 6).
14. **60-second skew tolerance** on `follow_up_at` (see 4).
15. **PATCH accepts only** `name`, `company`, `phone` and `status`.
16. **The system note text** is exactly "Lead created.".
17. **`GET /leads` returns all matching leads.** Grouping into Overdue, Today and the rest happens in the browser, in the browser's timezone.
18. **`Discussion.follow_up_at` is historical.** It records the follow-up requested when that note was logged, while `Lead.next_follow_up_at` is the only active reminder.

Design decisions:

- **Browser-local grouping:** the server cannot know the user's timezone, so it returns UTC and the client groups.
- **Optimistic status update:** the status select updates the list and dialog instantly, restores the previous caches on error, and revalidates with the server afterwards.
- **Cache updates after a note:** the saved lead is written into the lead and list caches immediately, then everything is invalidated to confirm with the server.
- **Unpaginated list:** `GET /leads` returns every lead because the grouping rules (pinning, overdue) need the whole set and the scope is a single rep's pipeline. Pagination would need server-side grouping, which would have to know the user's timezone.
- **Portable schema:** status is stored as a string with a CHECK constraint and datetimes go through a UTC-only type, so the same migrations run on SQLite and Postgres.

## Testing

Backend (from `backend/`, with the virtual environment active; 69 tests):

```bash
pytest
ruff check .
ruff format --check .
```

Frontend (from `frontend/`; 98 tests):

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Backend tests run against a migrated temporary SQLite database and cover the models, migrations (up, down, up), every endpoint, the error shape, CORS and the seed script. Frontend tests cover the pure time utilities (with the timezone forced to Asia/Kolkata), the cache helpers, the query-cache sync, the form schemas, the view-state helper and the API client.

## Project Structure

```
leadflow/
├── backend/
│   ├── app/
│   │   ├── api/            # thin routers (leads, discussions)
│   │   ├── core/           # config, database, clock, errors, handlers
│   │   ├── models/         # SQLAlchemy models, enums, UTC type
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # business logic
│   │   └── main.py
│   ├── alembic/            # migrations
│   ├── tests/
│   ├── seed.py
│   ├── Dockerfile
│   └── docker-entrypoint.sh
├── frontend/
│   ├── src/
│   │   ├── app/            # layout, page, providers
│   │   ├── components/     # AppHeader, LeadWorkspace, leads/*, ui/*
│   │   └── lib/            # api, queries, cache, time, schemas, types
│   └── Dockerfile
├── docs/
│   ├── assignment.md
│   ├── screenshots/
│   └── wireframes/README.md
├── docker-compose.yml
├── CLAUDE.md
├── AI_USAGE.md
└── .env.example
```

## Trade-offs and Known Limitations

- **No authentication.** The brief makes login optional and it was skipped.
- **No pagination.** `GET /leads` returns every lead (see the design decisions above).
- **Saving a note without a follow-up clears the active follow-up,** and there is no explicit "mark done" action. A note logged for another reason silently drops a pending reminder.
- **Search case-insensitivity differs by database.** On SQLite it is ASCII-only, on Postgres it is full Unicode.
- **The seed's "today" follow-up is now + 45 minutes.** Seeding within 45 minutes before midnight puts it on tomorrow.
- **The seed reports any database `OperationalError` as "run alembic upgrade head".** That hint is wrong for other operational errors such as a locked database.
- **No component or end-to-end tests.** Logic is unit tested, UI behaviour was checked manually in the browser.
- **No real-time reminders.** A follow-up becoming overdue is reflected within a minute (the list re-evaluates time every 60 seconds) but nothing notifies the user.
- **The web container has no healthcheck,** only the API does.
- **Test client deprecation warning.** The backend test run prints one Starlette warning about `httpx`.

## What I'd Do With More Time

- Pagination with server-side filtering for large pipelines.
- Authentication and per-user lead ownership.
- A "mark follow-up done" action and reminder notifications.
- An activity log for status changes (today they leave no trace in the timeline).
- End-to-end tests with Playwright.
- WebSocket or push notifications for due follow-ups.
- CI running lint, type checks, tests and the Docker build.

## Screenshots

> To be added by the author before submission. Files are expected in `docs/screenshots/`.

| Screen | File |
|---|---|
| Lead list | `docs/screenshots/landing.png` |
| Lead timeline dialog | `docs/screenshots/timeline.png` |
| Add New Lead dialog | `docs/screenshots/add-lead.png` |

Demo video: _link to be added by the author_.

## AI Usage

This project was built with AI assistance (Claude Code), directed and reviewed by me phase by phase. A summary of what was generated, what was reviewed and which bugs the process caught is in [AI_USAGE.md](AI_USAGE.md).

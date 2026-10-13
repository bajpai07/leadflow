# LeadFlow

## 1. Project overview

LeadFlow is a single-screen lead management tool (a lightweight CRM) built as a take-home assessment for PravarAI.
A sales rep tracks leads, logs every discussion in a per-lead timeline, and sets follow-up reminders.
The whole app lives on one screen: a lead list plus modal dialogs for the timeline and for adding a lead.
The original brief is in `docs/assignment.md`.

## 2. Tech stack and target layout

**Backend:** FastAPI, SQLAlchemy 2.0 (typed), Pydantic v2, Alembic, pydantic-settings, pytest, ruff, Postgres (SQLite allowed for local/tests via `DATABASE_URL`).

**Frontend:** Next.js App Router, TypeScript (strict), Tailwind, shadcn/ui, TanStack Query, react-hook-form + zod, date-fns.

**Infra:** Docker Compose (db + api + web).

```
backend/
  app/
    api/        # thin routers
    core/       # settings, db session, error handling
    models/     # SQLAlchemy models (no logic)
    schemas/    # Pydantic v2 schemas
    services/   # all business logic
  alembic/
  tests/
  seed.py
frontend/
  src/
    app/
    components/leads/
    lib/
      api.ts
      queries.ts
      time.ts
      types.ts
docs/
  assignment.md
  wireframes/README.md
```

## 3. Domain model

**Lead**: `id`, `name` (required), `company?`, `phone?`, `status` enum (`new`, `contacted`, `qualified`, `proposal_sent`, `won`, `lost`; default `new`), `next_follow_up_at?` (UTC), `last_discussion_at?` (UTC), `created_at`, `updated_at`.

**Discussion**: `id`, `lead_id` (FK, ON DELETE CASCADE), `note` (required, non-empty after trim), `follow_up_at?` (UTC, the follow-up requested when the note was logged), `created_at` (UTC).

**Indexes**: `leads(status)`, `leads(next_follow_up_at)`, `discussions(lead_id, created_at DESC)`.

## 4. Business rules (single source of truth, never contradict)

1. All timestamps are stored and transmitted in UTC (ISO 8601 with `Z`). The frontend converts to the browser's local timezone for display and for computing "today".
2. "Last note" and "time since last discussion" in the list come from the latest discussion row. Never denormalize note text onto Lead.
3. `POST /leads/{id}/discussions` runs in ONE transaction: insert the discussion, set `lead.last_discussion_at = discussion.created_at`, set `lead.next_follow_up_at = follow_up_at` if provided, otherwise clear it to null (a new note without a follow-up means the previous one was handled).
4. `follow_up_at` in the past is rejected with 422 (client AND server).
5. Today's follow-ups: `next_follow_up_at` falls inside the user's local today. Pinned at the top.
6. Overdue: `next_follow_up_at < now` and status not in (`won`, `lost`). Red highlight, its own "Overdue" group.
7. Won/Lost leads are excluded from pinned and overdue, and visually muted.
8. Filter chips: All, New, Contacted, Qualified, Proposal Sent, Won, Lost.
9. Search by name is case-insensitive and combines with the status filter.
10. Sort: pinned/overdue first, then `last_discussion_at` DESC (nulls last), then `created_at` DESC.
11. Creating a lead also inserts a first system discussion "Lead created." (the wireframe timeline shows "Lead created via web form."), so every lead has a non-empty timeline and last note.
12. A status change via PATCH does not create a discussion and does not touch follow-up fields.

## 5. API conventions

- `GET /leads?status=&q=`
- `POST /leads` (201)
- `GET /leads/{id}`
- `PATCH /leads/{id}`
- `GET /leads/{id}/discussions` (newest first)
- `POST /leads/{id}/discussions` (201)

Error shape for ALL errors: `{"detail": "<human message>", "code": "<machine_code>"}`.
Status codes: 200 / 201 / 404 / 422. Unexpected errors are handled globally as 500 without leaking internals.
CORS only for the frontend origin from env.

## 6. Code standards

**Backend:** type hints everywhere, thin routers, logic in `services/`, none in models, ruff + pytest.

**Frontend:** strict TS, no `any`, small single-responsibility components, server state only via TanStack Query, no business logic in JSX.

**General:** no dead code, no commented-out code, no TODOs left behind.

## 7. Workflow rules for Claude Code

- One task per session.
- Plan first and wait for approval.
- Small focused changes; no unrelated refactors.
- Run tests and lint before every commit; never commit failing code.
- Conventional commits, one logical change each.
- No features outside this spec without asking.
- Ask when ambiguous instead of guessing.
- Never commit secrets.

## 8. UI spec

`docs/wireframes/README.md` is the visual source of truth. The wireframes are "suggested", so improving them is allowed, but every element listed there must exist.

## 9. Locked decisions

Business rules 13 to 18 extend section 4 and carry the same authority.

13. Overdue takes priority over Today: a follow-up whose time has already passed today is Overdue, never in Today's Follow-ups. Today's group = `next_follow_up_at` is later today (local time) and not yet passed.
14. The server tolerates 60 seconds of clock skew when validating that `follow_up_at` is not in the past.
15. `PATCH /leads/{id}` accepts ONLY `name`, `company`, `phone`, `status`. Follow-up fields are never settable via PATCH.
16. The system note text on lead creation is exactly "Lead created."
17. `GET /leads` returns ALL matching leads (filtered by `status` and `q` only). Grouping into Overdue / Today / Rest is done by the frontend in the browser's timezone.
18. `Discussion.follow_up_at` is the follow-up requested when that note was logged and is historical; `Lead.next_follow_up_at` is the only active reminder.

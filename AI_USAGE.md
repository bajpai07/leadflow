# AI Usage

This project was built with AI assistance, directed and reviewed by me. The table below states what was generated and what I did, based on the repository history.

| Area | Tool | What AI generated | What I reviewed/changed manually |
| ---- | ---- | ----------------- | -------------------------------- |
| Project setup and conventions | Claude Code | Monorepo scaffold, `.gitignore`, `.editorconfig`, README skeleton, `CLAUDE.md` from my spec | I wrote the spec, the domain model and the business rules (`CLAUDE.md`) up front, and later locked decisions 13 to 18. |
| Data layer (models, migrations) | Claude Code | SQLAlchemy models, the UTC datetime type, Alembic setup and migrations 0001 and 0002, model and migration tests | I approved the plan and required microsecond-precision timestamps with an id tiebreak, a hand-reviewed migration, and tests that build the database from migrations. <!-- EDIT: confirm this is accurate --> |
| Backend API and services | Claude Code | Pydantic schemas, error handling, lead and discussion services, routers, and 49 API and cross-cutting tests | I locked the API decisions before implementation (one transaction per note, 422 for past follow-ups, 60-second tolerance) and asked for boundary tests at exactly 60 and 61 seconds, two atomicity failure points, and a same-instant `last_note` test. |
| Seed script | Claude Code | `seed.py`, idempotent with `--reset`, and its tests | I specified the 8 demo leads and which of them demonstrate Today, Overdue, Upcoming and Lost. <!-- EDIT: confirm this is accurate --> |
| Frontend foundation and list | Claude Code | Next.js scaffold, typed API client, query hooks, pure time utilities, lead list components, filters | I required the time logic to be pure and testable with a forced timezone, explicit local-versus-UTC test cases, and a hydration-safe `now`. |
| Timeline dialog and forms | Claude Code | Timeline dialog, status select, add-note form, cache helpers, add-lead dialog, search, toasts | I required optimistic status updates with rollback, cache tests covering several list caches (status and search variants), and the success toast firing only on success. <!-- EDIT: confirm this is accurate --> |
| Docker and documentation | Claude Code | Dockerfiles, entrypoint script, compose file, README, this file | I required the Postgres verification (constraints, indexes, NULLS LAST, literal `%` search, no duplicate seed) and a fresh-clone run before the docs were written. <!-- EDIT: confirm this is accurate --> |

## Bugs the process caught

- **Offset handling:** a follow-up sent with a non-UTC offset was echoed back un-normalised, which violated the UTC-on-the-wire rule. It is now normalised in the schema and covered by a test.
- **Index lost in a SQLite batch migration:** `batch_alter_table` rebuilt the discussions table and dropped the `DESC` ordering of the composite index. A test exposed it and migration 0002 now restores the index.
- **Hydration mismatch risk:** rendering relative times on first paint would differ between server and client. The "current time" hook returns nothing until after mount, and the board shows its loading state until then.
- **Stale session state after `--reset`:** the seed's reset left stale objects in the session identity map. It was fixed in its own commit.
- **Generator import quirk:** the component generator imported its class-name helper from a separate package, which I replaced with the standard local helper.

## What I tested manually

I ran the application in the browser and checked the flows end to end (list, filters, search, timeline dialog, adding notes and leads). <!-- EDIT: confirm this is accurate and list anything you want to add -->

## Disclosure

The code in this repository was written largely by an AI assistant (Claude Code) working from specifications and decisions I provided, one phase at a time, with a plan reviewed and approved before each phase. I read the plans and results and requested the amendments listed above, but the implementation text itself was generated rather than typed by me. Tests, linting and builds were run before each commit. Anything marked "confirm" above is a statement about my own review that the repository cannot prove. <!-- EDIT: confirm this is accurate -->

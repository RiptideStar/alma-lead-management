# Design Document

## 1. Problem

Build a lead-management system for an immigration law practice:

1. A **public** form where a prospect submits first name, last name, email, and a
   resume/CV. No login.
2. On submission, **email both the prospect and an attorney**.
3. An **internal, auth-guarded** console where attorneys see every lead and move
   a lead from `PENDING` to `REACHED_OUT` once they have reached out.

The stack is fixed by the brief: **FastAPI** for the API, **Next.js** for the web
app, plus real persistence and a real email integration, structured like a
production repo.

## 2. Architecture

```
                         ┌──────────────────────────────────────────┐
   prospect (public)     │                Next.js 15                 │
        │                │  /            public lead form (client)   │
        │  multipart     │  /login       attorney login (client)     │
        ▼  POST          │  /admin/leads list + detail (server comp) │
  ┌───────────┐  CORS    │  middleware   guards /admin/*             │
  │  Browser  │────────► │  app/api/...  BFF route handlers (server) │
  └───────────┘          └──────────────┬───────────────────────────┘
        ▲                               │ server-to-server, Bearer JWT
        │ authed UI                     │ (token read from httpOnly cookie)
        │                               ▼
        │                       ┌───────────────┐    ┌──────────────┐
        └───────────────────────│   FastAPI     │───►│  PostgreSQL  │
                                │   /api/*       │    └──────────────┘
                                │  • leads       │    ┌──────────────┐
                                │  • auth (JWT)  │───►│ file storage │ local disk
                                │  • email (bg)  │    └──────────────┘ (S3-ready)
                                └───────┬────────┘
                                        │ SMTP (background task)
                                        ▼
                                 ┌──────────────┐
                                 │   Mailpit    │ (any SMTP provider in prod)
                                 └──────────────┘
```

Two deployables, one repo:

- **`backend/`** — FastAPI service. Owns all business logic, persistence, auth,
  file storage, and email. Stateless (JWT), so it scales horizontally.
- **`frontend/`** — Next.js App Router app. Renders the public form and the
  internal console, and acts as a thin **BFF** (backend-for-frontend) for the
  authenticated parts so the JWT never reaches client JavaScript.

Everything runs with one command via `docker compose` (Postgres + Mailpit +
both apps). See [API_CONTRACT.md](API_CONTRACT.md) for the exact endpoints.

## 3. Data model

**lead**

| column                | type        | notes                                   |
|-----------------------|-------------|-----------------------------------------|
| id                    | uuid (pk)   |                                         |
| first_name            | varchar     |                                         |
| last_name             | varchar     |                                         |
| email                 | varchar     | indexed                                 |
| state                 | varchar(20) | `PENDING` \| `REACHED_OUT`, default `PENDING` |
| resume_filename       | varchar     | original filename, shown in the UI      |
| resume_content_type   | varchar     |                                         |
| resume_size_bytes     | int         |                                         |
| resume_storage_key    | varchar     | internal key; never returned by the API |
| reached_out_at        | timestamptz | set on transition                       |
| reached_out_by_id     | uuid (fk)   | which attorney acted                    |
| created_at/updated_at | timestamptz |                                         |

**user (attorney)** — id, email (unique), name, hashed_password (bcrypt),
is_active, created_at. One attorney is seeded on startup from env.

**State machine.** A lead is created `PENDING`. The only legal transition is
`PENDING → REACHED_OUT`; anything else returns `409 Conflict`. The transition
records who acted and when. Keeping this in one service function makes the rule
easy to find and to extend (e.g. a future `DISQUALIFIED` state).

## 4. Key decisions and tradeoffs

**PostgreSQL over SQLite.** The brief asks for production shape, and Postgres is
what this would run on in production (concurrent writers, real types, migrations).
SQLite would be simpler to run but would not represent the real system. The test
suite still uses SQLite so tests stay fast and need no running database.

**Synchronous SQLAlchemy, not async.** FastAPI supports both. I chose sync
because it removes a whole class of footguns (event-loop-bound sessions, async
fixtures) at no real cost here: FastAPI runs sync path-operation functions in a
threadpool, so blocking DB calls do not stall the server. The data access is a
small set of straightforward queries, so async buys little. The lead-create
endpoint is intentionally a sync `def` for exactly this reason.

**Pluggable storage and email.** Both are behind small interfaces:
- `StorageBackend` → `LocalStorageBackend` (disk) today, `S3StorageBackend`
  stub for production. Resume files are stored on disk under a uuid-based key,
  with metadata in the database.
- `EmailBackend` → `SMTPEmailBackend` (talks to Mailpit locally, or any SMTP
  provider in prod) and `ConsoleEmailBackend`. Selected by `EMAIL_BACKEND`.

This keeps environment-specific concerns out of the business logic and makes the
service testable with fakes. **Mailpit** gives a real SMTP server locally with a
web UI to inspect what was sent, so the email path is genuinely exercised, not
mocked away.

**Emails are sent in a background task.** The API stores the lead and returns
`201` immediately; the two emails are sent after the response via FastAPI
`BackgroundTasks`. One sharp edge here: the request-scoped DB session is closed
by the time the background task runs, so the task must not touch ORM objects.
The code extracts plain primitives into a small dataclass (`LeadEmailData`)
before returning, and the email function only ever sees those. This avoids a
detached-instance error that is easy to introduce.

**Auth: stateless JWT, delivered to the browser as an httpOnly cookie.**
- The backend is stateless: protected routes require `Authorization: Bearer`.
  Easy to scale, easy to test.
- The browser never holds the token in JavaScript. Login goes to a Next.js BFF
  route handler, which calls the backend, then sets the JWT in an **httpOnly**
  cookie on the Next origin. Server components and BFF handlers read that cookie
  and forward it to the backend. This removes the XSS token-theft surface that
  `localStorage` auth has.
- `middleware.ts` guards `/admin/*` by cookie presence (a fast gate). The backend
  is still the real authority on every request.

**Public form posts straight to the API; authed traffic goes through the BFF.**
The public `POST /api/leads` is a browser-to-FastAPI call with CORS allowing the
frontend origin, which keeps the "publicly available" API honest. Everything
authenticated is server-to-server through the Next BFF, so the only thing CORS
has to permit is the one public endpoint.

**Migrations with Alembic.** Schema is versioned with a hand-authored initial
migration (not autogenerated against a live DB, so it is deterministic). The
container entrypoint runs `alembic upgrade head` before serving.

**Host Postgres port is 5433.** Many machines already run Postgres on 5432
(mine did, which surfaced during testing). Compose exposes the database on host
port **5433** to avoid that clash; inside the Docker network the app still talks
to `db:5432`. The full-Docker path is unaffected either way.

## 5. Security

- Passwords hashed with **bcrypt**; only the hash is stored.
- JWT signed HS256 with a configurable secret and expiry; the browser copy is
  **httpOnly + SameSite=Lax**, so it is not readable by scripts.
- Resume downloads are **auth-gated** and streamed through the backend; files are
  never served from a public path.
- Upload validation: extension/content-type allowlist (pdf/doc/docx/txt) and a
  size cap (default 5 MB), enforced server-side.
- CORS is locked to the configured frontend origin.

Out of scope for a take-home but called out for honesty: refresh tokens, rate
limiting on the public form, virus scanning of uploads, and per-role
authorization (today every authenticated user is an attorney).

## 6. Testing

- **Backend:** 17 pytest tests over the API using a SQLite test database and a
  capturing fake email backend. They cover the happy path (lead created
  `PENDING`, file stored, two emails queued), input validation (400/422), auth
  (login, bad credentials, unauthorized access), listing with filters, and the
  state transition including the `409` on a repeat.
- **End-to-end:** the full stack was exercised against real Postgres and real
  SMTP — submitting the public form in a browser, watching both emails arrive in
  Mailpit, logging in, listing, opening a lead, marking it reached out, and
  downloading the resume.

## 7. Production next steps

If this graduated past a take-home: move file storage to S3, send email through a
managed provider (the `EmailBackend` swap is already there), add a retry/queue
for email instead of in-process background tasks, add rate limiting and a captcha
to the public form, add structured logging and tracing, and introduce roles if
non-attorney staff ever need access.

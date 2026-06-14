# Prompt logs (excerpts)

These are the actual prompts the conductor gave the two executor subagents, plus
the plan-review attempt. They are representative of how the build was driven:
a hand-written contract, a precise list of footguns, and a "verify it yourself"
instruction. Lightly trimmed for length.

---

## Orchestration

Conductor (Opus) flow: read the assignment → write the API contract + infra by
hand → spawn two Sonnet executors in parallel (one owning `backend/`, one owning
`frontend/`) → stand up the stack and verify end-to-end → fix what review found.

---

## Plan-review attempt (Codex)

```
codex exec "Critique this architecture for a 6-hour FastAPI+Next.js
lead-management take-home. Two agents build backend/ and frontend/ in parallel
against a fixed contract. Find only concrete bugs/footguns, prioritized, brief.
... Focus: BackgroundTask + sync DB session lifecycle (session closing before
background email runs), multipart size/type validation, Alembic sync migration
reliability, docker networking (browser localhost:8000 vs server backend:8000),
and any contract gap two parallel agents would diverge on."
```

Result: Codex returned a service-tier config error and no review, so the design
pass stayed with the Claude conductor. The footguns above were instead baked
directly into the executor prompts below.

---

## Backend executor (Sonnet)

```
You are the BACKEND implementer for a take-home "Lead Management System". Work
ONLY inside backend/. First read docs/API_CONTRACT.md, .env.example, and
docker-compose.yml to anchor to the contract and env var names.

STACK (use exactly): FastAPI · SQLAlchemy 2.0 SYNC + psycopg3 · Alembic ·
Pydantic v2 · PyJWT (HS256) · bcrypt directly (NOT passlib) · python-multipart ·
Jinja2 · stdlib smtplib · pytest + httpx.

DATA MODEL: User (uuid pk, email unique, name, hashed_password, is_active) and
Lead (uuid pk, names, email, state as VARCHAR from a Python enum — NOT a
Postgres ENUM, resume metadata, resume_storage_key internal/never exposed,
reached_out_at/by, timestamps). Use SQLAlchemy Uuid type.

CRITICAL FOOTGUNS you MUST handle:
1. BackgroundTask + DB session lifecycle: the request-scoped session CLOSES when
   the request returns. Do NOT pass ORM Lead objects into the BackgroundTask —
   extract primitives into a dataclass first; the email task must not touch the DB.
2. Multipart upload validation: allowlist pdf/doc/docx/txt + size cap, reject with
   400. Store via the storage abstraction; keep original filename in the DB.
3. Alembic: hand-author the initial migration (no autogenerate against a live DB);
   sync env.py reading DATABASE_URL; `alembic upgrade head` must create all tables.
4. bcrypt directly. 5. Idempotent attorney seed (startup + `python -m app.seed`).
6. CORS from ALLOWED_ORIGINS. 7. State PENDING->REACHED_OUT only, else 409.

ABSTRACTIONS: StorageBackend (Local + S3 stub) and EmailBackend (SMTP + Console)
behind factories. notifications.send_lead_emails renders two Jinja2 templates.
Product context: U.S. immigration; warm professional copy.

TESTS (pytest, must pass): SQLite test db via get_db override, tmp upload dir,
capturing fake email backend. Cover create happy path (201, PENDING, file stored,
2 emails), validation (400/422), login + bad creds 401, list auth + filters,
patch 200 then 409, unknown id 404. Run `uv run pytest` and ensure green.

Dockerfile + entrypoint.sh: alembic upgrade head && python -m app.seed &&
uvicorn ... REPORT what you built, the pytest summary line, and any assumptions.
```

---

## Frontend executor (Sonnet)

```
You are the FRONTEND implementer. Work ONLY inside frontend/. First read
docs/API_CONTRACT.md (API + the Frontend routes & BFF you must build),
.env.example (BACKEND_URL server-side, NEXT_PUBLIC_API_URL browser), and
docker-compose.yml.

GOAL: Next.js 15 App Router + TypeScript + Tailwind, pnpm. Clean, professional,
accessible UI — not generic-AI-looking. Product context: Alma helps people with
U.S. immigration cases.

AUTH FLOW (httpOnly cookie BFF): /login posts to a BFF route handler that calls
the backend, sets an httpOnly access_token cookie, and redirects to /admin/leads.
middleware.ts guards /admin/*. A server-side fetch helper reads the cookie and
forwards Authorization: Bearer; on 401 redirect to /login.

FOOTGUNS: NEXT_PUBLIC_API_URL is inlined at BUILD time (set it in the Dockerfile
before next build); BACKEND_URL is server-only, never NEXT_PUBLIC_. Use
output:'standalone'. The public form posts multipart DIRECTLY to
${NEXT_PUBLIC_API_URL}/api/leads and handles 201 / 400 / 422. Admin pages are
server components (no-store).

PAGES: / public form (react-hook-form + zod, file input). /login. /admin/leads
list (server component, state filter + search + paging, table with state badge).
/admin/leads/[id] detail (fields, resume download via BFF proxy, "Mark as reached
out" client button -> PATCH BFF -> router.refresh()). /admin layout nav with
attorney name + logout. BFF route handlers: login, logout, leads/[id] PATCH,
leads/[id]/resume GET.

VERIFY: pnpm install then pnpm build must succeed (fix every TS/build error).
Dockerfile: multi-stage node:20-alpine, standalone, NEXT_PUBLIC_API_URL baked.
REPORT structure, the build summary, and decisions.
```

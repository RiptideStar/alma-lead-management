# Running locally

Two ways to run it: the **one-command Docker path** (recommended) and a
**native dev path** for working on the code.

## Option A — Docker (recommended)

Prereqs: Docker Desktop (or Docker Engine + Compose v2).

```bash
cp .env.example .env
docker compose up --build
```

That starts four services: Postgres, Mailpit, the FastAPI backend (which runs
migrations + seeds the attorney on boot), and the Next.js frontend.

| URL                                 | What                                          |
|-------------------------------------|-----------------------------------------------|
| http://localhost:3000               | Public lead form                              |
| http://localhost:3000/login         | Attorney login                                |
| http://localhost:3000/admin/leads   | Internal leads console (auth required)        |
| http://localhost:8000/docs          | FastAPI interactive API docs                  |
| http://localhost:8025               | Mailpit — inspect the emails that were sent   |

**Seeded attorney login:** `attorney@alma.com` / `almapassword`
(override via `ATTORNEY_EMAIL` / `ATTORNEY_PASSWORD` in `.env`).

### Try the whole flow
1. Open http://localhost:3000 and submit the form with any name/email and a
   PDF/DOC/DOCX/TXT resume.
2. Open http://localhost:8025 — you will see two emails: a confirmation to the
   prospect and a "New lead" notification to the attorney.
3. Open http://localhost:3000/login, sign in, and you will see the lead in
   `PENDING`. Open it, click **Mark as reached out**, and the state flips to
   `REACHED_OUT`. Download the resume from the detail page.

Stop with `Ctrl-C`; `docker compose down` removes the containers (add `-v` to
also wipe the database and uploaded files).

## Option B — Native dev

Prereqs: Python 3.12 + [uv](https://docs.astral.sh/uv/), Node 20+ + pnpm. Use
Docker just for the infra:

```bash
cp .env.example .env
docker compose up -d db mailpit     # Postgres on host :5433, Mailpit on :8025/:1025
```

**Backend** (terminal 1):
```bash
cd backend
uv sync
uv run alembic upgrade head         # create tables
uv run python -m app.seed           # seed the attorney (also runs on startup)
uv run uvicorn app.main:app --reload --port 8000
```

**Frontend** (terminal 2):
```bash
cd frontend
pnpm install
BACKEND_URL=http://127.0.0.1:8000 NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 pnpm dev
```

Then use the same URLs as above. The backend defaults already point at the
Dockerized Postgres (`localhost:5433`) and Mailpit (`localhost:1025`), so no
extra config is needed.

## Running the tests

```bash
cd backend
uv run pytest                       # 17 tests, uses an in-memory SQLite db
```

## Troubleshooting

- **Port 5432 already in use.** Intentional: the Postgres container is exposed on
  host port **5433** precisely so it does not collide with a local Postgres.
  Native dev connects to `localhost:5433`; nothing to change.
- **Ports 3000 / 8000 / 8025 in use.** Stop whatever is using them, or edit the
  port mappings in `docker-compose.yml`.
- **No emails showing up.** Confirm `EMAIL_BACKEND=smtp` and that Mailpit is
  running, then check http://localhost:8025. Set `EMAIL_BACKEND=console` to log
  emails to stdout instead.
- **Reset all data.** `docker compose down -v` drops the Postgres volume and the
  uploads volume, then `docker compose up --build` starts fresh.

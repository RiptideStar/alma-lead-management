# Alma — Lead Management System

A small production-shaped system for capturing and managing prospect **leads**.

- **Public lead form** — prospects submit first name, last name, email, and a
  resume/CV. No auth required.
- **Automated emails** — on submission, both the prospect and an attorney get an
  email.
- **Internal console (auth-guarded)** — attorneys log in, browse all leads, and
  mark a lead `PENDING → REACHED_OUT` after reaching out.

## Stack

| Layer     | Choice                                                            |
|-----------|------------------------------------------------------------------|
| Backend   | **FastAPI**, SQLAlchemy 2.0, Alembic, Pydantic v2 (managed by uv) |
| Frontend  | **Next.js 15** (App Router), TypeScript, Tailwind CSS            |
| Database  | **PostgreSQL 16**                                                |
| Email     | SMTP abstraction → **Mailpit** locally, any SMTP provider in prod |
| Storage   | Pluggable file storage → local disk locally, S3-ready interface  |
| Auth      | JWT (HS256) in an httpOnly cookie, bcrypt password hashing        |

## Quickstart (one command)

```bash
cp .env.example .env
docker compose up --build
```

Then open:

| URL                              | What                                        |
|----------------------------------|---------------------------------------------|
| http://localhost:3000            | Public lead form                            |
| http://localhost:3000/login      | Attorney login (seeded creds below)         |
| http://localhost:3000/admin/leads| Internal leads console                       |
| http://localhost:8000/docs       | FastAPI interactive API docs                |
| http://localhost:8025            | Mailpit — view the emails that were "sent"  |

**Seeded attorney login:** `attorney@alma.com` / `almapassword` (override in `.env`).

Submit a lead on the public form, then watch the two emails land in Mailpit and
the lead appear in the internal console.

## Documentation

- [docs/RUNNING.md](docs/RUNNING.md) — run locally (docker + native dev)
- [docs/DESIGN.md](docs/DESIGN.md) — system design, data model, tradeoffs
- [docs/API_CONTRACT.md](docs/API_CONTRACT.md) — API reference
- [docs/AGENTS.md](docs/AGENTS.md) — how coding agents were used to build this
- [NOTES.md](NOTES.md) — agent-generated vs. hand-written attribution

## Repository layout

```
.
├── backend/      FastAPI app (API, models, services, migrations, tests)
├── frontend/     Next.js app (public form + internal console)
├── docs/         design, run, API, and agent-usage docs
├── docker-compose.yml
└── .env.example
```

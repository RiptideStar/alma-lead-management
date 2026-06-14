# Authorship & attribution

This project was built with heavy, deliberate use of coding agents (Claude Code),
which the assignment encourages. The full writeup, tools, and prompt logs are in
[docs/AGENTS.md](docs/AGENTS.md). This file is the file-level map of who wrote what.

Two layers of attribution:
- **Commits** are authored by me and carry a `Co-Authored-By: Claude` trailer;
  commit bodies note whether the change was conductor-authored or executor-generated.
- **This table** is the finer-grained breakdown.

## Conductor (hand-authored / human-directed)

The contract and the judgment calls — written directly while planning, reviewing,
and integrating:

- `docs/API_CONTRACT.md` — the single source of truth both executors built against
- `docker-compose.yml`, `.env.example`, `.gitignore`
- `README.md`, `docs/DESIGN.md`, `docs/RUNNING.md`, `docs/AGENTS.md`,
  `docs/agent-logs/executor-prompts.md`, this file
- Integration fix + cleanups after review:
  `backend/app/api/routes/leads.py` (async→sync threadpool fix),
  `backend/app/services/leads.py` and `backend/app/main.py` (small cleanups),
  and the `5433` host-port change in `docker-compose.yml` / config.

## Agent-generated (Sonnet executors, reviewed + verified by me)

- **`backend/`** — the FastAPI implementation: models, schemas, routes, services
  (leads, email, storage), auth/security, Alembic migration, seed, and the pytest
  suite. Generated against the contract by the backend executor.
- **`frontend/`** — the Next.js implementation: public lead form, login, attorney
  console (list + detail), BFF route handlers, middleware, components, and lib.
  Generated against the contract by the frontend executor.

Everything in those two directories was read, run, and verified end-to-end before
being accepted; see [docs/AGENTS.md](docs/AGENTS.md) for the one bug that review
caught and how it was fixed.

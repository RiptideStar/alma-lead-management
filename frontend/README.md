# Frontend — Alma Lead Management

Next.js 15 (App Router) + TypeScript + Tailwind. Two surfaces:

- **Public lead form** (`/`) — posts multipart directly to the FastAPI backend.
- **Attorney console** (`/login`, `/admin/leads`) — guarded by middleware, with a
  thin BFF (`app/api/admin/*`) that keeps the JWT in an httpOnly cookie.

It talks to the backend via two env vars: `NEXT_PUBLIC_API_URL` (browser, baked at
build) and `BACKEND_URL` (server-side only).

See the repo root for everything else:
[run instructions](../docs/RUNNING.md) · [design](../docs/DESIGN.md) ·
[API contract](../docs/API_CONTRACT.md).

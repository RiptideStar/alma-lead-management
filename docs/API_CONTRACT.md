# API Contract (ground truth for backend + frontend)

Backend base URL: `http://localhost:8000`. All API routes are under `/api`.
Interactive docs (OpenAPI) at `http://localhost:8000/docs`.

## Auth model

- Login returns a JWT (HS256). The backend is **stateless**: protected routes
  require `Authorization: Bearer <token>`.
- The frontend stores the JWT in an **httpOnly cookie** set by the Next.js BFF
  (so it never touches client JS). Server components / route handlers read the
  cookie and forward it to the backend as a Bearer token.

## Entities

### Lead (JSON returned to clients)
```json
{
  "id": "f1e2d3c4-...uuid",
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "state": "PENDING",
  "resume_filename": "jane_resume.pdf",
  "resume_content_type": "application/pdf",
  "resume_size_bytes": 24680,
  "created_at": "2026-06-13T22:00:00Z",
  "updated_at": "2026-06-13T22:00:00Z",
  "reached_out_at": null
}
```
- `state` ∈ `PENDING` | `REACHED_OUT`. New leads start `PENDING`.
- The resume binary is NOT inlined; download it via the resume endpoint.

### User (attorney)
```json
{ "id": "uuid", "email": "attorney@alma.com", "name": "Alex Attorney" }
```

## Endpoints

### Public (no auth)
- `GET /api/health` → `200 {"status":"ok"}`
- `POST /api/leads`  — **multipart/form-data**, PUBLIC
  - `first_name` (str, 1..100, required)
  - `last_name`  (str, 1..100, required)
  - `email`      (str, valid email, required)
  - `resume`     (file, required; allowed: pdf, doc, docx, txt; ≤ 5 MB)
  - `201` → Lead. Side effect: stores file, creates lead `PENDING`, and sends
    two emails in the background (prospect confirmation + attorney notification).
  - `400` bad file type/size · `422` field validation error.

### Auth
- `POST /api/auth/login` — **application/json** `{ "email", "password" }`
  - `200` → `{ "access_token": "...", "token_type": "bearer", "user": {User} }`
  - `401` invalid credentials.
- `GET /api/auth/me` (Bearer) → `200 {User}` · `401`.

### Internal (Bearer required)
- `GET /api/leads` — list. Query params:
  - `skip` (int ≥ 0, default 0), `limit` (int 1..100, default 50)
  - `state` (optional `PENDING|REACHED_OUT`)
  - `search` (optional; case-insensitive match on first/last/email)
  - `200` → `{ "items": [Lead], "total": int, "skip": int, "limit": int }`
- `GET /api/leads/{id}` → `200 {Lead}` · `404`
- `PATCH /api/leads/{id}` — **application/json** `{ "state": "REACHED_OUT" }`
  - Valid transition: `PENDING → REACHED_OUT` only.
  - `200` → updated Lead (sets `reached_out_at`, records actor).
  - `404` not found · `409` invalid transition (e.g. already `REACHED_OUT`).
- `GET /api/leads/{id}/resume` (Bearer) → streams the file with
  `Content-Disposition: attachment; filename="..."` · `404`.

## Errors
JSON `{ "detail": "..." }` (FastAPI default). Validation errors use FastAPI's
422 shape.

## CORS
Backend allows origin `http://localhost:3000` with credentials so the browser
can POST the public lead form directly.

## Frontend routes
- `/`                      public lead submission form (with success state)
- `/login`                 attorney login
- `/admin/leads`           internal list (guarded by middleware)
- `/admin/leads/[id]`      lead detail + "Mark as reached out" action

### Frontend BFF (Next route handlers, server-side)
- `POST /api/admin/login`  → backend login, set httpOnly `access_token` cookie
- `POST /api/admin/logout` → clear cookie
- Admin reads: server components read cookie, call backend with Bearer.
- `PATCH /api/admin/leads/[id]` → proxy state change with Bearer.
- `GET /api/admin/leads/[id]/resume` → proxy resume download with Bearer.

## Emails (sent on lead creation, via SMTP→Mailpit locally)
1. To prospect (`lead.email`): subject "We received your application" —
   warm confirmation.
2. To attorney (`LEAD_NOTIFICATION_EMAIL`): subject
   "New lead: {first} {last}" — details + link to `INTERNAL_APP_URL`.

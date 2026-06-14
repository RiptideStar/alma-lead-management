# Coding-agent usage

Heavy agent use, structured as a tier ladder. Full prompt logs are in
[agent-logs/executor-prompts.md](agent-logs/executor-prompts.md).

## Tools

- **Claude Code** as the harness. A single conductor model (Opus) owned the
  plan and the architecture and spawned two executor subagents (Sonnet), one for
  `backend/` and one for `frontend/`, running in parallel.
- **Codex (gpt-5.5)** was invoked as an independent plan reviewer. It hit a local
  config / service-tier mismatch and did not return a review, so I relied on the
  Claude conductor for the design pass. (Mentioned for honesty, since the point
  is how agents were used.)

## What I delegated vs. wrote myself

**Wrote myself (conductor, by hand):** the things that had to be right before any
code was generated, and the things that needed judgment afterward.
- The API contract (`docs/API_CONTRACT.md`) as the single source of truth both
  executors built against, so two parallel agents could not drift apart.
- Infra and config: `docker-compose.yml`, `.env.example`, and the host-port
  decision (5433) once I hit a real Postgres clash during testing.
- All verification: standing up the stack, the end-to-end browser run, reading
  every security-sensitive file, and the design docs.

**Delegated to executors:** essentially all of the implementation — the FastAPI
app (models, routes, services, auth, Alembic, tests) and the Next.js app (public
form, BFF auth, admin console, components). Each executor was given the contract,
a precise list of footguns to avoid, and a "verify it yourself" instruction
(run pytest / run the build). This is where the bulk of the lines came from.

The split follows the idea that the strongest model should plan once and the
cheaper, faster models should do the parallel build under a tight spec.

## One place the agent produced subtly bad code

The backend executor wrote the lead-create endpoint as an `async def` route, then
called the **synchronous** SQLAlchemy session and file storage inside it
(`data = await resume.read()` followed by blocking `db.commit()` and
`storage.save(...)`). It passes every test and works fine for one user, which is
what makes it subtle: blocking calls inside an `async` route run **on the event
loop**, so under real concurrency they serialize every request instead of being
handed off to FastAPI's threadpool.

I caught it while reading the route during verification (not from a failing test
— the tests are single-threaded, so they never expose it). The fix was to make
the route a plain `def` so FastAPI runs it in its threadpool, and read the upload
synchronously:

```python
# before
async def create_lead(..., resume: UploadFile = Form(...)):
    data = await resume.read()
    ...                       # blocking db.commit() on the event loop

# after
def create_lead(..., resume: UploadFile = File(...)):
    data = resume.file.read()
    ...                       # now runs in the threadpool, event loop stays free
```

Verified the 17 tests still pass after the change. (The same edit also corrected
`Form(...)` → `File(...)` for the upload, the idiomatic FastAPI declaration.)

## Attribution

Commits that carry agent-generated code use a `Co-Authored-By: Claude` trailer,
and [NOTES.md](../NOTES.md) records which areas were conductor-authored vs.
executor-generated.

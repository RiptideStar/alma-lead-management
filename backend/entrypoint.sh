#!/bin/sh
set -e

echo "Running Alembic migrations..."
uv run alembic upgrade head

echo "Running seed..."
uv run python -m app.seed

echo "Starting uvicorn..."
# --timeout-keep-alive 65: hold idle keep-alive connections open longer than the
# Next.js (undici) server-side fetch pool reuses them, avoiding UND_ERR_SOCKET
# ("other side closed") when the BFF reuses a connection uvicorn already dropped.
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 65

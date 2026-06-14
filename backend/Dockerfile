FROM python:3.12-slim

# Install system deps needed by psycopg[binary]
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency manifests first (cache layer). The project is a hatchling
# package, so install deps WITHOUT the project here (source isn't present yet).
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --no-install-project

# Copy application code, then install the project itself.
COPY . .
RUN uv sync --no-dev

EXPOSE 8000

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

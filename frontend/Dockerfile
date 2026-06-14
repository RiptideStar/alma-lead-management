# Multi-stage build for Next.js 15 standalone output
# NEXT_PUBLIC_API_URL is baked at build time so the browser bundle has it.
# BACKEND_URL is server-side runtime only (not NEXT_PUBLIC_) — never expose it here.

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable pnpm

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Bake the browser-facing API base URL at build time.
# docker-compose can override this ARG → ENV before `next build`.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Re-declare so the value is available at runtime too (for any server-side code
# that reads NEXT_PUBLIC_API_URL — though clients use the baked value).
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# BACKEND_URL is injected by docker-compose at runtime (server-side only).
ENV BACKEND_URL=http://localhost:8000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone output produces a minimal server bundle
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]

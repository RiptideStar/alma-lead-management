// Shared server-side fetch helper for talking to the FastAPI backend.
// Retries transient socket errors: Next.js (undici) can reuse a keep-alive
// connection the backend just closed, which surfaces as
// UND_ERR_SOCKET "other side closed". Retrying opens a fresh connection.
// BACKEND_URL is server-side only — never prefix it NEXT_PUBLIC_.

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function fetchBackend(
  path: string,
  init: RequestInit = {},
  attempts = 3
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${BACKEND_URL}${path}`;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, { cache: "no-store", ...init });
    } catch (err) {
      lastErr = err;
      // brief backoff before retrying with a fresh connection
      await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    }
  }
  throw lastErr;
}

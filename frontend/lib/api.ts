// Server-side fetch helper for BFF / server components.
// Reads the httpOnly "access_token" cookie from the incoming request and
// forwards it to the backend as a Bearer token.
// BACKEND_URL is a server-side-only env var (never NEXT_PUBLIC_).

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Lead, LeadListResponse, User } from "./types";
import { fetchBackend } from "./backend";

async function getToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get("access_token")?.value;
}

async function backendFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetchBackend(path, { ...init, headers });
  if (res.status === 401) {
    redirect("/login");
  }
  return res;
}

export async function getMe(): Promise<User> {
  const res = await backendFetch("/api/auth/me");
  if (!res.ok) redirect("/login");
  return res.json() as Promise<User>;
}

export async function getLeads(params: {
  skip?: number;
  limit?: number;
  state?: string;
  search?: string;
}): Promise<LeadListResponse> {
  const qs = new URLSearchParams();
  if (params.skip !== undefined) qs.set("skip", String(params.skip));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.state) qs.set("state", params.state);
  if (params.search) qs.set("search", params.search);

  const res = await backendFetch(`/api/leads?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json() as Promise<LeadListResponse>;
}

export async function getLead(id: string): Promise<Lead> {
  const res = await backendFetch(`/api/leads/${id}`);
  if (res.status === 404) throw new Error("Lead not found");
  if (!res.ok) throw new Error("Failed to fetch lead");
  return res.json() as Promise<Lead>;
}

export { backendFetch };

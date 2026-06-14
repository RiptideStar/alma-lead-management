// BFF login handler.
// Receives { email, password } from the client, forwards to the backend,
// and on success sets an httpOnly cookie with the JWT so client JS never sees it.

import { type NextRequest, NextResponse } from "next/server";
import type { AuthResponse, ApiError } from "@/lib/types";
import { fetchBackend } from "@/lib/backend";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetchBackend("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach backend" },
      { status: 502 }
    );
  }

  if (!backendRes.ok) {
    const err = (await backendRes.json()) as ApiError;
    return NextResponse.json(err, { status: backendRes.status });
  }

  const data = (await backendRes.json()) as AuthResponse;

  const isProduction = process.env.NODE_ENV === "production";

  const response = NextResponse.json(
    { user: data.user },
    { status: 200 }
  );

  response.cookies.set("access_token", data.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    // JWT expiry matches backend default (480 min = 8 h)
    maxAge: 60 * 480,
  });

  return response;
}

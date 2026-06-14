// BFF resume proxy — streams the file from the backend with its original
// Content-Disposition and Content-Type headers, so the browser gets a download.

import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchBackend } from "@/lib/backend";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jar = await cookies();
  const token = jar.get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const backendRes = await fetchBackend(`/api/leads/${id}/resume`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!backendRes.ok) {
    return NextResponse.json(
      { detail: "Resume not found" },
      { status: backendRes.status }
    );
  }

  // Pass through the file stream with the original content headers
  const contentType =
    backendRes.headers.get("Content-Type") ?? "application/octet-stream";
  const contentDisposition = backendRes.headers.get("Content-Disposition") ?? "";

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", contentType);
  if (contentDisposition) {
    responseHeaders.set("Content-Disposition", contentDisposition);
  }

  return new NextResponse(backendRes.body, {
    status: 200,
    headers: responseHeaders,
  });
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getLead } from "@/lib/api";
import { MarkReachedOutButton } from "@/components/MarkReachedOutButton";

export const metadata = {
  title: "Lead Detail — Alma Attorney Console",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-[var(--card-border)] last:border-0">
      <dt className="w-40 shrink-0 text-sm font-medium text-[var(--muted)]">
        {label}
      </dt>
      <dd className="text-sm text-[var(--foreground)] mt-0.5 sm:mt-0">{value}</dd>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let lead;
  try {
    lead = await getLead(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found") || message.includes("404")) {
      notFound();
    }
    throw err;
  }

  const isReachedOut = lead.state === "REACHED_OUT";

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition mb-6"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to leads
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            {lead.first_name} {lead.last_name}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">{lead.email}</p>
        </div>

        {isReachedOut ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-light)] px-3 py-1 text-sm font-medium text-[var(--success)] shrink-0">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Reached out
          </span>
        ) : (
          <MarkReachedOutButton leadId={lead.id} />
        )}
      </div>

      {/* Details card */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] px-6 py-2 mb-6">
        <dl>
          <DetailRow label="First name" value={lead.first_name} />
          <DetailRow label="Last name" value={lead.last_name} />
          <DetailRow label="Email" value={lead.email} />
          <DetailRow label="Status" value={isReachedOut ? "Reached out" : "Pending"} />
          <DetailRow label="Submitted" value={formatDate(lead.created_at)} />
          <DetailRow label="Last updated" value={formatDate(lead.updated_at)} />
          {lead.reached_out_at && (
            <DetailRow
              label="Reached out at"
              value={formatDate(lead.reached_out_at)}
            />
          )}
        </dl>
      </div>

      {/* Resume section */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-6">
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">
          Resume / CV
        </h2>
        <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-lg bg-slate-50 border border-[var(--card-border)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-[var(--accent-light)] flex items-center justify-center shrink-0">
              <svg
                className="h-4 w-4 text-[var(--accent)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                {lead.resume_filename}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {formatBytes(lead.resume_size_bytes)} ·{" "}
                {lead.resume_content_type}
              </p>
            </div>
          </div>
          <a
            href={`/api/admin/leads/${lead.id}/resume`}
            download={lead.resume_filename}
            className="shrink-0 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}

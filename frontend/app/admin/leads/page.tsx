import Link from "next/link";
import { getLeads } from "@/lib/api";
import type { Lead } from "@/lib/types";
import { LeadFilters } from "@/components/LeadFilters";

export const metadata = {
  title: "Leads — Alma Attorney Console",
};

interface SearchParams {
  state?: string;
  search?: string;
  page?: string;
}

const LIMIT = 20;

function StateBadge({ state }: { state: Lead["state"] }) {
  if (state === "REACHED_OUT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--success)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
        Reached out
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--warning-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--warning)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" aria-hidden="true" />
      Pending
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (page - 1) * LIMIT;
  const stateFilter =
    params.state === "PENDING" || params.state === "REACHED_OUT"
      ? params.state
      : undefined;

  const data = await getLeads({
    skip,
    limit: LIMIT,
    state: stateFilter,
    search: params.search || undefined,
  });

  const totalPages = Math.ceil(data.total / LIMIT);
  const showing = {
    from: data.total === 0 ? 0 : skip + 1,
    to: Math.min(skip + LIMIT, data.total),
    total: data.total,
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Leads</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {data.total === 0
              ? "No leads yet"
              : `Showing ${showing.from}–${showing.to} of ${showing.total}`}
          </p>
        </div>
        <LeadFilters currentState={params.state} currentSearch={params.search} />
      </div>

      {data.items.length === 0 ? (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-12 text-center">
          <p className="text-[var(--muted)] text-sm">
            {params.search || params.state
              ? "No leads match your filters."
              : "No leads have been submitted yet."}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-slate-50">
                  <th
                    scope="col"
                    className="text-left px-6 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="text-left px-6 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="text-left px-6 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="text-left px-6 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider"
                  >
                    Submitted
                  </th>
                  <th scope="col" className="sr-only">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {data.items.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-[var(--foreground)] whitespace-nowrap">
                      {lead.first_name} {lead.last_name}
                    </td>
                    <td className="px-6 py-4 text-[var(--muted)] whitespace-nowrap">
                      {lead.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StateBadge state={lead.state} />
                    </td>
                    <td className="px-6 py-4 text-[var(--muted)] whitespace-nowrap">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="text-[var(--accent)] font-medium hover:underline text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={{
                query: {
                  ...(params.state ? { state: params.state } : {}),
                  ...(params.search ? { search: params.search } : {}),
                  page: String(page - 1),
                },
              }}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-slate-50 transition"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-[var(--muted)]">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={{
                query: {
                  ...(params.state ? { state: params.state } : {}),
                  ...(params.search ? { search: params.search } : {}),
                  page: String(page + 1),
                },
              }}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-slate-50 transition"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

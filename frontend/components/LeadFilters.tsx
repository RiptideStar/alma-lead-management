"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";

interface Props {
  currentState?: string;
  currentSearch?: string;
}

const STATE_OPTIONS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "REACHED_OUT", label: "Reached out" },
];

export function LeadFilters({ currentState, currentSearch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 on filter change
      params.delete("page");
      router.push(`/admin/leads?${params.toString()}`);
    },
    [router, searchParams]
  );

  function handleStateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    update("state", e.target.value);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const val = e.target.value;
    debounceRef.current = setTimeout(() => {
      update("search", val);
    }, 400);
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <input
        type="search"
        placeholder="Search by name or email…"
        defaultValue={currentSearch ?? ""}
        onChange={handleSearchChange}
        className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] w-full sm:w-56 transition"
        aria-label="Search leads"
      />

      <select
        value={currentState ?? ""}
        onChange={handleStateChange}
        className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition"
        aria-label="Filter by status"
      >
        {STATE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

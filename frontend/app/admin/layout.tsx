import Link from "next/link";
import { getMe } from "@/lib/api";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getMe();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Top navigation */}
      <header className="bg-[var(--card)] border-b border-[var(--card-border)] sticky top-0 z-10">
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between"
          aria-label="Main navigation"
        >
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link
              href="/admin/leads"
              className="flex items-center gap-2 text-[var(--accent)] font-semibold"
            >
              <div className="h-7 w-7 rounded-full bg-[var(--accent)] flex items-center justify-center">
                <span className="text-white font-bold text-xs">A</span>
              </div>
              <span className="tracking-tight">Alma</span>
            </Link>

            <Link
              href="/admin/leads"
              className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition"
            >
              Leads
            </Link>
          </div>

          {/* User / actions */}
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-[var(--muted)]">
              {user.name}
            </span>
            <LogoutButton />
          </div>
        </nav>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

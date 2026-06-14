import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Sign in — Alma Attorney Console",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-full bg-[var(--accent)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-[var(--accent)] font-semibold text-lg tracking-tight">
              Alma
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1.5">
            Attorney Sign In
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Internal case management console
          </p>
        </div>

        <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] shadow-sm p-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

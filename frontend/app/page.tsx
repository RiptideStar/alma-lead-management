import { LeadForm } from "@/components/LeadForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="w-full max-w-md mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-full bg-[var(--accent)] flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-[var(--accent)] font-semibold text-lg tracking-tight">
            Alma
          </span>
        </div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-3">
          Request a Case Assessment
        </h1>
        <p className="text-[var(--muted)] text-base leading-relaxed">
          An Alma immigration attorney will review your information and reach
          out within one business day.
        </p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-md bg-[var(--card)] rounded-2xl border border-[var(--card-border)] shadow-sm p-8">
        <LeadForm />
      </div>

      <p className="mt-8 text-xs text-[var(--muted)] text-center max-w-sm">
        Your information is kept strictly confidential and used only to assess
        your immigration case.
      </p>
    </main>
  );
}

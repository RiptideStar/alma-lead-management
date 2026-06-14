"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ALLOWED_EXTENSIONS = ".pdf, .doc, .docx, .txt";

const schema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or fewer"),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be 100 characters or fewer"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  resume: z
    .custom<FileList>()
    .refine((files) => files && files.length > 0, "Resume is required")
    .refine(
      (files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE,
      "File must be 5 MB or smaller"
    )
    .refine(
      (files) =>
        !files ||
        files.length === 0 ||
        ALLOWED_TYPES.includes(files[0].type) ||
        // fallback: check extension for .doc which can have wrong MIME
        /\.(pdf|doc|docx|txt)$/i.test(files[0].name),
      "Only PDF, DOC, DOCX, and TXT files are allowed"
    ),
});

type FormValues = z.infer<typeof schema>;

function extractErrorMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e: { msg?: string }) => e.msg ?? String(e))
      .join(", ");
  }
  return "Something went wrong. Please try again.";
}

export function LeadForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const form = new FormData();
    form.append("first_name", values.first_name);
    form.append("last_name", values.last_name);
    form.append("email", values.email);
    form.append("resume", values.resume[0]);

    try {
      const res = await fetch(`${apiUrl}/api/leads`, {
        method: "POST",
        body: form,
      });

      if (res.status === 201) {
        setSubmitted(true);
        return;
      }

      const body = await res.json().catch(() => ({ detail: "Unexpected error" }));
      setServerError(extractErrorMessage(body.detail));
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-4">
        <div className="h-14 w-14 rounded-full bg-[var(--success-light)] flex items-center justify-center mx-auto mb-5">
          <svg
            className="h-7 w-7 text-[var(--success)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
          Application received!
        </h2>
        <p className="text-[var(--muted)] text-sm leading-relaxed">
          An attorney will review your information and reach out to you shortly.
          Keep an eye on your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="first_name"
            className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
          >
            First name <span className="text-[var(--danger)]" aria-hidden>*</span>
          </label>
          <input
            id="first_name"
            type="text"
            autoComplete="given-name"
            {...register("first_name")}
            aria-invalid={!!errors.first_name}
            aria-describedby={errors.first_name ? "first_name-error" : undefined}
            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-white placeholder:text-[var(--muted)] outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] ${
              errors.first_name
                ? "border-[var(--danger)] focus:ring-[var(--danger)]"
                : "border-[var(--card-border)]"
            }`}
            placeholder="Jane"
          />
          {errors.first_name && (
            <p id="first_name-error" role="alert" className="mt-1.5 text-xs text-[var(--danger)]">
              {errors.first_name.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="last_name"
            className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
          >
            Last name <span className="text-[var(--danger)]" aria-hidden>*</span>
          </label>
          <input
            id="last_name"
            type="text"
            autoComplete="family-name"
            {...register("last_name")}
            aria-invalid={!!errors.last_name}
            aria-describedby={errors.last_name ? "last_name-error" : undefined}
            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-white placeholder:text-[var(--muted)] outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] ${
              errors.last_name
                ? "border-[var(--danger)] focus:ring-[var(--danger)]"
                : "border-[var(--card-border)]"
            }`}
            placeholder="Doe"
          />
          {errors.last_name && (
            <p id="last_name-error" role="alert" className="mt-1.5 text-xs text-[var(--danger)]">
              {errors.last_name.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
        >
          Email address <span className="text-[var(--danger)]" aria-hidden>*</span>
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-white placeholder:text-[var(--muted)] outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] ${
            errors.email
              ? "border-[var(--danger)] focus:ring-[var(--danger)]"
              : "border-[var(--card-border)]"
          }`}
          placeholder="jane@example.com"
        />
        {errors.email && (
          <p id="email-error" role="alert" className="mt-1.5 text-xs text-[var(--danger)]">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="resume"
          className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
        >
          Resume / CV <span className="text-[var(--danger)]" aria-hidden>*</span>
        </label>
        <input
          id="resume"
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          {...register("resume")}
          aria-invalid={!!errors.resume}
          aria-describedby={
            errors.resume ? "resume-error" : "resume-hint"
          }
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-white outline-none transition file:mr-3 file:rounded file:border-0 file:bg-[var(--accent-light)] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[var(--accent)] hover:file:bg-blue-100 cursor-pointer ${
            errors.resume
              ? "border-[var(--danger)]"
              : "border-[var(--card-border)]"
          }`}
        />
        <p id="resume-hint" className="mt-1.5 text-xs text-[var(--muted)]">
          {ALLOWED_EXTENSIONS} · max 5 MB
        </p>
        {errors.resume && (
          <p id="resume-error" role="alert" className="mt-1 text-xs text-[var(--danger)]">
            {errors.resume.message as string}
          </p>
        )}
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-lg bg-[var(--danger-light)] border border-[var(--danger)] px-4 py-3 text-sm text-[var(--danger)]"
        >
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Submitting…
          </span>
        ) : (
          "Submit Application"
        )}
      </button>
    </form>
  );
}

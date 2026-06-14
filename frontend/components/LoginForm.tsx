"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        router.push("/admin/leads");
        return;
      }

      if (res.status === 401) {
        setServerError("Invalid email or password.");
        return;
      }

      const body = await res.json().catch(() => ({}));
      const detail = body.detail;
      setServerError(
        typeof detail === "string"
          ? detail
          : "Something went wrong. Please try again."
      );
    } catch {
      setServerError("Network error. Please check your connection.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-white placeholder:text-[var(--muted)] outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] ${
            errors.email
              ? "border-[var(--danger)] focus:ring-[var(--danger)]"
              : "border-[var(--card-border)]"
          }`}
          placeholder="attorney@alma.com"
        />
        {errors.email && (
          <p id="login-email-error" role="alert" className="mt-1.5 text-xs text-[var(--danger)]">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[var(--foreground)] mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-[var(--foreground)] bg-white placeholder:text-[var(--muted)] outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] ${
            errors.password
              ? "border-[var(--danger)] focus:ring-[var(--danger)]"
              : "border-[var(--card-border)]"
          }`}
          placeholder="••••••••"
        />
        {errors.password && (
          <p id="login-password-error" role="alert" className="mt-1.5 text-xs text-[var(--danger)]">
            {errors.password.message}
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
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 mt-2"
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
            Signing in…
          </span>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import AltitudeLogo from "./altitude-logo";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding";

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Your passwords don’t match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const result: { error?: string } = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Unable to create your account.");
        return;
      }

      const login = await signIn("credentials", {
        identifier: email,
        password,
        redirect: false,
        callbackUrl: "/",
      });
      if (!login || login.error) {
        setError("Your account is ready. Please log in to continue.");
        return;
      }

      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "complete");
      router.replace(login.url ?? "/");
      router.refresh();
    } catch {
      setError("Unable to create your account right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page relative z-10 mx-auto flex min-h-[calc(100svh-6rem)] w-full max-w-md flex-col items-center justify-between px-6 pb-8 pt-8">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <AltitudeLogo compact />
        <h1 className="mt-5 text-xl font-bold tracking-wide">
          Create an account <span aria-hidden="true">☕</span>
        </h1>
        <form onSubmit={submit} className="mt-5 w-full space-y-3">
          <label className="sr-only" htmlFor="signup-name">
            Your name
          </label>
          <input
            id="signup-name"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
            required
            className="h-11 w-full rounded-xl border border-transparent bg-altitude-black/[0.025] px-4 text-sm outline-none transition placeholder:text-altitude-black/65 focus:border-altitude-navy focus:ring-2 focus:ring-altitude-navy/15"
          />
          <label className="sr-only" htmlFor="signup-email">
            Email address
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email ID"
            required
            className="h-11 w-full rounded-xl border border-transparent bg-altitude-black/[0.025] px-4 text-sm outline-none transition placeholder:text-altitude-black/65 focus:border-altitude-navy focus:ring-2 focus:ring-altitude-navy/15"
          />
          <label className="sr-only" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password (at least 8 characters)"
            required
            className="h-11 w-full rounded-xl border border-transparent bg-altitude-black/[0.025] px-4 text-sm outline-none transition placeholder:text-altitude-black/65 focus:border-altitude-navy focus:ring-2 focus:ring-altitude-navy/15"
          />
          <label className="sr-only" htmlFor="signup-confirm-password">
            Confirm password
          </label>
          <input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            maxLength={128}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm password"
            required
            className="h-11 w-full rounded-xl border border-transparent bg-altitude-black/[0.025] px-4 text-sm outline-none transition placeholder:text-altitude-black/65 focus:border-altitude-navy focus:ring-2 focus:ring-altitude-navy/15"
          />
          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full rounded-xl bg-altitude-black px-5 text-sm font-semibold text-altitude-white transition hover:bg-altitude-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>

      <p className="w-full rounded-full py-3 text-center text-sm font-medium text-altitude-white">
        Already have an account?{" "}
        <Link href="/login" className="font-bold underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}

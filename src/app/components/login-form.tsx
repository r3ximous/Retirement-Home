"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import AltitudeLogo from "./altitude-logo";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding";

export default function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
        callbackUrl: "/",
      });
      if (!result || result.error) {
        setError("We couldn’t sign you in. Check your details and try again.");
        return;
      }

      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "complete");
      router.replace(result.url ?? "/");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "complete");
    await signIn("google", { callbackUrl: "/" });
  }

  function continueAsGuest() {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "complete");
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="auth-page relative z-10 mx-auto flex min-h-[calc(100svh-6rem)] w-full max-w-md flex-col items-center justify-between px-6 pb-8 pt-12">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <AltitudeLogo />
        <form onSubmit={submit} className="mt-9 w-full space-y-3">
          <label className="sr-only" htmlFor="login-identifier">
            Email or phone number
          </label>
          <input
            id="login-identifier"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Email or phone number"
            required
            className="h-12 w-full rounded-xl border border-transparent bg-altitude-black/[0.025] px-4 text-sm outline-none transition placeholder:text-altitude-black/65 focus:border-altitude-navy focus:ring-2 focus:ring-altitude-navy/15"
          />
          <label className="sr-only" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
            className="h-12 w-full rounded-xl border border-transparent bg-altitude-black/[0.025] px-4 text-sm outline-none transition placeholder:text-altitude-black/65 focus:border-altitude-navy focus:ring-2 focus:ring-altitude-navy/15"
          />
          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 w-full rounded-xl bg-altitude-black px-5 text-base font-semibold text-altitude-white transition hover:bg-altitude-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div className="mt-4 w-full">
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={!googleEnabled}
            aria-describedby={
              googleEnabled ? undefined : "google-signin-setup"
            }
            className="flex min-h-11 w-full items-center justify-center gap-3 rounded-full bg-altitude-black/[0.025] text-sm font-medium transition hover:bg-altitude-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span aria-hidden="true" className="font-bold text-altitude-navy">
              G
            </span>
            Continue with Google
          </button>
          {!googleEnabled && (
            <p
              id="google-signin-setup"
              className="mt-2 text-center text-xs text-altitude-black/60"
            >
              Google sign-in needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET configured.
            </p>
          )}
        </div>

        <div className="mt-6 w-full border-t border-altitude-navy/15 pt-5">
          <button
            type="button"
            onClick={continueAsGuest}
            className="min-h-12 w-full rounded-xl border border-altitude-black/25 bg-white px-5 text-base font-semibold text-altitude-black transition hover:bg-altitude-black/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy"
          >
            Continue as guest
          </button>
          <p className="mt-2 text-center text-xs text-altitude-black/65">
            Browse and order without an account. Profile features require sign-in.
          </p>
        </div>
      </div>

      <p className="w-full rounded-full py-3 text-center text-sm font-medium text-altitude-white">
        Don’t have an account?{" "}
        <Link href="/signup" className="font-bold underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </div>
  );
}

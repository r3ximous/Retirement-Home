"use client";

import { useState, type FormEvent } from "react";
import KdsBoard from "./board";

function getErrorMessage(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const error = (value as Record<string, unknown>).error;
  return typeof error === "string" ? error : null;
}

export default function KdsAccess() {
  const [secret, setSecret] = useState("");
  const [activeSecret, setActiveSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const providedSecret = secret.trim();
    if (!providedSecret || connecting) return;

    setConnecting(true);
    setError(null);
    try {
      const response = await fetch("/api/kds/access", {
        headers: { "x-demo-secret": providedSecret },
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "Access denied. Check the DEMO_SECRET configured for this app."
            : getErrorMessage(payload) ?? "Unable to open the kitchen display.",
        );
      }

      setActiveSecret(providedSecret);
      setSecret("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to open the kitchen display.",
      );
    } finally {
      setConnecting(false);
    }
  }

  if (activeSecret) {
    return (
      <>
        <div className="flex items-center justify-between gap-4 bg-slate-950 px-5 py-3 text-white">
          <p className="text-sm text-slate-300">Kitchen access is active.</p>
          <button
            type="button"
            onClick={() => setActiveSecret(null)}
            className="rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Lock kitchen
          </button>
        </div>
        <KdsBoard demoSecret={activeSecret} />
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <form
        onSubmit={connect}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6"
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
          Altitude Cafe
        </p>
        <h1 className="mt-2 text-2xl font-bold">Kitchen Display</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the configured demo secret to view and advance orders.
        </p>
        <label
          htmlFor="kds-secret"
          className="mt-5 block text-sm font-medium text-slate-200"
        >
          Demo secret
        </label>
        <input
          id="kds-secret"
          type="password"
          autoComplete="current-password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          required
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        />
        {error && (
          <p className="mt-3 text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={connecting || secret.trim().length === 0}
          className="mt-5 min-h-11 w-full rounded-lg bg-amber-400 px-4 font-bold text-slate-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-wait disabled:opacity-60"
        >
          {connecting ? "Checking access…" : "Open kitchen"}
        </button>
      </form>
    </main>
  );
}

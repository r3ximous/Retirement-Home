"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Coffee,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

function getErrorMessage(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }
  return null;
}

export default function GodModeControls() {
  const [secret, setSecret] = useState("");
  const [activeSecret, setActiveSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const providedSecret = secret.trim();
    if (!providedSecret || busy) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/kds/access", {
        headers: { "x-demo-secret": providedSecret },
        cache: "no-store",
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "Access denied. Check the DEMO_SECRET configured for this app."
            : getErrorMessage(result) ?? "Unable to verify staff access.",
        );
      }

      setActiveSecret(providedSecret);
      setSecret("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to verify staff access.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestAction(
    url: string,
    body: Record<string, unknown>,
    successMessage: string,
  ) {
    if (!activeSecret || busy) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-secret": activeSecret,
        },
        body: JSON.stringify(body),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(result) ?? "The action could not be completed.",
        );
      }

      setMessage(successMessage);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The action could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function simulateWebhook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedOrderId = orderId.trim();
    if (!trimmedOrderId) {
      setError("Enter an order ID to confirm payment.");
      return;
    }

    void requestAction(
      "/api/webhooks/simulate",
      { orderId: trimmedOrderId },
      "Payment confirmation was simulated.",
    );
  }

  if (!activeSecret) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10 text-altitude-black">
        <form
          onSubmit={connect}
          className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg ring-1 ring-altitude-navy/10 mobile:p-8"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-altitude-navy/10 text-altitude-navy">
            <LockKeyhole aria-hidden="true" size={22} />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-altitude-navy">
            Altitude Cafe · Staff
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Admin controls
          </h1>
          <p className="mt-3 text-sm leading-6 text-altitude-navy/70">
            Enter the configured demo secret to manage test orders, rewards, and
            demo data.
          </p>
          <label
            htmlFor="admin-secret"
            className="mt-6 block text-sm font-semibold"
          >
            Demo secret
          </label>
          <input
            id="admin-secret"
            type="password"
            autoComplete="current-password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            required
            className="mt-2 min-h-12 w-full rounded-xl border border-altitude-navy/20 bg-white px-4 text-sm outline-none transition focus:border-altitude-navy focus:ring-2 focus:ring-altitude-navy/15"
          />
          {error && (
            <p className="mt-3 text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || secret.trim().length === 0}
            className="mt-5 min-h-12 w-full rounded-xl bg-altitude-black px-4 text-sm font-semibold text-altitude-white transition hover:bg-altitude-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Verifying access…" : "Open admin controls"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 pb-32 pt-8 text-altitude-black mobile:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-altitude-navy">
              Altitude Cafe · Staff
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Admin controls
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-altitude-navy/70">
              Manage the demo queue and test the order and rewards experience.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveSecret(null);
              setError(null);
              setMessage(null);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-altitude-navy/20 px-4 text-sm font-semibold text-altitude-navy transition hover:bg-altitude-navy/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Lock controls
          </button>
        </header>

        {(error || message) && (
          <p
            className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium ${
              error
                ? "bg-red-50 text-red-800"
                : "bg-emerald-50 text-emerald-800"
            }`}
            role={error ? "alert" : "status"}
          >
            {error ?? message}
          </p>
        )}

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-altitude-navy/10 mobile:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-altitude-navy/10 text-altitude-navy">
                <Coffee aria-hidden="true" size={19} />
              </span>
              <div>
                <h2 className="font-semibold">Order queue</h2>
                <p className="mt-1 text-sm text-altitude-navy/70">
                  Advance the latest active order.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void requestAction(
                    "/api/godmode",
                    { action: "ADVANCE_LATEST_ORDER", status: "Brewing" },
                    "Latest active order is now brewing.",
                  )
                }
                className="min-h-11 rounded-xl bg-altitude-black px-3 text-sm font-semibold text-altitude-white transition hover:bg-altitude-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy disabled:cursor-wait disabled:opacity-60"
              >
                Set to brewing
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void requestAction(
                    "/api/godmode",
                    { action: "ADVANCE_LATEST_ORDER", status: "Ready" },
                    "Latest active order is ready for pickup.",
                  )
                }
                className="min-h-11 rounded-xl bg-altitude-navy px-3 text-sm font-semibold text-white transition hover:bg-altitude-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy disabled:cursor-wait disabled:opacity-60"
              >
                Set to ready
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-altitude-navy/10 mobile:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-altitude-navy/10 text-altitude-navy">
                <Sparkles aria-hidden="true" size={19} />
              </span>
              <div>
                <h2 className="font-semibold">Reward overrides</h2>
                <p className="mt-1 text-sm text-altitude-navy/70">
                  Set the outcome of the next demo roll.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void requestAction(
                    "/api/godmode",
                    { action: "SET_GACHA_OVERRIDE", result: "GOLD_DOUBLE" },
                    "The next reward roll is set to the gold jackpot.",
                  )
                }
                className="min-h-11 rounded-xl bg-altitude-black px-3 text-sm font-semibold text-altitude-white transition hover:bg-altitude-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy disabled:cursor-wait disabled:opacity-60"
              >
                Force gold jackpot
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void requestAction(
                    "/api/godmode",
                    { action: "SET_GACHA_OVERRIDE", result: "FREE_ADDON" },
                    "The next reward roll is set to a free add-on.",
                  )
                }
                className="min-h-11 rounded-xl border border-altitude-navy/20 px-3 text-sm font-semibold text-altitude-navy transition hover:bg-altitude-navy/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy disabled:cursor-wait disabled:opacity-60"
              >
                Force free add-on
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-altitude-navy/10 mobile:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-altitude-navy/10 text-altitude-navy">
                <ShieldCheck aria-hidden="true" size={19} />
              </span>
              <div>
                <h2 className="font-semibold">Payment simulation</h2>
                <p className="mt-1 text-sm text-altitude-navy/70">
                  Confirm a demo order without a live payment.
                </p>
              </div>
            </div>
            <form onSubmit={simulateWebhook} className="mt-5">
              <label
                htmlFor="order-id"
                className="block text-sm font-medium text-altitude-black"
              >
                Order ID
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  id="order-id"
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  placeholder="Paste an order ID"
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-altitude-navy/20 px-3 text-sm outline-none transition focus:border-altitude-navy focus:ring-2 focus:ring-altitude-navy/15"
                />
                <button
                  type="submit"
                  disabled={busy || orderId.trim().length === 0}
                  className="min-h-11 rounded-xl bg-altitude-black px-4 text-sm font-semibold text-altitude-white transition hover:bg-altitude-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy disabled:cursor-wait disabled:opacity-60"
                >
                  Confirm payment
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-red-900/10 mobile:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-red-50 text-red-800">
                <RefreshCw aria-hidden="true" size={19} />
              </span>
              <div>
                <h2 className="font-semibold">Reset demo data</h2>
                <p className="mt-1 text-sm text-altitude-navy/70">
                  Restore the seeded demo database.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Reset the demo database? This replaces current demo data.",
                  )
                ) {
                  void requestAction(
                    "/api/godmode",
                    { action: "RESET_DEMO_SEED" },
                    "The demo database was reset.",
                  );
                }
              }}
              className="mt-5 min-h-11 w-full rounded-xl border border-red-800/20 px-4 text-sm font-semibold text-red-800 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 disabled:cursor-wait disabled:opacity-60"
            >
              Reset demo database
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

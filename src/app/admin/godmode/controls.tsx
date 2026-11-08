"use client";

import { useState } from "react";

interface GodModeControlsProps {
  demoSecret: string;
}

export default function GodModeControls({
  demoSecret,
}: GodModeControlsProps) {
  const [busy, setBusy] = useState(false);

  const request = async (url: string, body: Record<string, unknown>) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-demo-secret": demoSecret,
      },
      body: JSON.stringify(body),
    });

    const result: unknown = await response.json();
    if (!response.ok) {
      const message =
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string"
          ? result.error
          : "The action could not be completed.";
      throw new Error(message);
    }

    return result;
  };

  const triggerAction = async (
    action: string,
    payload: Record<string, unknown> = {},
  ) => {
    setBusy(true);
    try {
      await request("/api/godmode", { action, ...payload });
      alert(`Executed: ${action}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  };

  const simulateWebhook = async () => {
    const orderId = prompt("Enter Order ID to force payment confirmation:");
    if (!orderId) return;

    setBusy(true);
    try {
      await request("/api/webhooks/simulate", { orderId });
      alert("Simulated Webhook Fired!");
    } catch (error) {
      alert(error instanceof Error ? error.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-xl bg-slate-950 p-6 text-white">
      <h1 className="mb-2 text-2xl font-black text-amber-500">
        ⚡ DEMO GOD-MODE CONTROLS
      </h1>
      <p className="mb-6 text-xs text-gray-400">
        Use on stage to force order states, simulate payments, or lock Gacha
        results.
      </p>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-2 text-sm font-bold text-amber-300">
            Instant Order Queue Transitions
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                triggerAction("ADVANCE_LATEST_ORDER", { status: "Brewing" })
              }
              className="rounded bg-blue-600 py-2 text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              Set Latest -&gt; BREWING
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                triggerAction("ADVANCE_LATEST_ORDER", { status: "Ready" })
              }
              className="rounded bg-green-600 py-2 text-xs font-bold hover:bg-green-700 disabled:opacity-50"
            >
              Set Latest -&gt; READY 🔔
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-2 text-sm font-bold text-amber-300">
            Gacha Result Overrides
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                triggerAction("SET_GACHA_OVERRIDE", {
                  result: "GOLD_DOUBLE",
                })
              }
              className="rounded bg-amber-500 py-2 text-xs font-black text-black disabled:opacity-50"
            >
              Force GOLD JACKPOT 🏆
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                triggerAction("SET_GACHA_OVERRIDE", { result: "FREE_ADDON" })
              }
              className="rounded bg-purple-600 py-2 text-xs font-bold disabled:opacity-50"
            >
              Force Free Cookie 🍪
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-2 text-sm font-bold text-amber-300">
            Offline Fallback Controls
          </h2>
          <button
            type="button"
            disabled={busy}
            onClick={simulateWebhook}
            className="w-full rounded bg-indigo-600 py-2 text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            ⚡ Force Payment Confirm (offline webhook fallback)
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-2 text-sm font-bold text-amber-300">
            System Reset
          </h2>
          <button
            type="button"
            disabled={busy}
            onClick={() => triggerAction("RESET_DEMO_SEED")}
            className="w-full rounded bg-red-700 py-2 text-xs font-bold hover:bg-red-800 disabled:opacity-50"
          >
            Re-seed Fresh Demo Database
          </button>
        </div>
      </div>
    </div>
  );
}

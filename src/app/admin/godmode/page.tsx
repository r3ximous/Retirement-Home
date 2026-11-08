import { Suspense } from "react";
import { headers } from "next/headers";
import { isValidDemoSecret } from "@/lib/auth";
import GodModeControls from "./controls";

export default function GodModePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
          <p>Checking demo access…</p>
        </main>
      }
    >
      <GodModeGate />
    </Suspense>
  );
}

async function GodModeGate() {
  const demoSecret = (await headers()).get("x-demo-secret");

  if (!demoSecret || !isValidDemoSecret(demoSecret)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <p role="alert">403 — Demo secret required.</p>
      </main>
    );
  }

  return <GodModeControls demoSecret={demoSecret} />;
}

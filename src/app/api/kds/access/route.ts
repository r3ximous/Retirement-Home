import { NextRequest, NextResponse } from "next/server";
import { requireDemoSecretHeader } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const denied = requireDemoSecretHeader(request);
  if (denied) return denied;

  return NextResponse.json(
    { authorized: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

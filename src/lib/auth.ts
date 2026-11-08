import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

export function isValidDemoSecret(providedSecret: string | null): boolean {
  const expectedSecret = process.env.DEMO_SECRET;
  if (!expectedSecret || !providedSecret) {
    return false;
  }

  const expected = Buffer.from(expectedSecret);
  const provided = Buffer.from(providedSecret);
  return (
    expected.length === provided.length &&
    timingSafeEqual(expected, provided)
  );
}

export function requireDemoSecretHeader(
  req: NextRequest,
): NextResponse | null {
  if (!isValidDemoSecret(req.headers.get("x-demo-secret"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export function requireDemoSecret(req: NextRequest): NextResponse | null {
  return requireDemoSecretHeader(req);
}

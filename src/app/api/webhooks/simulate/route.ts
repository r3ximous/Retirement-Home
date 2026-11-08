import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { requireDemoSecret } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleCheckoutSessionCompleted } from "../stripe/route";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest) {
  const denied = requireDemoSecret(req);
  if (denied) {
    return denied;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.orderId !== "string" || !body.orderId.trim()) {
    return NextResponse.json({ error: "A valid orderId is required" }, { status: 400 });
  }

  const orderId = body.orderId.trim();
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, totalAmount: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const session: Pick<
      Stripe.Checkout.Session,
      "id" | "metadata" | "payment_status" | "amount_total" | "currency"
    > = {
      id: `sim_${order.id}`,
      metadata: { orderId: order.id },
      payment_status: "paid",
      amount_total: Math.round(order.totalAmount * 100),
      currency: "aed",
    };

    return await handleCheckoutSessionCompleted(session);
  } catch (error) {
    console.error("Failed to simulate Stripe checkout completion", error);
    return NextResponse.json(
      { error: "Unable to simulate payment confirmation" },
      { status: 500 },
    );
  }
}

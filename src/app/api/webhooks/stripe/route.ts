import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { awardPoints, clawbackPoints } from "@/lib/loyalty";

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return secretKey ? new Stripe(secretKey) : null;
}

type CheckoutSessionMetadata = Pick<
  Stripe.Checkout.Session,
  "id" | "metadata" | "payment_status" | "amount_total" | "currency"
>;

export async function handleCheckoutSessionCompleted(
  session: CheckoutSessionMetadata,
) {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    return NextResponse.json({ received: true });
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return { kind: "missing" as const };
    }

    if (session.payment_status !== "paid") {
      return { kind: "payment-pending" as const };
    }

    if (
      session.amount_total !== Math.round(order.totalAmount * 100) ||
      session.currency?.toLowerCase() !== "aed"
    ) {
      return { kind: "payment-mismatch" as const };
    }

    if (order.isPaid) {
      if (order.stripeSessionId && order.stripeSessionId !== session.id) {
        return { kind: "session-conflict" as const };
      }
      return { kind: "received" as const };
    }

    if (order.status === "Cancelled") {
      return { kind: "received" as const };
    }

    const updated = await tx.order.updateMany({
      where: { id: orderId, isPaid: false, status: { not: "Cancelled" } },
      data: {
        status: "Paid",
        isPaid: true,
        stripeSessionId: session.id,
      },
    });

    if (updated.count === 0) {
      const current = await tx.order.findUnique({ where: { id: orderId } });
      if (current?.isPaid && current.stripeSessionId !== session.id) {
        return { kind: "session-conflict" as const };
      }
      return { kind: current ? "received" as const : "missing" as const };
    }

    await awardPoints(orderId, tx);
    return { kind: "received" as const };
  });

  if (result.kind === "missing") {
    console.error("Stripe checkout session references a missing order", { orderId });
    return NextResponse.json({ error: "Order not found" }, { status: 500 });
  }
  if (result.kind === "session-conflict") {
    console.error("Stripe checkout session conflicts with the paid order", { orderId });
    return NextResponse.json({ error: "Order was paid by a different session" }, { status: 409 });
  }
  if (result.kind === "payment-mismatch") {
    console.error("Stripe checkout amount or currency does not match the order", { orderId });
    return NextResponse.json({ error: "Payment does not match the order" }, { status: 409 });
  }

  return NextResponse.json({ received: true });
}

export async function handleCheckoutSessionExpired(
  session: CheckoutSessionMetadata,
) {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    return NextResponse.json({ received: true });
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return "missing" as const;
    }
    if (order.isPaid) {
      return "received" as const;
    }

    await tx.order.updateMany({
      where: { id: orderId, isPaid: false, status: "Pending" },
      data: { status: "Cancelled" },
    });
    await clawbackPoints(orderId, tx);
    return "received" as const;
  });

  if (result === "missing") {
    console.error("Expired Stripe checkout session references a missing order", { orderId });
    return NextResponse.json({ error: "Order not found" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
      );
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      return handleCheckoutSessionExpired(
        event.data.object as Stripe.Checkout.Session,
      );
    default:
      return NextResponse.json({ received: true });
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripeClient();
  if (!webhookSecret || !stripe) {
    console.error("Stripe webhook is not configured");
    return NextResponse.json(
      { error: "Stripe webhook is not configured" },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json(
      { error: `Webhook signature error: ${message}` },
      { status: 400 },
    );
  }

  try {
    return await handleStripeEvent(event);
  } catch (error) {
    console.error("Failed to process Stripe webhook event", error);
    return NextResponse.json(
      { error: "Unable to process Stripe webhook event" },
      { status: 500 },
    );
  }
}

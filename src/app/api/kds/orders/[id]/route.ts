import { NextRequest, NextResponse } from "next/server";
import { requireDemoSecretHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const NEXT_STATUS: Record<string, string> = {
  Pending: "Brewing",
  Paid: "Brewing",
  Brewing: "Ready",
  Ready: "Claimed",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const denied = requireDemoSecretHeader(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  if (!isRecord(body) || typeof body.status !== "string") {
    return NextResponse.json(
      { error: "A next order status is required" },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, queueNumber: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (NEXT_STATUS[order.status] !== body.status) {
      return NextResponse.json(
        { error: `Order cannot move from ${order.status} to ${body.status}` },
        { status: 409 },
      );
    }

    const result = await prisma.order.updateMany({
      where: { id, status: order.status },
      data: { status: body.status },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { error: "Order status changed before this update could be applied" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      orderId: order.id,
      queueNumber: order.queueNumber,
      status: body.status,
    });
  } catch (error) {
    console.error("Failed to update KDS order status", error);
    return NextResponse.json(
      { error: "Unable to update order status" },
      { status: 500 },
    );
  }
}

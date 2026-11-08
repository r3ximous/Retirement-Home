import { NextRequest, NextResponse } from "next/server";
import { seedDemoDatabase } from "../../../../prisma/seed";
import { requireDemoSecretHeader } from "@/lib/auth";
import { setGachaOverride } from "@/lib/gacha";
import { prisma } from "@/lib/prisma";

const ACTIVE_ORDER_STATUSES = ["Pending", "Paid", "Brewing", "Ready"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest) {
  const denied = requireDemoSecretHeader(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  if (!isRecord(body) || typeof body.action !== "string") {
    return NextResponse.json({ error: "A valid action is required" }, { status: 400 });
  }

  if (body.action === "ADVANCE_LATEST_ORDER") {
    if (body.status !== "Brewing" && body.status !== "Ready") {
      return NextResponse.json(
        { error: "Status must be Brewing or Ready" },
        { status: 400 },
      );
    }

    try {
      const latestOrder = await prisma.order.findFirst({
        where: { status: { in: ACTIVE_ORDER_STATUSES } },
        orderBy: [{ createdAt: "desc" }, { queueNumber: "desc" }],
        select: { id: true, queueNumber: true },
      });

      if (!latestOrder) {
        return NextResponse.json(
          { error: "There are no active orders to advance" },
          { status: 404 },
        );
      }

      const updated = await prisma.order.updateMany({
        where: {
          id: latestOrder.id,
          status: { in: ACTIVE_ORDER_STATUSES },
        },
        data: { status: body.status },
      });

      if (updated.count === 0) {
        return NextResponse.json(
          { error: "The latest order changed before it could be advanced" },
          { status: 409 },
        );
      }

      return NextResponse.json({
        orderId: latestOrder.id,
        queueNumber: latestOrder.queueNumber,
        status: body.status,
      });
    } catch (error) {
      console.error("Failed to advance the latest demo order", error);
      return NextResponse.json(
        { error: "Unable to advance the latest order" },
        { status: 500 },
      );
    }
  }

  if (body.action === "SET_GACHA_OVERRIDE") {
    if (body.result !== "GOLD_DOUBLE" && body.result !== "FREE_ADDON") {
      return NextResponse.json(
        { error: "Unsupported Gacha override" },
        { status: 400 },
      );
    }

    setGachaOverride(body.result);
    return NextResponse.json({ override: body.result });
  }

  if (body.action === "RESET_DEMO_SEED") {
    try {
      await seedDemoDatabase();
      return NextResponse.json({ reset: true });
    } catch (error) {
      console.error("Failed to reset the demo seed", error);
      return NextResponse.json(
        { error: "Unable to re-seed the demo database" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

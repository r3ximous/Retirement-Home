import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAndPriceOrder } from "@/lib/orderValidation";

const FULL_SLOT_ERROR =
  "Selected pickup timeslot is at full kitchen capacity. Please pick another slot.";

class OrderValidationError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 409,
  ) {
    super(message);
    this.name = "OrderValidationError";
  }
}

let reservationQueue = Promise.resolve();

async function serializeReservation<T>(reserve: () => Promise<T>): Promise<T> {
  const previous = reservationQueue;
  let release!: () => void;
  reservationQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;

  try {
    return await reserve();
  } finally {
    release();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  let phone: string | null = null;
  let customerName = "Student Customer";
  if (body.customer !== undefined) {
    if (!isRecord(body.customer) || typeof body.customer.phone !== "string") {
      return NextResponse.json(
        { error: "Customer phone number is invalid" },
        { status: 400 },
      );
    }

    phone = body.customer.phone.trim();
    if (phone.length === 0 || phone.length > 64) {
      return NextResponse.json(
        { error: "Customer phone number is invalid" },
        { status: 400 },
      );
    }

    const name = body.customer.name;
    if (name !== undefined && name !== null && typeof name !== "string") {
      return NextResponse.json({ error: "Customer name is invalid" }, { status: 400 });
    }
    customerName =
      typeof name === "string" ? name.trim() || "Student Customer" : customerName;
    if (customerName.length > 120) {
      return NextResponse.json({ error: "Customer name is invalid" }, { status: 400 });
    }
  }

  let pickupTime: string | undefined;
  if (body.pickupTime !== undefined && body.pickupTime !== null) {
    if (typeof body.pickupTime !== "string" || body.pickupTime.length === 0) {
      return NextResponse.json(
        { error: "Pickup timeslot is invalid" },
        { status: 400 },
      );
    }
    pickupTime = body.pickupTime;
  }

  try {
    const slotDate = pickupTime === undefined ? null : new Date(pickupTime);
    const order = await serializeReservation(() => prisma.$transaction(async (tx) => {
      // Take SQLite's write lock before reading capacity; the final check and
      // reservation then serialize with competing order-creation transactions.
      const customer = phone
        ? await tx.userProfile.upsert({
            where: { phone },
            update: {},
            create: { phone, fullName: customerName },
            select: { id: true },
          })
        : null;

      const currentValidation = await validateAndPriceOrder(
        body.items,
        pickupTime,
        tx,
      );
      if (!currentValidation.isValid) {
        throw new OrderValidationError(
          currentValidation.error ?? "Order could not be validated",
          currentValidation.error === FULL_SLOT_ERROR ? 409 : 400,
        );
      }

      const queueNumber =
        ((await tx.order.aggregate({ _max: { queueNumber: true } }))._max
          .queueNumber ?? 0) + 1;
      const createdOrder = await tx.order.create({
        data: {
          queueNumber,
          customerId: customer?.id ?? null,
          customerPhone: phone,
          itemsJson: JSON.stringify(currentValidation.verifiedItems),
          totalAmount: currentValidation.totalAmount,
          status: "Pending",
          timeslot: slotDate,
        },
      });

      for (const item of currentValidation.verifiedItems) {
        await tx.menuItem.update({
          where: { id: item.id },
          data: { orderCount: { increment: item.quantity } },
        });
      }

      return createdOrder;
    }, { maxWait: 30_000, timeout: 30_000 }));

    return NextResponse.json({
      orderId: order.id,
      queueNumber: order.queueNumber,
      totalAmount: order.totalAmount,
    });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to create order", error);
    return NextResponse.json(
      { error: "Unable to create order. Please try again." },
      { status: 500 },
    );
  }
}

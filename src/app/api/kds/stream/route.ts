import { NextRequest } from "next/server";
import { requireDemoSecretHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const POLL_INTERVAL_MS = 1_500;
const ACTIVE_KDS_STATUSES = ["Pending", "Paid", "Brewing", "Ready"];

interface OrderItem {
  title: string;
  quantity: number;
}

function parseItems(itemsJson: string): OrderItem[] {
  const items: unknown = JSON.parse(itemsJson);
  if (
    !Array.isArray(items) ||
    !items.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        typeof item.title === "string" &&
        "quantity" in item &&
        typeof item.quantity === "number",
    )
  ) {
    throw new Error("Order contains invalid item data");
  }

  return items;
}

export async function GET(req: NextRequest) {
  const denied = requireDemoSecretHeader(req);
  if (denied) return denied;

  const encoder = new TextEncoder();
  let stopStreaming: (() => void) | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let closed = false;

      const stop = () => {
        if (closed) return;
        closed = true;
        if (timer) clearTimeout(timer);
        req.signal.removeEventListener("abort", onAbort);
      };

      const close = () => {
        if (closed) return;
        stop();
        controller.close();
      };

      const onAbort = () => close();
      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      stopStreaming = stop;
      const poll = async () => {
        if (closed) return;

        try {
          const records = await prisma.order.findMany({
            where: { status: { in: ACTIVE_KDS_STATUSES } },
            orderBy: { queueNumber: "asc" },
            take: 100,
            select: {
              id: true,
              queueNumber: true,
              status: true,
              itemsJson: true,
              createdAt: true,
              customer: { select: { fullName: true } },
            },
          });

          if (closed) return;
          sendEvent({
            orders: records.map((order) => ({
              id: order.id,
              queueNumber: order.queueNumber,
              customerName: order.customer?.fullName ?? "Walk-in",
              status: order.status,
              items: parseItems(order.itemsJson),
              createdAt: order.createdAt.toISOString(),
            })),
          });
        } catch (error) {
          console.error("Failed to stream KDS orders", error);
          if (!closed) {
            sendEvent({ error: "Kitchen updates are temporarily unavailable." });
            close();
          }
          return;
        }

        if (!closed) timer = setTimeout(poll, POLL_INTERVAL_MS);
      };

      req.signal.addEventListener("abort", onAbort, { once: true });
      if (req.signal.aborted) {
        close();
        return;
      }
      void poll();
    },
    cancel() {
      stopStreaming?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

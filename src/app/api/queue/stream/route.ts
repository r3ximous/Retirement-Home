import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const POLL_INTERVAL_MS = 1_500;
const ACTIVE_QUEUE_STATUSES = ["Pending", "Paid", "Brewing"];
const TERMINAL_ORDER_STATUSES = new Set(["Claimed", "Cancelled"]);

export async function GET(req: NextRequest) {
  const orderId = new URL(req.url).searchParams.get("orderId");
  if (!orderId) {
    return new Response("Missing orderId parameter", { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) {
    return new Response("Order not found", { status: 404 });
  }

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

      stopStreaming = stop;
      const close = () => {
        if (closed) return;
        stop();
        controller.close();
      };

      const onAbort = () => close();
      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const poll = async () => {
        if (closed) return;

        try {
          const currentOrder = await prisma.order.findUnique({
            where: { id: orderId },
            select: {
              id: true,
              status: true,
              queueNumber: true,
              updatedAt: true,
            },
          });

          if (closed) return;
          if (!currentOrder) {
            sendEvent({ error: "Order not found" });
            close();
            return;
          }

          const ordersAhead = await prisma.order.count({
            where: {
              status: { in: ACTIVE_QUEUE_STATUSES },
              queueNumber: { lt: currentOrder.queueNumber },
            },
          });

          if (closed) return;
          sendEvent({
            status: currentOrder.status,
            ordersAhead,
            queueNumber: currentOrder.queueNumber,
            updatedAt: currentOrder.updatedAt,
          });

          if (TERMINAL_ORDER_STATUSES.has(currentOrder.status)) {
            close();
            return;
          }
        } catch (error) {
          console.error("Failed to stream queue updates", error);
          if (!closed) {
            sendEvent({ error: "Queue updates are temporarily unavailable" });
            close();
          }
          return;
        }

        if (!closed) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
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

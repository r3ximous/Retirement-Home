"use client";

import { useEffect, useState } from "react";

interface KdsOrderItem {
  title: string;
  quantity: number;
}

interface KdsOrder {
  id: string;
  queueNumber: number;
  customerName: string;
  status: "Pending" | "Paid" | "Brewing" | "Ready";
  items: KdsOrderItem[];
  createdAt: string;
}

type NextOrderStatus = "Brewing" | "Ready" | "Claimed";

interface KdsBoardProps {
  demoSecret: string;
}

const NEXT_ACTION: Record<
  KdsOrder["status"],
  { label: string; status: NextOrderStatus }
> = {
  Pending: { label: "Start brewing", status: "Brewing" },
  Paid: { label: "Start brewing", status: "Brewing" },
  Brewing: { label: "Mark ready", status: "Ready" },
  Ready: { label: "Mark collected", status: "Claimed" },
};

const COLUMNS: Array<{ title: string; statuses: KdsOrder["status"][] }> = [
  { title: "Incoming", statuses: ["Pending", "Paid"] },
  { title: "Brewing", statuses: ["Brewing"] },
  { title: "Ready", statuses: ["Ready"] },
];

function isKdsOrder(value: unknown): value is KdsOrder {
  if (typeof value !== "object" || value === null) return false;

  const order = value as Record<string, unknown>;
  return (
    typeof order.id === "string" &&
    typeof order.queueNumber === "number" &&
    typeof order.customerName === "string" &&
    ["Pending", "Paid", "Brewing", "Ready"].includes(String(order.status)) &&
    Array.isArray(order.items) &&
    order.items.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        typeof item.title === "string" &&
        "quantity" in item &&
        typeof item.quantity === "number",
    ) &&
    typeof order.createdAt === "string"
  );
}

function applyMessage(
  eventData: string,
  setOrders: (orders: KdsOrder[]) => void,
  setError: (message: string | null) => void,
): boolean {
  let message: unknown;
  try {
    message = JSON.parse(eventData);
  } catch {
    setError("The kitchen stream sent unreadable data.");
    return true;
  }

  if (typeof message !== "object" || message === null) {
    setError("The kitchen stream sent an unexpected update.");
    return true;
  }

  const data = message as Record<string, unknown>;
  if (typeof data.error === "string") {
    setError(data.error);
    return true;
  }
  if (!Array.isArray(data.orders) || !data.orders.every(isKdsOrder)) {
    setError("The kitchen stream sent an unexpected update.");
    return true;
  }

  setOrders(data.orders);
  setError(null);
  return false;
}

export default function KdsBoard({ demoSecret }: KdsBoardProps) {
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const advanceOrder = async (order: KdsOrder) => {
    if (updatingOrderId) return;

    setUpdatingOrderId(order.id);
    setActionError(null);
    const nextStatus = NEXT_ACTION[order.status].status;
    try {
      const response = await fetch(
        `/api/kds/orders/${encodeURIComponent(order.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-demo-secret": demoSecret,
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to update order status.";
        throw new Error(message);
      }

      if (nextStatus === "Claimed") {
        setOrders((current) => current.filter((item) => item.id !== order.id));
      } else {
        setOrders((current) =>
          current.map((item) =>
            item.id === order.id ? { ...item, status: nextStatus } : item,
          ),
        );
      }
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update order status.",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const connect = async () => {
      try {
        const response = await fetch("/api/kds/stream", {
          headers: { "x-demo-secret": demoSecret },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          throw new Error(
            response.status === 403
              ? "Kitchen access was denied."
              : "Unable to connect to the kitchen stream.",
          );
        }

        setStreamError(null);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamMessageError = false;

        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");

          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const event = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const data = event
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trimStart())
              .join("\n");
            if (data) {
              streamMessageError =
                applyMessage(data, setOrders, setStreamError) || streamMessageError;
            }
            boundary = buffer.indexOf("\n\n");
          }

          if (done) break;
        }

        if (!controller.signal.aborted && !streamMessageError) {
          setStreamError("Kitchen updates disconnected. Refresh to reconnect.");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setStreamError(
            error instanceof Error
              ? error.message
              : "Unable to connect to the kitchen stream.",
          );
        }
      }
    };

    void connect();
    return () => controller.abort();
  }, [demoSecret]);

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white tablet:p-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
            Altitude Cafe
          </p>
          <h1 className="mt-1 text-3xl font-black">Kitchen Display System</h1>
        </div>
        <p className="text-sm text-slate-400" role="status" aria-live="polite">
          {streamError ?? "Live order updates"}
        </p>
      </header>

      {actionError && (
        <p className="mb-5 text-sm text-rose-300" role="alert">
          {actionError}
        </p>
      )}

      <div className="grid gap-5 desktop:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnOrders = orders.filter((order) =>
            column.statuses.includes(order.status),
          );

          return (
            <section
              key={column.title}
              aria-label={`${column.title} orders`}
              className="min-h-64 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{column.title}</h2>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                  {columnOrders.length}
                </span>
              </div>
              <div className="space-y-3">
                {columnOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-2xl font-black text-amber-400">
                        #{order.queueNumber}
                      </h3>
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">
                      {order.customerName}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm">
                      {order.items.map((item, index) => (
                        <li key={`${item.title}-${index}`}>
                          <span className="font-bold text-white">
                            {item.quantity}x
                          </span>{" "}
                          {item.title}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-slate-500">
                      Placed{" "}
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <button
                      type="button"
                      disabled={updatingOrderId !== null}
                      onClick={() => void advanceOrder(order)}
                      className="mt-4 min-h-10 w-full rounded-lg bg-amber-400 px-3 text-sm font-bold text-slate-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-wait disabled:opacity-60"
                    >
                      {updatingOrderId === order.id
                        ? "Updating…"
                        : NEXT_ACTION[order.status].label}
                    </button>
                  </article>
                ))}
                {columnOrders.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No orders
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

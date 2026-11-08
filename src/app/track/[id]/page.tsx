"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Coffee, CircleCheck } from "lucide-react";

type OrderStatus =
  | "Pending"
  | "Paid"
  | "Brewing"
  | "Ready"
  | "Claimed"
  | "Cancelled";

interface OrderState {
  status: OrderStatus;
  ordersAhead: number;
  queueNumber: number;
}

interface OrderPresentation {
  fillHeight: number;
  title: string;
  description: string;
  cupCaption: string;
}

const ORDER_PRESENTATION: Record<OrderStatus, OrderPresentation> = {
  Pending: {
    fillHeight: 8,
    title: "Order received",
    description: "Your order is in the queue.",
    cupCaption: "Your order is in the queue.",
  },
  Paid: {
    fillHeight: 24,
    title: "Your order is confirmed",
    description: "Your barista will begin brewing soon.",
    cupCaption: "Your barista is getting ready.",
  },
  Brewing: {
    fillHeight: 52,
    title: "Your coffee is brewing!",
    description: "Your daily ritual is on its way.",
    cupCaption: "Your daily ritual is on its way.",
  },
  Ready: {
    fillHeight: 82,
    title: "Your coffee is ready!",
    description: "Collect it at the counter. Enjoy your coffee.",
    cupCaption: "Your daily ritual, ready.",
  },
  Claimed: {
    fillHeight: 82,
    title: "Coffee collected",
    description: "Hope you enjoy every sip.",
    cupCaption: "Enjoy every sip.",
  },
  Cancelled: {
    fillHeight: 0,
    title: "Order cancelled",
    description: "Payment was not completed. Any held points were refunded.",
    cupCaption: "We hope to see you again soon.",
  },
};

const ORDER_STEPS: Array<{ status: OrderStatus; label: string }> = [
  { status: "Pending", label: "Received" },
  { status: "Paid", label: "Confirmed" },
  { status: "Brewing", label: "Brewing" },
  { status: "Ready", label: "Ready" },
];

const INITIAL_ORDER_STATE: OrderState = {
  status: "Pending",
  ordersAhead: 0,
  queueNumber: 0,
};

function isOrderState(value: unknown): value is OrderState {
  if (typeof value !== "object" || value === null) return false;

  const data = value as Record<string, unknown>;
  return (
    isOrderStatus(data.status) &&
    typeof data.ordersAhead === "number" &&
    typeof data.queueNumber === "number"
  );
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return ["Pending", "Paid", "Brewing", "Ready", "Claimed", "Cancelled"].some(
    (status) => status === value,
  );
}

const pastOrders = [
  { name: "Flat white", date: "Today", price: 22 },
  { name: "Iced latte", date: "6 Nov", price: 24 },
  { name: "Americano", date: "4 Nov", price: 18 },
];

const suggestedPicks = [
  { name: "Iced oat latte", price: 26 },
  { name: "Almond croissant", price: 18 },
  { name: "Matcha latte", price: 28 },
];

function CoffeeCup({ status }: { status: OrderStatus }) {
  const { fillHeight } = ORDER_PRESENTATION[status];

  return (
    <svg
      aria-label={
        status === "Brewing"
          ? "Coffee filling animation"
          : `${status} order coffee cup`
      }
      className={`h-40 w-40 ${
        status === "Ready" ? "animate-coffee-ready" : ""
      }`}
      role="img"
      viewBox="0 0 180 190"
    >
      <path
        className={status === "Brewing" ? "animate-steam" : ""}
        d="M72 28v8m18-15v11m18-4v8"
        fill="none"
        opacity={status === "Brewing" ? 1 : 0.65}
        stroke="white"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <rect x="37" y="46" width="106" height="13" rx="4" fill="white" />
      <rect x="43" y="49" width="94" height="5" rx="2" fill="#050505" />
      <path
        d="M47 61h86l-13 98a7 7 0 0 1-7 6H67a7 7 0 0 1-7-6L47 61Z"
        fill="white"
      />
      <defs>
        <clipPath id="coffee-cup-fill">
          <path d="M54 66h72l-11 88H65L54 66Z" />
        </clipPath>
      </defs>
      <rect
        clipPath="url(#coffee-cup-fill)"
        height={fillHeight}
        style={{ transition: "height 1400ms ease, y 1400ms ease" }}
        width="74"
        x="53"
        y={154 - fillHeight}
        fill="#111111"
      />
      <path d="M57 108h66l-3 23H60l-3-23Z" fill="#050505" />
      <ellipse
        cx="90"
        cy="119.5"
        rx="5"
        ry="8"
        transform="rotate(22 90 119.5)"
        fill="white"
      />
      <path
        d="m87 126 6-13"
        fill="none"
        stroke="#050505"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black p-5 text-white">
          Connecting to your order…
        </main>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}

function OrderTrackingContent() {
  const { id } = useParams<{ id: string }>();
  const [orderState, setOrderState] = useState(INITIAL_ORDER_STATE);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousStatusRef = useRef<OrderStatus>(INITIAL_ORDER_STATE.status);

  useEffect(() => {
    let active = true;
    const audio = new Audio("/sounds/ready-chime.mp3");
    audio.preload = "auto";
    audioRef.current = audio;
    audio.muted = true;

    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        if (active) setAudioUnlocked(true);
      })
      .catch(() => {
        if (active) setAudioUnlocked(false);
      });

    const eventSource = new EventSource(
      `/api/queue/stream?orderId=${encodeURIComponent(id)}`,
    );

    eventSource.onmessage = (event) => {
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        setStreamError("A queue update could not be read. Reconnecting…");
        return;
      }

      if (
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string"
      ) {
        setStreamError(data.error);
        return;
      }

      if (!isOrderState(data)) {
        setStreamError("The queue sent an unexpected update.");
        return;
      }

      setStreamError(null);
      setOrderState(data);

      if (data.status === "Ready" && previousStatusRef.current !== "Ready") {
        void audioRef.current?.play().catch(() => setAudioUnlocked(false));
        if (typeof navigator.vibrate === "function") {
          navigator.vibrate([200, 100, 200]);
        }
      }

      previousStatusRef.current = data.status;
      if (data.status === "Claimed" || data.status === "Cancelled") {
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setStreamError("Live updates are reconnecting…");
    };

    return () => {
      active = false;
      eventSource.close();
      audio.pause();
      audioRef.current = null;
    };
  }, [id]);

  const enableAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.muted = false;
      audio.currentTime = 0;
      await audio.play();
      setAudioUnlocked(true);
    } catch {
      setAudioUnlocked(false);
    }
  };

  const presentation = ORDER_PRESENTATION[orderState.status];
  const completionDescription =
    orderState.status === "Pending"
      ? `${orderState.ordersAhead} orders ahead of yours.`
      : presentation.description;
  const activeStep =
    orderState.status === "Claimed"
      ? ORDER_STEPS.length
      : ORDER_STEPS.findIndex((step) => step.status === orderState.status);

  return (
    <main className="min-h-screen px-4 pb-32 pt-6 text-zinc-950 sm:px-7 sm:pt-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your orders
          </h1>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.12em] text-zinc-600">
            BREWED JUST FOR YOU
          </p>
        </header>

        <div className="grid gap-5 tablet:grid-cols-[1.45fr_1fr] tablet:items-center">
          <section aria-label="Current order">
            <h2 className="mb-2 text-base font-semibold text-zinc-700">
              {orderState.status === "Brewing"
                ? "Coffee filling animation"
                : "Your coffee"}
            </h2>
            <div className="relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-[1.35rem] bg-black px-5 pb-4 pt-3 text-white sm:min-h-64">
              <p className="absolute left-5 top-5 text-xs font-bold">
                ORDER #{orderState.queueNumber || "—"}
              </p>
              <CoffeeCup status={orderState.status} />
              <p className="mt-1 text-center text-sm font-semibold sm:text-base">
                {presentation.cupCaption}
              </p>
            </div>
            {orderState.status === "Cancelled" ? (
              <p className="mt-3 text-sm font-semibold text-red-800" role="status">
                Order cancelled
              </p>
            ) : (
              <ol
                aria-label={`Order progress: ${orderState.status}`}
                className="mt-4 grid grid-cols-4 gap-1"
              >
                {ORDER_STEPS.map((step, index) => {
                  const isComplete = index < activeStep;
                  const isCurrent = index === activeStep;

                  return (
                    <li
                      key={step.status}
                      aria-current={isCurrent ? "step" : undefined}
                      className="flex flex-col items-center gap-1 text-center"
                    >
                      <span
                        className={`size-2.5 rounded-full ${
                          isComplete || isCurrent
                            ? "bg-altitude-navy"
                            : "bg-altitude-navy/20"
                        }`}
                      />
                      <span
                        className={`text-[10px] ${
                          isComplete || isCurrent
                            ? "font-semibold text-altitude-black"
                            : "text-altitude-navy/60"
                        }`}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-live="polite">
            <h2 className="mb-2 text-base font-semibold text-zinc-700">
              Coffee completion notification
            </h2>
            <div
              className={`flex min-h-16 items-center gap-3 rounded-2xl px-4 py-3 text-white ${
                orderState.status === "Cancelled" ? "bg-red-950" : "bg-black"
              }`}
              role="status"
            >
              {orderState.status === "Ready" ||
              orderState.status === "Claimed" ? (
                <CircleCheck aria-hidden="true" className="shrink-0" size={22} />
              ) : (
                <Coffee aria-hidden="true" className="shrink-0" size={22} />
              )}
              <div>
                <h3 className="text-sm font-bold">{presentation.title}</h3>
                <p className="mt-0.5 text-xs text-white/80">
                  {completionDescription}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[10px] font-medium text-zinc-700">
              ORDER ID: {id.slice(0, 8)}
            </p>
          </section>
        </div>

        {streamError && (
          <p className="mt-4 text-sm text-zinc-600" role="alert">
            {streamError}
          </p>
        )}

        {!audioUnlocked && (
          <button
            type="button"
            onClick={enableAudio}
            className="mt-4 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Enable ready chime
          </button>
        )}

        <section className="mt-8" aria-labelledby="past-orders-heading">
          <h2
            className="mb-3 text-base font-semibold"
            id="past-orders-heading"
          >
            Past orders
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {pastOrders.map((order) => (
              <li
                className="flex min-h-24 flex-col justify-between rounded-2xl bg-black p-3 text-white sm:min-h-28 sm:p-4"
                key={order.name}
              >
                <Coffee aria-hidden="true" size={20} strokeWidth={1.8} />
                <div>
                  <p className="text-xs font-semibold">{order.name}</p>
                  <p className="mt-2 text-[10px] font-medium text-white/75">
                    {order.date} · AED {order.price}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6" aria-labelledby="suggested-picks-heading">
          <h2
            className="mb-3 text-base font-semibold"
            id="suggested-picks-heading"
          >
            Suggested picks
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {suggestedPicks.map((pick) => (
              <li
                className="rounded-2xl bg-black p-1.5 text-white sm:p-2"
                key={pick.name}
              >
                <div className="flex aspect-[1.45/1] flex-col items-center justify-center rounded-xl bg-white text-zinc-950">
                  <Coffee aria-hidden="true" size={26} strokeWidth={1.8} />
                  <span className="mt-2 text-[9px] font-semibold tracking-wide">
                    BARISTA PICK
                  </span>
                </div>
                <div className="px-2 pb-2 pt-2">
                  <p className="text-xs font-semibold">{pick.name}</p>
                  <p className="mt-1.5 text-[10px] font-medium text-white/75">
                    AED {pick.price}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

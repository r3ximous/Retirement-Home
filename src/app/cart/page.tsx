"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "../components/cart-provider";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(value: unknown): string | null {
  return isRecord(value) && typeof value.error === "string" ? value.error : null;
}

function isCreatedOrder(value: unknown): value is { orderId: string } {
  return isRecord(value) && typeof value.orderId === "string";
}

export default function CartPage() {
  const router = useRouter();
  const { items, changeQuantity, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function placeOrder() {
    if (items.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setOrderError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ?? "Unable to place your order. Please try again.",
        );
      }
      if (!isCreatedOrder(payload)) {
        throw new Error("The order service returned an unexpected response.");
      }

      clearCart();
      router.push(`/track/${encodeURIComponent(payload.orderId)}`);
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? error.message
          : "Unable to place your order. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-5 pb-32 py-8 text-altitude-black mobile:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-sm font-medium text-altitude-navy transition hover:underline"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Back to menu
        </Link>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-altitude-navy">
            Altitude Cafe
          </p>
          <h1 className="mt-2 text-3xl font-bold">Your bag</h1>
        </header>

        {items.length > 0 ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
            <section
              aria-label="Items in your bag"
              className="divide-y divide-altitude-navy/15 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-altitude-navy/10"
            >
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex items-center justify-between gap-4 p-4 mobile:p-5"
                >
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{item.title}</h2>
                    <p className="mt-1 text-sm text-altitude-navy/70">
                      AED {item.price.toFixed(0)} each
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.id, -1)}
                      aria-label={`Remove one ${item.title}`}
                      className="flex size-9 items-center justify-center rounded-full border border-altitude-navy/20 hover:bg-altitude-navy/10"
                    >
                      <Minus aria-hidden="true" size={16} />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.id, 1)}
                      aria-label={`Add one ${item.title}`}
                      className="flex size-9 items-center justify-center rounded-full bg-altitude-black text-altitude-white hover:bg-altitude-navy"
                    >
                      <Plus aria-hidden="true" size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm ring-1 ring-altitude-navy/10">
              <h2 className="font-semibold">Order summary</h2>
              <div className="mt-4 flex justify-between border-t border-altitude-navy/15 pt-4 font-bold">
                <span>Total</span>
                <span>AED {total.toFixed(2)}</span>
              </div>
              <p className="mt-3 text-xs text-altitude-navy/65">
                {items.reduce((count, item) => count + item.quantity, 0)} items
                in your bag
              </p>
              {orderError && (
                <p className="mt-4 text-sm font-medium text-red-700" role="alert">
                  {orderError}
                </p>
              )}
              <button
                type="button"
                onClick={placeOrder}
                disabled={isSubmitting}
                className="mt-5 min-h-12 w-full rounded-xl bg-altitude-black px-4 text-sm font-semibold text-altitude-white transition hover:bg-altitude-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting
                  ? "Placing your order…"
                  : `Place order · AED ${total.toFixed(2)}`}
              </button>
              <p className="mt-2 text-center text-xs text-altitude-navy/65">
                You can follow your order&apos;s progress live.
              </p>
            </aside>
          </div>
        ) : (
          <section className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-altitude-navy/10 mobile:p-12">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-altitude-navy/10 text-altitude-navy">
              <ShoppingBag aria-hidden="true" size={28} />
            </div>
            <h2 className="mt-5 text-xl font-bold">Your bag is empty</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-altitude-navy/70">
              Browse the menu and add a favorite to get started.
            </p>
            <Link
              href="/menu"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-altitude-black px-6 font-semibold text-altitude-white transition hover:bg-altitude-navy"
            >
              Explore the menu
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

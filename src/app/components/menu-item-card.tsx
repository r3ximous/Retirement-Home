"use client";

import { Coffee, Plus } from "lucide-react";
import { useCart } from "./cart-provider";
import ARPreviewButton from "./ar-preview-button";
import type { MenuItem } from "../menu/menu-data";

function ProductArtwork({ item }: { item: MenuItem }) {
  const isCoffee = item.category.toLowerCase().includes("coffee");
  const isTea = item.category.toLowerCase().includes("tea");

  return (
    <div
      role="img"
      aria-label={`${item.title} illustration`}
      className={`relative flex h-32 items-center justify-center overflow-hidden rounded-xl ${
        isCoffee
          ? "bg-altitude-navy text-altitude-white"
          : isTea
            ? "bg-altitude-black text-altitude-white"
            : "bg-white text-altitude-navy"
      }`}
    >
      <span className="absolute -right-7 -top-9 size-28 rounded-full border border-current/20" />
      <span className="absolute -bottom-12 -left-7 size-32 rounded-full border border-current/20" />
      <Coffee aria-hidden="true" className="relative" size={48} strokeWidth={1.4} />
      <span className="absolute bottom-2 left-3 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
        Altitude
      </span>
    </div>
  );
}

export default function MenuItemCard({
  item,
  variant = "menu",
}: {
  item: MenuItem;
  variant?: "home" | "menu";
}) {
  const { addItem } = useCart();
  const isHomeCard = variant === "home";

  return (
    <article
      className={`flex min-w-0 flex-col rounded-2xl p-2 ${
        isHomeCard
          ? "bg-altitude-black text-altitude-white"
          : "bg-white text-altitude-black shadow-sm ring-1 ring-altitude-navy/10"
      }`}
    >
      <ProductArtwork item={item} />
      <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold">{item.title}</h3>
        <button
          type="button"
          onClick={() => addItem(item)}
          aria-label={`Add ${item.title} to cart`}
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy ${
            isHomeCard
              ? "bg-white text-altitude-black"
              : "bg-altitude-black text-altitude-white"
          }`}
        >
          <Plus aria-hidden="true" size={18} />
        </button>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>AED {item.price.toFixed(0)}</span>
        {item.isPopular && (
          <span className={isHomeCard ? "text-white/60" : "text-altitude-navy/70"}>
            Best seller
          </span>
        )}
      </div>
      {(item.arGlbUrl || item.arUsdzUrl) && (
        <div className="mt-2">
          <ARPreviewButton item={item} light={isHomeCard} />
        </div>
      )}
    </article>
  );
}

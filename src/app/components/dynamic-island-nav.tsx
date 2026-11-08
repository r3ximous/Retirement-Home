"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  House,
  ShoppingBag,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useCart } from "./cart-provider";

const navigationItems = [
  { label: "Home", href: "/", Icon: House },
  { label: "Menu", href: "/menu", Icon: BookOpen },
  { label: "Bag", href: "/cart", Icon: ShoppingBag },
  { label: "Stars", href: "/rewards", Icon: Sparkles },
  { label: "Profile", href: "/profile", Icon: UserRound },
];

export default function DynamicIslandNav() {
  const pathname = usePathname();
  const { totalItems } = useCart();

  if (["/onboarding", "/login", "/signup"].includes(pathname)) {
    return null;
  }

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 mx-auto flex w-[min(26rem,calc(100%-2rem))] items-center justify-between rounded-full border border-white/10 bg-altitude-black/95 p-2 text-altitude-white shadow-2xl shadow-black/30 backdrop-blur-xl"
    >
      {navigationItems.map(({ label, href, Icon }) => {
        const isActive =
          pathname === href ||
          (href !== "/" && pathname.startsWith(`${href}/`));

        return (
          <Link
            key={label}
            href={href}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex h-11 min-w-11 items-center justify-center gap-2 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-white ${
              isActive
                ? "bg-white/15 px-4 text-altitude-white"
                : "px-3 text-white/60 hover:text-altitude-white"
            }`}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={2} />
            {label === "Bag" && totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-altitude-white text-[10px] font-bold text-altitude-black">
                {totalItems}
              </span>
            )}
            {isActive && (
              <span className="text-sm font-medium">{label}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

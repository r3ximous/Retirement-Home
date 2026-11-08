"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Coffee, Globe2, House, Sparkles, UserRound } from "lucide-react";
import { useCart } from "./components/cart-provider";
import ARPreviewButton from "./components/ar-preview-button";
import MenuItemCard from "./components/menu-item-card";
import { menuItems } from "./menu/menu-data";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding";

const drinkOfTheDay = menuItems.filter((item) => item.isPromo === true)[0];
const arFeaturedItem = menuItems.find((item) => item.arGlbUrl && item.arUsdzUrl);
const popularItems = menuItems.filter((item) => item.isPopular).slice(0, 6);

function subscribeToOnboarding() {
  return () => {};
}

function getOnboardingSnapshot() {
  return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "complete";
}

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const { addItem } = useCart();
  const onboardingComplete = useSyncExternalStore(
    subscribeToOnboarding,
    getOnboardingSnapshot,
    () => false,
  );

  useEffect(() => {
    if (!onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [onboardingComplete, router]);

  if (!onboardingComplete) {
    return null;
  }

  return (
    <main className="min-h-screen text-altitude-black">
      <header className="bg-gradient-to-r from-altitude-navy to-altitude-black text-altitude-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 py-4 mobile:px-8">
          <div>
            <p className="text-xs font-medium text-white/65">Altitude Cafe</p>
            <h1 className="mt-1 text-lg font-bold tracking-wide">
              {session?.user?.name
                ? `Welcome back, ${session.user.name.split(" ")[0]}`
                : "Welcome to Altitude"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              aria-label="Profile"
              className="flex size-10 items-center justify-center rounded-full bg-altitude-black"
            >
              <UserRound aria-hidden="true" size={20} />
            </Link>
            <span className="flex size-10 items-center justify-center rounded-full border border-white/25">
              <Globe2 aria-hidden="true" size={20} />
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-32 pt-8 mobile:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <section aria-labelledby="drink-of-the-day">
            <div className="mb-4 flex justify-center">
              <h2
                id="drink-of-the-day"
                className="rounded-xl bg-altitude-black px-4 py-2 text-center text-lg font-black tracking-wide text-altitude-white mobile:text-2xl"
              >
                DRINK OF THE DAY
              </h2>
            </div>
            {drinkOfTheDay ? (
              <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-altitude-navy/10">
                <div className="relative flex h-56 items-center justify-center bg-white mobile:h-72 lg:h-80">
                  <div className="flex size-48 items-center justify-center rounded-full bg-altitude-navy text-altitude-white mobile:size-60">
                    <Coffee aria-hidden="true" size={88} strokeWidth={1.1} />
                  </div>
                  <span className="absolute bottom-4 left-4 rounded-full bg-altitude-black px-3 py-1 text-xs font-semibold text-altitude-white">
                    Featured today
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 p-4 mobile:p-5">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold">
                      {drinkOfTheDay.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-altitude-navy/75">
                      {drinkOfTheDay.description}
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      AED {drinkOfTheDay.price.toFixed(0)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(drinkOfTheDay)}
                    className="rounded-full bg-altitude-black px-4 py-2 text-sm font-semibold text-altitude-white"
                  >
                    Add
                  </button>
                </div>
              </article>
            ) : (
              <p className="rounded-2xl bg-white p-8 text-center text-sm shadow-sm">
                Today&apos;s featured drink is coming soon.
              </p>
            )}
            {arFeaturedItem && (
              <article className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-altitude-navy px-5 py-4 text-altitude-white">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
                    Featured Web AR
                  </p>
                  <h3 className="mt-1 text-lg font-bold">
                    Preview {arFeaturedItem.title}
                  </h3>
                  <p className="mt-1 text-xs text-white/75">
                    See your drink at table scale before you order.
                  </p>
                </div>
                <ARPreviewButton item={arFeaturedItem} light />
              </article>
            )}
          </section>

          <section aria-labelledby="menu-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="menu-heading" className="text-2xl font-bold">
                MENU
              </h2>
              <Link
                href="/menu"
                className="rounded-full bg-altitude-black px-4 py-2 text-sm font-semibold text-altitude-white transition hover:bg-altitude-navy"
              >
                Shop now
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {popularItems.slice(0, 3).map((item) => (
                <MenuItemCard key={item.id} item={item} variant="home" />
              ))}
            </div>
            <Link
              href="/menu"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-altitude-navy hover:underline"
            >
              Browse the full menu <House aria-hidden="true" size={16} />
            </Link>
          </section>
        </div>

        <section
          aria-labelledby="rewards-heading"
          className="mt-10 flex flex-col gap-4 border-t border-altitude-navy/15 pt-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h2 id="rewards-heading" className="text-xl font-bold tracking-wide">
              A Little Closer to Free.
            </h2>
            <div
              className="mt-3 flex items-center gap-2"
              aria-label="4 of 6 drinks collected"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <span
                  key={index}
                  className={`flex size-11 items-center justify-center rounded-full ${
                    index < 4
                      ? "bg-altitude-black text-altitude-white"
                      : "bg-altitude-navy/20 text-altitude-navy/60"
                  }`}
                >
                  <Coffee aria-hidden="true" size={20} />
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
            <p className="text-sm font-medium">
              4 of 6 collected · Your next one is on us.
            </p>
            <Link
              href="/rewards"
              className="inline-flex items-center gap-2 rounded-full bg-altitude-black px-4 py-2 text-sm font-semibold text-altitude-white transition hover:bg-altitude-navy"
            >
              <Sparkles aria-hidden="true" size={16} />
              View the rest
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

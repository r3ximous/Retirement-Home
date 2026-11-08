"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Menu as MenuIcon, Search } from "lucide-react";
import MenuItemCard from "../components/menu-item-card";
import { menuItems, type MenuItem } from "./menu-data";

const categoryTabs = [
  "Best sellers",
  "Hot drinks",
  "Cold drinks",
  "Smoothies",
] as const;
type CategoryTab = (typeof categoryTabs)[number];

function isSmoothie(item: MenuItem) {
  return /\b(smoothie|shake)\b/i.test(`${item.title} ${item.description}`);
}

function isColdDrink(item: MenuItem) {
  return (
    !isSmoothie(item) &&
    /\b(iced|cold|spritzer|cooler|punch|refresher|infusion)\b/i.test(
      `${item.title} ${item.description}`,
    )
  );
}

function matchesCategory(item: MenuItem, category: CategoryTab) {
  if (category === "Best sellers") return item.isPopular;
  if (category === "Cold drinks") return isColdDrink(item);
  if (category === "Smoothies") return isSmoothie(item);

  return (
    ["Coffee", "Tea", "Caffeine Free"].includes(item.category) &&
    !isColdDrink(item)
  );
}

export default function MenuPage() {
  const [activeCategory, setActiveCategory] =
    useState<CategoryTab>("Best sellers");
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return menuItems.filter(
      (item) =>
        matchesCategory(item, activeCategory) &&
        (!normalizedQuery ||
          `${item.title} ${item.description} ${item.category}`
            .toLowerCase()
            .includes(normalizedQuery)),
    );
  }, [activeCategory, query]);

  return (
    <main className="min-h-screen px-4 pb-32 pt-8 text-altitude-black mobile:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Our menu</h1>
          <Link
            href="/"
            aria-label="Back to home"
            className="flex size-10 items-center justify-center rounded-full bg-altitude-black text-altitude-white lg:hidden"
          >
            <MenuIcon aria-hidden="true" size={19} />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-[7rem_minmax(0,1fr)] md:gap-6">
          <aside aria-label="Menu categories">
            <div className="rounded-2xl bg-white/80 p-2 shadow-sm ring-1 ring-altitude-navy/10 md:sticky md:top-6">
              <MenuIcon
                aria-hidden="true"
                className="mb-3 ml-2 mt-1 hidden md:block"
                size={20}
              />
              <div className="flex gap-2 overflow-x-auto md:flex-col">
                {categoryTabs.map((category) => {
                  const isActive = category === activeCategory;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      aria-pressed={isActive}
                      className={`min-h-10 shrink-0 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy ${
                        isActive
                          ? "bg-altitude-black text-altitude-white"
                          : "bg-white text-altitude-black hover:bg-altitude-navy/10"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section aria-labelledby="menu-category-title">
            <label
              htmlFor="menu-search"
              className="mb-1 block text-xs font-medium"
            >
              Search drinks
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-altitude-navy/60"
                size={17}
              />
              <input
                id="menu-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a drink..."
                className="h-11 w-full rounded-xl border border-altitude-black/40 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-altitude-navy focus:ring-2 focus:ring-altitude-navy/15"
              />
            </div>

            <div className="mb-3 mt-4 flex items-baseline justify-between gap-3">
              <h2
                id="menu-category-title"
                className="text-xl font-semibold tracking-wide"
              >
                {activeCategory}
              </h2>
              <span className="text-xs text-altitude-navy/70">
                {filteredItems.length} items
              </span>
            </div>

            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-white p-8 text-center text-sm shadow-sm">
                No drinks match that search. Try another name.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

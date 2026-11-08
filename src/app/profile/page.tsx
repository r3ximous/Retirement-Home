import { getServerSession } from "next-auth";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowUpRight,
  CreditCard,
  History,
  Shield,
  UserRound,
} from "lucide-react";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import SignOutButton from "./sign-out-button";

export const instant = false;

function getOrderSummary(itemsJson: string) {
  try {
    const items: unknown = JSON.parse(itemsJson);
    if (!Array.isArray(items)) return "Order details unavailable";

    const names = items.flatMap((item: unknown) => {
      if (
        typeof item !== "object" ||
        item === null ||
        !("title" in item) ||
        typeof item.title !== "string"
      ) {
        return [];
      }

      const quantity =
        "quantity" in item && typeof item.quantity === "number"
          ? item.quantity
          : 1;
      return [`${item.title}${quantity > 1 ? ` × ${quantity}` : ""}`];
    });

    return names.join(", ") || "Order details unavailable";
  } catch {
    return "Order details unavailable";
  }
}

function ProfileAccess({
  message,
  authConfigured,
}: {
  message: string;
  authConfigured: boolean;
}) {
  return (
    <main className="min-h-screen px-5 pb-32 pt-8 text-altitude-black mobile:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-altitude-navy">
            Altitude Cafe
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Your profile</h1>
        </header>

        <section className="rounded-3xl bg-gradient-to-br from-altitude-navy to-altitude-black p-6 text-altitude-white shadow-lg mobile:p-8">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/15">
              <UserRound aria-hidden="true" size={27} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                Altitude member
              </p>
              <h2 className="mt-1 text-xl font-bold">Welcome</h2>
            </div>
          </div>
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/80">
            {message}
          </p>
          {authConfigured ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-altitude-black transition hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/35 px-5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Create an account
              </Link>
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-white/20 bg-white/10 p-4 text-sm leading-6 text-white/85">
              Staff: configure <code>NEXTAUTH_SECRET</code> for this production
              server, then restart the app to enable sign-in.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export default async function ProfilePage() {
  await connection();
  const authConfigured =
    process.env.NODE_ENV !== "production" ||
    Boolean(process.env.NEXTAUTH_SECRET);
  const session = authConfigured ? await getServerSession(authOptions) : null;
  if (!session?.user) {
    return (
      <ProfileAccess
        authConfigured={authConfigured}
        message="Sign in to see your member details, stars, payment information, and recent orders."
      />
    );
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: session.user.id },
    select: {
      fullName: true,
      email: true,
      phone: true,
      pointsBalance: true,
      tierLevel: true,
      _count: { select: { orders: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          queueNumber: true,
          itemsJson: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!profile) {
    return (
      <ProfileAccess
        authConfigured={authConfigured}
        message="We couldn't load the member details for this account. Please sign in again or contact the cafe team."
      />
    );
  }

  return (
    <main className="min-h-screen px-5 pb-32 pt-8 text-altitude-black mobile:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-altitude-navy">
            Altitude Cafe
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Your profile</h1>
        </header>

        <section
          aria-labelledby="member-name"
          className="rounded-3xl bg-gradient-to-br from-altitude-navy to-altitude-black p-6 text-altitude-white shadow-lg mobile:p-8"
        >
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/15">
              <UserRound aria-hidden="true" size={27} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                {profile.tierLevel} member
              </p>
              <h2 id="member-name" className="mt-1 truncate text-xl font-bold">
                {profile.fullName}
              </h2>
              <p className="mt-1 truncate text-sm text-white/70">
                {profile.email ?? profile.phone ?? "Welcome to Altitude Cafe"}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-end justify-between border-t border-white/15 pt-5">
            <div>
              <p className="text-sm text-white/65">Your stars</p>
              <p className="mt-1 text-3xl font-bold">
                {profile.pointsBalance.toLocaleString()}
              </p>
            </div>
            <p className="text-right text-sm text-white/75">
              Keep ordering
              <br />
              to earn rewards
            </p>
          </div>
        </section>

        <section
          id="payment-methods"
          aria-labelledby="payment-heading"
          className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-altitude-navy/10 mobile:p-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-altitude-navy/10 text-altitude-navy">
              <CreditCard aria-hidden="true" size={19} />
            </span>
            <div>
              <h2 id="payment-heading" className="font-semibold">
                Payment methods
              </h2>
              <p className="mt-1 text-sm text-altitude-navy/70">
                No saved payment methods yet.
              </p>
            </div>
          </div>
          <p className="mt-4 border-t border-altitude-navy/10 pt-4 text-sm leading-6 text-altitude-navy/70">
            Payment details are not stored in your profile. Saved payment
            methods and in-app checkout are not available in this demo.
          </p>
        </section>

        <section
          aria-labelledby="orders-heading"
          className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-altitude-navy/10 mobile:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-altitude-navy/10 text-altitude-navy">
                <History aria-hidden="true" size={19} />
              </span>
              <div>
                <h2 id="orders-heading" className="font-semibold">
                  Past orders
                </h2>
                <p className="mt-1 text-sm text-altitude-navy/70">
                  Your recent coffee runs
                </p>
              </div>
            </div>
            <span className="rounded-full bg-altitude-navy/10 px-3 py-1 text-xs font-semibold text-altitude-navy">
              {profile._count.orders}
            </span>
          </div>

          {profile.orders.length > 0 ? (
            <ul className="mt-5 divide-y divide-altitude-navy/10">
              {profile.orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">Order #{order.queueNumber}</p>
                    <p className="mt-1 truncate text-sm text-altitude-navy/70">
                      {getOrderSummary(order.itemsJson)}
                    </p>
                    <p className="mt-1 text-xs text-altitude-navy/55">
                      {order.createdAt.toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                      {" · "}
                      {order.status}
                    </p>
                  </div>
                  <p className="font-semibold">
                    AED {order.totalAmount.toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-xl bg-altitude-navy/5 p-4 text-sm leading-6 text-altitude-navy/70">
              Your orders will appear here after you place one while signed in.
            </p>
          )}
        </section>

        <section
          aria-labelledby="account-heading"
          className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-altitude-navy/10 mobile:p-6"
        >
          <h2 id="account-heading" className="font-semibold">
            Account settings
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-altitude-navy/10 pt-4">
            <div>
              <p className="text-sm font-medium">Signed in as {profile.fullName}</p>
              <p className="mt-1 text-sm text-altitude-navy/70">
                Manage your account access or open staff tools.
              </p>
            </div>
            <SignOutButton />
          </div>
          <Link
            href="/admin"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-altitude-navy/20 px-4 text-sm font-semibold text-altitude-navy transition hover:bg-altitude-navy/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy"
          >
            <Shield aria-hidden="true" size={16} />
            Staff access
            <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        </section>
      </div>
    </main>
  );
}

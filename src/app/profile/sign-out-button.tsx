"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="min-h-11 rounded-xl bg-altitude-black px-5 text-sm font-semibold text-altitude-white transition hover:bg-altitude-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy"
    >
      Sign out
    </button>
  );
}

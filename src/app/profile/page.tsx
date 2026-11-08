import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/next-auth";
import SignOutButton from "./sign-out-button";

export const instant = false;

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-5 pb-32 pt-10 mobile:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
      <section className="mt-7 rounded-2xl bg-white/95 p-6 shadow-sm ring-1 ring-altitude-navy/10">
        <p className="text-sm font-medium text-altitude-navy">Altitude member</p>
        <h2 className="mt-2 text-xl font-bold">{session.user.name}</h2>
        <p className="mt-1 text-sm text-altitude-black/70">{session.user.email}</p>
        <div className="mt-6 border-t border-altitude-navy/10 pt-5">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}

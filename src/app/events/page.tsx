import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";

const events = [
  {
    club: "RIT Campus",
    title: "Your campus coffee break",
    date: "Campus events coming soon",
    description:
      "Meet the campus community over a freshly brewed drink. Check back for the next gathering.",
  },
  {
    club: "Altitude Cafe",
    title: "Club meetups & coffee",
    date: "New dates announced soon",
    description:
      "A home base for student clubs, study groups, and the ideas that bring campus together.",
  },
];

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-stone-950 px-5 py-8 text-white mobile:px-8 tablet:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
              RIT Campus
            </p>
            <h1 className="mt-2 text-3xl font-black mobile:text-4xl">
              Club &amp; events
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">
              Find your people, meet up over coffee, and keep an eye out for
              event perks.
            </p>
          </div>
          <Link
            href="/rewards"
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-300 transition hover:text-amber-200"
          >
            View rewards <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>

        <section
          className="mt-8 grid gap-4 tablet:grid-cols-2"
          aria-label="Campus events"
        >
          {events.map((event) => (
            <article
              key={event.title}
              className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-6 mobile:p-8"
            >
              <span className="w-fit rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
                {event.club}
              </span>
              <h2 className="mt-5 text-xl font-bold">{event.title}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-stone-400">
                <CalendarDays size={16} aria-hidden="true" />
                {event.date}
              </p>
              <p className="mt-4 flex-1 text-sm leading-6 text-stone-300">
                {event.description}
              </p>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                <span className="flex items-center gap-2 text-xs text-stone-400">
                  <MapPin size={14} aria-hidden="true" />
                  RIT Dubai campus
                </span>
                <span className="flex items-center gap-1 text-xs text-stone-500">
                  <Users size={14} aria-hidden="true" />
                  RSVP soon
                </span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

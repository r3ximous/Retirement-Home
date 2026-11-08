"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Coffee, ShoppingBag, Sparkles } from "lucide-react";
import AltitudeLogo from "../components/altitude-logo";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding";

const slides = [
  {
    title: "Welcome to the Altitude App",
    description: "You’re one step closer to altitude at your fingertips.",
    Icon: Coffee,
  },
  {
    title: "Collect 100 stars for every 1 dirham you spend",
    description: "Just one last step into discovering Altitude’s rewards.",
    Icon: Sparkles,
  },
  {
    title: "Skip the line and pre-order your drinks!",
    description: "Last step, and you’re here at a more convenient experience.",
    Icon: ShoppingBag,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "complete") {
      router.replace("/");
    }
  }, [router]);

  function finishOnboarding() {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "complete");
    router.push("/login");
  }

  const slide = slides[step];
  const Icon = slide.Icon;

  return (
    <main className="onboarding-page relative z-10 mx-auto flex min-h-[calc(100svh-6rem)] w-full max-w-3xl flex-col items-center justify-between px-6 pb-8 pt-12 text-center mobile:px-10">
      <div className="mt-4 flex flex-1 flex-col items-center justify-center">
        <AltitudeLogo />
        <Icon
          aria-hidden="true"
          className="mt-6 text-altitude-black"
          size={44}
          strokeWidth={1.6}
        />
        <h1 className="mt-4 max-w-md text-2xl font-semibold leading-tight tracking-wide mobile:text-3xl">
          {slide.title}
        </h1>
        <p className="mt-3 max-w-sm text-sm text-altitude-black/70">
          {slide.description}
        </p>
        <div
          className="mt-5 flex items-center gap-1.5"
          role="group"
          aria-label={`Screen ${step + 1} of 3`}
        >
          {slides.map((item, index) => (
            <span
              key={item.title}
              aria-current={index === step ? "step" : undefined}
              className={`size-2 rounded-full ${
                index === step ? "bg-altitude-navy" : "bg-altitude-navy/25"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white/90 p-3 shadow-sm">
        <button
          type="button"
          onClick={
            step === slides.length - 1
              ? finishOnboarding
              : () => setStep(step + 1)
          }
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-altitude-black bg-altitude-black px-6 text-sm font-semibold text-altitude-white transition hover:bg-altitude-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-altitude-navy"
        >
          {step === slides.length - 1 ? "Get started" : "Continue"}
          <ArrowRight aria-hidden="true" size={17} />
        </button>
        {step < slides.length - 1 ? (
          <button
            type="button"
            onClick={finishOnboarding}
            className="min-h-10 text-sm font-medium text-altitude-navy underline-offset-4 hover:underline"
          >
            Skip
          </button>
        ) : (
          <button
            type="button"
            onClick={finishOnboarding}
            className="min-h-10 text-sm font-medium text-altitude-navy underline-offset-4 hover:underline"
          >
            Already have an account? Log in
          </button>
        )}
      </div>
    </main>
  );
}

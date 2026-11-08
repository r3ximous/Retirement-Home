"use client";

import { useCallback, useEffect, useState } from "react";

interface GachaCustomer {
  fullName: string;
  pointsBalance: number;
  tierLevel: string;
  streakCount: number;
}

interface GachaPrize {
  type: string;
  label: string;
  chancePercent: number;
}

interface GachaReward {
  id: string;
  rewardType: string;
  rewardLabel: string;
  isClaimed: boolean;
  unlockedAt: string;
}

interface GachaPageData {
  customer: GachaCustomer;
  canPull: boolean;
  prizes: GachaPrize[];
  recentRewards: GachaReward[];
}

const POINTS_PER_FREE_COFFEE = 300;
const PIP_POSITIONS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrize(value: unknown): value is GachaPrize {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    typeof value.label === "string" &&
    typeof value.chancePercent === "number"
  );
}

function isReward(value: unknown): value is GachaReward {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.rewardType === "string" &&
    typeof value.rewardLabel === "string" &&
    typeof value.isClaimed === "boolean" &&
    typeof value.unlockedAt === "string"
  );
}

function isGachaPageData(value: unknown): value is GachaPageData {
  if (!isRecord(value) || !isRecord(value.customer)) return false;
  const customer = value.customer;

  return (
    typeof customer.fullName === "string" &&
    typeof customer.pointsBalance === "number" &&
    typeof customer.tierLevel === "string" &&
    typeof customer.streakCount === "number" &&
    typeof value.canPull === "boolean" &&
    Array.isArray(value.prizes) &&
    value.prizes.every(isPrize) &&
    Array.isArray(value.recentRewards) &&
    value.recentRewards.every(isReward)
  );
}

function getErrorMessage(payload: unknown, fallback: string): string {
  return isRecord(payload) && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

async function loadGachaData(signal?: AbortSignal): Promise<GachaPageData> {
  const response = await fetch("/api/gacha", { cache: "no-store", signal });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Unable to load rewards right now."));
  }
  if (!isGachaPageData(payload)) {
    throw new Error("The rewards service returned unexpected data.");
  }
  return payload;
}

function formatTierName(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function Dice({ value }: { value: number }) {
  const pips = PIP_POSITIONS[value] ?? PIP_POSITIONS[1];

  return (
    <div
      aria-hidden="true"
      className="grid size-[100px] grid-cols-3 grid-rows-3 place-items-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      {Array.from({ length: 9 }, (_, index) => (
        <span
          key={index}
          className={`size-2.5 rounded-full bg-slate-950 ${
            pips.includes(index) ? "" : "invisible"
          }`}
        />
      ))}
    </div>
  );
}

export default function GachaPanel() {
  const [data, setData] = useState<GachaPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rollResult, setRollResult] = useState<GachaReward | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void loadGachaData(controller.signal)
      .then(setData)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Unable to load rewards right now.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const pullReward = useCallback(async (): Promise<GachaReward> => {
    const response = await fetch("/api/gacha", { method: "POST" });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(getErrorMessage(payload, "Unable to roll your reward right now."));
    }
    if (!isRecord(payload) || !isReward(payload.reward)) {
      throw new Error("The rewards service returned an unexpected result.");
    }

    const reward = payload.reward;
    setRollResult(reward);
    setData((current) =>
      current
        ? {
            ...current,
            canPull: false,
            recentRewards: [
              reward,
              ...current.recentRewards.filter((item) => item.id !== reward.id),
            ].slice(0, 5),
          }
        : current,
    );
    return reward;
  }, []);

  const rollDice = async () => {
    if (!data?.canPull || rolling) return;

    setRolling(true);
    setError(null);
    setRollResult(null);

    try {
      await pullReward();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to roll your reward right now.");
    } finally {
      setRolling(false);
    }
  };

  const points = data?.customer.pointsBalance ?? 0;
  const pointsProgress = points % POINTS_PER_FREE_COFFEE;
  const pointsRemaining = POINTS_PER_FREE_COFFEE - pointsProgress;
  const progressPercent = (pointsProgress / POINTS_PER_FREE_COFFEE) * 100;
  const latestReward = data?.recentRewards[0];

  return (
    <div className="space-y-12 mobile:space-y-16">
      <section
        aria-label="Your points"
        className="rounded-2xl bg-black px-5 py-5 text-white mobile:px-7 mobile:py-6"
      >
        <p className="text-xs font-semibold uppercase">Your points</p>
        {loading ? (
          <p className="mt-4 text-sm text-white/70">Loading your rewards…</p>
        ) : data ? (
          <>
            <p className="mt-4 text-5xl font-medium tracking-tight">
              {new Intl.NumberFormat("en").format(points)}
            </p>
            <p className="mt-3 text-sm font-medium">
              points available <span aria-hidden="true">·</span>{" "}
              {formatTierName(data.customer.tierLevel)} member
            </p>
            <div
              role="progressbar"
              aria-label="Progress to your next free coffee"
              aria-valuenow={pointsProgress}
              aria-valuemin={0}
              aria-valuemax={POINTS_PER_FREE_COFFEE}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-500"
            >
              <div
                className="h-full rounded-full bg-white transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-medium">
              {pointsRemaining} points to your next free coffee
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-white/70">
            Your member profile is temporarily unavailable.
          </p>
        )}
      </section>

      <section
        aria-labelledby="roll-title"
        className="flex min-h-[550px] flex-col items-center rounded-[28px] bg-[#141212] px-5 py-7 text-white mobile:px-8"
      >
        <h2 id="roll-title" className="text-xl font-bold">
          Roll for a Discount
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          One daily roll, real savings
        </p>

        <div
          className={`mt-4 flex gap-5 ${
            rolling ? "animate-dice-roll" : ""
          }`}
          aria-hidden="true"
        >
          <Dice value={1} />
          <Dice value={1} />
        </div>

        <div className="mt-5 flex min-h-[90px] w-full max-w-[292px] flex-col items-center justify-center rounded-2xl bg-[#d1d1d1] px-4 py-3 text-slate-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Result
          </p>
          <p className="mt-1 text-center text-lg font-extrabold leading-tight" aria-live="polite">
            {rolling ? "Rolling…" : rollResult?.rewardLabel ?? "—"}
          </p>
        </div>

        <p className="mt-3 min-h-5 text-sm text-slate-400" aria-live="polite">
          {rolling
            ? "Rolling..."
            : loading
              ? "Loading your roll..."
              : data?.canPull
              ? "You have 1 roll available today"
              : "Today's roll has been used"}
        </p>

        <button
          type="button"
          onClick={rollDice}
          disabled={loading || !data?.canPull || rolling}
          className="mt-3 rounded-full bg-[#777] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#888] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {rolling
            ? "Rolling..."
            : data?.canPull
              ? "Roll for a discount"
              : "Come Back Tomorrow"}
        </button>

        {error && (
          <p className="mt-3 text-center text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}

        <section
          aria-label="Your rewards"
          className="mt-8 w-full max-w-[356px]"
        >
          <h3 className="mb-3 text-center text-sm font-bold text-slate-400">
            Your Rewards
          </h3>
          <div className="min-h-[76px] rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-950">
            {latestReward ? (
              <p className="font-bold">{latestReward.rewardLabel}</p>
            ) : (
              <p className="flex min-h-11 items-center justify-center text-sm text-slate-500">
                Roll the dice to reveal your reward
              </p>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

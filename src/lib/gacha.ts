import { randomInt } from "node:crypto";
import type { GachaReward } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const GACHA_TABLE = [
  { type: "POINTS_BOOST", label: "+50 Bonus Points", weight: 55 },
  { type: "FREE_ADDON", label: "Free Cookie", weight: 25 },
  { type: "DISCOUNT_VAR", label: "20% Off Next Order", weight: 12 },
  { type: "SHOT_ESPRESSO", label: "Free Espresso Shot", weight: 6 },
  { type: "GOLD_DOUBLE", label: "GOLD JACKPOT 2x Points", weight: 2 },
] as const;

export type GachaRewardType = (typeof GACHA_TABLE)[number]["type"];
type GachaItem = (typeof GACHA_TABLE)[number];
type GachaPullResult = { reward: GachaReward } | { error: string };

let override: GachaRewardType | null = null;

export function setGachaOverride(type: GachaRewardType | null) {
  override = type;
}

function roll(seed: number, forcedType: GachaRewardType | null): GachaItem {
  if (forcedType) {
    const result = GACHA_TABLE.find((item) => item.type === forcedType);
    if (!result) {
      throw new Error(`Unknown gacha reward type: ${forcedType}`);
    }
    return result;
  }

  const totalWeight = GACHA_TABLE.reduce((sum, item) => sum + item.weight, 0);
  let position = seed % totalWeight;
  for (const item of GACHA_TABLE) {
    if (position < item.weight) {
      return item;
    }
    position -= item.weight;
  }

  return GACHA_TABLE[0];
}

export async function performGachaPull(phone: string): Promise<GachaPullResult> {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const seed = randomInt(1_000_000);
  const forcedType = override;
  const result = roll(seed, forcedType);

  const pull = await prisma.$transaction(async (tx) => {
    const user = await tx.userProfile.findUnique({
      where: { phone },
      select: { id: true, lastGachaAt: true },
    });
    if (!user) {
      return { error: "Profile not found" } as const;
    }

    if (user.lastGachaAt && user.lastGachaAt >= today) {
      return { error: "Daily pull already used - come back tomorrow!" } as const;
    }

    const claimed = await tx.userProfile.updateMany({
      where: {
        phone,
        OR: [{ lastGachaAt: null }, { lastGachaAt: { lt: today } }],
      },
      data: { lastGachaAt: now },
    });
    if (claimed.count === 0) {
      return { error: "Daily pull already used - come back tomorrow!" } as const;
    }

    const reward = await tx.gachaReward.create({
      data: {
        userId: user.id,
        rewardType: result.type,
        rewardLabel: result.label,
        pullSeed: seed,
      },
    });
    return { reward } as const;
  });

  if ("reward" in pull && override === forcedType) {
    override = null;
  }

  return pull;
}

import { NextResponse } from "next/server";
import { GACHA_TABLE, performGachaPull } from "@/lib/gacha";
import { prisma } from "@/lib/prisma";

const DEMO_CUSTOMER_PHONE = "+971500000000";

export async function GET() {
  try {
    const customer = await prisma.userProfile.findUnique({
      where: { phone: DEMO_CUSTOMER_PHONE },
      select: {
        fullName: true,
        pointsBalance: true,
        tierLevel: true,
        streakCount: true,
        lastGachaAt: true,
        gachaRewards: {
          orderBy: { unlockedAt: "desc" },
          take: 5,
          select: {
            id: true,
            rewardType: true,
            rewardLabel: true,
            isClaimed: true,
            unlockedAt: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Demo customer profile not found" }, { status: 404 });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const totalWeight = GACHA_TABLE.reduce((sum, item) => sum + item.weight, 0);

    return NextResponse.json({
      customer: {
        fullName: customer.fullName,
        pointsBalance: customer.pointsBalance,
        tierLevel: customer.tierLevel,
        streakCount: customer.streakCount,
      },
      canPull: !customer.lastGachaAt || customer.lastGachaAt < startOfToday,
      prizes: GACHA_TABLE.map(({ type, label, weight }) => ({
        type,
        label,
        chancePercent: (weight / totalWeight) * 100,
      })),
      recentRewards: customer.gachaRewards,
    });
  } catch (error) {
    console.error("Failed to load demo Gacha data", error);
    return NextResponse.json(
      { error: "Unable to load rewards right now" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const result = await performGachaPull(DEMO_CUSTOMER_PHONE);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Profile not found" ? 404 : 409 },
      );
    }

    return NextResponse.json({ reward: result.reward }, { status: 201 });
  } catch (error) {
    console.error("Failed to perform demo Gacha pull", error);
    return NextResponse.json(
      { error: "Unable to roll your reward right now" },
      { status: 500 },
    );
  }
}

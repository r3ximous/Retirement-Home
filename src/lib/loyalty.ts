import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LoyaltyTransaction = Prisma.TransactionClient;

export async function awardPoints(
  orderId: string,
  tx?: LoyaltyTransaction,
): Promise<number> {
  const apply = async (client: LoyaltyTransaction) => {
    const order = await client.order.findUnique({
      where: { id: orderId },
      select: {
        customerId: true,
        isPaid: true,
        pointsAwarded: true,
        totalAmount: true,
      },
    });

    if (!order) {
      throw new Error(`Cannot award points for missing order ${orderId}`);
    }
    if (!order.isPaid || order.pointsAwarded > 0 || !order.customerId) {
      return 0;
    }

    const points = Math.floor(order.totalAmount * 10);
    if (!Number.isSafeInteger(points) || points < 0) {
      throw new Error(`Order ${orderId} has an invalid total for loyalty points`);
    }
    if (points === 0) {
      return 0;
    }

    const claimed = await client.order.updateMany({
      where: { id: orderId, isPaid: true, pointsAwarded: 0 },
      data: { pointsAwarded: points },
    });
    if (claimed.count === 0) {
      return 0;
    }

    await client.userProfile.update({
      where: { id: order.customerId },
      data: {
        pointsBalance: { increment: points },
        lastOrderAt: new Date(),
      },
    });

    return points;
  };

  return tx ? apply(tx) : prisma.$transaction(apply);
}

export async function clawbackPoints(
  orderId: string,
  tx?: LoyaltyTransaction,
): Promise<number> {
  const apply = async (client: LoyaltyTransaction) => {
    const order = await client.order.findUnique({
      where: { id: orderId },
      select: { customerId: true, pointsAwarded: true },
    });

    if (!order) {
      throw new Error(`Cannot claw back points for missing order ${orderId}`);
    }
    if (order.pointsAwarded <= 0 || !order.customerId) {
      return 0;
    }

    const claimed = await client.order.updateMany({
      where: { id: orderId, pointsAwarded: { gt: 0 } },
      data: { pointsAwarded: 0 },
    });
    if (claimed.count === 0) {
      return 0;
    }

    await client.userProfile.update({
      where: { id: order.customerId },
      data: { pointsBalance: { decrement: order.pointsAwarded } },
    });

    return order.pointsAwarded;
  };

  return tx ? apply(tx) : prisma.$transaction(apply);
}

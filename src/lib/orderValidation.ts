import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface ClientOrderItem {
  productId: string;
  quantity: number;
}

export interface VerifiedOrderResult {
  isValid: boolean;
  error?: string;
  totalAmount: number;
  verifiedItems: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPrice: number;
  }>;
}

const SLOT_CAPACITY = 15;
const ACTIVE_ORDER_STATUSES = ["Pending", "Paid", "Brewing"];
const EMPTY_ORDER: Pick<VerifiedOrderResult, "totalAmount" | "verifiedItems"> = {
  totalAmount: 0,
  verifiedItems: [],
};

function invalidOrder(error: string): VerifiedOrderResult {
  return { isValid: false, error, ...EMPTY_ORDER };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function validateAndPriceOrder(
  items: unknown,
  pickupTimeslot?: string,
  tx?: Prisma.TransactionClient,
): Promise<VerifiedOrderResult> {
  if (!Array.isArray(items) || items.length === 0) {
    return invalidOrder("Cart cannot be empty");
  }
  if (items.length > 50) {
    return invalidOrder("Cart contains too many items");
  }

  const quantities = new Map<string, number>();
  for (const item of items) {
    if (
      !isRecord(item) ||
      typeof item.productId !== "string" ||
      item.productId.trim().length === 0 ||
      item.productId.trim().length > 128 ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 20
    ) {
      return invalidOrder("Cart contains an invalid item or quantity");
    }

    const productId = item.productId.trim();
    const quantity = (quantities.get(productId) ?? 0) + item.quantity;
    if (quantity > 20) {
      return invalidOrder("An item quantity cannot exceed 20");
    }
    quantities.set(productId, quantity);
  }
  const parsedItems: ClientOrderItem[] = [...quantities].map(
    ([productId, quantity]) => ({ productId, quantity }),
  );

  let slotDate: Date | undefined;
  if (pickupTimeslot !== undefined) {
    slotDate = new Date(pickupTimeslot);
    if (!Number.isFinite(slotDate.getTime())) {
      return invalidOrder("Pickup timeslot is invalid");
    }
  }

  const client = tx ?? prisma;
  const productIds = [...new Set(parsedItems.map((item) => item.productId))];
  const dbProducts = await client.menuItem.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map(dbProducts.map((product) => [product.id, product]));

  let totalAmount = 0;
  const verifiedItems: VerifiedOrderResult["verifiedItems"] = [];

  for (const item of parsedItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      return invalidOrder(`Product ID ${item.productId} not found`);
    }
    if (!product.inStock) {
      return invalidOrder(`Item "${product.title}" is currently out of stock`);
    }
    if (!Number.isFinite(product.price) || product.price < 0) {
      return invalidOrder(`Item "${product.title}" has an invalid price`);
    }

    totalAmount += product.price * item.quantity;
    verifiedItems.push({
      id: product.id,
      title: product.title,
      quantity: item.quantity,
      unitPrice: product.price,
    });
  }

  if (!Number.isFinite(totalAmount)) {
    return invalidOrder("Order total is invalid");
  }

  if (slotDate) {
    const checkCapacity = async (client: Prisma.TransactionClient | typeof prisma) => {
      const count = await client.order.count({
        where: {
          timeslot: slotDate,
          status: { in: ACTIVE_ORDER_STATUSES },
        },
      });
      return count >= SLOT_CAPACITY;
    };

    const slotIsFull = tx
      ? await checkCapacity(tx)
      : await prisma.$transaction(checkCapacity);

    if (slotIsFull) {
      return invalidOrder(
        "Selected pickup timeslot is at full kitchen capacity. Please pick another slot.",
      );
    }
  }

  return {
    isValid: true,
    totalAmount: Math.round(totalAmount * 100) / 100,
    verifiedItems,
  };
}

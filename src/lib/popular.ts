import { prisma } from "@/lib/prisma";

export async function getPopularNow(limit = 6) {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError("Popular item limit must be a non-negative integer");
  }

  const items = await prisma.menuItem.findMany({ where: { inStock: true } });
  return items
    .map((item) => ({
      ...item,
      score: item.orderCount + (item.isPopular ? 30 : 0) + (item.isPromo ? 50 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

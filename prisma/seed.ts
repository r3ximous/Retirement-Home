import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

// ---------- Types for menu.json ----------
interface MenuJsonItem {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  arGlbUrl?: string;
  arUsdzUrl?: string;
  isPopular: boolean;
  isPromo: boolean;
}
interface MenuJson {
  currency: string;
  categories: Array<{ name: string; items: MenuJsonItem[] }>;
}

// ---------- Deterministic PRNG so every seed run yields the same history ----------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260508);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const DAY_MS = 24 * 60 * 60 * 1000;
const SARA_PHONE = '+971500000000';
const POINTS_PER_AED = 10;

const OTHER_CUSTOMERS = [
  { phone: '+971500000001', fullName: 'Omar Khalid', pointsBalance: 320, tierLevel: 'Base', streakCount: 1 },
  { phone: '+971500000002', fullName: 'Layla Hassan', pointsBalance: 860, tierLevel: 'Base', streakCount: 2 },
  { phone: '+971500000003', fullName: 'Rahul Menon', pointsBalance: 2150, tierLevel: 'Platinum', streakCount: 5 },
  { phone: '+971500000004', fullName: 'Aisha Rahman', pointsBalance: 540, tierLevel: 'Base', streakCount: 0 },
  { phone: '+971500000005', fullName: 'Daniel Park', pointsBalance: 1100, tierLevel: 'Gold', streakCount: 4 },
];

async function seedMenu(): Promise<MenuJsonItem[]> {
  const raw = fs.readFileSync(path.resolve(process.cwd(), 'prisma/menu.json'), 'utf-8');
  const menu = JSON.parse(raw) as MenuJson;
  const items = menu.categories.flatMap((c) => c.items);

  for (const item of items) {
    const data = {
      title: item.title,
      description: item.description,
      category: item.category,
      price: item.price,
      arGlbUrl: item.arGlbUrl ?? null,
      arUsdzUrl: item.arUsdzUrl ?? null,
      isPopular: item.isPopular,
      isPromo: item.isPromo,
      inStock: true,
      orderCount: 0, // recomputed from historical orders below
    };
    await prisma.menuItem.upsert({ where: { id: item.id }, update: data, create: { id: item.id, ...data } });
  }
  console.log(`✔ Menu items upserted: ${items.length}`);
  return items;
}

async function seedUsers(now: Date): Promise<Map<string, string>> {
  // Sara — the hero demo profile
  const sara = await prisma.userProfile.upsert({
    where: { phone: SARA_PHONE },
    update: {
      fullName: 'Sara',
      pointsBalance: 1240,
      tierLevel: 'Gold',
      streakCount: 3,
      lastOrderAt: new Date(now.getTime() - 1 * DAY_MS),
      lastGachaAt: null, // gacha pull available for the demo
    },
    create: {
      phone: SARA_PHONE,
      fullName: 'Sara',
      pointsBalance: 1240,
      tierLevel: 'Gold',
      streakCount: 3,
      lastOrderAt: new Date(now.getTime() - 1 * DAY_MS),
      lastGachaAt: null,
    },
  });

  const users = new Map([[SARA_PHONE, sara.id]]);
  // A few other campus customers so historical order volume looks realistic
  for (const c of OTHER_CUSTOMERS) {
    const data = { ...c, lastOrderAt: new Date(now.getTime() - randInt(1, 6) * DAY_MS) };
    const user = await prisma.userProfile.upsert({
      where: { phone: c.phone },
      update: data,
      create: data,
      select: { id: true },
    });
    users.set(c.phone, user.id);
  }
  console.log(`✔ User profiles upserted: Sara (${SARA_PHONE}) + ${OTHER_CUSTOMERS.length} others`);
  return users;
}

async function seedHistoricalOrders(
  items: MenuJsonItem[],
  now: Date,
  users: Map<string, string>,
) {
  // Reseed safely: clear transactional data, keep profiles/menu via upsert.
  await prisma.eventRSVP.deleteMany();
  await prisma.gachaReward.deleteMany();
  await prisma.order.deleteMany();

  // Weighted pick: popular / promo items are ordered more often.
  const weighted = items.map((i) => ({ item: i, weight: 1 + (i.isPopular ? 4 : 0) + (i.isPromo ? 3 : 0) }));
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  const pickItem = () => {
    let x = rand() * totalWeight;
    for (const w of weighted) {
      if (x < w.weight) return w.item;
      x -= w.weight;
    }
    return weighted[0].item;
  };

  const phones = [SARA_PHONE, ...OTHER_CUSTOMERS.map((c) => c.phone)];
  const ORDER_COUNT = 48;
  const orderCounts = new Map<string, number>();

  // Oldest -> newest so autoincrement queue numbers match chronology.
  for (let n = 0; n < ORDER_COUNT; n++) {
    const daysAgo = Math.max(1, 30 - Math.floor((n / ORDER_COUNT) * 30)); // spread over last 30 days
    const createdAt = new Date(now.getTime() - daysAgo * DAY_MS + randInt(8, 17) * 60 * 60 * 1000);
    const customerPhone = n % 4 === 0 ? SARA_PHONE : phones[randInt(0, phones.length - 1)];

    const lineCount = randInt(1, 3);
    const lines = new Map<string, { id: string; title: string; quantity: number; unitPrice: number }>();
    for (let l = 0; l < lineCount; l++) {
      const it = pickItem();
      const qty = randInt(1, 2);
      const existing = lines.get(it.id);
      if (existing) existing.quantity += qty;
      else lines.set(it.id, { id: it.id, title: it.title, quantity: qty, unitPrice: it.price });
    }
    const verified = [...lines.values()];
    const total = Math.round(verified.reduce((s, v) => s + v.unitPrice * v.quantity, 0) * 100) / 100;

    for (const v of verified) orderCounts.set(v.id, (orderCounts.get(v.id) ?? 0) + v.quantity);

    await prisma.order.create({
      data: {
        queueNumber: n + 1,
        customerId: users.get(customerPhone),
        customerPhone,
        itemsJson: JSON.stringify(verified),
        totalAmount: total,
        status: 'Claimed',
        timeslot: new Date(createdAt.getTime() + 15 * 60 * 1000),
        isPaid: true,
        stripeSessionId: `cs_test_seed_${String(n + 1).padStart(3, '0')}`,
        pointsAwarded: Math.floor(total) * POINTS_PER_AED,
        smsSent: false,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 20 * 60 * 1000),
      },
    });
  }

  // Denormalised counters used by the "Popular Now" formula
  for (const [id, count] of orderCounts) {
    await prisma.menuItem.update({ where: { id }, data: { orderCount: count } });
  }
  console.log(`✔ Historical orders created: ${ORDER_COUNT} (status=Claimed, isPaid=true)`);
}

async function seedGachaHistory(now: Date, users: Map<string, string>) {
  const saraId = users.get(SARA_PHONE);
  if (!saraId) throw new Error('Sara profile was not seeded');

  await prisma.gachaReward.createMany({
    data: [
      {
        userId: saraId,
        rewardType: 'POINTS_BOOST',
        rewardLabel: '+50 Bonus Points',
        isClaimed: true,
        unlockedAt: new Date(now.getTime() - 4 * DAY_MS),
        pullSeed: 123456,
      },
      {
        userId: saraId,
        rewardType: 'FREE_ADDON',
        rewardLabel: 'Free Cookie',
        isClaimed: false,
        unlockedAt: new Date(now.getTime() - 2 * DAY_MS),
        pullSeed: 654321,
      },
    ],
  });
  console.log('✔ Gacha history created: 2 past rewards for Sara');
}

async function seedEvents(now: Date, users: Map<string, string>) {
  const events = [
    {
      clubName: 'AIRC',
      eventTitle: 'AI & Robotics Showcase Night',
      description: 'Live robot demos and student AI projects. RSVP to unlock a discounted study-fuel bundle.',
      daysFromNow: 3,
      bundleItemIds: ['coffee-iced-latte', 'food-croissant-butter'],
      discountToken: 'AIRC-SHOWCASE-15',
    },
    {
      clubName: 'IEEE',
      eventTitle: 'IEEE Hardware Hack Hour',
      description: 'Bring your breadboard and build something in 60 minutes. Free refill perks for attendees.',
      daysFromNow: 6,
      bundleItemIds: ['coffee-cold-brew', 'snack-snow-ice'],
      discountToken: 'IEEE-HACK-10',
    },
    {
      clubName: 'Student Council',
      eventTitle: 'Campus Town Hall & Coffee',
      description: 'Meet your student reps over coffee and share ideas for the semester ahead.',
      daysFromNow: 9,
      bundleItemIds: ['coffee-caramel-cloud-latte', 'food-muffin-assorted'],
      discountToken: 'COUNCIL-TOWNHALL-20',
    },
  ];

  const created = [];
  for (const e of events) {
    const eventDate = new Date(now.getTime() + e.daysFromNow * DAY_MS);
    eventDate.setHours(18, 0, 0, 0);
    const data = {
      clubName: e.clubName,
      eventTitle: e.eventTitle,
      description: e.description,
      eventDate,
      bundleItemIds: JSON.stringify(e.bundleItemIds),
      discountToken: e.discountToken,
    };
    created.push(
      await prisma.clubEvent.upsert({ where: { discountToken: e.discountToken }, update: data, create: data })
    );
  }

  // Sara has already RSVP'd to the first event (shows the "Going" state in the UI)
  const saraId = users.get(SARA_PHONE);
  if (!saraId) throw new Error('Sara profile was not seeded');
  await prisma.eventRSVP.create({ data: { eventId: created[0].id, userId: saraId } });
  console.log(`✔ Club events upserted: ${created.length}, RSVPs created: 1`);
}

export async function seedDemoDatabase() {
  try {
    const now = new Date();
    const items = await seedMenu();
    const users = await seedUsers(now);
    await seedHistoricalOrders(items, now, users);
    await seedGachaHistory(now, users);
    await seedEvents(now, users);
    console.log('🌱 Seed complete.');
  } finally {
    await prisma.$disconnect();
  }
}

if (
  typeof __filename !== 'undefined' &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename)
) {
  void seedDemoDatabase().catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  });
}

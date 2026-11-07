# Altitude Cafe PWA — Unified Coding Agent Master Build Plan

## 1. Executive Summary & Core Objective

* **Target System**: Altitude Cafe Progressive Web App (PWA) + Kitchen Display System (KDS) + Admin Dashboard + POS Simulator.
* **Primary Objective**: Build a single-repository, full-stack prototype for the ideaForge Hackathon solving all 6 brief tracks:
  1. **Order & Queue**: Live queue position tracking ("Order #27 - 3 ahead"), audio chimes, and KDS status progression across 10 distinct operational stages.
  2. **Loyalty Rewards**: Points engine ($10\text{ points} = 1\text{ AED}$), tier progression (Base, Gold, Platinum), coffee streaks, and an interactive **Gacha Pull** mini-game.
  3. **Popular Picks**: Dynamic top-bestsellers calculation based on live + seeded order volume.
  4. **Promo Spotlight**: Digital "Drink of the Month" hero card with 1-tap add to cart.
  5. **Club & Event Hub**: RIT Campus community tab (AIRC, IEEE, Student Council) with event RSVP perks.
  6. **Online Payments & POS Sync**: Stripe Checkout integration (Apple Pay / Google Pay / Card) with automated webhooks to a MOBIPOS/FloCafe simulator interface.
* **Architecture Strategy**: Next.js 14+ (App Router, TypeScript) Monolith + Tailwind CSS + shadcn/ui + SQLite (Prisma ORM) + Native Server-Sent Events (SSE) + Google `<model-viewer>` WebAR + Twilio REST API.

---

## 2. 10-Stage Order Lifecycle Breakdown

The application processes every customer interaction through a structured 10-stage lifecycle to ensure zero-trust pricing security, queue accuracy, and instant kitchen updates.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               10-STAGE ORDER LIFECYCLE                                 │
├───────────────┬────────────────────────────────────────────────────────────────────────┤
│ Stage         │ Operational & Technical Action                                         │
├───────────────┼────────────────────────────────────────────────────────────────────────┤
│ 1. Schedule   │ Customer selects items, custom options, pickup timeslot, and submits. │
│ 2. Validation │ Backend recalculates item prices independently from DB (Zero-Trust)    │
│               │ and verifies active stock & kitchen capacity thresholds.              │
│ 3. Reservation│ Backend creates a `Pending` order and holds the selected pickup slot.  │
│ 4. Payment    │ Backend initializes a Stripe Checkout Session; client redirects to UI. │
│ 5. Confirm    │ Stripe posts signed `checkout.session.completed` webhook; order status │
│               │ advances to `Paid`.                                                    │
│ 6. Staff Queue│ Order enters KDS queue (`Pending` column) in real time over SSE.       │
│ 7. Preparation│ Barista taps "Brewing" on KDS display; status update streams to client.│
│ 8. Ready      │ Barista taps "Ready"; customer phone plays sound chime + Web Push/SMS. │
│ 9. Collection │ Customer provides queue # at counter; staff hands over items.          │
│ 10. Completion│ Staff marks order "Claimed"; backend archives state & logs points.     │
└───────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

## 3. End-to-End System Sequence & Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM SEQUENCE FLOW (MERMAID)                            │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [Customer Website/PWA]       [Backend API]            [Database]      [Stripe/Twilio]  [Staff Dashboard]
          │                        │                        │                 │               │
  1. POST /api/orders ────────────►│                        │                 │               │
  (Items, Timeslot, Phone)         │ 2. Recalculate prices  │                 │               │
          │                        │    & verify stock ────►│                 │               │
          │                        │◄─── (Stock & Rates OK) │                 │               │
          │                        │                        │                 │               │
  3. Create Stripe Session ───────►│ 4. Reserve Slot & Order│                 │               │
          │                        │    status = `Pending` ─►│                 │               │
          │◄───────────────────────│                        │                 │               │
          │ (Redirect to Stripe)   │                        │                 │               │
          │                        │                        │                 │               │
  5. Pay on Stripe Checkout ──────────────────────────────────────────────────►│               │
          │                        │                        │                 │               │
          │                        │ 6. Signed Webhook Event│                 │               │
          │                        │    checkout.session.  │                 │               │
          │                        │    completed ◄───────────────────────────┤               │
          │                        │ 7. Verify signature &  │                 │               │
          │                        │    set status = `Paid`►│                 │               │
          │                        │                        │                 │               │
  8. Subscribe to SSE Tracker ────►│ 9. Push new order SSE ──────────────────────────────────►│
          │                        │                        │                 │ (Appears on KDS)
          │                        │                        │                 │               │
          │                        │◄─────────────────────────────────────────────────────────┤
          │                        │ 10. Barista Taps `Brewing` -> `Ready`            │
          │◄───────────────────────│                        │                 │               │
    (Play Sound + Web Push)        │ 11. Dispatch SMS alert ─────────────────►│ (Twilio SMS)  │
          │                        │                        │                 │               │
          │                        │◄─────────────────────────────────────────────────────────┤
          │                        │ 12. Barista Taps `Claimed`                        │
          │◄───────────────────────│ 13. Update state &     │                 │               │
   (Order Completed View)          │     award points ─────►│                 │               │
```

---

## 4. Full Repository Directory Tree

```
altitude-cafe/
├── prisma/
│   ├── schema.prisma          # Database schema (SQLite)
│   ├── menu.json              # Structured Altitude menu seed data
│   └── seed.ts                # Seed script for demo data (Sara, Menu, Promos, Events)
├── public/
│   ├── models/
│   │   ├── iced_latte_16oz.glb
│   │   └── iced_latte_16oz.usdz
│   ├── sounds/
│   │   └── ready-chime.mp3
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with Tailwind & HTML5 PWA tags
│   │   ├── page.tsx           # Customer PWA main view
│   │   ├── cart/page.tsx      # Cart & Time-slot pickup selector
│   │   ├── track/[id]/page.tsx# Real-time SSE queue tracking page
│   │   ├── rewards/page.tsx   # Loyalty profile, streaks & Gacha machine
│   │   ├── events/page.tsx    # Campus Club Hub & RSVP perk unlocker
│   │   ├── kds/page.tsx       # Barista Kitchen Display System
│   │   ├── admin/
│   │   │   ├── page.tsx       # Admin overview & sales analytics
│   │   │   └── godmode/page.tsx # Demo God-Mode control panel
│   │   ├── pos-sim/page.tsx   # MOBIPOS Integration Simulator Page
│   │   └── api/
│   │       ├── orders/route.ts        # Order validation & creation
│   │       ├── queue/stream/route.ts  # Native SSE streaming route
│   │       ├── checkout/route.ts      # Stripe session creation
│   │       ├── webhooks/stripe/route.ts# Stripe webhook verification
│   │       ├── gacha/route.ts         # Gacha pull logic endpoint
│   │       └── godmode/route.ts       # Force order status & override RNG
│   ├── components/
│   │   ├── WebARViewer.tsx    # Google <model-viewer> wrapper + 2D fallback
│   │   ├── PromoBanner.tsx    # Drink of the Month hero card
│   │   ├── PopularNow.tsx     # Dynamic bestseller carousel
│   │   ├── QueueProgress.tsx  # Animated live status bar
│   │   ├── GachaWheel.tsx     # Interactive reward pull UI
│   │   └── Navbar.tsx         # Bottom navigation bar for mobile PWA
│   ├── lib/
│   │   ├── prisma.ts          # Singleton Prisma client setup
│   │   ├── orderValidation.ts # Zero-trust price & capacity validator
│   │   ├── sse.ts             # Server-Sent Events hub helper
│   │   └── gacha.ts           # Reward probability calculation engine
│   └── types/
│       └── index.ts           # TypeScript interfaces
├── .env.example
├── package.json
└── tailwind.config.js
```

---

## 5. Prisma Database Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model UserProfile {
  phone          String        @id
  fullName       String
  pointsBalance  Int           @default(1240) // Default matches mockup in brief
  tierLevel      String        @default("Gold") // Base, Gold, Platinum
  streakCount    Int           @default(3)
  lastOrderAt    DateTime      @default(now())
  createdAt      DateTime      @default(now())
  orders         Order[]
  gachaRewards   GachaReward[]
}

model MenuItem {
  id          String   @id @default(uuid())
  title       String
  description String
  category    String   // Tea, Caffeine Free, Snacks, Food, Coffee, Special
  price       Float
  arGlbUrl    String?
  arUsdzUrl   String?
  isPopular   Boolean  @default(false)
  isPromo     Boolean  @default(false)
  inStock     Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model Order {
  id              String      @id @default(uuid())
  queueNumber     Int         @default(autoincrement())
  customerPhone   String
  customer        UserProfile @relation(fields: [customerPhone], references: [phone])
  itemsJson       String      // Serialized array of { id, title, quantity, price, options }
  totalAmount     Float
  status          String      @default("Pending") // Pending, Paid, Brewing, Ready, Claimed, Cancelled
  timeslot        DateTime?
  isPaid          Boolean     @default(false)
  stripeSessionId String?
  smsSent         Boolean     @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model GachaReward {
  id          String      @id @default(uuid())
  phone       String
  customer    UserProfile @relation(fields: [phone], references: [phone])
  rewardType  String      // FREE_ADDON, DISCOUNT_VAR, SHOT_ESPRESSO, GOLD_DOUBLE, POINTS_BOOST
  rewardLabel String
  isClaimed   Boolean     @default(false)
  unlockedAt  DateTime    @default(now())
}

model ClubEvent {
  id             String   @id @default(uuid())
  clubName       String   // AIRC, IEEE, Student Council
  eventTitle     String
  description    String
  eventDate      DateTime
  bundleItemIds  String   // JSON string of menu item IDs
  discountToken  String
}
```

---

## 6. Altitude Cafe Menu JSON Seed Dataset (`prisma/menu.json`)

This JSON dataset accurately transcribes the physical Altitude Cafe menu image along with customizations and featured hackathon coffee items.

```json
{
  "currency": "AED",
  "categories": [
    {
      "name": "Tea",
      "items": [
        {
          "id": "tea-black",
          "title": "Black Tea",
          "description": "Classic premium black tea blend brewed to perfection",
          "price": 12.00,
          "category": "Tea",
          "isPopular": false,
          "isPromo": false
        },
        {
          "id": "tea-green",
          "title": "Green Tea",
          "description": "Refreshing and antioxidant-rich green tea leaves",
          "price": 12.00,
          "category": "Tea",
          "isPopular": false,
          "isPromo": false
        },
        {
          "id": "tea-rooibos",
          "title": "Rooibos Tea",
          "description": "Naturally caffeine-free herbal South African rooibos",
          "price": 12.00,
          "category": "Tea",
          "isPopular": false,
          "isPromo": false
        },
        {
          "id": "tea-hibiscus",
          "title": "Hibiscus Tea",
          "description": "Tart, floral, and vibrant iced hibiscus infusion",
          "price": 12.00,
          "category": "Tea",
          "isPopular": false,
          "isPromo": false
        },
        {
          "id": "tea-macha-latte",
          "title": "Macha Latte",
          "description": "Creamy Japanese matcha green tea with steamed milk",
          "price": 12.00,
          "category": "Tea",
          "isPopular": true,
          "isPromo": false
        }
      ]
    },
    {
      "name": "Caffeine Free",
      "items": [
        {
          "id": "caf-summer-zest",
          "title": "Summer Zest",
          "description": "Zesty and refreshing citrus mocktail cooler",
          "price": 12.00,
          "category": "Caffeine Free",
          "isPopular": false,
          "isPromo": false
        },
        {
          "id": "caf-lavender-spritzer",
          "title": "Lavender Spritzer",
          "description": "Calming floral lavender spritzer with sparkling water",
          "price": 12.00,
          "category": "Caffeine Free",
          "isPopular": false,
          "isPromo": false
        },
        {
          "id": "caf-pomegranate-punch",
          "title": "Pomegranate Punch",
          "description": "Sweet and tangy pomegranate blend over ice",
          "price": 12.00,
          "category": "Caffeine Free",
          "isPopular": false,
          "isPromo": false
        },
        {
          "id": "caf-hot-chocolate-nutella",
          "title": "Hot Chocolate / Nutella",
          "description": "Rich cocoa blend infused with creamy Nutella hazelnut spread",
          "price": 12.00,
          "category": "Caffeine Free",
          "isPopular": true,
          "isPromo": false
        },
        {
          "id": "caf-pina-colada",
          "title": "Piña Colada",
          "description": "Tropical coconut milk and pineapple blend",
          "price": 12.00,
          "category": "Caffeine Free",
          "isPopular": false,
          "isPromo": false
        },
        {
          "id": "caf-mango-mango",
          "title": "Mango Mango",
          "description": "Luscious double-mango iced refresher",
          "price": 12.00,
          "category": "Caffeine Free",
          "isPopular": false,
          "isPromo": false
        },
        {
          "id": "caf-banana-choco-shake",
          "title": "Banana Chocolate - Protein Shake",
          "description": "High-protein banana chocolate fitness shake",
          "price": 12.00,
          "category": "Caffeine Free",
          "isPopular": false,
          "isPromo": false
        }
      ]
    },
    {
      "name": "Snacks",
      "items": [
        {
          "id": "snack-acai-bowl",
          "title": "Acai Bowl (Banana - Strawberry - Blueberry)",
          "description": "Organic acai topped with fresh sliced banana, strawberries, and blueberries",
          "price": 14.00,
          "category": "Snacks",
          "isPopular": true,
          "isPromo": false
        },
        {
          "id": "snack-acai-smoothie",
          "title": "Acai Smoothie (Banana - Strawberry)",
          "description": "Blended acai smoothie with ripe banana and fresh strawberries",
          "price": 16.00,
          "category": "Snacks",
          "isPopular": false,
          "isPromo": false
        },
        {
          "id": "snack-snow-ice",
          "title": "New Snow Ice",
          "description": "Fluffy Korean shaved snow ice dessert",
          "price": 12.00,
          "category": "Snacks",
          "isPopular": false,
          "isPromo": false
        }
      ]
    },
    {
      "name": "Food",
      "items": [
        {
          "id": "food-muffin-assorted",
          "title": "Assorted Muffins",
          "description": "Freshly baked blueberry, chocolate chip, and double chocolate muffins",
          "price": 12.00,
          "category": "Food",
          "isPopular": false,
          "isPromo": false
        },
        {
          "id": "food-croissant-butter",
          "title": "Butter Croissant",
          "description": "Flaky, golden-baked French butter croissant",
          "price": 15.00,
          "category": "Food",
          "isPopular": true,
          "isPromo": false
        },
        {
          "id": "food-sandwich-artisanal",
          "title": "Artisanal Gourmet Sandwich",
          "description": "Freshly prepared turkey breast and pesto sandwich on sourdough",
          "price": 22.00,
          "category": "Food",
          "isPopular": false,
          "isPromo": false
        }
      ]
    },
    {
      "name": "Coffee (Featured)",
      "items": [
        {
          "id": "coffee-iced-latte",
          "title": "Iced Latte",
          "description": "Signature espresso with cold milk over ice",
          "price": 16.00,
          "category": "Coffee",
          "arGlbUrl": "/models/iced_latte_16oz.glb",
          "arUsdzUrl": "/models/iced_latte_16oz.usdz",
          "isPopular": true,
          "isPromo": false
        },
        {
          "id": "coffee-cold-brew",
          "title": "Cold Brew",
          "description": "Steeped for 18 hours for maximum smoothness",
          "price": 18.00,
          "category": "Coffee",
          "isPopular": true,
          "isPromo": false
        },
        {
          "id": "coffee-caramel-cloud-latte",
          "title": "Caramel Cloud Latte",
          "description": "Featured Drink of the Month: Espresso layered with whipped caramel cloud cold foam",
          "price": 20.00,
          "category": "Coffee",
          "isPopular": true,
          "isPromo": true
        }
      ]
    }
  ],
  "customizations": {
    "milkAlternatives": [
      { "id": "milk-oatly", "title": "Oatly", "extraCost": 0.00 },
      { "id": "milk-almond", "title": "Almond Milk", "extraCost": 0.00 },
      { "id": "milk-coconut", "title": "Coconut Milk", "extraCost": 0.00 },
      { "id": "milk-lactose-free", "title": "Lactose Free", "extraCost": 0.00 }
    ],
    "toppings": [
      { "id": "top-blue-granola", "title": "Blueberry - Granola", "price": 4.00 },
      { "id": "top-oats-honey-almonds", "title": "Oats - Honey - Almonds", "price": 4.00 },
      { "id": "top-almond-peanut-butter", "title": "Almond Butter - Peanut Butter", "price": 4.00 },
      { "id": "top-chia-kiwi", "title": "Chia Seeds - Kiwi", "price": 4.00 }
    ]
  }
}
```

---

## 7. Server-Side Zero-Trust Order Validation (`src/lib/orderValidation.ts`)

To enforce Stage 2 Security, prices submitted from the client browser are completely ignored. The backend re-fetches prices directly from the database and checks kitchen timeslot capacity.

```typescript
import { prisma } from '@/lib/prisma';

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

export async function validateAndPriceOrder(
  items: ClientOrderItem[],
  pickupTimeslot?: string
): Promise<VerifiedOrderResult> {
  if (!items || items.length === 0) {
    return { isValid: false, error: 'Cart cannot be empty', totalAmount: 0, verifiedItems: [] };
  }

  let totalAmount = 0;
  const verifiedItems = [];

  // 1. Re-fetch all menu items from DB to prevent client price tampering
  const productIds = items.map((i) => i.productId);
  const dbProducts = await prisma.menuItem.findMany({
    where: { id: { in: productIds } },
  });

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  for (const item of items) {
    const dbProduct = productMap.get(item.productId);

    if (!dbProduct) {
      return { isValid: false, error: `Product ID ${item.productId} not found`, totalAmount: 0, verifiedItems: [] };
    }

    if (!dbProduct.inStock) {
      return { isValid: false, error: `Item "${dbProduct.title}" is currently out of stock`, totalAmount: 0, verifiedItems: [] };
    }

    if (item.quantity <= 0 || item.quantity > 20) {
      return { isValid: false, error: `Invalid quantity for item "${dbProduct.title}"`, totalAmount: 0, verifiedItems: [] };
    }

    const itemTotal = dbProduct.price * item.quantity;
    totalAmount += itemTotal;

    verifiedItems.push({
      id: dbProduct.id,
      title: dbProduct.title,
      quantity: item.quantity,
      unitPrice: dbProduct.price,
    });
  }

  // 2. Capacity & Window Check (Max 15 active orders per 15-minute slot)
  if (pickupTimeslot) {
    const slotDate = new Date(pickupTimeslot);
    const existingOrdersCount = await prisma.order.count({
      where: {
        timeslot: slotDate,
        status: { in: ['Pending', 'Paid', 'Brewing'] },
      },
    });

    if (existingOrdersCount >= 15) {
      return { isValid: false, error: 'Selected pickup timeslot is at full kitchen capacity. Please pick another slot.', totalAmount: 0, verifiedItems: [] };
    }
  }

  return {
    isValid: true,
    totalAmount: Math.round(totalAmount * 100) / 100,
    verifiedItems,
  };
}
```

---

## 8. Key Backend API Endpoint Implementations

### 8.1 Order Creation & Reservation Route (`src/app/api/orders/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAndPriceOrder } from '@/lib/orderValidation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, pickupTime, customer } = body;

    if (!customer?.phone) {
      return NextResponse.json({ error: 'Customer phone number is required' }, { status: 400 });
    }

    // Stage 2: Zero-Trust Validation & Price Calculation
    const validation = await validateAndPriceOrder(items, pickupTime);

    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Ensure user profile exists or create guest record
    await prisma.userProfile.upsert({
      where: { phone: customer.phone },
      update: { fullName: customer.name || 'Student Customer' },
      create: { phone: customer.phone, fullName: customer.name || 'Student Customer' },
    });

    // Stage 3: Reservation & Slot Hold
    const order = await prisma.order.create({
      data: {
        customerPhone: customer.phone,
        itemsJson: JSON.stringify(validation.verifiedItems),
        totalAmount: validation.totalAmount,
        status: 'Pending',
        timeslot: pickupTime ? new Date(pickupTime) : null,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      queueNumber: order.queueNumber,
      totalAmount: order.totalAmount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

### 8.2 Native SSE Queue Tracker (`src/app/api/queue/stream/route.ts`)

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return new Response('Missing orderId parameter', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const interval = setInterval(async () => {
        try {
          const currentOrder = await prisma.order.findUnique({
            where: { id: orderId },
          });

          if (!currentOrder) return;

          const pendingAhead = await prisma.order.count({
            where: {
              status: { in: ['Pending', 'Paid'] },
              createdAt: { lt: currentOrder.createdAt },
            },
          });

          sendEvent({
            status: currentOrder.status,
            ordersAhead: pendingAhead,
            queueNumber: currentOrder.queueNumber,
            updatedAt: currentOrder.updatedAt,
          });

          if (currentOrder.status === 'Claimed' || currentOrder.status === 'Cancelled') {
            clearInterval(interval);
            controller.close();
          }
        } catch (err) {
          clearInterval(interval);
          controller.close();
        }
      }, 1500);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
```

### 8.3 Stripe Webhook Verification (`src/app/api/webhooks/stripe/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Signature Error: ${err.message}` }, { status: 400 });
  }

  // Stage 5: Payment Confirmation
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'Paid', isPaid: true, stripeSessionId: session.id },
      });

      // Stage 10 Preview: Award Loyalty Points ($10\text{ points} = 1\text{ AED}$)
      const pointsEarned = Math.floor(updatedOrder.totalAmount * 10);
      await prisma.userProfile.update({
        where: { phone: updatedOrder.customerPhone },
        data: {
          pointsBalance: { increment: pointsEarned },
          lastOrderAt: new Date(),
        },
      });

      // Outbound Webhook to MOBIPOS Simulator
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/pos-sim/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'PAID_ACCEPTED', total: updatedOrder.totalAmount }),
      }).catch(() => {});
    }
  }

  return NextResponse.json({ received: true });
}
```

---

## 9. Frontend Core Component Specifications

### 9.1 WebAR Viewer Component with 2D Fallback (`src/components/WebARViewer.tsx`)

```tsx
'use client';

import React, { useState } from 'react';

interface WebARProps {
  glbPath?: string;
  usdzPath?: string;
  itemName: string;
  portionSize: string;
}

export function WebARViewer({ glbPath, usdzPath, itemName, portionSize }: WebARProps) {
  const [arFailed, setArFailed] = useState(false);

  return (
    <div className="w-full flex flex-col items-center bg-gray-900 text-white p-4 rounded-2xl shadow-xl border border-amber-500/30">
      {!arFailed && glbPath ? (
        //@ts-ignore - Google <model-viewer> Custom Element
        <model-viewer
          src={glbPath}
          ios-src={usdzPath}
          alt={`3D ${itemName}`}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          touch-action="pan-y"
          shadow-intensity="1.5"
          style={{ width: '100%', height: '260px' }}
          onerror={() => setArFailed(true)}
        >
          <button
            slot="ar-button"
            className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold px-6 py-3 rounded-full shadow-lg transition transform active:scale-95 flex items-center gap-2 mx-auto mt-4"
          >
            <span>📷 Preview {portionSize} Size on Table</span>
          </button>
        </model-viewer>
      ) : (
        /* 2D Depth-Calibrated Fallback Overlay */
        <div className="w-full h-64 bg-gray-800 rounded-xl flex flex-col items-center justify-center p-4 border border-dashed border-amber-400/50">
          <div className="flex items-end justify-center gap-6 mb-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-400 mb-1">12 oz</span>
              <div className="w-12 h-20 bg-amber-700/60 rounded-b-lg border border-amber-400 flex items-center justify-center text-xs font-bold">M</div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-amber-400 font-bold mb-1">16 oz (Selected)</span>
              <div className="w-16 h-28 bg-amber-500/80 rounded-b-lg border-2 border-amber-300 flex items-center justify-center text-sm font-extrabold text-black shadow-lg shadow-amber-500/40">L</div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-400 mb-1">24 oz</span>
              <div className="w-20 h-36 bg-amber-900/60 rounded-b-lg border border-amber-400 flex items-center justify-center text-xs font-bold">XL</div>
            </div>
          </div>
          <p className="text-xs text-amber-200 text-center">2D Scale Comparison (16oz = 15cm height against standard desk items)</p>
        </div>
      )}
      <p className="text-[11px] text-gray-400 mt-2">Zero app download required. Powered by WebAR / iOS QuickLook.</p>
    </div>
  );
}
```

### 9.2 Customer Live Queue Tracking View (`src/app/track/[id]/page.tsx`)

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function OrderTrackingPage() {
  const { id } = useParams();
  const [orderState, setOrderState] = useState({
    status: 'Pending',
    ordersAhead: 0,
    queueNumber: 0,
  });

  useEffect(() => {
    const eventSource = new EventSource(`/api/queue/stream?orderId=${id}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setOrderState(data);

      if (data.status === 'Ready') {
        const audio = new Audio('/sounds/ready-chime.mp3');
        audio.play().catch(() => {});
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      }
    };

    return () => eventSource.close();
  }, [id]);

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col justify-between">
      <div className="text-center pt-8">
        <span className="text-amber-500 font-bold uppercase tracking-widest text-xs">Altitude Cafe Queue</span>
        <h1 className="text-5xl font-extrabold mt-2 text-white">#{orderState.queueNumber}</h1>
        <p className="text-gray-400 mt-1">Order Identifier: {id?.slice(0, 8)}</p>
      </div>

      <div className="my-auto space-y-6">
        <div className="w-full bg-gray-800 h-4 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              orderState.status === 'Ready'
                ? 'bg-green-500 w-full'
                : orderState.status === 'Brewing'
                ? 'bg-blue-500 w-2/3'
                : 'bg-amber-500 w-1/3'
            }`}
          />
        </div>

        {orderState.status === 'Pending' && (
          <p className="text-center text-amber-400 font-semibold text-lg animate-pulse">
            ⏳ Stage 6: {orderState.ordersAhead} order(s) ahead in kitchen queue
          </p>
        )}
        {orderState.status === 'Brewing' && (
          <p className="text-center text-blue-400 font-semibold text-lg">
            ☕ Stage 7: Barista is brewing your drink right now!
          </p>
        )}
        {orderState.status === 'Ready' && (
          <div className="bg-green-500/20 border-2 border-green-500 rounded-2xl p-6 text-center animate-bounce">
            <h2 className="text-2xl font-black text-green-400">STAGE 8: YOUR ORDER IS READY! 🎉</h2>
            <p className="text-sm text-green-200 mt-1">Please show queue #{orderState.queueNumber} at the pickup counter.</p>
          </div>
        )}
      </div>

      <div className="bg-gray-900 p-4 rounded-xl text-center">
        <p className="text-xs text-gray-400">Points Earned: <span className="text-amber-400 font-bold">+10 pts per 1 AED</span></p>
      </div>
    </div>
  );
}
```

---

## 10. Demo God-Mode Control Panel (`src/app/admin/godmode/page.tsx`)

```tsx
'use client';

export default function GodModePage() {
  const triggerAction = async (action: string, payload?: any) => {
    await fetch('/api/godmode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    alert(`Executed: ${action}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-black text-amber-500 mb-2">⚡ DEMO GOD-MODE CONTROLS</h1>
      <p className="text-xs text-gray-400 mb-6">Use on stage to force order states, simulate payments, or lock Gacha results.</p>

      <div className="space-y-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <h2 className="font-bold text-sm text-amber-300 mb-2">Instant Order Queue Transitions</h2>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => triggerAction('ADVANCE_LATEST_ORDER', { status: 'Brewing' })} className="bg-blue-600 hover:bg-blue-700 py-2 rounded text-xs font-bold">Set Latest -> BREWING</button>
            <button onClick={() => triggerAction('ADVANCE_LATEST_ORDER', { status: 'Ready' })} className="bg-green-600 hover:bg-green-700 py-2 rounded text-xs font-bold">Set Latest -> READY 🔔</button>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <h2 className="font-bold text-sm text-amber-300 mb-2">Gacha Result Overrides</h2>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => triggerAction('SET_GACHA_OVERRIDE', { result: 'GOLD_DOUBLE' })} className="bg-amber-500 text-black py-2 rounded text-xs font-black">Force GOLD JACKPOT 🏆</button>
            <button onClick={() => triggerAction('SET_GACHA_OVERRIDE', { result: 'FREE_ADDON' })} className="bg-purple-600 py-2 rounded text-xs font-bold">Force Free Cookie 🍪</button>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <h2 className="font-bold text-sm text-amber-300 mb-2">System Reset</h2>
          <button onClick={() => triggerAction('RESET_DEMO_SEED')} className="w-full bg-red-700 hover:bg-red-800 py-2 rounded text-xs font-bold">Re-seed Fresh Demo Database</button>
        </div>
      </div>
    </div>
  );
}
```

---

## 11. Step-by-Step Coding Agent Execution Blueprint

Execute these commands and code tasks sequentially:

```bash
# Task Step 1: Scaffold Next.js Application
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npm i prisma @prisma/client stripe lucide-react clsx tailwind-merge twilio

# Task Step 2: Initialize Prisma & Seed Database
npx prisma init --datasource-provider sqlite
# (Copy schema from Section 5 into prisma/schema.prisma)
npx prisma db push

# Task Step 3: Implement Seed Data from Menu JSON
# Read prisma/menu.json inside prisma/seed.ts to populate MenuItems, "Sara" (+971500000000, 1240 pts), Promos, and Club Events.
npx prisma db seed

# Task Step 4: Build Core Validation & API Routes
# Build /lib/orderValidation.ts, /api/orders, /api/queue/stream (SSE), /api/checkout, /api/webhooks/stripe, /api/gacha, and /api/godmode.

# Task Step 5: Build Customer Front-End Views
# Implement Customer Home (/), Cart (/cart), WebAR Viewer, Rewards (/rewards), Event Hub (/events), and Live Queue Tracker (/track/[id]).

# Task Step 6: Build KDS, Admin & POS Simulator
# Implement /kds Kanban, /admin dashboard, /admin/godmode controls, and /pos-sim view.

# Task Step 7: Verify Build & Run Local Server
npm run build
npm run start
```

---

## 12. Live Demo Script (3-Minute Judging Pitch)

1. **0:00–0:20 (Hook)**: Scan QR code from mobile device. PWA opens instantly without app store download.
2. **0:20–0:50 (Ordering & WebAR)**: Highlight "Drink of the Month" banner and "Popular Right Now" items. Open WebAR model viewer to demonstrate 1:1 cup scale comparison on the desk. Place order (Stage 1 & 2 validation executed).
3. **0:50–1:20 (KDS & Realtime Queue)**: Show split screen: Mobile phone displays "Order #27 - 3 ahead" queue bar. Barista taps "Brewing" on KDS screen (Stage 7); phone updates instantly via SSE.
4. **1:20–1:40 (Audio Alert)**: Barista taps "Ready" (Stage 8). Phone vibrates and plays HTML5 audio chime.
5. **1:40–2:10 (Loyalty & Gacha Game)**: Points update to 1,460 pts (Gold Tier, 40 to Platinum). Trigger live **Gacha Pull** animation; use God-mode to guarantee a Jackpot pull.
6. **2:10–2:30 (Campus Hub)**: Open Events tab showcasing AIRC & IEEE club collabs with RSVP drink bundle tokens.
7. **2:30–3:00 (POS Sync & Feasibility)**: Show POS Simulator (`/pos-sim`) receiving order payload. Explain how FloCafe SQLite / MOBIPOS webhooks allow seamless deployment at Altitude Cafe.
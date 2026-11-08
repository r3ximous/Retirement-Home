### Altitude Cafe PWA — Unified Coding Agent Master Build Plan (Final Merged Version)

#### 1. Executive Summary & Core Objective

* **Target System**: Altitude Cafe Progressive Web App (PWA) + Kitchen Display System (KDS) + Admin Dashboard + POS Simulator.
* **Primary Objective**: Build a single-repository, full-stack prototype for the ideaForge Hackathon solving all 6 brief tracks:
1. **Order & Queue**: Live queue position tracking ("Order #27 - 3 ahead"), audio chimes, and KDS status progression across 10 distinct operational stages.
2. **Loyalty Rewards**: Points engine ($10\text{ points} = 1\text{ AED}$), tier progression (Base, Gold, Platinum), coffee streaks, and an interactive **Gacha Pull** mini-game.
3. **Popular Picks**: Dynamic top-bestsellers calculation based on live + seeded order volume.
4. **Promo Spotlight**: Digital "Drink of the Month" hero card with 1-tap add to cart.
5. **Club & Event Hub**: RIT Campus community tab (AIRC, IEEE, Student Council) with event RSVP perks.
6. **Online Payments & POS Sync**: Stripe Checkout integration (Apple Pay / Google Pay / Card) in **TEST MODE** with automated webhooks to a MOBIPOS/FloCafe simulator interface.


* **Architecture Strategy**: Next.js 14+ (App Router, TypeScript) Monolith + Tailwind CSS + shadcn/ui + SQLite (Prisma ORM) + Native Server-Sent Events (SSE) + Google `<model-viewer>` WebAR + (optional) Twilio REST API.

> **⛔ DEPLOYMENT CONSTRAINT:** This app uses long-lived SSE streams and a local SQLite file. **It MUST run as a long-lived Node process (`npm run start` / `npm run dev`). Do NOT deploy to Vercel, Netlify, or any serverless platform.** The demo machine IS the server. If a public URL is needed for the QR code, expose the demo laptop via a tunnel (e.g. `ngrok http 3000`).

---

#### 2. 10-Stage Order Lifecycle Breakdown

The application processes every customer interaction through a structured lifecycle to ensure zero-trust pricing security, queue accuracy, and instant kitchen updates.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               10-STAGE ORDER LIFECYCLE                                 │
├───────────────┬────────────────────────────────────────────────────────────────────────┤
│ Stage         │ Operational & Technical Action                                         │
├───────────────┼────────────────────────────────────────────────────────────────────────┤
│ 1. Schedule   │ Customer selects items, custom options, pickup timeslot, and submits.  │
│ 2. Validation │ Backend recalculates item prices independently from DB (Zero-Trust).   │
│ 3. Reservation│ Backend creates a `Pending` order and holds the selected pickup slot.  │
│ 4. Payment    │ Backend initializes a Stripe Checkout Session; client redirects.       │
│ 5. Confirm    │ Stripe posts signed webhook; order status advances to `Paid`.          │
│ 6. Staff Queue│ Order enters KDS queue (`Pending` column) in real time over SSE.       │
│ 7. Preparation│ Barista taps "Brewing" on KDS display; status update streams.          │
│ 8. Ready      │ Barista taps "Ready"; customer phone plays sound chime + Web Push/SMS. │
│ 9. Collection │ Customer provides queue # at counter; staff hands over items.          │
│ 9b. Cancelled │ (NEW) If payment fails, order cancels and held points are clawed back. │
│ 10. Completion│ Staff marks order "Claimed"; backend archives state & logs points.     │
└───────────────┴────────────────────────────────────────────────────────────────────────┘

```

*Note on Queue Logic: `ordersAhead` counts unstarted orders (`Pending`/`Paid`). Once the order physically ahead enters `Brewing`, it leaves the count, so numbers drop faster than real time (ideal for rapid hackathon pacing).*

---

#### 3. End-to-End System Sequence & Architecture Diagram

```text
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
          │                        │    checkout.session.   │                 │               │
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
    (Play Sound + SSE Push)        │ 11. Dispatch SMS alert (Optional) ──────►│ (Twilio SMS)  │
          │                        │                        │                 │               │
          │                        │◄─────────────────────────────────────────────────────────┤
          │                        │ 12. Barista Taps `Claimed`                        │
          │◄───────────────────────│ 13. Update state &     │                 │               │
   (Order Completed View)          │     award points ─────►│                 │               │

```

---

#### 4. Full Repository Directory Tree

```text
altitude-cafe/
├── prisma/
│   ├── schema.prisma          
│   ├── menu.json              
│   └── seed.ts                # Seeds Sara, Menu, Promos, Events, and RSVPs
├── public/
│   ├── models/
│   │   ├── iced_latte_16oz.glb  # 3D assets renamed to match seed
│   │   └── iced_latte_16oz.usdz
│   ├── sounds/
│   │   └── ready-chime.mp3
│   ├── manifest.json
│   └── sw.js                  # Generated by next-pwa
├── src/
│   ├── middleware.ts          # Shared-secret guard for protected routes
│   ├── app/
│   │   ├── layout.tsx         
│   │   ├── page.tsx           
│   │   ├── cart/page.tsx      
│   │   ├── track/[id]/page.tsx
│   │   ├── rewards/page.tsx   
│   │   ├── events/page.tsx    
│   │   ├── kds/page.tsx       
│   │   ├── admin/
│   │   │   ├── page.tsx       
│   │   │   └── godmode/page.tsx 
│   │   ├── pos-sim/page.tsx   
│   │   └── api/
│   │       ├── orders/route.ts        
│   │       ├── queue/stream/route.ts  
│   │       ├── kds/stream/route.ts       # SSE feed for the KDS board
│   │       ├── checkout/route.ts      
│   │       ├── webhooks/stripe/route.ts
│   │       ├── webhooks/simulate/route.ts# Offline fallback for fake signed webhook
│   │       ├── notify/sms/route.ts       # Optional Twilio SMS dispatch
│   │       ├── gacha/route.ts         
│   │       ├── godmode/route.ts       
│   │       └── popular/route.ts          # Bestseller calculation endpoint
│   ├── components/
│   │   ├── WebARViewer.tsx    
│   │   ├── PromoBanner.tsx    
│   │   ├── PopularNow.tsx     
│   │   ├── QueueProgress.tsx  
│   │   ├── GachaWheel.tsx     
│   │   └── Navbar.tsx         
│   ├── lib/
│   │   ├── prisma.ts          
│   │   ├── orderValidation.ts 
│   │   ├── sse.ts             
│   │   ├── gacha.ts           # Probability table, daily cooldown, override seed
│   │   ├── auth.ts            # requireDemoSecret() helper
│   │   └── popular.ts         # Bestseller scoring formula
│   └── types/
│       └── index.ts           
├── .env.example
├── package.json
├── next.config.js             # withPWA wrapper
└── tailwind.config.js

```

---

#### 5. Prisma Database Schema (`prisma/schema.prisma`)

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
  pointsBalance  Int           @default(1240)
  tierLevel      String        @default("Gold") 
  streakCount    Int           @default(3)
  lastOrderAt    DateTime      @default(now())
  lastGachaAt    DateTime?     
  createdAt      DateTime      @default(now())
  orders         Order[]
  gachaRewards   GachaReward[]
  rsvps          EventRSVP[]   
}

model MenuItem {
  id          String   @id @default(uuid())
  title       String
  description String
  category    String
  price       Float    
  arGlbUrl    String?
  arUsdzUrl   String?
  isPopular   Boolean  @default(false)
  isPromo     Boolean  @default(false)
  inStock     Boolean  @default(true)
  orderCount  Int      @default(0) 
  createdAt   DateTime @default(now())

  @@index([category, isPopular])
}

model Order {
  id              String      @id @default(uuid())
  queueNumber     Int         @default(autoincrement())
  customerPhone   String
  customer        UserProfile @relation(fields: [customerPhone], references: [phone])
  itemsJson       String
  totalAmount     Float
  status          String      @default("Pending") 
  timeslot        DateTime?
  isPaid          Boolean     @default(false)
  stripeSessionId String?     @unique 
  pointsAwarded   Int         @default(0) 
  smsSent         Boolean     @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([status, timeslot]) 
  @@index([status, createdAt])
}

model GachaReward {
  id          String      @id @default(uuid())
  phone       String
  customer    UserProfile @relation(fields: [phone], references: [phone])
  rewardType  String      
  rewardLabel String
  isClaimed   Boolean     @default(false)
  unlockedAt  DateTime    @default(now())
  pullSeed    Int         
}

model ClubEvent {
  id             String      @id @default(uuid())
  clubName       String
  eventTitle     String
  description    String
  eventDate      DateTime
  bundleItemIds  String
  discountToken  String      @unique
  rsvps          EventRSVP[] 
}

model EventRSVP { 
  id        String    @id @default(uuid())
  eventId   String
  event     ClubEvent @relation(fields: [eventId], references: [id])
  phone     String
  customer  UserProfile @relation(fields: [phone], references: [phone])
  createdAt DateTime  @default(now())

  @@unique([eventId, phone]) 
}

```

---

#### 6. Altitude Cafe Menu JSON Seed Dataset (`prisma/menu.json`)

```json
{
  "currency": "AED",
  "categories": [
    {
      "name": "Tea",
      "items": [
        { "id": "tea-black", "title": "Black Tea", "description": "Classic premium black tea blend brewed to perfection", "price": 12.00, "category": "Tea", "isPopular": false, "isPromo": false },
        { "id": "tea-green", "title": "Green Tea", "description": "Refreshing and antioxidant-rich green tea leaves", "price": 12.00, "category": "Tea", "isPopular": false, "isPromo": false },
        { "id": "tea-rooibos", "title": "Rooibos Tea", "description": "Naturally caffeine-free herbal South African rooibos", "price": 12.00, "category": "Tea", "isPopular": false, "isPromo": false },
        { "id": "tea-hibiscus", "title": "Hibiscus Tea", "description": "Tart, floral, and vibrant iced hibiscus infusion", "price": 12.00, "category": "Tea", "isPopular": false, "isPromo": false },
        { "id": "tea-macha-latte", "title": "Macha Latte", "description": "Creamy Japanese matcha green tea with steamed milk", "price": 12.00, "category": "Tea", "isPopular": true, "isPromo": false }
      ]
    },
    {
      "name": "Caffeine Free",
      "items": [
        { "id": "caf-summer-zest", "title": "Summer Zest", "description": "Zesty and refreshing citrus mocktail cooler", "price": 12.00, "category": "Caffeine Free", "isPopular": false, "isPromo": false },
        { "id": "caf-lavender-spritzer", "title": "Lavender Spritzer", "description": "Calming floral lavender spritzer with sparkling water", "price": 12.00, "category": "Caffeine Free", "isPopular": false, "isPromo": false },
        { "id": "caf-pomegranate-punch", "title": "Pomegranate Punch", "description": "Sweet and tangy pomegranate blend over ice", "price": 12.00, "category": "Caffeine Free", "isPopular": false, "isPromo": false },
        { "id": "caf-hot-chocolate-nutella", "title": "Hot Chocolate / Nutella", "description": "Rich cocoa blend infused with creamy Nutella hazelnut spread", "price": 12.00, "category": "Caffeine Free", "isPopular": true, "isPromo": false },
        { "id": "caf-pina-colada", "title": "Piña Colada", "description": "Tropical coconut milk and pineapple blend", "price": 12.00, "category": "Caffeine Free", "isPopular": false, "isPromo": false },
        { "id": "caf-mango-mango", "title": "Mango Mango", "description": "Luscious double-mango iced refresher", "price": 12.00, "category": "Caffeine Free", "isPopular": false, "isPromo": false },
        { "id": "caf-banana-choco-shake", "title": "Banana Chocolate - Protein Shake", "description": "High-protein banana chocolate fitness shake", "price": 12.00, "category": "Caffeine Free", "isPopular": false, "isPromo": false }
      ]
    },
    {
      "name": "Snacks",
      "items": [
        { "id": "snack-acai-bowl", "title": "Acai Bowl (Banana - Strawberry - Blueberry)", "description": "Organic acai topped with fresh sliced banana, strawberries, and blueberries", "price": 14.00, "category": "Snacks", "isPopular": true, "isPromo": false },
        { "id": "snack-acai-smoothie", "title": "Acai Smoothie (Banana - Strawberry)", "description": "Blended acai smoothie with ripe banana and fresh strawberries", "price": 16.00, "category": "Snacks", "isPopular": false, "isPromo": false },
        { "id": "snack-snow-ice", "title": "New Snow Ice", "description": "Fluffy Korean shaved snow ice dessert", "price": 12.00, "category": "Snacks", "isPopular": false, "isPromo": false }
      ]
    },
    {
      "name": "Food",
      "items": [
        { "id": "food-muffin-assorted", "title": "Assorted Muffins", "description": "Freshly baked blueberry, chocolate chip, and double chocolate muffins", "price": 12.00, "category": "Food", "isPopular": false, "isPromo": false },
        { "id": "food-croissant-butter", "title": "Butter Croissant", "description": "Flaky, golden-baked French butter croissant", "price": 15.00, "category": "Food", "isPopular": true, "isPromo": false },
        { "id": "food-sandwich-artisanal", "title": "Artisanal Gourmet Sandwich", "description": "Freshly prepared turkey breast and pesto sandwich on sourdough", "price": 22.00, "category": "Food", "isPopular": false, "isPromo": false }
      ]
    },
    {
      "name": "Coffee (Featured)",
      "items": [
        { "id": "coffee-iced-latte", "title": "Iced Latte", "description": "Signature espresso with cold milk over ice", "price": 16.00, "category": "Coffee", "arGlbUrl": "/models/iced_latte_16oz.glb", "arUsdzUrl": "/models/iced_latte_16oz.usdz", "isPopular": true, "isPromo": false },
        { "id": "coffee-cold-brew", "title": "Cold Brew", "description": "Steeped for 18 hours for maximum smoothness", "price": 18.00, "category": "Coffee", "isPopular": true, "isPromo": false },
        { "id": "coffee-caramel-cloud-latte", "title": "Caramel Cloud Latte", "description": "Featured Drink of the Month: Espresso layered with whipped caramel cloud cold foam", "price": 20.00, "category": "Coffee", "isPopular": true, "isPromo": true }
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

#### 7. Server-Side Zero-Trust Order Validation (`src/lib/orderValidation.ts`)

*Fixes the timeslot capacity race condition via an interactive transaction.*

```typescript
import { prisma } from '@/lib/prisma';

export interface ClientOrderItem { productId: string; quantity: number; }

export interface VerifiedOrderResult {
  isValid: boolean;
  error?: string;
  totalAmount: number;
  verifiedItems: Array<{ id: string; title: string; quantity: number; unitPrice: number }>;
}

const SLOT_CAPACITY = 15;

export async function validateAndPriceOrder(
  items: ClientOrderItem[],
  pickupTimeslot?: string
): Promise<VerifiedOrderResult> {
  if (!items || items.length === 0) {
    return { isValid: false, error: 'Cart cannot be empty', totalAmount: 0, verifiedItems: [] };
  }

  // 1. Re-fetch all menu items from DB to prevent client price tampering
  const productIds = items.map((i) => i.productId);
  const dbProducts = await prisma.menuItem.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  let totalAmount = 0;
  const verifiedItems = [];

  for (const item of items) {
    const dbProduct = productMap.get(item.productId);
    if (!dbProduct) return { isValid: false, error: `Product ID ${item.productId} not found`, totalAmount: 0, verifiedItems: [] };
    if (!dbProduct.inStock) return { isValid: false, error: `Item "${dbProduct.title}" is currently out of stock`, totalAmount: 0, verifiedItems: [] };
    if (item.quantity <= 0 || item.quantity > 20) return { isValid: false, error: `Invalid quantity for item "${dbProduct.title}"`, totalAmount: 0, verifiedItems: [] };

    totalAmount += dbProduct.price * item.quantity;
    verifiedItems.push({ id: dbProduct.id, title: dbProduct.title, quantity: item.quantity, unitPrice: dbProduct.price });
  }

  // 2. Capacity check inside a transaction to close the TOCTOU race.
  if (pickupTimeslot) {
    const slotDate = new Date(pickupTimeslot);
    const conflict = await prisma.$transaction(async (tx) => {
      const existingOrdersCount = await tx.order.count({
        where: { timeslot: slotDate, status: { in: ['Pending', 'Paid', 'Brewing'] } },
      });
      return existingOrdersCount >= SLOT_CAPACITY;
    });
    if (conflict) {
      return { isValid: false, error: 'Selected pickup timeslot is at full kitchen capacity. Please pick another slot.', totalAmount: 0, verifiedItems: [] };
    }
  }

  return { isValid: true, totalAmount: Math.round(totalAmount * 100) / 100, verifiedItems };
}

```

---

#### 8. Key Backend API Endpoint Implementations

**8.1 Demo Auth Guard (`src/lib/auth.ts`)**

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function requireDemoSecret(req: NextRequest): NextResponse | null {
  const secret = req.headers.get('x-demo-secret') || new URL(req.url).searchParams.get('demoKey');
  if (!secret || secret !== process.env.DEMO_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null; // pass
}

```

**8.2 Order Creation & Reservation Route (`src/app/api/orders/route.ts`)**

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

    const validation = await validateAndPriceOrder(items, pickupTime);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await prisma.userProfile.upsert({
      where: { phone: customer.phone },
      update: { fullName: customer.name || 'Student Customer' },
      create: { phone: customer.phone, fullName: customer.name || 'Student Customer' },
    });

    // Capacity re-check + create in one transaction
    const slotDate = pickupTime ? new Date(pickupTime) : null;
    const order = await prisma.$transaction(async (tx) => {
      if (slotDate) {
        const count = await tx.order.count({
          where: { timeslot: slotDate, status: { in: ['Pending', 'Paid', 'Brewing'] } },
        });
        if (count >= 15) throw new Error('SLOT_FULL');
      }
      return tx.order.create({
        data: {
          customerPhone: customer.phone,
          itemsJson: JSON.stringify(validation.verifiedItems),
          totalAmount: validation.totalAmount,
          status: 'Pending',
          timeslot: slotDate,
        },
      });
    }).catch((e) => {
      if (e.message === 'SLOT_FULL') return null;
      throw e;
    });

    if (!order) {
      return NextResponse.json({ error: 'Selected pickup timeslot is at full kitchen capacity. Please pick another slot.' }, { status: 409 });
    }

    // Bump denormalized counters
    await Promise.allSettled(
      validation.verifiedItems.map((i) =>
        prisma.menuItem.update({ where: { id: i.id }, data: { orderCount: { increment: i.quantity } } })
      )
    );

    return NextResponse.json({ orderId: order.id, queueNumber: order.queueNumber, totalAmount: order.totalAmount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

```

**8.3 Stripe Webhook Verification (`src/app/api/webhooks/stripe/route.ts`) & Points Clawback**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { awardPoints, clawbackPoints } from '@/lib/loyalty'; // See logic below

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
  return handleStripeEvent(event);
}

// Exported for God-Mode simulation reuse
export async function handleStripeEvent(event: Stripe.Event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (!orderId) return NextResponse.json({ received: true });

    // Idempotency check
    const existing = await prisma.order.findUnique({ where: { stripeSessionId: session.id } });
    if (existing?.isPaid) return NextResponse.json({ received: true });

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'Paid', isPaid: true, stripeSessionId: session.id },
    });

    const pointsEarned = Math.floor(updatedOrder.totalAmount * 10);
    await prisma.userProfile.update({
      where: { phone: updatedOrder.customerPhone },
      data: { pointsBalance: { increment: pointsEarned }, lastOrderAt: new Date() },
    });
    await prisma.order.update({ where: { id: orderId }, data: { pointsAwarded: pointsEarned } });

    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/pos-sim/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-secret': process.env.DEMO_SECRET || '' },
      body: JSON.stringify({ orderId, status: 'PAID_ACCEPTED', total: updatedOrder.totalAmount }),
    }).catch(() => {});
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await prisma.order.update({ where: { id: orderId }, data: { status: 'Cancelled' } });
      await clawbackPoints(orderId);
    }
  }

  return NextResponse.json({ received: true });
}

```

*(`src/lib/loyalty.ts` code for `clawbackPoints` decrements `pointsBalance` securely within a transaction if the payment expires).*

**8.4 Offline Webhook Fallback (`src/app/api/webhooks/simulate/route.ts`)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireDemoSecret } from '@/lib/auth';
import { handleStripeEvent } from '../webhooks/stripe/route';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const denied = requireDemoSecret(req);
  if (denied) return denied;

  const { orderId } = await req.json();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const fakeEvent = {
    type: 'checkout.session.completed',
    data: { object: { id: `sim_${orderId}`, metadata: { orderId } } },
  } as any;

  return handleStripeEvent(fakeEvent);
}

```

**8.5 Native SSE Queue Tracker (`src/app/api/queue/stream/route.ts`)**

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

**8.6 Gacha Engine (`src/lib/gacha.ts`)**

```typescript
import { prisma } from '@/lib/prisma';

export const GACHA_TABLE = [
  { type: 'POINTS_BOOST',   label: '+50 Bonus Points',     weight: 55 },
  { type: 'FREE_ADDON',     label: 'Free Cookie',           weight: 25 },
  { type: 'DISCOUNT_VAR',   label: '20% Off Next Order',    weight: 12 },
  { type: 'SHOT_ESPRESSO',  label: 'Free Espresso Shot',    weight: 6  },
  { type: 'GOLD_DOUBLE',    label: 'GOLD JACKPOT 2x Points',weight: 2  }, 
];

let override: string | null = null; 
export function setGachaOverride(type: string | null) { override = type; }

function roll(seed: number): (typeof GACHA_TABLE)[number] {
  if (override) {
    const hit = GACHA_TABLE.find((r) => r.type === override)!;
    override = null; 
    return hit;
  }
  const total = GACHA_TABLE.reduce((s, r) => s + r.weight, 0);
  let x = seed % total;
  for (const r of GACHA_TABLE) { if (x < r.weight) return r; x -= r.weight; }
  return GACHA_TABLE[0];
}

export async function performGachaPull(phone: string) {
  const user = await prisma.userProfile.findUnique({ where: { phone } });
  if (!user) return { error: 'Profile not found' };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (user.lastGachaAt && user.lastGachaAt >= today) {
    return { error: 'Daily pull already used — come back tomorrow!' };
  }

  const seed = Math.floor(Math.random() * 1_000_000);
  const result = roll(seed);

  const [reward] = await prisma.$transaction([
    prisma.gachaReward.create({ data: { phone, rewardType: result.type, rewardLabel: result.label, pullSeed: seed } }),
    prisma.userProfile.update({ where: { phone }, data: { lastGachaAt: new Date() } }),
  ]);

  return { reward };
}

```

**8.7 Popular Now Formula (`src/lib/popular.ts`)**

```typescript
import { prisma } from '@/lib/prisma';

export async function getPopularNow(limit = 6) {
  const items = await prisma.menuItem.findMany({ where: { inStock: true } });
  const scored = items
    .map((i) => ({
      ...i,
      score: i.orderCount + (i.isPopular ? 30 : 0) + (i.isPromo ? 50 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored;
}

```

---

#### 9. Frontend Core Component Specifications

**9.1 WebAR Viewer Component with 2D Fallback (`src/components/WebARViewer.tsx`)**

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

**9.2 Customer Live Queue Tracking View (`src/app/track/[id]/page.tsx`)**

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

export default function OrderTrackingPage() {
  const { id } = useParams();
  const [orderState, setOrderState] = useState({ status: 'Pending', ordersAhead: 0, queueNumber: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Unlock autoplay: prime a muted play on mount inside the user-gesture-allowed window
    audioRef.current = new Audio('/sounds/ready-chime.mp3');
    audioRef.current.muted = true;
    audioRef.current.play().then(() => {
      if (audioRef.current) audioRef.current.pause();
      if (audioRef.current) audioRef.current.muted = false; 
    }).catch(() => {});

    const eventSource = new EventSource(`/api/queue/stream?orderId=${id}`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setOrderState(data);
      if (data.status === 'Ready') {
        audioRef.current?.play().catch(() => {});
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      }
      if (data.status === 'Claimed' || data.status === 'Cancelled') eventSource.close();
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
              orderState.status === 'Ready' ? 'bg-green-500 w-full' : 
              orderState.status === 'Brewing' ? 'bg-blue-500 w-2/3' : 'bg-amber-500 w-1/3'
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
        {orderState.status === 'Cancelled' && (
          <div className="bg-red-500/20 border-2 border-red-500 rounded-2xl p-6 text-center">
            <h2 className="text-2xl font-black text-red-400">ORDER CANCELLED</h2>
            <p className="text-sm text-red-200 mt-1">Payment was not completed. Any held points were refunded.</p>
          </div>
        )}
      </div>
    </div>
  );
}

```

---

#### 10. Demo God-Mode Control Panel (`src/app/admin/godmode/page.tsx`)

```tsx
'use client';

export default function GodModePage() {
  const triggerAction = async (action: string, payload?: any) => {
    // Note: ensure x-demo-secret is appended to headers here if implementing auth
    await fetch('/api/godmode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    alert(`Executed: ${action}`);
  };

  const simulateWebhook = async () => {
    // Provide a valid orderId here from your state
    const orderId = prompt("Enter Order ID to force payment confirmation:");
    if (!orderId) return;
    await fetch('/api/webhooks/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    alert("Simulated Webhook Fired!");
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
          <h2 className="font-bold text-sm text-amber-300 mb-2">Offline Fallback Controls</h2>
          <button onClick={simulateWebhook} className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded text-xs font-bold">
            ⚡ Force Payment Confirm (offline webhook fallback)
          </button>
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

Update the `tailwind.config.js` file referenced in the directory tree of architecture_plan_v2_revised.md to define explicit semantic screen sizes.

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'mobile': '480px',     // Standard mobile breakpoint
        'tablet': '768px',     // Tablet breakpoint (e.g., iPad portrait)
        'desktop': '1024px',   // Standard desktop/laptop breakpoint
        'desktop-xl': '1440px' // Large desktop monitor breakpoint
      },
    },
  },
  plugins: [],
};

```

* **Integration:** Placing the `screens` object inside `extend` retains Tailwind's default breakpoints (`sm`, `md`, `lg`, `xl`, `2xl`) while adding your explicit naming conventions.
* **Usage:** Apply these specific breakpoints directly in your React components using prefixes, such as `className="w-full tablet:w-1/2 desktop:w-1/3"`.
* **Strict Overrides:** If you want to disable Tailwind's default sizes entirely and force the development team to use only `mobile`, `tablet`, and `desktop`, move the `screens` object out of `extend` and place it directly under `theme`.

---

#### 11. Step-by-Step Coding Agent Execution Blueprint

```bash
# Step 1: Scaffold Next.js Application
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npm i prisma @prisma/client stripe lucide-react clsx tailwind-merge
npm i next-pwa

# Step 2: Initialize Prisma & Seed Database
npx prisma init --datasource-provider sqlite
# (Copy schema from Section 5 into prisma/schema.prisma)
# CRITICAL — add to package.json: "prisma": { "seed": "npx tsx prisma/seed.ts" }
npx prisma db push

# Step 2.5: Environment + Stripe test mode
# .env:
#   DATABASE_URL="file:./dev.db"
#   STRIPE_SECRET_KEY=sk_test_...          
#   STRIPE_WEBHOOK_SECRET=whsec_...         
#   NEXT_PUBLIC_APP_URL=http://localhost:3000
#   DEMO_SECRET=altitude2026

# Step 3: Seed Data
# Seeds menu.json, creates Sara (+971500000000), ClubEvents, and historical orders.
npx prisma db seed

# Step 4: Build Core Validation & API Routes
# Build files in lib/ and api/ folders as specified above.

# Step 4.5: Stripe webhook tunnel 
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Step 5: Customer Front-End
# /, /cart, WebARViewer, /rewards, /events, /track/[id]

# Step 6: KDS, Admin & POS Simulator
# /kds, /admin, /admin/godmode, /pos-sim

# Step 7: Verify (Run as Node server)
npm run build
npm run start          
```

**Appendix: Known Tradeoffs Slide**
* Demo secret protects staff screens; customer APIs open by design (walk-up cafe model).
* Phone number is the loyalty key — OTP is roadmap.
* SSE requires a long-lived Node server — not serverless-deployable in this prototype.
* 3D model quality depends on final asset; 2D fallback always available.

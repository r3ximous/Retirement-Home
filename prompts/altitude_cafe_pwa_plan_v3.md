### Altitude Cafe PWA — Unified Coding Agent Master Build Plan (V3 - UI Integrated)

#### 1. Executive Summary & Core Objective

* **Target System**: Altitude Cafe Progressive Web App (PWA) + KDS + Admin Dashboard.
* **Primary Objective**: Build a single-repository, full-stack prototype solving all 6 brief tracks, now fully integrated with the V2 High-Fidelity UI/UX designs (Black/White/Navy theme, Mountain silhouettes, Dynamic Island Nav).
* **Architecture Strategy**: Next.js 14+ (App Router) + Tailwind CSS + shadcn/ui + SQLite (Prisma) + Native SSE + Auth.js (NextAuth) for new login screens.

> **⛔ DEPLOYMENT CONSTRAINT:** This app uses long-lived SSE streams and a local SQLite file. **It MUST run as a long-lived Node process (`npm run start` / `npm run dev`). Do NOT deploy to Vercel/Netlify.** 

---

#### 2. Frontend Routing & UI Screen Mapping

The Next.js App Router must be structured to match the provided UI mockups exactly. 

| Route | UI Reference Image | Description & Logic |
| :--- | :--- | :--- |
| `/onboarding` | Screens 1, 2, 3 | 3-step carousel ("Welcome", "Collect 100 stars", "Skip the Line"). Uses `localStorage` to bypass on future visits. |
| `/login` | Screen 4 | Login with Google, Email, or Phone. |
| `/signup` | Screen 5 | Account creation form (Name, Email, Password). |
| `/home` | Screen 6 | Dashboard: "Drink of the Day" hero, quick menu preview, and dynamic loyalty progress bar (e.g., "4 of 6 collected"). |
| `/menu` | Screen 7 | Full menu with left-side category filters (Best sellers, Hot drinks, etc.) and search bar. Clicking an item opens the WebAR viewer / Add to Cart modal. |
| `/rewards` | Eighth Screen | Points display and the **"Roll for a Discount"** interactive dice game (replaces the old spinning wheel). |
| `/profile` | Ninth Screen | User details, Payment methods, Past Orders, Settings. |
| `/track/[id]` | Screen 8 iPad | Real-time SSE queue tracking. Features "Coffee filling animation", completion checkmark, and past/suggested orders. |
| **Global Component** | All Core Pages | **Dynamic Island Nav**: Sticky bottom navigation bar (Home, Menu, Bag, Stars, Profile). Mountain silhouette background wrapper. |

---

#### 3. Updated Prisma Database Schema (`prisma/schema.prisma`)

*To support the new Login/Signup screens while keeping the original walk-up logic intact, `UserProfile` is expanded to support emails and passwords, and `phone` is no longer the sole primary key.*

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model UserProfile {
  id             String        @id @default(uuid())
  phone          String?       @unique // Optional now, in case they sign up via email first
  email          String?       @unique
  passwordHash   String?       // Hashed password for Screen 4/5 local auth
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
  
  // Updated relations to link to the new UserProfile ID
  customerId      String?
  customer        UserProfile? @relation(fields: [customerId], references: [id])
  customerPhone   String?      // Fallback for anonymous walk-ups
  
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
}

model GachaReward {
  id          String      @id @default(uuid())
  userId      String
  customer    UserProfile @relation(fields: [userId], references: [id])
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
  userId    String
  customer  UserProfile @relation(fields: [userId], references: [id])
  createdAt DateTime  @default(now())

  @@unique([eventId, userId]) 
}
```

---

#### 4. Design System & Global Layout (`src/app/layout.tsx`)

To match the high-fidelity designs, the application must use a global layout that wraps children in the Mountain Background and conditionally renders the Dynamic Island Nav based on the route (hiding it on Onboarding/Auth screens).

```tsx
// Example layout logic for Zed Agent
import { DynamicIslandNav } from '@/components/DynamicIslandNav';
import { MountainBackground } from '@/components/MountainBackground';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-black min-h-screen relative overflow-x-hidden">
        <MountainBackground />
        <main className="relative z-10 pb-24"> 
           {/* pb-24 ensures content isn't hidden behind the sticky nav */}
          {children}
        </main>
        <DynamicIslandNav />
      </body>
    </html>
  );
}
```

---

#### 5. Backend Logic Preservation (CRITICAL)

The Zed agent must integrate the new UI elements WITHOUT altering the core logic from V2:
1.  **Zero-Trust Order Validation**: `src/lib/orderValidation.ts` must still recalculate all cart prices on the server and check the 15-slot capacity via Prisma transactions.
2.  **Server-Sent Events (SSE)**: `src/app/track/[id]/page.tsx` must still consume the `/api/queue/stream` endpoint. Map `orderState.status === 'Brewing'` to the new "Coffee filling animation" visually.
3.  **Dice Logic (Gacha)**: The "Roll Dice" button in `/rewards` must trigger the exact same `src/lib/gacha.ts` backend probability table. Do not implement the dice logic on the client.

---

#### 6. Step-by-Step Coding Agent Execution Blueprint (V3 Update)

1.  **Foundation & Auth Schema**: Initialize Next.js, Prisma, and the V3 Schema. Scaffold NextAuth (Auth.js) credentials provider for the new login screens.
2.  **Core Server Logic**: Implement Zero-Trust cart validation, Stripe webhooks, and the SSE Queue Tracker endpoints.
3.  **Design System & Onboarding**: Build `MountainBackground`, `DynamicIslandNav`, and the `/onboarding`, `/login`, and `/signup` screens.
4.  **Core App Screens**: Build `/home`, `/menu`, and `/profile` using strict Tailwind breakpoints (`mobile:`, `tablet:`).
5.  **Interactive Elements**: Build the `/rewards` (Dice Roll) and `/track/[id]` (SSE animation) pages.
6.  **KDS & God-Mode Dashboard**: Build the staff-facing `/kds` and `/admin/godmode` pages to control the SSE state.
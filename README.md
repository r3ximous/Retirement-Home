# Altitude Cafe

Altitude Cafe is a mobile-friendly cafe ordering app built with the Next.js App
Router, Prisma, and SQLite. Guests can explore drinks, place an order, and
follow its progress; staff can manage the live kitchen queue.

## What the app does

- **Discover the menu:** Browse best sellers, hot and cold drinks, and
  smoothies; search by drink name, description, or category. The home page
  highlights the featured drink and popular items.
- **Preview selected drinks in AR:** Menu items with 3D assets can be opened in
  a Web AR viewer. Compatible phones can place the 16 oz model in their space.
- **Order and track:** Add drinks to your bag, adjust quantities, and place an
  order. The app validates item availability and prices on the server, assigns
  a queue number, and opens a tracking page that updates as the order moves
  through the kitchen.
- **Interactive menu (voice commands and Augmented Reality)** With an option to 
  order items through voice commands, the app can be used hands-free. Food Items 
  can be viewed in Augmented Reality by placing the 16 oz model in your space.
- **Manage the kitchen:** Staff use `/kds` to view incoming orders and move them
  through brewing, ready, and collected. The kitchen display and customer
  tracking page receive live updates through Server-Sent Events (SSE).
- **Use an account and earn rewards:** Sign up with email or phone and a
  password, or enable Google sign-in. The rewards page shows a member's points,
  tier, and reward history, and supports one prize roll per day. Confirmed,
  paid orders award 10 points per AED to the associated member.
- **Explore campus events:** `/events` currently presents sample event cards;
  live event scheduling and RSVP actions are not yet available in the page.

## How it works

The browser app talks to Next.js route handlers for account, order, kitchen,
and rewards operations. Prisma stores menu items, profiles, orders, and
rewards in SQLite. When an order is submitted, the server rechecks the menu
items and calculates the total rather than trusting prices sent by the
browser. It creates the order and its unique queue number in a database
transaction.

The customer tracking page and kitchen display subscribe to SSE endpoints.
When staff change an order's status, both views receive the update without
needing a manual refresh. Stripe payment webhooks are supported separately;
they require Stripe configuration and are used to record confirmed payments
and award points.

## Run locally

Requirements: Node.js and npm.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example`, then set `NEXTAUTH_SECRET` to a unique
   random value. The example database URL uses a local SQLite file:
   `DATABASE_URL="file:./dev.db"`.

3. Create the database, add the menu and demo data, and generate the Prisma
   client:

   ```bash
   npx prisma db push
   npx prisma db seed
   npx prisma generate
   ```

   Seeding clears existing demo orders and rewards. Use it only with a new
   database or data you are willing to replace.

4. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). The first visit starts
with onboarding; after that, use the menu to create an order. To try the
kitchen queue, set `DEMO_SECRET` in `.env`, open `/kds`, and enter that value.

## Authentication and integrations

Credentials sign-in accepts either an email address or phone number. Passwords
are stored as scrypt hashes. Set `NEXTAUTH_SECRET` before deployment and set
`NEXTAUTH_URL` to the public application URL in production.

Google sign-in is optional. Set both `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` to enable it. For local development, add
`http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
in the Google OAuth client; use the corresponding origin in production.
Without both Google variables, the login page shows Google sign-in as
unavailable.

The Stripe webhook requires `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET`. Demo-only controls use the `DEMO_SECRET` request
header (`x-demo-secret`).

## Database notes

- For a new, empty database, `npx prisma db push` creates the schema.
- `npx prisma db seed` adds the menu and demo records; it also clears existing
  demo orders and rewards.
- To upgrade an existing V2 database while preserving profiles, orders,
  rewards, and RSVPs, back it up and run `npm run db:upgrade:v3`. This is a
  one-time migration.
- After changing the Prisma schema, regenerate the client with
  `npx prisma generate`.

Order creation assigns queue numbers inside a transaction. SQLite does not
support Prisma `autoincrement()` on a non-primary-key field, so the app
calculates the next queue number while reserving the order.

## Production

Build and run the app with:

```bash
npm run build
npm run start
```

The app uses a local SQLite database and long-lived SSE connections for order
and kitchen updates. Deploy it as a long-lived Node.js process with persistent
database storage, not to a serverless platform.

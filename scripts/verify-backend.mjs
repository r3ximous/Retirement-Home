import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const testCustomerPhone = "+971500000000";
let prisma;

function loadLocalEnv() {
  return readFile(new URL("../.env", import.meta.url), "utf8")
    .then((contents) => {
      for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;

        const separator = line.indexOf("=");
        if (separator < 1) continue;

        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        process.env[key] ??= value;
      }
    })
    .catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
}

async function responseJson(response, step) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${step} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  if (!body || typeof body !== "object") {
    throw new Error(`${step} returned an invalid JSON response`);
  }
  return body;
}

async function main() {
  await loadLocalEnv();
  prisma = new PrismaClient();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const demoSecret = process.env.DEMO_SECRET;
  if (!demoSecret) throw new Error("DEMO_SECRET is missing from the environment or .env");

  const menuJson = JSON.parse(
    await readFile(new URL("../prisma/menu.json", import.meta.url), "utf8"),
  );
  const menuItems = menuJson.categories.flatMap((category) => category.items);
  const databaseItems = await prisma.menuItem.findMany({ select: { id: true } });
  const databaseItemIds = new Set(databaseItems.map((item) => item.id));
  const missingMenuItems = menuItems.filter((item) => !databaseItemIds.has(item.id));
  if (missingMenuItems.length > 0) {
    throw new Error(
      `Database is missing menu.json items: ${missingMenuItems.map((item) => item.id).join(", ")}`,
    );
  }

  const customerBefore = await prisma.userProfile.findUnique({
    where: { phone: testCustomerPhone },
    select: { pointsBalance: true },
  });
  if (!customerBefore) throw new Error("Seeded test customer Sara was not found");

  const menuItem = menuItems[0];
  const orderResponse = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      customer: { phone: testCustomerPhone, name: "Sara" },
      items: [{ productId: menuItem.id, quantity: 1 }],
    }),
  });
  const orderResult = await responseJson(orderResponse, "Order creation");
  if (
    typeof orderResult.orderId !== "string" ||
    typeof orderResult.queueNumber !== "number"
  ) {
    throw new Error("Order creation did not return an orderId and queueNumber");
  }

  const orderBeforePayment = await prisma.order.findUnique({
    where: { id: orderResult.orderId },
    select: { status: true },
  });
  if (!orderBeforePayment || orderBeforePayment.status !== "Pending") {
    throw new Error("Created order was not found in Pending status before payment");
  }

  const paymentResponse = await fetch(`${baseUrl}/api/webhooks/simulate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-demo-secret": demoSecret,
    },
    body: JSON.stringify({ orderId: orderResult.orderId }),
  });
  const paymentResult = await responseJson(paymentResponse, "Payment simulation");
  if (paymentResult.received !== true) {
    throw new Error("Payment simulation did not confirm receipt");
  }

  const [paidOrder, customerAfter] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderResult.orderId },
      select: { status: true, isPaid: true, totalAmount: true, pointsAwarded: true },
    }),
    prisma.userProfile.findUnique({
      where: { phone: testCustomerPhone },
      select: { pointsBalance: true },
    }),
  ]);
  if (!paidOrder || paidOrder.status !== "Paid" || !paidOrder.isPaid) {
    throw new Error("Prisma did not show the order as Paid");
  }
  if (!customerAfter || customerAfter.pointsBalance <= customerBefore.pointsBalance) {
    throw new Error("Customer pointsBalance did not increase after payment");
  }

  const expectedPoints = Math.floor(paidOrder.totalAmount * 10);
  if (
    paidOrder.pointsAwarded !== expectedPoints ||
    customerAfter.pointsBalance - customerBefore.pointsBalance !== expectedPoints
  ) {
    throw new Error("Awarded points did not match the customer's pointsBalance increase");
  }

  console.log(
    JSON.stringify(
      {
        result: "PASS",
        menuJsonItems: menuItems.length,
        databaseMenuItems: databaseItems.length,
        testCustomerExists: true,
        orderId: orderResult.orderId,
        queueNumber: orderResult.queueNumber,
        orderStatus: paidOrder.status,
        isPaid: paidOrder.isPaid,
        pointsBefore: customerBefore.pointsBalance,
        pointsAfter: customerAfter.pointsBalance,
        pointsAwarded: paidOrder.pointsAwarded,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(`Backend verification failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma?.$disconnect());

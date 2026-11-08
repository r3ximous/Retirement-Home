import assert from "node:assert/strict";
import { test } from "node:test";
import { menuItems } from "./menu-data";
import { parseVoiceOrder } from "./voice-order-parser";

function getMenuItem(id: string) {
  const item = menuItems.find((menuItem) => menuItem.id === id);
  assert.ok(item, `Expected menu item ${id} to exist`);
  return item;
}

test("matches multiple spoken items and quantities, including plurals", () => {
  const result = parseVoiceOrder(
    "two iced lattes and one black tea, please",
    menuItems,
  );

  assert.deepEqual(
    result.items.map(({ item, quantity }) => [item.id, quantity]),
    [
      ["coffee-iced-latte", 2],
      ["tea-black", 1],
    ],
  );
  assert.deepEqual(result.unresolved, []);
});

test("matches a menu title without its parenthetical details", () => {
  const result = parseVoiceOrder("one acai bowl", menuItems);

  assert.equal(result.items[0]?.item.id, "snack-acai-bowl");
  assert.equal(result.items[0]?.quantity, 1);
  assert.deepEqual(result.unresolved, []);
});

test("keeps an unknown phrase out of the cartable matches", () => {
  const result = parseVoiceOrder("one dragonfruit latte", menuItems);

  assert.deepEqual(result.items, []);
  assert.equal(result.unresolved[0]?.reason, "unmatched");
});

test("surfaces duplicate menu names as ambiguous instead of guessing", () => {
  const icedLatte = getMenuItem("coffee-iced-latte");
  const duplicate = { ...icedLatte, id: "coffee-iced-latte-test-copy" };
  const result = parseVoiceOrder("two iced lattes", [icedLatte, duplicate]);

  assert.deepEqual(result.items, []);
  assert.equal(result.unresolved[0]?.reason, "ambiguous");
  assert.equal(result.unresolved[0]?.candidates.length, 2);
  assert.equal(result.unresolved[0]?.requestedQuantity, 2);
});

test("requires correction when the requested quantity exceeds the order limit", () => {
  const result = parseVoiceOrder("twenty one iced lattes", menuItems);

  assert.deepEqual(result.items, []);
  assert.equal(result.unresolved[0]?.reason, "quantity-too-large");
});

test("does not turn a zero quantity into one", () => {
  const result = parseVoiceOrder("zero iced lattes", menuItems);

  assert.deepEqual(result.items, []);
  assert.equal(result.unresolved[0]?.reason, "invalid-quantity");
});

test("surfaces unsupported customizations instead of silently ignoring them", () => {
  const result = parseVoiceOrder("iced latte with oat milk", menuItems);

  assert.equal(result.items[0]?.item.id, "coffee-iced-latte");
  assert.equal(result.unresolved[0]?.phrase, "with oat milk");
  assert.equal(result.unresolved[0]?.reason, "unmatched");
});

import type { MenuItem } from "./menu-data";

export interface VoiceOrderItem {
  item: MenuItem;
  quantity: number;
}

export type UnresolvedVoicePhrase = {
  phrase: string;
  reason: "unmatched" | "ambiguous" | "invalid-quantity" | "quantity-too-large";
  candidates: MenuItem[];
  requestedQuantity: number | null;
};

export interface ParsedVoiceOrder {
  items: VoiceOrderItem[];
  unresolved: UnresolvedVoicePhrase[];
}

const quantityWords: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const fillerWords = new Set([
  "a",
  "an",
  "and",
  "can",
  "could",
  "get",
  "give",
  "have",
  "i",
  "id",
  "in",
  "like",
  "me",
  "my",
  "of",
  "order",
  "please",
  "put",
  "some",
  "the",
  "then",
  "to",
  "want",
  "would",
  "you",
]);

const quantityFillers = new Set(["a", "an", "please", "some"]);

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function tokenize(value: string) {
  return value
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
}

function getNameVariants(title: string) {
  const simplifiedTitle = title.replace(/\s*\([^)]*\)/g, "").trim();
  const variants = [
    title,
    simplifiedTitle,
    ...simplifiedTitle.split(/\s*\/\s*/),
    ...simplifiedTitle.split(/\s+-\s+/),
  ];

  return [...new Set(variants.map(tokenize).filter((tokens) => tokens.length))];
}

function tokensMatch(actual: string, expected: string) {
  if (actual === expected || actual === `${expected}s`) return true;
  if (expected.endsWith("y") && actual === `${expected.slice(0, -1)}ies`) {
    return true;
  }
  if (/[sxz]$|ch$|sh$/.test(expected) && actual === `${expected}es`) {
    return true;
  }
  return false;
}

function getQuantityBefore(tokens: string[], itemStart: number) {
  for (let index = itemStart - 1; index >= Math.max(0, itemStart - 3); index--) {
    const quantity = quantityWords[tokens[index]] ?? Number(tokens[index]);
    if (Number.isInteger(quantity)) {
      if (quantity === 0) return { quantity, indexes: [index] };
      if (quantity < 0) break;

      const tens = quantityWords[tokens[index - 1]];
      if (
        quantity < 10 &&
        typeof tens === "number" &&
        tens >= 20 &&
        tens % 10 === 0
      ) {
        return { quantity: tens + quantity, indexes: [index - 1, index] };
      }
      return { quantity, indexes: [index] };
    }
    if (!quantityFillers.has(tokens[index])) break;
  }
  return { quantity: 1, indexes: [] };
}

function getVariantMatches(
  tokens: string[],
  start: number,
  variantsByItem: Array<{ item: MenuItem; variants: string[][] }>,
) {
  const matches: Array<{ item: MenuItem; length: number }> = [];
  for (const { item, variants } of variantsByItem) {
    for (const variant of variants) {
      if (
        variant.every((token, offset) => {
          const actual = tokens[start + offset];
          return actual !== undefined && tokensMatch(actual, token);
        })
      ) {
        matches.push({ item, length: variant.length });
      }
    }
  }

  if (matches.length === 0) return [];
  const longestMatch = Math.max(...matches.map((match) => match.length));
  const uniqueItems = new Map<string, MenuItem>();
  for (const match of matches) {
    if (match.length === longestMatch) uniqueItems.set(match.item.id, match.item);
  }

  return [...uniqueItems.values()].map((item) => ({
    item,
    length: longestMatch,
  }));
}

export function parseVoiceOrder(
  transcript: string,
  menuItems: readonly MenuItem[],
): ParsedVoiceOrder {
  const parsedItems = new Map<string, VoiceOrderItem>();
  const unresolved: UnresolvedVoicePhrase[] = [];
  const variantsByItem = menuItems.map((item) => ({
    item,
    variants: getNameVariants(item.title),
  }));
  const clauses = transcript
    .split(/[,;.!?]|\b(?:and|then)\b/gi)
    .map((phrase) => phrase.trim())
    .filter(Boolean);

  for (const phrase of clauses) {
    const tokens = tokenize(phrase);
    if (tokens.length > 0 && tokens.every((token) => fillerWords.has(token))) {
      continue;
    }

    const coveredTokens = new Set<number>();
    let foundItem = false;

    for (let start = 0; start < tokens.length; ) {
      const candidates = getVariantMatches(tokens, start, variantsByItem);
      if (candidates.length === 0) {
        start++;
        continue;
      }

      foundItem = true;
      const { quantity, indexes: quantityIndexes } = getQuantityBefore(
        tokens,
        start,
      );
      const end = start + candidates[0].length;
      for (let index = start; index < end; index++) coveredTokens.add(index);
      for (const index of quantityIndexes) coveredTokens.add(index);

      if (candidates.length > 1) {
        unresolved.push({
          phrase,
          reason: "ambiguous",
          candidates: candidates.map((candidate) => candidate.item),
          requestedQuantity: quantity,
        });
      } else if (quantity < 1) {
        unresolved.push({
          phrase,
          reason: "invalid-quantity",
          candidates: [candidates[0].item],
          requestedQuantity: quantity,
        });
      } else {
        const { item } = candidates[0];
        const totalQuantity = (parsedItems.get(item.id)?.quantity ?? 0) + quantity;
        if (totalQuantity > 20) {
          unresolved.push({
            phrase,
            reason: "quantity-too-large",
            candidates: [item],
            requestedQuantity: totalQuantity,
          });
        } else {
          parsedItems.set(item.id, { item, quantity: totalQuantity });
        }
      }

      start = end;
    }

    if (!foundItem) {
      unresolved.push({
        phrase,
        reason: "unmatched",
        candidates: [],
        requestedQuantity: null,
      });
      continue;
    }

    const remainder = tokens
      .filter(
        (token, index) =>
          !coveredTokens.has(index) &&
          !fillerWords.has(token) &&
          !(Number.isInteger(Number(token)) && Number(token) > 0),
      )
      .join(" ");
    if (remainder) {
      unresolved.push({
        phrase: remainder,
        reason: "unmatched",
        candidates: [],
        requestedQuantity: null,
      });
    }
  }

  return { items: [...parsedItems.values()], unresolved };
}

import { normalizeLabel } from "@/app/lib/menu";

export type OrderItemType = "drink" | "food" | "addon";

export type PendingOrderItem = {
  itemId: number;
  itemType: OrderItemType;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PendingOrder = {
  items: PendingOrderItem[];
  totalAmount: number;
  displayName: string;
  address: string;
  createdAt: string;
};

export type DrinkTemperature = "hot" | "cold";

export type OrderCatalogItem = {
  itemType: OrderItemType;
  itemId: number;
  name: string;
  unitPrice: number;
  temperature?: DrinkTemperature;
  size?: "small" | "medium" | "large";
};

export const PENDING_ORDER_STORAGE_KEY = "cafemo:pending-order";

type DrinkSize = "small" | "medium" | "large";

type DrinkMapping = {
  itemType: "drink";
  itemId: number;
  name: string;
  unitPrice: number;
  hot: boolean;
  size: DrinkSize;
};

type NonDrinkMapping = {
  itemType: "food" | "addon";
  itemId: number;
  name: string;
  unitPrice: number;
};

type CatalogEntry = {
  itemType: OrderItemType;
  canonicalName: string;
  aliases: string[];
};

type TokenMatch = {
  start: number;
  end: number;
  termLength: number;
  entry: CatalogEntry;
};

const DRINKS: DrinkMapping[] = [
  {
    itemType: "drink",
    itemId: 1,
    name: "Americano",
    hot: true,
    size: "small",
    unitPrice: 171.44,
  },
  {
    itemType: "drink",
    itemId: 2,
    name: "Americano",
    hot: true,
    size: "medium",
    unitPrice: 211.44,
  },
  {
    itemType: "drink",
    itemId: 3,
    name: "Americano",
    hot: true,
    size: "large",
    unitPrice: 251.44,
  },
  {
    itemType: "drink",
    itemId: 4,
    name: "Caffe Latte",
    hot: true,
    size: "small",
    unitPrice: 216.74,
  },
  {
    itemType: "drink",
    itemId: 5,
    name: "Caffe Latte",
    hot: true,
    size: "medium",
    unitPrice: 256.74,
  },
  {
    itemType: "drink",
    itemId: 6,
    name: "Caffe Latte",
    hot: true,
    size: "large",
    unitPrice: 296.74,
  },
  {
    itemType: "drink",
    itemId: 7,
    name: "Cappuccino",
    hot: true,
    size: "small",
    unitPrice: 216.74,
  },
  {
    itemType: "drink",
    itemId: 8,
    name: "Cappuccino",
    hot: true,
    size: "medium",
    unitPrice: 256.74,
  },
  {
    itemType: "drink",
    itemId: 9,
    name: "Cappuccino",
    hot: true,
    size: "large",
    unitPrice: 296.74,
  },
  {
    itemType: "drink",
    itemId: 10,
    name: "Hot Chocolate",
    hot: true,
    size: "small",
    unitPrice: 201.64,
  },
  {
    itemType: "drink",
    itemId: 11,
    name: "Hot Chocolate",
    hot: true,
    size: "medium",
    unitPrice: 241.64,
  },
  {
    itemType: "drink",
    itemId: 12,
    name: "Hot Chocolate",
    hot: true,
    size: "large",
    unitPrice: 281.64,
  },
  {
    itemType: "drink",
    itemId: 13,
    name: "Iced Americano",
    hot: false,
    size: "small",
    unitPrice: 186.54,
  },
  {
    itemType: "drink",
    itemId: 14,
    name: "Iced Americano",
    hot: false,
    size: "medium",
    unitPrice: 226.54,
  },
  {
    itemType: "drink",
    itemId: 15,
    name: "Iced Americano",
    hot: false,
    size: "large",
    unitPrice: 266.54,
  },
  {
    itemType: "drink",
    itemId: 16,
    name: "Iced Latte",
    hot: false,
    size: "small",
    unitPrice: 231.84,
  },
  {
    itemType: "drink",
    itemId: 17,
    name: "Iced Latte",
    hot: false,
    size: "medium",
    unitPrice: 271.84,
  },
  {
    itemType: "drink",
    itemId: 18,
    name: "Iced Latte",
    hot: false,
    size: "large",
    unitPrice: 311.84,
  },
  {
    itemType: "drink",
    itemId: 19,
    name: "Peach Smoothie",
    hot: false,
    size: "small",
    unitPrice: 292.25,
  },
  {
    itemType: "drink",
    itemId: 20,
    name: "Peach Smoothie",
    hot: false,
    size: "medium",
    unitPrice: 332.25,
  },
  {
    itemType: "drink",
    itemId: 21,
    name: "Peach Smoothie",
    hot: false,
    size: "large",
    unitPrice: 372.25,
  },
];

const FOODS: NonDrinkMapping[] = [
  { itemType: "food", itemId: 1, name: "Butter Croissant", unitPrice: 226.54 },
  { itemType: "food", itemId: 2, name: "Breakfast Burrito", unitPrice: 543.69 },
  {
    itemType: "food",
    itemId: 3,
    name: "Ham & Cheese Panini",
    unitPrice: 634.3,
  },
];

const ADDONS: NonDrinkMapping[] = [
  { itemType: "addon", itemId: 1, name: "Extra Shot", unitPrice: 60.41 },
  { itemType: "addon", itemId: 2, name: "Plant-based Milk", unitPrice: 45.31 },
  { itemType: "addon", itemId: 3, name: "Flavored Syrup", unitPrice: 30.2 },
];

const CATALOG: CatalogEntry[] = [
  {
    itemType: "drink",
    canonicalName: "Americano",
    aliases: ["americano", "hot americano"],
  },
  {
    itemType: "drink",
    canonicalName: "Caffe Latte",
    aliases: ["caffe latte", "cafe latte"],
  },
  {
    itemType: "drink",
    canonicalName: "Cappuccino",
    aliases: ["cappuccino", "capuccino"],
  },
  {
    itemType: "drink",
    canonicalName: "Hot Chocolate",
    aliases: ["hot chocolate"],
  },
  {
    itemType: "drink",
    canonicalName: "Iced Americano",
    aliases: ["iced americano"],
  },
  { itemType: "drink", canonicalName: "Iced Latte", aliases: ["iced latte"] },
  {
    itemType: "drink",
    canonicalName: "Peach Smoothie",
    aliases: ["peach smoothie"],
  },
  {
    itemType: "food",
    canonicalName: "Butter Croissant",
    aliases: ["butter croissant", "butter croasaint", "croissant"],
  },
  {
    itemType: "food",
    canonicalName: "Breakfast Burrito",
    aliases: ["breakfast burrito", "burrito"],
  },
  {
    itemType: "food",
    canonicalName: "Ham & Cheese Panini",
    aliases: ["ham and cheese panini", "ham cheese panini", "panini"],
  },
  { itemType: "addon", canonicalName: "Extra Shot", aliases: ["extra shot"] },
  {
    itemType: "addon",
    canonicalName: "Plant-based Milk",
    aliases: ["plant-based milk", "plant based milk"],
  },
  {
    itemType: "addon",
    canonicalName: "Flavored Syrup",
    aliases: ["flavored syrup", "flavour syrup"],
  },
];

function isQuantityToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  if (!/^\d+$/.test(token)) {
    return null;
  }

  const parsed = Number.parseInt(token, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function detectQuantity(tokens: string[], start: number, end: number) {
  const before = isQuantityToken(tokens[start - 1]);
  if (before) {
    return before;
  }

  const beforeWithX = isQuantityToken(tokens[start - 2]);
  if (tokens[start - 1] === "x" && beforeWithX) {
    return beforeWithX;
  }

  const after = isQuantityToken(tokens[end + 1]);
  if (tokens[end] === "x" && after) {
    return after;
  }

  const trailing = isQuantityToken(tokens[end]);
  if (trailing) {
    return trailing;
  }

  return 1;
}

function isDrinkSize(token: string | undefined): token is DrinkSize {
  return token === "small" || token === "medium" || token === "large";
}

function detectDrinkSize(
  tokens: string[],
  start: number,
  end: number,
): DrinkSize {
  const before = tokens[start - 1];
  if (isDrinkSize(before)) {
    return before;
  }

  const after = tokens[end];
  if (isDrinkSize(after)) {
    return after;
  }

  return "medium";
}

function createDrinkLookupKey(name: string, size: DrinkSize) {
  return `${normalizeLabel(name)}:${size}`;
}

const DRINK_BY_NAME_AND_SIZE = new Map(
  DRINKS.map((drink) => [createDrinkLookupKey(drink.name, drink.size), drink]),
);

const FOOD_BY_NAME = new Map(
  FOODS.map((food) => [normalizeLabel(food.name), food]),
);

const ADDON_BY_NAME = new Map(
  ADDONS.map((addon) => [normalizeLabel(addon.name), addon]),
);

const DRINK_BY_ID = new Map(DRINKS.map((drink) => [drink.itemId, drink]));
const FOOD_BY_ID = new Map(FOODS.map((food) => [food.itemId, food]));
const ADDON_BY_ID = new Map(ADDONS.map((addon) => [addon.itemId, addon]));

export function getOrderCatalogItemById(
  itemType: OrderItemType,
  itemId: number,
): OrderCatalogItem | null {
  if (itemType === "drink") {
    const drink = DRINK_BY_ID.get(itemId);
    if (!drink) {
      return null;
    }

    return {
      itemType: drink.itemType,
      itemId: drink.itemId,
      name: drink.name,
      unitPrice: drink.unitPrice,
      temperature: drink.hot ? "hot" : "cold",
      size: drink.size,
    };
  }

  if (itemType === "food") {
    const food = FOOD_BY_ID.get(itemId);
    if (!food) {
      return null;
    }

    return {
      itemType: food.itemType,
      itemId: food.itemId,
      name: food.name,
      unitPrice: food.unitPrice,
    };
  }

  const addon = ADDON_BY_ID.get(itemId);
  if (!addon) {
    return null;
  }

  return {
    itemType: addon.itemType,
    itemId: addon.itemId,
    name: addon.name,
    unitPrice: addon.unitPrice,
  };
}

function hasOverlap(candidate: TokenMatch, accepted: TokenMatch[]) {
  return accepted.some(
    (entry) => candidate.start <= entry.end && candidate.end >= entry.start,
  );
}

function findMatches(tokens: string[]) {
  const candidates: TokenMatch[] = [];

  for (const entry of CATALOG) {
    for (const alias of entry.aliases) {
      const normalizedAlias = normalizeLabel(alias);
      if (!normalizedAlias) {
        continue;
      }

      const aliasTokens = normalizedAlias.split(" ");
      const aliasLength = aliasTokens.length;

      for (let index = 0; index <= tokens.length - aliasLength; index += 1) {
        const maybeMatch = tokens.slice(index, index + aliasLength);
        const matches = maybeMatch.every(
          (token, tokenIndex) => token === aliasTokens[tokenIndex],
        );

        if (!matches) {
          continue;
        }

        candidates.push({
          start: index,
          end: index + aliasLength - 1,
          termLength: aliasLength,
          entry,
        });
      }
    }
  }

  const deduped = Array.from(
    new Map(
      candidates.map((candidate) => [
        `${candidate.start}:${candidate.end}:${candidate.entry.itemType}:${candidate.entry.canonicalName}`,
        candidate,
      ]),
    ).values(),
  );

  const sorted = deduped.sort((first, second) => {
    if (first.start !== second.start) {
      return first.start - second.start;
    }

    return second.termLength - first.termLength;
  });

  const accepted: TokenMatch[] = [];
  for (const candidate of sorted) {
    if (hasOverlap(candidate, accepted)) {
      continue;
    }

    accepted.push(candidate);
  }

  return accepted;
}

export function parseOrderItemsFromText(text: string): PendingOrderItem[] {
  const normalizedText = normalizeLabel(text);
  if (!normalizedText) {
    return [];
  }

  const tokens = normalizedText.split(" ");
  const matches = findMatches(tokens);
  const aggregate = new Map<string, PendingOrderItem>();

  for (const match of matches) {
    const quantity = detectQuantity(tokens, match.start, match.end);

    if (match.entry.itemType === "drink") {
      const size = detectDrinkSize(tokens, match.start, match.end);
      const drink = DRINK_BY_NAME_AND_SIZE.get(
        createDrinkLookupKey(match.entry.canonicalName, size),
      );

      if (!drink) {
        continue;
      }

      const lineKey = `drink:${drink.itemId}`;
      const existing = aggregate.get(lineKey);

      if (existing) {
        existing.quantity += quantity;
        existing.lineTotal = Number.parseFloat(
          (existing.quantity * existing.unitPrice).toFixed(2),
        );
        continue;
      }

      aggregate.set(lineKey, {
        itemId: drink.itemId,
        itemType: "drink",
        name: `${drink.name} (${size})`,
        quantity,
        unitPrice: drink.unitPrice,
        lineTotal: Number.parseFloat((quantity * drink.unitPrice).toFixed(2)),
      });

      continue;
    }

    if (match.entry.itemType === "food") {
      const food = FOOD_BY_NAME.get(normalizeLabel(match.entry.canonicalName));
      if (!food) {
        continue;
      }

      const lineKey = `food:${food.itemId}`;
      const existing = aggregate.get(lineKey);
      if (existing) {
        existing.quantity += quantity;
        existing.lineTotal = Number.parseFloat(
          (existing.quantity * existing.unitPrice).toFixed(2),
        );
        continue;
      }

      aggregate.set(lineKey, {
        itemId: food.itemId,
        itemType: "food",
        name: food.name,
        quantity,
        unitPrice: food.unitPrice,
        lineTotal: Number.parseFloat((quantity * food.unitPrice).toFixed(2)),
      });

      continue;
    }

    const addon = ADDON_BY_NAME.get(normalizeLabel(match.entry.canonicalName));
    if (!addon) {
      continue;
    }

    const lineKey = `addon:${addon.itemId}`;
    const existing = aggregate.get(lineKey);
    if (existing) {
      existing.quantity += quantity;
      existing.lineTotal = Number.parseFloat(
        (existing.quantity * existing.unitPrice).toFixed(2),
      );
      continue;
    }

    aggregate.set(lineKey, {
      itemId: addon.itemId,
      itemType: "addon",
      name: addon.name,
      quantity,
      unitPrice: addon.unitPrice,
      lineTotal: Number.parseFloat((quantity * addon.unitPrice).toFixed(2)),
    });
  }

  return Array.from(aggregate.values());
}

export function buildPendingOrder(input: {
  displayName: string;
  address: string;
  sourceText: string;
}): PendingOrder | null {
  const items = parseOrderItemsFromText(input.sourceText);

  if (items.length === 0) {
    return null;
  }

  const totalAmount = Number.parseFloat(
    items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
  );

  return {
    items,
    totalAmount,
    displayName: input.displayName.trim(),
    address: input.address.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function savePendingOrderToStorage(order: PendingOrder) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PENDING_ORDER_STORAGE_KEY, JSON.stringify(order));
}

export function loadPendingOrderFromStorage(): PendingOrder | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PENDING_ORDER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingOrder;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingOrderFromStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
}

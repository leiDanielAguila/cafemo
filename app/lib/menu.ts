import menuData from "@/app/dashboard/kiosk/menu.json";

export type MenuItem = {
  name: string;
  price: number;
};

export type BeverageSizes = {
  small: number;
  medium: number;
  large: number;
};

export type BeverageItem = {
  name: string;
  sizes: BeverageSizes;
};

export type BeverageGroup = {
  category: string;
  items: BeverageItem[];
};

export type MatchedMenuItem = {
  name: string;
  price: number;
  sizes?: BeverageSizes;
};

type MatchCandidate = {
  start: number;
  end: number;
  item: MatchedMenuItem;
  termLength: number;
};

const AVAILABLE_MENU_IMAGE_FILES = [
  "Hot-chocolate.png",
  "breakfast-burrito.png",
  "butter-croasaint.png",
  "cafe-latte.png",
  "capuccino.png",
  "extra-shot.png",
  "flavored-syrup.png",
  "grilled-ham-cheese-panini.png",
  "hot-americano.png",
  "iced-americano.png",
  "iced-latte.png",
  "peach-smoothie.png",
  "plant-based-milk.png",
] as const;

const IMAGE_FILE_BY_LOWER_NAME = AVAILABLE_MENU_IMAGE_FILES.reduce<
  Record<string, string>
>((accumulator, fileName) => {
  accumulator[fileName.toLowerCase()] = fileName;
  return accumulator;
}, {});

const IMAGE_ALIASES: Record<string, string> = {
  americano: "hot-americano.png",
  "caffe latte": "cafe-latte.png",
  cappuccino: "capuccino.png",
  "hot chocolate": "Hot-chocolate.png",
  "butter croissant": "butter-croasaint.png",
  "ham and cheese panini": "grilled-ham-cheese-panini.png",
};

const MATCH_ALIASES_BY_NORMALIZED_ITEM_NAME: Record<string, string[]> = {
  americano: ["hot americano"],
  "caffe latte": ["cafe latte"],
  cappuccino: ["capuccino"],
  "butter croissant": ["butter croasaint"],
  "plant-based milk": ["plant based milk"],
};

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toMenuItem(value: unknown): MenuItem | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const name = toName(record.name);
  const price = toFiniteNumber(record.price ?? record.prize);

  if (!name || price === null) {
    return null;
  }

  return {
    name,
    price,
  };
}

function toBeverageSizes(value: unknown): BeverageSizes | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const small = toFiniteNumber(record.small);
  const medium = toFiniteNumber(record.medium);
  const large = toFiniteNumber(record.large);

  if (small === null || medium === null || large === null) {
    return null;
  }

  return {
    small,
    medium,
    large,
  };
}

function toBeverageItem(value: unknown): BeverageItem | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const name = toName(record.name);
  const sizes = toBeverageSizes(record.sizes);

  if (!name || !sizes) {
    return null;
  }

  return {
    name,
    sizes,
  };
}

function toBeverageGroup(value: unknown): BeverageGroup | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const category = toName(record.category);
  const itemList = Array.isArray(record.items)
    ? record.items
        .map((item) => toBeverageItem(item))
        .filter((item): item is BeverageItem => Boolean(item))
    : [];

  if (!category || itemList.length === 0) {
    return null;
  }

  return {
    category,
    items: itemList,
  };
}

const typedMenuData = toRecord(menuData);
const typedMenuRoot = toRecord(typedMenuData?.menu);

export const beverages = (
  Array.isArray(typedMenuRoot?.beverages) ? typedMenuRoot.beverages : []
)
  .map((group) => toBeverageGroup(group))
  .filter((group): group is BeverageGroup => Boolean(group));

export const food = (
  Array.isArray(typedMenuRoot?.food) ? typedMenuRoot.food : []
)
  .map((item) => toMenuItem(item))
  .filter((item): item is MenuItem => Boolean(item));

export const addOns = (
  Array.isArray(typedMenuRoot?.add_ons) ? typedMenuRoot.add_ons : []
)
  .map((item) => toMenuItem(item))
  .filter((item): item is MenuItem => Boolean(item));

function toDisplayPrice(sizes: BeverageSizes) {
  return sizes.medium;
}

const flattenedBeverageMenuItems: MatchedMenuItem[] = beverages.flatMap(
  (group) =>
    group.items.map((item) => ({
      name: item.name,
      price: toDisplayPrice(item.sizes),
      sizes: item.sizes,
    })),
);

const flattenedMenuItems = [...flattenedBeverageMenuItems, ...food, ...addOns];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toSlug(value: string) {
  return normalizeLabel(value).replace(/\s+/g, "-");
}

function hasOverlap(candidate: MatchCandidate, keptMatches: MatchCandidate[]) {
  return keptMatches.some(
    (kept) => candidate.start < kept.end && candidate.end > kept.start,
  );
}

function getMatchTermsForItem(item: MatchedMenuItem) {
  const normalizedName = normalizeLabel(item.name);
  const aliases = MATCH_ALIASES_BY_NORMALIZED_ITEM_NAME[normalizedName] ?? [];

  return Array.from(
    new Set([normalizedName, ...aliases.map((alias) => normalizeLabel(alias))]),
  ).filter((term) => term.length > 0);
}

export function resolveMenuImagePath(itemName: string) {
  const normalized = normalizeLabel(itemName);
  const aliasFile = IMAGE_ALIASES[normalized];

  if (aliasFile) {
    return `/menu/${aliasFile}`;
  }

  const slugFileKey = `${toSlug(itemName)}.png`.toLowerCase();
  const matchingFile = IMAGE_FILE_BY_LOWER_NAME[slugFileKey];
  if (matchingFile) {
    return `/menu/${matchingFile}`;
  }

  return null;
}

export function formatPrice(price: number) {
  if (typeof price !== "number" || !Number.isFinite(price)) {
    return "—";
  }

  return `₱${price.toFixed(2)}`;
}

export function findTopMatchedMenuItemsByAppearance(text: string, limit = 3) {
  const normalizedText = normalizeLabel(text);
  if (!normalizedText) {
    return [];
  }

  const candidates: MatchCandidate[] = [];

  for (const item of flattenedMenuItems) {
    const terms = getMatchTermsForItem(item);

    for (const term of terms) {
      const pattern = new RegExp(`(^| )${escapeRegExp(term)}(?= |$)`, "g");
      let result = pattern.exec(normalizedText);

      while (result) {
        const leadingSpaceLength = result[1]?.length ?? 0;
        const start = result.index + leadingSpaceLength;
        const end = start + term.length;

        candidates.push({
          start,
          end,
          item,
          termLength: term.length,
        });

        result = pattern.exec(normalizedText);
      }
    }
  }

  if (candidates.length === 0) {
    return [];
  }

  const dedupedBySpanAndItem = Array.from(
    new Map(
      candidates.map((candidate) => [
        `${candidate.start}:${candidate.end}:${normalizeLabel(candidate.item.name)}`,
        candidate,
      ]),
    ).values(),
  );

  const sortedCandidates = dedupedBySpanAndItem.sort((first, second) => {
    if (first.start !== second.start) {
      return first.start - second.start;
    }

    if (first.termLength !== second.termLength) {
      return second.termLength - first.termLength;
    }

    return first.item.name.localeCompare(second.item.name);
  });

  const acceptedMatches: MatchCandidate[] = [];

  for (const candidate of sortedCandidates) {
    if (hasOverlap(candidate, acceptedMatches)) {
      continue;
    }

    acceptedMatches.push(candidate);

    if (acceptedMatches.length >= limit) {
      break;
    }
  }

  return acceptedMatches.map((match) => match.item);
}

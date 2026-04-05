import Image from "next/image";
import {
  BowlFoodIcon,
  CoffeeIcon,
  ImageSquareIcon,
  PlusCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import menuData from "@/app/dashboard/kiosk/menu.json";

type MenuItem = {
  name: string;
  price: number;
};

type BeverageGroup = {
  category: string;
  items: MenuItem[];
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

function normalizeLabel(value: string) {
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

function resolveImagePath(itemName: string) {
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

function formatPrice(price: number) {
  return `₱${price.toFixed(2)}`;
}

function MenuItemCard({ item }: { item: MenuItem }) {
  const imagePath = resolveImagePath(item.name);

  return (
    <article className="glass-card group rounded-2xl p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(72,65,73,0.14)]">
      <div className="rounded-xl bg-white/65 p-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white">
          {imagePath ? (
            <Image
              src={imagePath}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--surface)] text-[var(--color-charcoal)]/50">
              <ImageSquareIcon
                size={30}
                weight="duotone"
                className="motion-safe:animate-pulse"
              />
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--color-charcoal)]">
          {item.name}
        </h3>
        <p className="shrink-0 text-sm font-semibold text-[var(--color-violet)]">
          {formatPrice(item.price)}
        </p>
      </div>
    </article>
  );
}

function MenuGrid({ items }: { items: MenuItem[] }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <MenuItemCard key={item.name} item={item} />
      ))}
    </div>
  );
}

export default function MenuPage() {
  const beverages = menuData.menu.beverages as BeverageGroup[];
  const food = menuData.menu.food as MenuItem[];
  const addOns = menuData.menu.add_ons as MenuItem[];

  return (
    <main className="px-4 pb-8 pt-6 md:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="glass-card rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 md:p-8">
          <div className="flex items-center gap-2 text-[var(--color-charcoal)]">
            <CoffeeIcon
              size={24}
              weight="duotone"
              className="transition-transform duration-300 hover:scale-110"
            />
            <h1 className="text-2xl font-semibold md:text-3xl">Menu</h1>
          </div>
          <p className="mt-2 text-sm text-[var(--color-charcoal)]/75">
            Freshly prepared drinks and bites. Prices are shown in PHP.
          </p>
        </div>

        <section className="glass-card rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 md:p-8">
          <div className="flex items-center gap-2 text-[var(--color-charcoal)]">
            <CoffeeIcon
              size={22}
              weight="duotone"
              className="transition-transform duration-300 hover:scale-110"
            />
            <h2 className="text-xl font-semibold">Beverages</h2>
          </div>

          <div className="mt-5 space-y-6">
            {beverages.map((group) => (
              <div key={group.category}>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-charcoal)]/70">
                  {group.category}
                </h3>
                <MenuGrid items={group.items} />
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 md:p-8">
          <div className="flex items-center gap-2 text-[var(--color-charcoal)]">
            <BowlFoodIcon
              size={22}
              weight="duotone"
              className="transition-transform duration-300 hover:scale-110"
            />
            <h2 className="text-xl font-semibold">Food</h2>
          </div>
          <MenuGrid items={food} />
        </section>

        <section className="glass-card rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 md:p-8">
          <div className="flex items-center gap-2 text-[var(--color-charcoal)]">
            <PlusCircleIcon
              size={22}
              weight="duotone"
              className="transition-transform duration-300 hover:scale-110"
            />
            <h2 className="text-xl font-semibold">Add-ons</h2>
          </div>
          <MenuGrid items={addOns} />
        </section>
      </section>
    </main>
  );
}

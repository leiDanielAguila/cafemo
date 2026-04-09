"use client";

import Image from "next/image";
import {
  BowlFoodIcon,
  CoffeeIcon,
  ImageSquareIcon,
  PlusCircleIcon,
} from "@phosphor-icons/react";
import {
  formatPrice,
  resolveMenuImagePath,
  type BeverageItem,
  type MenuItem,
} from "@/app/lib/menu";
import { useMenuDataQuery } from "@/app/lib/useMenuDataQuery";

function MenuItemCard({ item }: { item: MenuItem }) {
  const imagePath = resolveMenuImagePath(item.name);
  const priceLabel = formatPrice(item.price);

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
          {priceLabel}
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

function BeverageItemCard({ item }: { item: BeverageItem }) {
  const imagePath = resolveMenuImagePath(item.name);

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
      <div className="mt-3">
        <h3 className="text-sm font-semibold text-[var(--color-charcoal)]">
          {item.name}
        </h3>
        <p className="mt-2 text-xs text-[var(--color-charcoal)]/70">Small</p>
        <p className="text-sm font-semibold text-[var(--color-violet)]">
          {formatPrice(item.sizes.small)}
        </p>
        <p className="mt-1 text-xs text-[var(--color-charcoal)]/70">Medium</p>
        <p className="text-sm font-semibold text-[var(--color-violet)]">
          {formatPrice(item.sizes.medium)}
        </p>
        <p className="mt-1 text-xs text-[var(--color-charcoal)]/70">Large</p>
        <p className="text-sm font-semibold text-[var(--color-violet)]">
          {formatPrice(item.sizes.large)}
        </p>
      </div>
    </article>
  );
}

function BeverageGrid({ items }: { items: BeverageItem[] }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <BeverageItemCard key={item.name} item={item} />
      ))}
    </div>
  );
}

export default function MenuPage() {
  const { data } = useMenuDataQuery();
  const beverages = data?.beverages ?? [];
  const food = data?.food ?? [];
  const addOns = data?.addOns ?? [];

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
            Freshly prepared drinks and bites. Latest prices are shown in PHP.
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
                <BeverageGrid items={group.items} />
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

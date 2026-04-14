"use client";

import { CloudSun } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWeather } from "@/app/lib/useWeather";

const dashboardNavItems = [
  { href: "/dashboard/kiosk", label: "Kiosk" },
  { href: "/dashboard/transactions", label: "Transactions" },
  { href: "/dashboard/track-order", label: "Track Order" },
  { href: "/dashboard/menu", label: "Menu" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

function getActiveIndex(pathname: string) {
  const index = dashboardNavItems.findIndex(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return index === -1 ? 0 : index;
}

export default function DashboardNav() {
  const pathname = usePathname();
  const activeIndex = getActiveIndex(pathname);
  const { data, isLoading } = useWeather();

  const temperatureLabel =
    typeof data?.temperature === "number"
      ? `${Math.round(data.temperature)}°C`
      : isLoading
        ? "--°C"
        : "N/A";

  const locationLabel =
    data?.name && data.region
      ? `${data.name}, ${data.region}`
      : "Local weather";

  return (
    <nav aria-label="Dashboard navigation" className="w-full max-w-2xl">
      <div className="mb-3 flex items-center justify-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--color-charcoal)] shadow-sm backdrop-blur">
        <CloudSun
          size={20}
          weight="duotone"
          className="text-[var(--color-violet)]"
        />
        <span>{temperatureLabel}</span>
        <span className="text-xs font-medium text-[var(--color-charcoal)]/70">
          {locationLabel}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-full ">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/5 rounded-full bg-[var(--color-sage)] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />

        <ul className="relative z-10 grid grid-cols-5">
          {dashboardNavItems.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`block px-3 py-2 text-center text-sm font-bold transition-colors md:px-4 ${
                    isActive
                      ? "text-white"
                      : "text-[var(--color-charcoal)] hover:text-[var(--color-violet)]"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

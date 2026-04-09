"use client";

import { useMemo } from "react";
import { formatPrice } from "@/app/lib/menu";
import { getOrderCatalogItemById } from "@/app/lib/orderFlow";
import { useUserOrdersQuery } from "@/app/lib/useUserOrdersQuery";
import { StatsGridIcons, type UserOrderStat } from "./StatsGridIcon";

type OrderTableRow = {
  rowId: string;
  orderedAt: string;
  orderId: string;
  itemName: string;
  itemType: "drink" | "food" | "addon";
  drinkTemperature: "hot" | "cold" | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

function formatDateTime(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleString();
}

export default function TransactionsClientPage() {
  const {
    data: orders,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useUserOrdersQuery();

  const tableRows = useMemo<OrderTableRow[]>(() => {
    if (!orders) {
      return [];
    }

    return orders.flatMap((order) =>
      order.items.map((item) => {
        const catalogItem = getOrderCatalogItemById(item.itemType, item.itemId);
        const itemName =
          catalogItem?.itemType === "drink" && catalogItem.size
            ? `${catalogItem.name} (${catalogItem.size})`
            : (catalogItem?.name ?? `Unknown ${item.itemType} #${item.itemId}`);

        return {
          rowId: `${order.orderId}-${item.itemType}-${item.itemId}`,
          orderedAt: order.createdAt,
          orderId: order.orderId,
          itemName,
          itemType: item.itemType,
          drinkTemperature:
            catalogItem?.itemType === "drink"
              ? (catalogItem.temperature ?? null)
              : null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: Number.parseFloat(
            (item.quantity * item.unitPrice).toFixed(2),
          ),
        };
      }),
    );
  }, [orders]);

  const stats = useMemo<UserOrderStat[]>(() => {
    const hotDrinksCount = tableRows.reduce((sum, row) => {
      if (row.itemType !== "drink" || row.drinkTemperature !== "hot") {
        return sum;
      }

      return sum + row.quantity;
    }, 0);

    const coldDrinksCount = tableRows.reduce((sum, row) => {
      if (row.itemType !== "drink" || row.drinkTemperature !== "cold") {
        return sum;
      }

      return sum + row.quantity;
    }, 0);

    const foodOrdersCount = tableRows.reduce((sum, row) => {
      if (row.itemType !== "food") {
        return sum;
      }

      return sum + row.quantity;
    }, 0);

    return [
      {
        title: "Hot Drinks",
        value: hotDrinksCount,
        description: "Total hot drinks ordered",
        tone: "hot",
      },
      {
        title: "Cold Drinks",
        value: coldDrinksCount,
        description: "Total cold drinks ordered",
        tone: "cold",
      },
      {
        title: "Food Orders",
        value: foodOrdersCount,
        description: "Total food items ordered",
        tone: "food",
      },
    ];
  }, [tableRows]);

  if (isLoading) {
    return (
      <p className="text-sm text-[var(--color-charcoal)]/80">
        Loading transactions...
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4 text-left">
        <p className="text-sm text-red-700">
          {error instanceof Error
            ? error.message
            : "Failed to load transactions."}
        </p>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-charcoal)] hover:bg-white/80"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <StatsGridIcons stats={stats} />

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h3 className="text-base font-semibold text-[var(--color-charcoal)]">
            Past Order Items
          </h3>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-cream)]"
          >
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {tableRows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--color-charcoal)]/80">
            No completed orders found for your account yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border)] text-sm">
              <thead className="bg-[var(--color-cream)]/60 text-left text-xs uppercase tracking-wide text-[var(--color-charcoal)]/75">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ordered At</th>
                  <th className="px-4 py-3 font-semibold">Order ID</th>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Qty</th>
                  <th className="px-4 py-3 font-semibold">Unit Price</th>
                  <th className="px-4 py-3 font-semibold">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-white text-[var(--color-charcoal)]">
                {tableRows.map((row) => (
                  <tr key={row.rowId}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDateTime(row.orderedAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.orderId}
                    </td>
                    <td className="px-4 py-3">{row.itemName}</td>
                    <td className="px-4 py-3 capitalize">
                      {row.itemType}
                      {row.drinkTemperature ? ` · ${row.drinkTemperature}` : ""}
                    </td>
                    <td className="px-4 py-3">{row.quantity}</td>
                    <td className="px-4 py-3">{formatPrice(row.unitPrice)}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatPrice(row.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

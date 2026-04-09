"use client";

import { useQuery } from "@tanstack/react-query";
import type { OrderItemType } from "@/app/lib/orderFlow";

export const USER_ORDERS_QUERY_KEY = ["user-orders"] as const;

export type UserOrderItem = {
  itemId: number;
  itemType: OrderItemType;
  quantity: number;
  unitPrice: number;
};

export type UserOrder = {
  orderId: string;
  totalAmount: number;
  createdAt: string;
  items: UserOrderItem[];
};

type UserOrdersResponse = {
  orders: UserOrder[];
};

async function fetchUserOrders() {
  const response = await fetch("/api/orders", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(errorData?.error || "Failed to fetch user orders.");
  }

  const data = (await response.json()) as UserOrdersResponse;
  return data.orders ?? [];
}

export function useUserOrdersQuery() {
  return useQuery({
    queryKey: USER_ORDERS_QUERY_KEY,
    queryFn: fetchUserOrders,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

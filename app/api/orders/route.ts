import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

type OrderItemPayload = {
  itemId: number;
  itemType: "drink" | "food" | "addon";
  quantity: number;
  unitPrice: number;
};

type CreateOrderPayload = {
  totalAmount: number;
  items: OrderItemPayload[];
};

<<<<<<< HEAD
=======
type OrderRecord = {
  order_id: string;
  total_amount: number;
  created_at: string;
};

type OrderItemRecord = {
  order_id: string;
  item_id: number;
  item_type: "drink" | "food" | "addon";
  quantity: number;
  price_at_purchase: number;
};

>>>>>>> dev
function isValidOrderPayload(payload: unknown): payload is CreateOrderPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const record = payload as Record<string, unknown>;
  if (
    typeof record.totalAmount !== "number" ||
    !Number.isFinite(record.totalAmount)
  ) {
    return false;
  }

  if (!Array.isArray(record.items) || record.items.length === 0) {
    return false;
  }

  return record.items.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const parsed = item as Record<string, unknown>;
    return (
      typeof parsed.itemId === "number" &&
      Number.isInteger(parsed.itemId) &&
      parsed.itemId > 0 &&
      (parsed.itemType === "drink" ||
        parsed.itemType === "food" ||
        parsed.itemType === "addon") &&
      typeof parsed.quantity === "number" &&
      Number.isInteger(parsed.quantity) &&
      parsed.quantity > 0 &&
      typeof parsed.unitPrice === "number" &&
      Number.isFinite(parsed.unitPrice)
    );
  });
}

<<<<<<< HEAD
=======
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("order_id,total_amount,created_at")
      .eq("profile_id", authData.user.id)
      .order("created_at", { ascending: false })
      .returns<OrderRecord[]>();

    if (ordersError) {
      return NextResponse.json(
        { error: ordersError.message || "Failed to fetch orders." },
        { status: 500 },
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ orders: [] }, { status: 200 });
    }

    const orderIds = orders.map((order) => order.order_id);
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("order_id,item_id,item_type,quantity,price_at_purchase")
      .in("order_id", orderIds)
      .returns<OrderItemRecord[]>();

    if (itemsError) {
      return NextResponse.json(
        { error: itemsError.message || "Failed to fetch order items." },
        { status: 500 },
      );
    }

    const itemsByOrderId = new Map<string, OrderItemRecord[]>();
    for (const item of orderItems ?? []) {
      const existingItems = itemsByOrderId.get(item.order_id);
      if (existingItems) {
        existingItems.push(item);
        continue;
      }

      itemsByOrderId.set(item.order_id, [item]);
    }

    const hydratedOrders = orders.map((order) => ({
      orderId: order.order_id,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
      items:
        itemsByOrderId.get(order.order_id)?.map((item) => ({
          itemId: item.item_id,
          itemType: item.item_type,
          quantity: item.quantity,
          unitPrice: item.price_at_purchase,
        })) ?? [],
    }));

    return NextResponse.json({ orders: hydratedOrders }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch past orders." },
      { status: 500 },
    );
  }
}

>>>>>>> dev
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    if (!isValidOrderPayload(body)) {
      return NextResponse.json(
        { error: "Invalid order payload." },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: insertedOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        profile_id: authData.user.id,
        total_amount: body.totalAmount,
      })
      .select("order_id")
      .single();

    if (orderError || !insertedOrder?.order_id) {
      return NextResponse.json(
        { error: orderError?.message || "Failed to create order." },
        { status: 500 },
      );
    }

    const orderItemsRows = body.items.map((item) => ({
      order_id: insertedOrder.order_id,
      item_id: item.itemId,
      item_type: item.itemType,
      quantity: item.quantity,
      price_at_purchase: item.unitPrice,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsRows);

    if (itemsError) {
      return NextResponse.json(
        { error: itemsError.message || "Failed to create order items." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { orderId: insertedOrder.order_id },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to process order creation request." },
      { status: 500 },
    );
  }
}

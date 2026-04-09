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

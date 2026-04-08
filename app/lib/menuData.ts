import { type SupabaseClient } from "@supabase/supabase-js";
import { type MenuData, normalizeMenuDataFromRows } from "@/app/lib/menu";

type FoodsRow = {
  food_name: string | null;
  price: number | null;
};

type DrinksRow = {
  drink_name: string | null;
  drink_hot: boolean | null;
  drink_size: string | null;
  price: number | null;
};

type AddOnsRow = {
  addons_name: string | null;
  price: number | null;
};

export async function fetchMenuData(
  supabase: SupabaseClient,
): Promise<MenuData> {
  const [foodsResult, drinksResult, addOnsResult] = await Promise.all([
    supabase.from("foods").select("food_name, price"),
    supabase.from("drinks").select("drink_name, drink_hot, drink_size, price"),
    supabase.from("addons").select("addons_name, price"),
  ]);

  if (foodsResult.error) {
    throw new Error(`Failed to fetch foods: ${foodsResult.error.message}`);
  }

  if (drinksResult.error) {
    throw new Error(`Failed to fetch drinks: ${drinksResult.error.message}`);
  }

  if (addOnsResult.error) {
    throw new Error(`Failed to fetch add-ons: ${addOnsResult.error.message}`);
  }

  return normalizeMenuDataFromRows({
    foodRows: (foodsResult.data ?? []) as FoodsRow[],
    drinkRows: (drinksResult.data ?? []) as DrinksRow[],
    addOnRows: (addOnsResult.data ?? []) as AddOnsRow[],
  });
}

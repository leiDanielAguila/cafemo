"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/app/utils/supabase/client";
import { flattenMenuItems } from "@/app/lib/menu";
import { fetchMenuData } from "@/app/lib/menuData";

export const MENU_DATA_QUERY_KEY = ["menu-data"] as const;

export function useMenuDataQuery() {
  const supabase = useMemo(() => createClient(), []);

  const query = useQuery({
    queryKey: MENU_DATA_QUERY_KEY,
    queryFn: () => fetchMenuData(supabase),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const flattenedMenuItems = useMemo(
    () => (query.data ? flattenMenuItems(query.data) : []),
    [query.data],
  );

  return {
    ...query,
    flattenedMenuItems,
  };
}

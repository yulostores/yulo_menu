// Ported near-verbatim from yulo_restaurant/src/hooks/customer/useMenu.js — same public
// endpoints, same category-tree shape, so it can stay unchanged as the backend evolves.

import { useQuery } from "@tanstack/react-query";
import { menuApi } from "@/api/menu.api";

export const menuKeys = {
  menu:       (rId)       => ["menu", rId],
  restaurant: (rId)       => ["restaurant", rId],
  table:      (rId, tId)  => ["table", rId, tId],
  session:    (rId, tId)  => ["session", rId, tId],
};

export function useRestaurantMenu(restaurantId) {
  return useQuery({
    queryKey: menuKeys.menu(restaurantId),
    queryFn: () => menuApi.getMenu(restaurantId).then((r) => r.data.data.menu ?? []),
    enabled: !!restaurantId,
    staleTime: 5 * 60_000,
  });
}

export function useRestaurant(restaurantId) {
  return useQuery({
    queryKey: menuKeys.restaurant(restaurantId),
    queryFn: () => menuApi.getRestaurant(restaurantId).then((r) => r.data.data.restaurant),
    enabled: !!restaurantId,
    staleTime: 10 * 60_000,
  });
}

export function useTable(restaurantId, tableId) {
  return useQuery({
    queryKey: menuKeys.table(restaurantId, tableId),
    queryFn: () => menuApi.getTable(restaurantId, tableId).then((r) => r.data.data.table),
    enabled: !!restaurantId && !!tableId,
    staleTime: 5 * 60_000,
  });
}

// Flattens the category tree into a single item list, tagging each item with the
// category (and subcategory) it came from.
export function flattenMenu(menu = []) {
  const out = [];
  for (const category of menu) {
    for (const item of category.items ?? []) {
      out.push({ ...item, categoryName: category.name, subCategoryName: null });
    }
    for (const sub of category.subCategories ?? []) {
      for (const item of sub.items ?? []) {
        out.push({ ...item, categoryName: category.name, subCategoryName: sub.name });
      }
    }
  }
  return out;
}

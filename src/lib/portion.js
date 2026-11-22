// Half / full plate. A dish with `halfPlatePrice` comes in two sizes: its normal price is the
// full plate. Each size is its own cart line, keyed "<itemId>:half" / "<itemId>:full", and
// the order API gets { menuItemId, portion } back (yulo_backend services/portion.service.js).

export const hasPortions = (item) => item?.halfPlatePrice != null;

export const fullPriceOf = (item) => item.effectivePrice ?? item.discountedPrice ?? item.sellingPrice ?? 0;

/** The cart-ready version of `item` in one size. */
export function portionItem(item, portion) {
  if (!hasPortions(item)) return item;
  return portion === "half"
    ? { ...item, _id: `${item._id}:half`, name: `${item.name} (Half)`, effectivePrice: item.halfPlatePrice }
    : { ...item, _id: `${item._id}:full`, name: `${item.name} (Full)`, effectivePrice: fullPriceOf(item) };
}

/** A cart line id → { menuItemId, portion? } for the API. */
export function splitLineId(lineId) {
  const [menuItemId, portion] = String(lineId).split(":");
  return portion ? { menuItemId, portion } : { menuItemId };
}

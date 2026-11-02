// The offer a restaurant sent this diner from its live dashboard (hooks/useDiner.js), shown on
// the menu, cart, order and bill screens. It comes off the table's bill by itself — nothing to
// apply — so this only says what it is and how long it lasts. Plus the one-line notice that the
// restaurant can see this table's activity, with a way to stop sharing it.

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";

import { useTableSession } from "@/context/TableSessionContext";
import { useMarkOfferSeen, useStopSharing, useTableOffer } from "@/hooks/useDiner";

// Layout renders this component, so its price formatter is not imported from there.
const formatPrice = (rupees) => `₹${Number(rupees ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function minutesLeft(expiresAt) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60000));
}

export function offerValueText(offer) {
  return offer.type === "percentage"
    ? `${offer.percentage}% off${offer.maxDiscountAmount ? ` up to ${formatPrice(offer.maxDiscountAmount)}` : ""}`
    : `${formatPrice(offer.flatAmount)} off`;
}

export default function TableOffer() {
  const { session, dinerActive } = useTableSession();
  const { data: offer } = useTableOffer(session.restaurantId, session.tableId, dinerActive);
  useMarkOfferSeen(session.restaurantId, session.tableId, offer);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!offer) return undefined;
    const timer = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, [offer]);

  if (!offer) return null;
  const left = minutesLeft(offer.expiresAt);
  if (left <= 0) return null;
  const dishes = offer.applicableItemNames?.length ? ` on ${offer.applicableItemNames.join(", ")}` : "";

  return (
    <section
      aria-label="Offer from the restaurant"
      className="mx-4 mt-4 flex gap-3 rounded-2xl border border-brand-orange/40 bg-[#FFF6EF] px-4 py-3"
    >
      <Gift className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
      <div className="min-w-0 text-sm">
        <p className="font-bold">
          {offer.title}: {offerValueText(offer)}
          {dishes}
        </p>
        <p className="mt-0.5 text-xs text-[#5a403e]">
          A gift from {offer.restaurant?.name ?? "the restaurant"} — taken off your table&apos;s bill automatically
          {offer.minimumOrderValue ? ` on orders over ${formatPrice(offer.minimumOrderValue)}` : ""}. Ends in {left} min.
        </p>
      </div>
    </section>
  );
}

/** One line under the menu: the restaurant sees this table's activity; "Don't share" stops it. */
export function ActivityNotice() {
  const { dinerActive } = useTableSession();
  const { stop, stopping, stopped } = useStopSharing();
  if (stopped) {
    return <p className="px-4 pb-4 text-center text-[11px] text-muted-foreground">Your activity isn&apos;t shared with the restaurant.</p>;
  }
  if (!dinerActive) return null;
  return (
    <p className="px-4 pb-4 text-center text-[11px] text-muted-foreground">
      The restaurant can see what you browse and order at this table, so it can send you offers.{" "}
      <button type="button" onClick={stop} disabled={stopping} className="font-semibold text-brand-orange underline">
        Don&apos;t share
      </button>
    </p>
  );
}

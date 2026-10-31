// The website's front page — what someone sees opening the site directly, without a table QR
// (a QR link lands on the menu itself; see Menu.jsx). It says what Yulo Stores is, shows a live
// menu with real items and prices, and links every policy page in the footer — the things a
// payment gateway's website review (and any first-time visitor) looks for.
//
// The menu shown is VITE_FEATURED_RESTAURANT_ID's, read-only: ordering needs a table, so each
// dish says to scan the QR at the table instead of offering "Add".

import { useMemo } from "react";
import { QrCode, Receipt, ShieldCheck, Store, UtensilsCrossed } from "lucide-react";

import Layout, { FoodThumb, VegDot, formatPrice } from "@/components/Layout";
import SiteFooter from "@/components/SiteFooter";
import { BUSINESS } from "@/content/business";
import { flattenMenu, useRestaurant, useRestaurantMenu } from "@/hooks/useMenu";

const FEATURED_RESTAURANT_ID = import.meta.env.VITE_FEATURED_RESTAURANT_ID || null;

const STEPS = [
  { icon: QrCode, title: "Scan", text: "Scan the QR code on your table to open the restaurant's menu." },
  { icon: UtensilsCrossed, title: "Order", text: "Pick your dishes and send the order straight to the kitchen." },
  { icon: Receipt, title: "Pay", text: "Pay your bill securely online with UPI, cards or net banking." },
];

function FeaturedMenu({ restaurantId }) {
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: menu = [], isLoading, isError } = useRestaurantMenu(restaurantId);

  // Grouped by category, in menu order.
  const groups = useMemo(() => {
    const byCategory = new Map();
    for (const item of flattenMenu(menu)) {
      const key = item.categoryName ?? "Menu";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(item);
    }
    return [...byCategory.entries()];
  }, [menu]);

  if (isError) return null;

  const address = [restaurant?.address?.street, restaurant?.address?.city].filter(Boolean).join(", ");

  return (
    <section className="space-y-3 px-5 py-6" aria-labelledby="featured-menu">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">Live menu</p>
        <h2 id="featured-menu" className="text-xl font-bold">
          {restaurant?.name ?? "Our partner restaurant"}
        </h2>
        {address ? <p className="text-xs text-muted-foreground">{address}</p> : null}
        <p className="mt-1 text-xs text-muted-foreground">
          Prices in Indian Rupees (₹), set by the restaurant. Taxes and charges are shown before you pay.
        </p>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading menu…</p>
      ) : (
        groups.map(([category, items]) => (
          <div key={category} className="space-y-2">
            <h3 className="pt-2 text-sm font-bold text-[#5a403e]">{category}</h3>
            {items.map((item) => (
              <article key={item._id} className="flex gap-3 rounded-2xl border border-brand-cream/70 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <VegDot type={item.foodType} />
                    <h4 className="truncate font-bold">{item.name}</h4>
                  </div>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-bold text-brand-red">
                      {formatPrice(item.effectivePrice ?? item.sellingPrice)}
                    </span>
                    {item.discountedPrice && item.discountedPrice < item.sellingPrice ? (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(item.sellingPrice)}
                      </span>
                    ) : null}
                    {item.isAvailable === false ? (
                      <span className="text-xs font-semibold text-brand-maroon">· Currently unavailable</span>
                    ) : null}
                  </div>
                </div>
                <FoodThumb src={item.image} alt={item.name} className="h-20 w-20 shrink-0 rounded-xl" />
              </article>
            ))}
          </div>
        ))
      )}

      <p className="rounded-xl bg-brand-cream/40 px-3 py-2.5 text-center text-xs font-semibold text-[#5a403e]">
        To order, scan the QR code on your table at the restaurant.
      </p>
    </section>
  );
}

export default function Home() {
  return (
    <Layout title={BUSINESS.brand}>
      <section className="bg-brand-gradient px-5 py-8 text-white">
        <h2 className="text-2xl font-bold leading-tight">Scan. Order. Pay.</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/90">
          {BUSINESS.brand} lets you order from your table at partner restaurants — browse the menu, send your
          order to the kitchen and pay your bill online, all from your phone. No app download needed.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-2 px-5 py-6">
        {STEPS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-brand-cream/70 bg-white p-3 text-center">
            <Icon className="mx-auto h-5 w-5 text-brand-orange" />
            <p className="mt-1.5 text-sm font-bold">{title}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      {FEATURED_RESTAURANT_ID ? <FeaturedMenu restaurantId={FEATURED_RESTAURANT_ID} /> : null}

      <section className="space-y-3 px-5 pb-6">
        <div className="flex gap-3 rounded-2xl border border-brand-cream/70 bg-white p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-brand-green" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-[#24190f]">Secure payments.</span> Online payments are processed
            by Razorpay. Refunds go back to your original payment method — see our Cancellation &amp; Refund
            Policy below.
          </p>
        </div>
        <div className="flex gap-3 rounded-2xl border border-brand-cream/70 bg-white p-4">
          <Store className="h-5 w-5 shrink-0 text-brand-orange" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-[#24190f]">Own a restaurant?</span> Put your menu on{" "}
            {BUSINESS.brand}, take table and delivery orders and get weekly payouts.{" "}
            <a href={BUSINESS.restaurantPortalUrl} className="font-semibold text-brand-orange">
              Partner login
            </a>
          </p>
        </div>
      </section>

      <SiteFooter />
    </Layout>
  );
}

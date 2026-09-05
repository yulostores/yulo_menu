// Mobile-first shell, ported from yulo_restaurant's CustomerLayout.jsx. Dropped the
// "Account" nav item (no login → no profile) and the QR-scan icon; kept everything else.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, ClipboardList, Receipt, ChevronLeft, UtensilsCrossed } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTableSession } from "@/context/TableSessionContext";

const NAV = [
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/help", label: "Help", icon: BellRing },
  { to: "/bill", label: "Bill", icon: Receipt },
  { to: "/cart", label: "Cart", icon: ClipboardList },
];

export function VegDot({ type, className }) {
  const veg = type === "veg";
  return (
    <span
      className={cn(
        "grid h-4 w-4 shrink-0 place-items-center rounded-sm border",
        veg ? "border-brand-green" : "border-brand-maroon",
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", veg ? "bg-brand-green" : "bg-brand-maroon")} />
    </span>
  );
}

export function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function FoodThumb({ src, alt, className }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div
        className={cn(
          "grid place-items-center bg-gradient-to-br from-brand-saffron to-brand-red text-white",
          className,
        )}
      >
        <UtensilsCrossed className="h-6 w-6 opacity-80" />
      </div>
    );
  }
  return (
    <img src={src} alt={alt} onError={() => setFailed(true)} className={cn("object-cover", className)} />
  );
}

export default function Layout({ children, title, onBack, showBack = false, showNav = false, activeNav, footer }) {
  const navigate = useNavigate();
  const { cartCount } = useTableSession();

  return (
    <div className="flex min-h-screen justify-center bg-[#efe6df] font-sans text-[#24190f]">
      <div className="relative flex w-full max-w-[480px] flex-col bg-brand-page shadow-xl">
        {title ? (
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-brand-cream/60 bg-brand-page/95 px-4 py-3.5 backdrop-blur">
            {showBack ? (
              <button
                type="button"
                onClick={onBack ?? (() => navigate(-1))}
                className="grid h-9 w-9 place-items-center rounded-full border border-brand-cream/70 text-[#5a403e]"
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : null}
            <h1 className="text-lg font-bold">{title}</h1>
          </header>
        ) : null}

        <main className={cn("flex-1", showNav && "pb-20", footer && "pb-24")}>{children}</main>

        {footer ? (
          <div className="sticky bottom-0 z-20 border-t border-brand-cream/60 bg-brand-page/95 px-4 py-3 backdrop-blur">
            {footer}
          </div>
        ) : null}

        {showNav ? (
          <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-brand-cream/60 bg-white">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.label;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-brand-orange" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
                  {item.label}
                  {item.label === "Cart" && cartCount > 0 ? (
                    <span className="absolute right-[28%] top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-red px-1 text-[9px] font-bold text-white">
                      {cartCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

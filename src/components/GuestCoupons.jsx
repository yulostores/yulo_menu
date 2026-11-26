// "Get free coupons" — a guest paying the table's bill may give name, gender, mobile number and
// date of birth, and gets coupons from partner shops near the restaurant (yulo_backend
// services/guestCoupon.service.js). Optional: "No thanks" pays without them.
//
//   CouponDetailsForm   the form on the Bill screen, before Pay
//   GuestCouponsList    after paying: the coupons themselves, with their codes
//
// The details are kept in this tab's sessionStorage only, so a reload mid-payment doesn't lose
// them; the server keeps them on the bill and gives this device a token to see its coupons.

import { CheckCircle2, ChevronDown, Gift, Loader2, MapPin, Ticket } from "lucide-react";

import { useGuestCoupons } from "@/hooks/useBill";
import { cn } from "@/lib/utils";

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

export const EMPTY_DETAILS = { name: "", gender: "", phone: "", dateOfBirth: "" };

const istToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const yearsBefore = (iso, years) => `${Number(iso.slice(0, 4)) - years}${iso.slice(4)}`;

/** The same rules the server applies — field → message, empty when it's fine. */
export function couponDetailsErrors(d) {
  const errors = {};
  if ((d.name ?? "").trim().length < 2) errors.name = "Enter your name";
  if (!["male", "female", "other"].includes(d.gender)) errors.gender = "Choose one";
  const digits = String(d.phone ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  if (!/^[6-9]\d{9}$/.test(digits)) errors.phone = "Enter a 10-digit mobile number";
  const today = istToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dateOfBirth ?? "")) errors.dateOfBirth = "Enter your date of birth";
  else if (d.dateOfBirth > yearsBefore(today, 10) || d.dateOfBirth < yearsBefore(today, 100)) errors.dateOfBirth = "Enter your real date of birth";
  return errors;
}

export function CouponDetailsForm({ open, onOpenChange, details, onChange, errors, disabled }) {
  const today = istToday();
  const set = (field) => (e) => onChange({ ...details, [field]: e.target.value });
  const fieldClass = (bad) =>
    cn(
      "w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20",
      bad ? "border-brand-maroon" : "border-brand-cream",
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-orange/40 bg-[#FFF8F2]">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        disabled={disabled}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <Gift className="h-6 w-6 shrink-0 text-brand-orange" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Get free coupons</span>
          <span className="block text-xs text-muted-foreground">From salons, spas and shops near this restaurant — add your details before you pay.</span>
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-brand-orange transition", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-brand-orange/20 px-4 pb-4 pt-3">
          <label className="block text-xs font-semibold text-[#5a403e]">
            Name
            <input value={details.name} onChange={set("name")} autoComplete="name" maxLength={60} className={cn("mt-1", fieldClass(errors.name))} disabled={disabled} />
            {errors.name ? <span className="mt-0.5 block font-normal text-brand-maroon">{errors.name}</span> : null}
          </label>

          <div className="text-xs font-semibold text-[#5a403e]">
            Gender
            <div className="mt-1 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gender">
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  role="radio"
                  aria-checked={details.gender === g.value}
                  onClick={() => onChange({ ...details, gender: g.value })}
                  disabled={disabled}
                  className={cn(
                    "rounded-xl border py-2 text-sm font-semibold",
                    details.gender === g.value ? "border-brand-orange bg-brand-orange/10 text-brand-orange" : "border-brand-cream bg-white text-[#5a403e]",
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {errors.gender ? <span className="mt-0.5 block font-normal text-brand-maroon">{errors.gender}</span> : null}
          </div>

          <label className="block text-xs font-semibold text-[#5a403e]">
            Mobile number
            <div className={cn("mt-1 flex items-center", fieldClass(errors.phone), "p-0")}>
              <span className="pl-3 pr-1 text-sm text-muted-foreground">+91</span>
              <input
                value={details.phone}
                onChange={(e) => onChange({ ...details, phone: e.target.value.replace(/[^\d+ ]/g, "").slice(0, 14) })}
                inputMode="numeric"
                autoComplete="tel-national"
                className="w-full rounded-xl bg-transparent py-2.5 pr-3 text-sm outline-none"
                disabled={disabled}
              />
            </div>
            {errors.phone ? <span className="mt-0.5 block font-normal text-brand-maroon">{errors.phone}</span> : null}
          </label>

          <label className="block text-xs font-semibold text-[#5a403e]">
            Date of birth
            <input
              type="date"
              value={details.dateOfBirth}
              onChange={set("dateOfBirth")}
              max={yearsBefore(today, 10)}
              min={yearsBefore(today, 100)}
              autoComplete="bday"
              className={cn("mt-1", fieldClass(errors.dateOfBirth))}
              disabled={disabled}
            />
            {errors.dateOfBirth ? <span className="mt-0.5 block font-normal text-brand-maroon">{errors.dateOfBirth}</span> : null}
          </label>

          <p className="text-[11px] leading-snug text-muted-foreground">
            Your coupons are saved to this mobile number — sign in to the Yulo app with it to see them any time. We don&apos;t share your number with the shops.
          </p>
          <button
            type="button"
            onClick={() => {
              onChange(EMPTY_DETAILS);
              onOpenChange(false);
            }}
            disabled={disabled}
            className="text-xs font-bold text-[#5a403e] underline"
          >
            No thanks
          </button>
        </div>
      ) : null}
    </section>
  );
}

const validTill = (d) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

export function GuestCouponsList({ restaurantId, tableId, token, appUrl }) {
  const { data, isLoading, isError } = useGuestCoupons(restaurantId, tableId, token);
  if (!token) return null;
  const coupons = data?.coupons ?? [];
  const waiting = isLoading || data?.issuing || data?.paid === false;

  return (
    <section className="mt-2 w-full max-w-sm space-y-3 text-left" aria-live="polite">
      {waiting ? (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-[#FFF4EC] p-4 text-sm font-semibold text-[#8A4B00]">
          <Loader2 className="h-4 w-4 animate-spin" /> Getting your coupons…
        </p>
      ) : isError ? (
        <p className="rounded-2xl bg-[#FFF4EC] p-4 text-sm text-[#8A4B00]">Your coupons are saved to your mobile number — open the Yulo app to see them.</p>
      ) : coupons.length === 0 ? (
        <p className="rounded-2xl bg-brand-cream/40 p-4 text-sm text-muted-foreground">No partner coupons are available near this restaurant right now. Thanks for your details!</p>
      ) : (
        <>
          <p className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-5 w-5 text-brand-green" /> You got {coupons.length} {coupons.length === 1 ? "coupon" : "coupons"}
          </p>
          {coupons.map((c) => (
            <article key={c.id} className="rounded-2xl border border-dashed border-brand-orange bg-white p-4">
              <div className="flex items-start gap-3">
                <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-snug">{c.title}</p>
                  {c.seller?.name ? <p className="text-sm text-[#5a403e]">{c.seller.name}</p> : null}
                  {c.seller?.address ? (
                    <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {c.seller.address}
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 rounded-xl bg-brand-cream/40 py-2 text-center font-mono text-lg font-bold tracking-widest">{c.code}</p>
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                Show this code at the shop · valid till {validTill(c.expiresAt)}
              </p>
              {c.terms ? <p className="mt-1 text-[11px] text-muted-foreground">{c.terms}</p> : null}
            </article>
          ))}
          <p className="text-center text-xs text-muted-foreground">
            Saved to your number ending {data?.phoneLast4 ?? "••••"}.{" "}
            <a href={appUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-orange underline">
              Open the Yulo app
            </a>{" "}
            to keep them handy.
          </p>
        </>
      )}
    </section>
  );
}

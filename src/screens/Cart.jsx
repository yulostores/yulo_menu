// Cart — REWRITTEN from yulo_restaurant's Cart.jsx: no delivery address picker, no
// "hand this to your waiter" notice. Places a real dine-in order directly against
// POST /api/restaurants/:id/tables/:tableId/orders (see guestOrder.service.js on the
// backend) — no login, an optional phone number only.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Phone, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { usePlaceOrder } from "@/hooks/useOrder";
import { useTableSession } from "@/context/TableSessionContext";
import Layout, { FoodThumb, VegDot, formatPrice } from "@/components/Layout";

export default function Cart() {
  const navigate = useNavigate();
  const { session, cart, cartTotal, setQuantity, removeFromCart, clearCart, setGuestPhone } = useTableSession();

  const placeOrderMutation = usePlaceOrder(session.restaurantId, session.tableId);

  const [instructions, setInstructions] = useState("");
  const [phone, setPhone] = useState(session.guestPhone || "");
  const [error, setError] = useState("");

  const placing = placeOrderMutation.isPending;

  async function placeOrder() {
    if (placing || cart.length === 0) return;
    setError("");
    try {
      setGuestPhone(phone.trim());
      await placeOrderMutation.mutateAsync({
        items: cart.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          note: line.specialInstructions || undefined,
        })),
        ...(instructions.trim() ? { specialInstructions: instructions.trim() } : {}),
        ...(phone.trim() ? { guestPhone: phone.trim() } : {}),
      });
      clearCart();
      navigate("/status");
    } catch (err) {
      setError(err.message);
    }
  }

  if (cart.length === 0) {
    return (
      <Layout title="Cart" showNav activeNav="Cart">
        <div className="flex flex-col items-center gap-3 px-8 py-20 text-center">
          <ShoppingBag className="h-10 w-10 text-brand-orange" />
          <p className="font-bold">Your cart is empty</p>
          <p className="text-sm text-muted-foreground">Add a few dishes from the menu to get started.</p>
          <button
            type="button"
            onClick={() => navigate("/menu")}
            className="mt-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white"
          >
            Browse menu
          </button>
        </div>
      </Layout>
    );
  }

  const canOrder = !!session.restaurantId && !!session.tableId;

  const footer = (
    <button
      type="button"
      onClick={placeOrder}
      disabled={placing || !canOrder}
      className="flex w-full items-center justify-between rounded-xl bg-brand-gradient px-4 py-3.5 text-white transition hover:brightness-105 disabled:opacity-50"
    >
      <span className="text-sm font-semibold">{placing ? "Placing order…" : "Place order"}</span>
      <span className="text-base font-bold">{formatPrice(cartTotal)}</span>
    </button>
  );

  return (
    <Layout title="Cart" showNav activeNav="Cart" footer={footer}>
      <div className="space-y-4 px-4 py-4">
        {error ? <p className="rounded-lg bg-[#FCE9E4] px-3 py-2 text-sm text-brand-maroon">{error}</p> : null}

        <div className="space-y-2">
          {cart.map((line) => (
            <div key={line.menuItemId} className="flex items-center gap-3 rounded-2xl border border-brand-cream/70 bg-white p-3">
              <FoodThumb src={line.image} alt={line.name} className="h-14 w-14 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <VegDot type={line.foodType} />
                  <p className="truncate text-sm font-bold">{line.name}</p>
                </div>
                <p className="text-sm text-brand-red">{formatPrice(line.price)}</p>
                {line.specialInstructions ? (
                  <p className="truncate text-[11px] text-muted-foreground">"{line.specialInstructions}"</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(line.menuItemId, line.quantity - 1)}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-brand-cream/40"
                  aria-label="Decrease"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-bold">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(line.menuItemId, line.quantity + 1)}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-brand-cream/40"
                  aria-label="Increase"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeFromCart(line.menuItemId)}
                  className="grid h-7 w-7 place-items-center rounded-lg text-brand-maroon"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Optional contact — never gates ordering, purely so the restaurant can reach
            the table if something's wrong with the order. */}
        <section className="rounded-2xl border border-brand-cream/70 bg-white p-4">
          <label className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <Phone className="h-3.5 w-3.5" /> Phone number (optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="For the restaurant to reach you, if needed"
            className="w-full rounded-xl border border-brand-cream bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-orange"
          />
        </section>

        <section className="rounded-2xl border border-brand-cream/70 bg-white p-4">
          <label className="mb-2 block text-sm font-bold">Order note</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Anything the kitchen should know?"
            rows={2}
            className="w-full resize-none rounded-xl border border-brand-cream bg-white px-3 py-2 text-sm outline-none focus:border-brand-orange"
          />
        </section>

        <section className="rounded-2xl border border-brand-cream/70 bg-white p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Item subtotal</span>
            <span className="font-semibold">{formatPrice(cartTotal)}</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Taxes and any applicable discounts are calculated by the restaurant and shown on
            your final bill — ask your waiter or tap "Request bill" from Help when you're ready
            to pay.
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Your order goes to the restaurant first — you&apos;ll see it on the order screen the
            moment they accept it.
          </p>
        </section>
      </div>
    </Layout>
  );
}

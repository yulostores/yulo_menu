// Status screen — polls the table's open session (not a single order id), since a guest
// can place more than one order in a visit and each is a separate "batch" against the
// same TableSession (see guestOrder.service.js). Pattern ported from yulo_restaurant's
// OrderStatus.jsx (15s poll), adapted to show every batch + a running total.

import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChefHat, Clock, XCircle } from "lucide-react";

import { useGuestSession } from "@/hooks/useOrder";
import { useTableSession } from "@/context/TableSessionContext";
import Layout, { formatPrice } from "@/components/Layout";

const STATUS_LABEL = {
  placed: "Order placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready to serve",
  cancelled: "Cancelled",
};

function StatusIcon({ status }) {
  if (status === "cancelled") return <XCircle className="h-4 w-4 text-brand-maroon" />;
  if (status === "ready") return <CheckCircle2 className="h-4 w-4 text-brand-green" />;
  if (status === "preparing" || status === "confirmed") return <ChefHat className="h-4 w-4 text-brand-orange" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

export default function OrderStatus() {
  const navigate = useNavigate();
  const { session } = useTableSession();

  const { data: tableSession, isLoading, isError, error } = useGuestSession(
    session.restaurantId,
    session.tableId,
    { pollInterval: 15_000 },
  );

  const orders = tableSession?.orders ?? [];
  const anyActive = orders.some((o) => !["cancelled"].includes(o.status));
  const runningTotal = orders.reduce((sum, o) => sum + (o.subtotal ?? 0), 0);

  return (
    <Layout title="Your order" showNav activeNav="Menu">
      <div className="space-y-4 px-4 py-4">
        {isError ? (
          <p className="py-10 text-center text-sm text-brand-maroon">
            Couldn&apos;t load your order: {error.message}
          </p>
        ) : isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <Clock className="h-10 w-10 text-brand-orange" />
            <p className="font-bold">No order placed yet</p>
            <p className="text-sm text-muted-foreground">Add some dishes and place your first order.</p>
            <button
              type="button"
              onClick={() => navigate("/menu")}
              className="mt-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white"
            >
              Browse menu
            </button>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-brand-cream/70 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Running total this visit</p>
                <span className="text-lg font-bold text-brand-red">{formatPrice(runningTotal)}</span>
              </div>
              {anyActive ? (
                <p className="mt-2 text-xs text-muted-foreground">This page refreshes automatically every 15 seconds.</p>
              ) : null}
            </section>

            <div className="space-y-3">
              {orders
                .slice()
                .sort((a, b) => (a.batchNumber ?? 0) - (b.batchNumber ?? 0))
                .map((order) => (
                  <section key={order._id} className="rounded-2xl border border-brand-cream/70 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-bold">
                        <StatusIcon status={order.status} />
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      <span className="text-sm font-bold text-brand-red">{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {(order.items ?? []).map((item, i) => (
                        <div key={item.menuItemId ?? i} className="flex justify-between text-sm text-muted-foreground">
                          <span className="min-w-0 truncate">{item.quantity} × {item.name}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
            </div>

            <button
              type="button"
              onClick={() => navigate("/menu")}
              className="w-full rounded-xl border border-brand-cream bg-white py-3 text-sm font-bold text-brand-orange"
            >
              Order more
            </button>
          </>
        )}
      </div>
    </Layout>
  );
}

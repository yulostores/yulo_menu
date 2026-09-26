// Status screen — polls the table's open session (not a single order id), since a guest
// can place more than one order in a visit and each is a separate "batch" against the
// same TableSession (see guestOrder.service.js). Pattern ported from yulo_restaurant's
// OrderStatus.jsx, adapted to show every batch + a running total.
//
// Each round goes to the restaurant first and only reaches the kitchen once they accept it
// (see src/lib/orderStatus.js). A waiting round shows how long the restaurant has left to
// answer; a rejected or timed-out one shows why, and neither is counted in the total.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChefHat, Clock, Hourglass, XCircle } from "lucide-react";

import { useGuestSession } from "@/hooks/useOrder";
import { useTableSession } from "@/context/TableSessionContext";
import Layout, { formatPrice } from "@/components/Layout";
import { AWAITING_APPROVAL, cancellationMessage, formatCountdown, statusLabel } from "@/lib/orderStatus";

const WAITING_POLL_MS = 8_000;
const IDLE_POLL_MS = 15_000;

function StatusIcon({ status }) {
  if (status === "cancelled") return <XCircle className="h-4 w-4 text-brand-maroon" />;
  if (status === AWAITING_APPROVAL) return <Hourglass className="h-4 w-4 text-brand-orange" />;
  if (status === "ready" || status === "served" || status === "delivered") {
    return <CheckCircle2 className="h-4 w-4 text-brand-green" />;
  }
  if (status === "preparing" || status === "confirmed") return <ChefHat className="h-4 w-4 text-brand-orange" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

// Seconds until `deadlineMs` (a time on this device's clock), ticking once a second.
function useSecondsUntil(deadlineMs) {
  const compute = () => (deadlineMs == null ? null : Math.max(0, Math.round((deadlineMs - Date.now()) / 1000)));
  const [left, setLeft] = useState(compute);
  useEffect(() => {
    setLeft(compute());
    if (deadlineMs == null) return undefined;
    const timer = setInterval(() => setLeft(compute()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs]);
  return left;
}

function AwaitingNote({ deadlineMs }) {
  const secondsLeft = useSecondsUntil(deadlineMs);
  return (
    <div className="mt-3 rounded-xl bg-[#FFF4E5] px-3 py-2 text-xs text-[#8A4B00]">
      <p className="font-semibold">Sent to the restaurant — waiting for them to accept.</p>
      {secondsLeft == null ? null : secondsLeft > 0 ? (
        <p className="mt-0.5">
          If they don&apos;t respond in {formatCountdown(secondsLeft)}, this round will be cancelled.
        </p>
      ) : (
        // The server's sweep runs once a minute and the restaurant can still accept until
        // then, so this doesn't claim the round is already cancelled.
        <p className="mt-0.5">The restaurant hasn&apos;t responded yet. If they don&apos;t soon, this round will be cancelled.</p>
      )}
    </div>
  );
}

export default function OrderStatus() {
  const navigate = useNavigate();
  const { session } = useTableSession();

  const { data: tableSession, dataUpdatedAt, isLoading, isError, error } = useGuestSession(
    session.restaurantId,
    session.tableId,
    {
      pollInterval: (data) =>
        (data?.orders ?? []).some((o) => o?.status === AWAITING_APPROVAL) ? WAITING_POLL_MS : IDLE_POLL_MS,
    },
  );

  const orders = (tableSession?.orders ?? []).filter(Boolean);
  const anyActive = orders.some((o) => o.status !== "cancelled");
  // Cancelled rounds are off the bill; waiting ones aren't on it until accepted.
  const runningTotal = orders
    .filter((o) => o.status !== "cancelled" && o.status !== AWAITING_APPROVAL)
    .reduce((sum, o) => sum + (o.subtotal ?? 0), 0);
  const awaitingTotal = orders
    .filter((o) => o.status === AWAITING_APPROVAL)
    .reduce((sum, o) => sum + (o.subtotal ?? 0), 0);

  // approvalSecondsLeft is measured on the server's clock at fetch time; anchoring it to
  // when this device received the data keeps the countdown right on a phone set to the
  // wrong time.
  const deadlineOf = (order) =>
    typeof order.approvalSecondsLeft === "number" && dataUpdatedAt
      ? dataUpdatedAt + order.approvalSecondsLeft * 1000
      : null;

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
              {awaitingTotal > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  + {formatPrice(awaitingTotal)} waiting for the restaurant to accept
                </p>
              ) : null}
              {anyActive ? (
                <p className="mt-2 text-xs text-muted-foreground">This page updates automatically.</p>
              ) : null}
            </section>

            <div className="space-y-3">
              {orders
                .slice()
                .sort((a, b) => (a.batchNumber ?? 0) - (b.batchNumber ?? 0))
                .map((order) => {
                  const cancelled = order.status === "cancelled";
                  return (
                    <section key={order._id} className="rounded-2xl border border-brand-cream/70 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-bold">
                          <StatusIcon status={order.status} />
                          {statusLabel(order.status)}
                        </span>
                        <span
                          className={`text-sm font-bold ${cancelled ? "text-muted-foreground line-through" : "text-brand-red"}`}
                        >
                          {formatPrice(order.subtotal)}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {(order.items ?? []).map((item, i) => (
                          <div key={item.menuItemId ?? i} className="flex justify-between text-sm text-muted-foreground">
                            <span className="min-w-0 truncate">{item.quantity} × {item.name}</span>
                          </div>
                        ))}
                      </div>
                      {order.status === AWAITING_APPROVAL ? <AwaitingNote deadlineMs={deadlineOf(order)} /> : null}
                      {cancelled ? (
                        <p className="mt-3 rounded-xl bg-[#FCE9E4] px-3 py-2 text-xs text-brand-maroon">
                          {cancellationMessage(order)} You won&apos;t be charged for it.
                        </p>
                      ) : null}
                    </section>
                  );
                })}
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

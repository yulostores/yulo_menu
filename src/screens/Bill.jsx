// Guest-initiated online payment for the table's running bill — a self-serve
// counterpart to "Request the bill" in Help.jsx, which stays waiter-mediated (cash/card
// machine) for guests who'd rather just ask a human. Settlement itself reuses the exact
// billing.service.js primitives the staff-side bill screen already calls
// (assembleBill/markPaid), via the new public bill.controller.js endpoints.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Receipt } from "lucide-react";

import { useTableSession } from "@/context/TableSessionContext";
import { useBill, usePayBill, usePayBillSimulate, useVerifyBillPayment, useCancelBillPayment } from "@/hooks/useBill";
import { openRazorpayCheckout, RazorpayCancelledError } from "@/lib/razorpay";
import Layout, { formatPrice } from "@/components/Layout";
import { AWAITING_APPROVAL } from "@/lib/orderStatus";

// Mirrors yulo_backend billing.service.js: the bill can only be settled once every round
// that is still on it has reached the table. Checked here too so the guest is told why up
// front instead of tapping Pay into an error.
const SERVED_STATUSES = new Set(["served", "delivered"]);

// The backend's ORDERS_PENDING message is written for staff ("accept or reject them before
// generating the bill"); a guest gets their own wording.
function guestPayError(err) {
  if (err?.code === "ORDERS_PENDING") {
    return err.details?.awaitingApprovalCount > 0
      ? "A round is still waiting for the restaurant to accept it. You can pay once they've answered."
      : "Some of your food hasn't reached the table yet. You can pay once everything has been served.";
  }
  return err?.message ?? "Couldn't process your payment. Please try again.";
}

export default function Bill() {
  const navigate = useNavigate();
  const { session, clearCart } = useTableSession();
  const [error, setError] = useState("");
  // True when `error` is the server refusing payment because a round is still pending — an
  // error that stops being true on its own once that round is accepted and served.
  const [pendingError, setPendingError] = useState(false);
  const [paying, setPaying] = useState(false);

  // Polls while a payment might be in flight so bill.status flips to "paid" here even if
  // this device's own verify call never lands (a webhook can settle it independently).
  const { data: bill, isLoading, isError, error: loadError } = useBill(
    session.restaurantId,
    session.tableId,
    { pollInterval: 10_000 },
  );

  const payBill = usePayBill(session.restaurantId, session.tableId);
  const payBillSimulate = usePayBillSimulate(session.restaurantId, session.tableId);
  const verifyPayment = useVerifyBillPayment(session.restaurantId, session.tableId);
  const cancelPayment = useCancelBillPayment(session.restaurantId, session.tableId);

  const batches = bill?.batches ?? [];
  const awaitingCount = batches.filter((b) => b.status === AWAITING_APPROVAL).length;
  const cookingCount = batches.filter(
    (b) => b.status && b.status !== "cancelled" && b.status !== AWAITING_APPROVAL && !SERVED_STATUSES.has(b.status),
  ).length;
  const allCancelled = batches.length > 0 && batches.every((b) => b.status === "cancelled");
  const nothingToPay = Boolean(bill) && !(bill.grandTotal > 0) && awaitingCount === 0 && cookingCount === 0;
  const payBlockedReason =
    awaitingCount > 0
      ? `${awaitingCount === 1 ? "A round is" : `${awaitingCount} rounds are`} still waiting for the restaurant to accept. You can pay once they've answered.`
      : cookingCount > 0
        ? "Some of your food hasn't reached the table yet. You can pay once everything has been served."
        : null;

  // The bill is polled; once nothing is pending any more, a "can't pay yet" error from an
  // earlier attempt is simply out of date — drop it rather than leave it contradicting the
  // enabled Pay button.
  useEffect(() => {
    if (pendingError && !payBlockedReason) {
      setError("");
      setPendingError(false);
    }
  }, [pendingError, payBlockedReason]);

  const isBusy =
    paying || payBill.isPending || payBillSimulate.isPending || verifyPayment.isPending;

  async function payOnline() {
    if (isBusy) return;
    setError("");
    setPendingError(false);
    setPaying(true);
    try {
      const { razorpayOrder } = await payBill.mutateAsync();

      if (!razorpayOrder) {
        // Dev/local fallback for when the server has no Razorpay key configured.
        await payBillSimulate.mutateAsync();
        clearCart();
        return;
      }

      const signature = await openRazorpayCheckout(razorpayOrder, {
        name: "Yulo Stores",
        description: `Table bill · ${session.tableId}`,
      });
      await verifyPayment.mutateAsync(signature);
      clearCart();
    } catch (err) {
      if (err instanceof RazorpayCancelledError) {
        await cancelPayment.mutateAsync().catch(() => {});
        setError("Payment not completed — you can try again whenever you're ready.");
      } else {
        await cancelPayment.mutateAsync().catch(() => {});
        setError(guestPayError(err));
        setPendingError(err?.code === "ORDERS_PENDING");
      }
    } finally {
      setPaying(false);
    }
  }

  if (!session.restaurantId || !session.tableId) {
    return (
      <Layout title="Bill" showNav activeNav="Bill">
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          Scan a table QR code first.
        </p>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout title="Bill" showNav activeNav="Bill">
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading…</p>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout title="Bill" showNav activeNav="Bill">
        <p className="px-5 py-10 text-center text-sm text-brand-maroon">{loadError.message}</p>
      </Layout>
    );
  }

  if (!bill) {
    return (
      <Layout title="Bill" showNav activeNav="Bill">
        <div className="flex flex-col items-center gap-3 px-8 py-20 text-center">
          <Receipt className="h-10 w-10 text-brand-orange" />
          <p className="font-bold">Nothing to pay yet</p>
          <p className="text-sm text-muted-foreground">
            Place an order first — your bill will show up here.
          </p>
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

  if (bill.status === "paid") {
    return (
      <Layout title="Bill" showNav activeNav="Bill">
        <div className="flex flex-col items-center gap-3 px-8 py-20 text-center">
          <CheckCircle2 className="h-10 w-10 text-brand-green" />
          <p className="font-bold">Bill settled — thanks for visiting!</p>
          <p className="text-sm text-muted-foreground">{formatPrice(bill.grandTotal)} paid.</p>
        </div>
      </Layout>
    );
  }

  // A pending-round error and the live notice say the same thing; show only the live one.
  const shownError = pendingError && payBlockedReason ? "" : error;

  const footer = nothingToPay ? null : (
    <button
      type="button"
      onClick={payOnline}
      disabled={isBusy || Boolean(payBlockedReason)}
      className="flex w-full items-center justify-between rounded-xl bg-brand-gradient px-4 py-3.5 text-white transition hover:brightness-105 disabled:opacity-50"
    >
      <span className="text-sm font-semibold">{isBusy ? "Processing…" : "Pay online"}</span>
      <span className="text-base font-bold">{formatPrice(bill.grandTotal)}</span>
    </button>
  );

  return (
    <Layout title="Bill" showNav activeNav="Bill" footer={footer}>
      <div className="space-y-4 px-4 py-4">
        {shownError ? <p className="rounded-lg bg-[#FCE9E4] px-3 py-2 text-sm text-brand-maroon">{shownError}</p> : null}
        {!shownError && payBlockedReason ? (
          <p className="rounded-lg bg-[#FFF4E5] px-3 py-2 text-sm text-[#8A4B00]">{payBlockedReason}</p>
        ) : null}
        {nothingToPay ? (
          <p className="rounded-lg bg-brand-cream/40 px-3 py-2 text-sm text-muted-foreground">
            {allCancelled ? "Nothing to pay — every round on this bill was cancelled." : "Nothing to pay on this bill."}
          </p>
        ) : null}

        <section className="rounded-2xl border border-brand-cream/70 bg-white p-4">
          {batches.map((batch) => {
            // Neither is charged: a cancelled round is off the bill, and a waiting one isn't
            // on it until the restaurant accepts. The totals below already leave both out.
            const cancelled = batch.status === "cancelled";
            const awaiting = batch.status === AWAITING_APPROVAL;
            const uncharged = cancelled || awaiting;
            return (
              <div key={batch.orderId} className="mb-3 last:mb-0">
                <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Round {batch.batchNumber ?? batch.round ?? ""}
                  {cancelled ? (
                    <span className="rounded bg-[#FCE9E4] px-1.5 py-0.5 normal-case tracking-normal text-brand-maroon">
                      Cancelled · not charged
                    </span>
                  ) : awaiting ? (
                    <span className="rounded bg-[#FFF4E5] px-1.5 py-0.5 normal-case tracking-normal text-[#8A4B00]">
                      Waiting for the restaurant · not charged yet
                    </span>
                  ) : null}
                </p>
                {(batch.items ?? []).map((item, i) => (
                  <div key={i} className="flex justify-between py-0.5 text-sm">
                    <span className="text-muted-foreground">
                      {item.quantity} × {item.name}
                    </span>
                    <span className={uncharged ? "text-muted-foreground line-through" : "font-medium"}>
                      {formatPrice(item.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </section>

        <section className="space-y-1.5 rounded-2xl border border-brand-cream/70 bg-white p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(bill.subtotal)}</span>
          </div>
          {bill.gstAmount ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST ({bill.gstPercent}%)</span>
              <span>{formatPrice(bill.gstAmount)}</span>
            </div>
          ) : null}
          {bill.serviceChargeAmount ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service charge ({bill.serviceChargePercent}%)</span>
              <span>{formatPrice(bill.serviceChargeAmount)}</span>
            </div>
          ) : null}
          {bill.discountsApplied?.map((d) => (
            <div key={d.discountId} className="flex justify-between text-brand-green">
              <span>{d.description || d.code}</span>
              <span>-{formatPrice(d.amount)}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-dashed border-brand-cream pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatPrice(bill.grandTotal)}</span>
          </div>
        </section>

        <p className="px-2 text-center text-[11px] text-muted-foreground">
          Prefer to pay in person? Ask your waiter — "Request the bill" is under Help.
        </p>
      </div>
    </Layout>
  );
}

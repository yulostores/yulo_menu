// Guest-initiated online payment for the table's running bill — a self-serve
// counterpart to "Request the bill" in Help.jsx, which stays waiter-mediated (cash/card
// machine) for guests who'd rather just ask a human. Settlement itself reuses the exact
// billing.service.js primitives the staff-side bill screen already calls
// (assembleBill/markPaid), via the new public bill.controller.js endpoints.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Receipt } from "lucide-react";

import { useTableSession } from "@/context/TableSessionContext";
import { useBill, usePayBill, usePayBillSimulate, useVerifyBillPayment, useCancelBillPayment } from "@/hooks/useBill";
import { openRazorpayCheckout, RazorpayCancelledError } from "@/lib/razorpay";
import Layout, { formatPrice } from "@/components/Layout";

export default function Bill() {
  const navigate = useNavigate();
  const { session, clearCart } = useTableSession();
  const [error, setError] = useState("");
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

  const isBusy =
    paying || payBill.isPending || payBillSimulate.isPending || verifyPayment.isPending;

  async function payOnline() {
    if (isBusy) return;
    setError("");
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
        setError(err.message ?? "Couldn't process your payment. Please try again.");
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

  const footer = (
    <button
      type="button"
      onClick={payOnline}
      disabled={isBusy}
      className="flex w-full items-center justify-between rounded-xl bg-brand-gradient px-4 py-3.5 text-white transition hover:brightness-105 disabled:opacity-50"
    >
      <span className="text-sm font-semibold">{isBusy ? "Processing…" : "Pay online"}</span>
      <span className="text-base font-bold">{formatPrice(bill.grandTotal)}</span>
    </button>
  );

  return (
    <Layout title="Bill" showNav activeNav="Bill" footer={footer}>
      <div className="space-y-4 px-4 py-4">
        {error ? <p className="rounded-lg bg-[#FCE9E4] px-3 py-2 text-sm text-brand-maroon">{error}</p> : null}

        <section className="rounded-2xl border border-brand-cream/70 bg-white p-4">
          {bill.batches.map((batch) => (
            <div key={batch.orderId} className="mb-3 last:mb-0">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Round {batch.batchNumber}
              </p>
              {batch.items.map((item, i) => (
                <div key={i} className="flex justify-between py-0.5 text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity} × {item.name}
                  </span>
                  <span className="font-medium">{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          ))}
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

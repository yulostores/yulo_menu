// Guest-initiated online payment for the table's running bill — a self-serve
// counterpart to "Request the bill" in Help.jsx, which stays waiter-mediated (cash/card
// machine) for guests who'd rather just ask a human. Settlement itself reuses the exact
// billing.service.js primitives the staff-side bill screen already calls
// (assembleBill/markPaid), via the public bill endpoints.
//
// Money rules this screen keeps:
//   - Every figure is the server's. The bill renders chargeBreakdown.lines (food, GST,
//     service charge, platform fee, round-off) and its grandTotal — nothing is added up here.
//   - A payment that may have gone through is never cancelled. After a dismissed sheet, a
//     failed verify or a lost connection the screen asks the server where the payment
//     stands ("Confirming payment…") before it offers anything else; the backend's webhook
//     settles a bill whose verify call never arrived.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Receipt, Store } from "lucide-react";

import { useTableSession } from "@/context/TableSessionContext";
import {
  fetchBillPaymentStatus,
  useAppConfig,
  useBill,
  useCancelBillPayment,
  usePayBill,
  usePayBillSimulate,
  useVerifyBillPayment,
} from "@/hooks/useBill";
import { menuKeys } from "@/hooks/useMenu";
import { useCreateRequest } from "@/hooks/useOrder";
import { openRazorpayCheckout, RazorpayCancelledError } from "@/lib/razorpay";
import Layout, { formatPrice } from "@/components/Layout";
import { AWAITING_APPROVAL } from "@/lib/orderStatus";

// Mirrors yulo_backend billing.service.js: the bill can only be settled once every round
// that is still on it has reached the table. Checked here too so the guest is told why up
// front instead of tapping Pay into an error.
const SERVED_STATUSES = new Set(["served", "delivered"]);

// How hard to look for a payment's outcome. A dismissed sheet gets a short look (the guest
// most likely just closed it); anything that may have gone through gets a longer one.
const QUICK_CHECK = { attempts: 2, intervalMs: 2_000 };
const FULL_CHECK = { attempts: 8, intervalMs: 3_000 };

// The Razorpay order this device is paying, kept across a reload so a guest who refreshes
// mid-payment can still be told whether it went through.
const payingKey = (tableId) => `yulo_menu_paying_${tableId}`;
function rememberPaying(tableId, razorpayOrderId) {
  try {
    if (razorpayOrderId) window.sessionStorage.setItem(payingKey(tableId), razorpayOrderId);
    else window.sessionStorage.removeItem(payingKey(tableId));
  } catch {
    // Storage blocked (private mode) — the in-memory ref still covers this visit.
  }
}
function recallPaying(tableId) {
  try {
    return window.sessionStorage.getItem(payingKey(tableId));
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Bill lines carry paise; shown to the paisa (₹10.17), unlike menu prices.
function formatPaise(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);
}

// The backend's ORDERS_PENDING message is written for staff ("accept or reject them before
// generating the bill"); a guest gets their own wording.
function guestPayError(err) {
  if (err?.code === "ORDERS_PENDING") {
    return err.details?.awaitingApprovalCount > 0
      ? "A round is still waiting for the restaurant to accept it. You can pay once they've answered."
      : "Some of your food hasn't reached the table yet. You can pay once everything has been served.";
  }
  if (err?.code === "PAYMENT_GATEWAY_UNAVAILABLE") {
    return "Online payment isn't available right now — please pay at the counter.";
  }
  return err?.message ?? "Couldn't process your payment. Please try again.";
}

// What a refused / refunded payment's refund looks like to the guest, from the status read.
function refundNote(status) {
  const refund = status?.refund;
  if (!refund || refund.status === "none") return "";
  return refund.timeline
    ? ` ${refund.timeline}`
    : " If money left your account, it will be refunded automatically.";
}

export default function Bill() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session, clearCart } = useTableSession();
  const { restaurantId, tableId } = session;

  // idle | starting | checkout | confirming | unconfirmed | paid
  const [phase, setPhase] = useState("idle");
  const [notice, setNotice] = useState(null); // { tone: "error" | "warn" | "info", text }
  // True when `notice` is the server refusing payment because a round is still pending — a
  // notice that stops being true on its own once that round is accepted and served.
  const [pendingError, setPendingError] = useState(false);
  const [settled, setSettled] = useState(null); // { amount } once this sitting is paid
  const [counterOpen, setCounterOpen] = useState(false);
  const [waiterAsked, setWaiterAsked] = useState(false);
  const payingRef = useRef(null);

  // Polled while a payment might be in flight so a bill settled by the webhook is noticed
  // here even if this device's own verify call never lands. Stops once settled.
  const { data: bill, isLoading, isError, error: loadError } = useBill(restaurantId, tableId, {
    pollInterval: phase === "paid" ? 0 : 10_000,
  });
  const { data: appConfig } = useAppConfig();
  const simulationAllowed = Boolean(appConfig?.payments?.paymentSimulationEnabled);

  const payBill = usePayBill(restaurantId, tableId);
  const payBillSimulate = usePayBillSimulate(restaurantId, tableId);
  const verifyPayment = useVerifyBillPayment(restaurantId, tableId);
  const cancelPayment = useCancelBillPayment(restaurantId, tableId);
  const askWaiter = useCreateRequest(restaurantId);

  const batches = bill?.batches ?? [];
  const awaitingCount = batches.filter((b) => b.status === AWAITING_APPROVAL).length;
  const cookingCount = batches.filter(
    (b) => b.status && b.status !== "cancelled" && b.status !== AWAITING_APPROVAL && !SERVED_STATUSES.has(b.status),
  ).length;
  const allCancelled = batches.length > 0 && batches.every((b) => b.status === "cancelled");
  const breakdown = bill?.chargeBreakdown ?? null;
  const totalRupees = breakdown ? breakdown.grandTotal / 100 : bill?.grandTotal ?? 0;
  const nothingToPay = Boolean(bill) && !(totalRupees > 0) && awaitingCount === 0 && cookingCount === 0;
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
      setNotice(null);
      setPendingError(false);
    }
  }, [pendingError, payBlockedReason]);

  // No bill any more (the sitting closed) — was it just paid? A guest who reloads after
  // paying, or whose verify call was lost while the webhook settled it, lands here.
  useEffect(() => {
    if (bill !== null || settled || !restaurantId || !tableId) return undefined;
    let stale = false;
    fetchBillPaymentStatus(restaurantId, tableId, payingRef.current ?? recallPaying(tableId))
      .then((status) => {
        if (!stale && status?.paid) markSettled(status.amount);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill, settled, restaurantId, tableId]);

  function markSettled(amount) {
    rememberPaying(tableId, null);
    payingRef.current = null;
    setSettled({ amount });
    setPhase("paid");
    setNotice(null);
    clearCart();
    qc.invalidateQueries({ queryKey: menuKeys.session(restaurantId, tableId) });
  }

  // Asks the server where `razorpayOrderId`'s payment stands, a few times. Returns the last
  // status read; settles the screen as soon as it says paid.
  async function confirmPayment(razorpayOrderId, { attempts, intervalMs }) {
    let last = null;
    for (let i = 0; i < attempts; i += 1) {
      if (i > 0) await sleep(intervalMs);
      try {
        last = await fetchBillPaymentStatus(restaurantId, tableId, razorpayOrderId);
      } catch {
        continue; // a blip — the next attempt asks again
      }
      if (last?.paid) {
        markSettled(last.amount);
        return last;
      }
    }
    return last;
  }

  // The guest closed the sheet. Unless it turns out they did pay, release the bill so the
  // table can order or pay another way — but the server refuses that while a payment is
  // authorized or captured (409 PAYMENT_IN_PROGRESS), and then we keep confirming instead.
  async function afterDismiss(razorpayOrderId, failureReason) {
    setPhase("confirming");
    const status = await confirmPayment(razorpayOrderId, QUICK_CHECK);
    if (status?.paid) return;
    try {
      await cancelPayment.mutateAsync();
    } catch (err) {
      if (err?.code === "PAYMENT_IN_PROGRESS") {
        const later = await confirmPayment(razorpayOrderId, FULL_CHECK);
        if (later?.paid) return;
        setPhase("unconfirmed");
        setNotice({
          tone: "warn",
          text: "Your payment is still being confirmed. Please don't pay again — this page will update once it's through.",
        });
        return;
      }
      // Couldn't release (connection) — nothing was paid, so a retry is safe.
    }
    rememberPaying(tableId, null);
    setPhase("idle");
    setNotice({
      tone: "info",
      text: failureReason
        ? `The payment didn't go through (${failureReason}). You can try again, or pay at the counter.`
        : "Payment not completed — you can try again whenever you're ready.",
    });
  }

  async function payOnline() {
    if (phase !== "idle" && phase !== "unconfirmed") return;
    setNotice(null);
    setPendingError(false);
    setPhase("starting");

    let started;
    try {
      started = await payBill.mutateAsync();
    } catch (err) {
      if (err?.code === "BILL_ALREADY_PAID") {
        markSettled(totalRupees);
        return;
      }
      if (err?.code === "PAYMENT_ALREADY_RECEIVED") {
        // A payment for this bill already went through and is settling.
        setPhase("confirming");
        const status = await confirmPayment(payingRef.current ?? recallPaying(tableId), FULL_CHECK);
        if (status?.paid) return;
        setPhase("unconfirmed");
        setNotice({ tone: "warn", text: "A payment for this bill is already going through — this page will update in a moment." });
        return;
      }
      setPhase("idle");
      setNotice({ tone: "error", text: guestPayError(err) });
      setPendingError(err?.code === "ORDERS_PENDING");
      return;
    }

    const { razorpayOrder, paymentSimulated } = started;
    if (!razorpayOrder) {
      // Local/dev only: the server is in payment-simulation mode. Never used otherwise.
      if (paymentSimulated && simulationAllowed) {
        try {
          const paidBill = await payBillSimulate.mutateAsync();
          markSettled(paidBill?.charges?.grandTotal ?? totalRupees);
        } catch (err) {
          await cancelPayment.mutateAsync().catch(() => {});
          setPhase("idle");
          setNotice({ tone: "error", text: guestPayError(err) });
        }
        return;
      }
      await cancelPayment.mutateAsync().catch(() => {});
      setPhase("idle");
      setNotice({ tone: "error", text: "Online payment isn't available right now — please pay at the counter." });
      return;
    }

    payingRef.current = razorpayOrder.id;
    rememberPaying(tableId, razorpayOrder.id);
    setPhase("checkout");

    let signature;
    try {
      signature = await openRazorpayCheckout(razorpayOrder, {
        name: "Yulo Stores",
        description: bill?.tableNumber ? `Table ${bill.tableNumber} bill` : "Table bill",
      });
    } catch (err) {
      if (err instanceof RazorpayCancelledError) {
        await afterDismiss(razorpayOrder.id, err.failureReason);
      } else {
        // Razorpay's script didn't load — nothing could have been paid.
        await cancelPayment.mutateAsync().catch(() => {});
        rememberPaying(tableId, null);
        setPhase("idle");
        setNotice({ tone: "error", text: err.message });
      }
      return;
    }

    setPhase("confirming");
    try {
      const paidBill = await verifyPayment.mutateAsync(signature);
      markSettled(paidBill?.charges?.grandTotal ?? totalRupees);
    } catch (err) {
      if (err?.code === "BILL_TOTAL_CHANGED") {
        // The bill was re-priced (a round added or removed) between starting and finishing
        // the payment. That payment is owed back; the guest pays the new total.
        rememberPaying(tableId, null);
        qc.invalidateQueries({ queryKey: menuKeys.bill(restaurantId, tableId) });
        setPhase("idle");
        setNotice({
          tone: "warn",
          text: "The bill changed while you were paying. The payment you just made will be refunded automatically — please pay the new total below.",
        });
        return;
      }
      if (err?.code === "BILL_ALREADY_PAID") {
        rememberPaying(tableId, null);
        setPhase("paid");
        setSettled({ amount: totalRupees });
        setNotice({
          tone: "warn",
          text: "This bill was already settled at the counter, so your online payment will be refunded automatically.",
        });
        clearCart();
        return;
      }
      // Anything else — a refused payment, a lost connection, a gateway hiccup — may still
      // have settled (the webhook does it independently). Ask before saying anything.
      const status = await confirmPayment(razorpayOrder.id, FULL_CHECK);
      if (status?.paid) return;
      if (err?.code === "PAYMENT_VERIFICATION_FAILED") {
        rememberPaying(tableId, null);
        setPhase("idle");
        setNotice({
          tone: "error",
          text: `We couldn't accept that payment.${refundNote(status) || " If money left your account, it will be refunded automatically."} You can try again.`,
        });
        return;
      }
      setPhase("unconfirmed");
      setNotice({
        tone: "warn",
        text: "We couldn't confirm your payment yet. If it went through, this page will update shortly — please don't pay twice.",
      });
    }
  }

  async function checkAgain() {
    setPhase("confirming");
    const status = await confirmPayment(payingRef.current ?? recallPaying(tableId), QUICK_CHECK);
    if (!status?.paid) setPhase("unconfirmed");
  }

  async function callWaiterForBill() {
    try {
      await askWaiter.mutateAsync({ type: "bill", tableId });
      setWaiterAsked(true);
    } catch (err) {
      setNotice({ tone: "error", text: err?.message ?? "Couldn't reach the staff. Please wave to your waiter." });
    }
  }

  if (!restaurantId || !tableId) {
    return (
      <Layout title="Bill" showNav activeNav="Bill">
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          Scan a table QR code first.
        </p>
      </Layout>
    );
  }

  if (phase === "paid" || settled) {
    return (
      <Layout title="Bill" showNav activeNav="Bill">
        <div className="flex flex-col items-center gap-3 px-8 py-20 text-center">
          <CheckCircle2 className="h-10 w-10 text-brand-green" />
          <p className="font-bold">Bill settled — thanks for visiting!</p>
          {settled?.amount ? (
            <p className="text-sm text-muted-foreground">{formatPaise(Math.round(settled.amount * 100))} paid.</p>
          ) : null}
          {notice ? <p className="rounded-lg bg-[#FFF4E5] px-3 py-2 text-sm text-[#8A4B00]">{notice.text}</p> : null}
        </div>
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

  // A pending-round error and the live notice say the same thing; show only the live one.
  const shownNotice = pendingError && payBlockedReason ? null : notice;
  const busy = phase === "starting" || phase === "checkout" || phase === "confirming";
  const lines = (breakdown?.lines ?? []).filter((line) => line.key !== "grand_total");

  const footer = nothingToPay ? null : (
    <div className="space-y-2">
      <button
        type="button"
        onClick={payOnline}
        disabled={busy || Boolean(payBlockedReason)}
        className="flex w-full items-center justify-between rounded-xl bg-brand-gradient px-4 py-3.5 text-white transition hover:brightness-105 disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {phase === "confirming"
            ? "Confirming payment…"
            : phase === "starting" || phase === "checkout"
              ? "Processing…"
              : phase === "unconfirmed"
                ? "Try paying again"
                : "Pay online"}
        </span>
        <span className="text-base font-bold">
          {breakdown ? formatPaise(breakdown.grandTotal) : formatPrice(bill.grandTotal)}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setCounterOpen((open) => !open)}
        disabled={busy}
        className="w-full rounded-xl border border-brand-cream bg-white py-2.5 text-sm font-bold text-[#5a403e] disabled:opacity-50"
      >
        Pay at the counter instead
      </button>
    </div>
  );

  return (
    <Layout title="Bill" showNav activeNav="Bill" footer={footer}>
      <div className="space-y-4 px-4 py-4">
        {phase === "confirming" ? (
          <p className="flex items-center gap-2 rounded-lg bg-brand-cream/40 px-3 py-2 text-sm text-[#5a403e]">
            <Loader2 className="h-4 w-4 animate-spin" /> Confirming payment… please keep this page open.
          </p>
        ) : null}
        {shownNotice ? (
          <div
            className={
              shownNotice.tone === "error"
                ? "rounded-lg bg-[#FCE9E4] px-3 py-2 text-sm text-brand-maroon"
                : shownNotice.tone === "warn"
                  ? "rounded-lg bg-[#FFF4E5] px-3 py-2 text-sm text-[#8A4B00]"
                  : "rounded-lg bg-brand-cream/40 px-3 py-2 text-sm text-[#5a403e]"
            }
          >
            <p>{shownNotice.text}</p>
            {phase === "unconfirmed" ? (
              <button type="button" onClick={checkAgain} className="mt-1.5 text-xs font-bold underline">
                Check again
              </button>
            ) : null}
          </div>
        ) : null}
        {!shownNotice && payBlockedReason ? (
          <p className="rounded-lg bg-[#FFF4E5] px-3 py-2 text-sm text-[#8A4B00]">{payBlockedReason}</p>
        ) : null}
        {nothingToPay ? (
          <p className="rounded-lg bg-brand-cream/40 px-3 py-2 text-sm text-muted-foreground">
            {allCancelled ? "Nothing to pay — every round on this bill was cancelled." : "Nothing to pay on this bill."}
          </p>
        ) : null}

        {counterOpen && !nothingToPay ? (
          <section className="rounded-2xl border border-brand-cream/70 bg-white p-4 text-sm">
            <p className="flex items-center gap-2 font-bold">
              <Store className="h-4 w-4 text-brand-orange" /> Paying at the counter
            </p>
            <p className="mt-1.5 text-muted-foreground">
              Tell your waiter you&apos;d like to pay by cash, UPI or card. They&apos;ll settle the bill
              for {breakdown ? formatPaise(breakdown.grandTotal) : formatPrice(bill.grandTotal)} — nothing
              is charged here.
            </p>
            {waiterAsked ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-green">
                <CheckCircle2 className="h-3.5 w-3.5" /> Your waiter has been told — they&apos;re on the way.
              </p>
            ) : (
              <button
                type="button"
                onClick={callWaiterForBill}
                disabled={askWaiter.isPending}
                className="mt-2.5 rounded-lg border border-brand-cream px-3 py-1.5 text-xs font-bold text-brand-orange disabled:opacity-50"
              >
                {askWaiter.isPending ? "Calling…" : "Call the waiter with the bill"}
              </button>
            )}
          </section>
        ) : null}

        <section className="rounded-2xl border border-brand-cream/70 bg-white p-4">
          {batches.map((batch) => {
            // Neither is charged: a cancelled round is off the bill, and a waiting one isn't
            // on it until the restaurant accepts. The totals below already leave both out.
            const cancelled = batch.status === "cancelled";
            const awaiting = batch.status === AWAITING_APPROVAL;
            const uncharged = cancelled || awaiting;
            return (
              <div key={batch.orderId ?? batch.batchNumber} className="mb-3 last:mb-0">
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
          {breakdown ? (
            // The server's own lines, in its order — food, GST, service charge, platform fee,
            // round-off. Nothing here is computed on the device.
            lines.map((line) => (
              <div key={line.key} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {line.label}
                  {line.sublabel ? <span className="block text-[11px]">{line.sublabel}</span> : null}
                </span>
                <span className={line.amountPaise < 0 ? "text-brand-green" : undefined}>
                  {line.amountPaise < 0 ? `−${formatPaise(-line.amountPaise)}` : formatPaise(line.amountPaise)}
                </span>
              </div>
            ))
          ) : (
            // A bill raised before the pricing engine (no breakdown) — its own rupee summary.
            <>
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
            </>
          )}
          {(bill.discountsApplied ?? []).length > 0 && !breakdown
            ? bill.discountsApplied.map((d, i) => (
                <div key={d.code ?? i} className="flex justify-between text-brand-green">
                  <span>{d.description || d.code}</span>
                  <span>-{formatPrice(d.amount)}</span>
                </div>
              ))
            : null}
          <div className="mt-1 flex justify-between border-t border-dashed border-brand-cream pt-2 text-base font-bold">
            <span>Total</span>
            <span>{breakdown ? formatPaise(breakdown.grandTotal) : formatPrice(bill.grandTotal)}</span>
          </div>
        </section>

        <p className="px-2 text-center text-[11px] text-muted-foreground">
          Prefer to pay in person? Tap &quot;Pay at the counter instead&quot; — or ask your waiter.
        </p>
      </div>
    </Layout>
  );
}

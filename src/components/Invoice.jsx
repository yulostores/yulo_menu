// The guest's invoice once the bill is paid (GET …/bill/invoice): restaurant and tax details,
// every dish, the server's own charge lines, the total and the payment reference.
// "Download / Print" opens it on its own page and calls the browser's print dialog, where
// "Save as PDF" keeps a copy.

import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";

import { menuApi } from "@/api/menu.api";

// Bill lines carry paise; shown to the paisa (₹10.17).
const formatPaise = (paise) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    (Number(paise) || 0) / 100,
  );

const money = (rupees) => formatPaise(Math.round((rupees ?? 0) * 100));
const signedLine = (line) =>
  line.amountPaise < 0
    ? `−${formatPaise(-line.amountPaise)}`
    : line.key === "round_off"
      ? `+${formatPaise(line.amountPaise)}`
      : formatPaise(line.amountPaise);
const when = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function invoiceRows(bill) {
  const lines = (bill.chargeBreakdown?.lines ?? []).filter((l) => l.key !== "grand_total" && l.key !== "item_total" && l.amountPaise);
  const total = bill.chargeBreakdown ? formatPaise(bill.chargeBreakdown.grandTotal) : money(bill.grandTotal);
  return { lines, total };
}

function printInvoice(bill) {
  const r = bill.restaurant ?? {};
  const addr = [r.address?.street, r.address?.city, r.address?.state, r.address?.pincode].filter(Boolean).join(", ");
  const { lines, total } = invoiceRows(bill);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(bill.billNumber)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:420px;margin:24px auto;color:#23180E;font-size:13px}
h1{font-size:18px;margin:0}p{margin:2px 0}table{width:100%;border-collapse:collapse;margin-top:12px}
td{padding:4px 0}td.n{text-align:right}tr.t td{border-top:1px dashed #999;font-weight:700;font-size:15px;padding-top:8px}
.muted{color:#6b5b4b}.hd{border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:8px}</style></head><body>
<div class="hd"><h1>${esc(r.name)}</h1>${addr ? `<p class="muted">${esc(addr)}</p>` : ""}
${r.gstNumber ? `<p class="muted">GSTIN ${esc(r.gstNumber)}</p>` : ""}${r.fssaiNumber ? `<p class="muted">FSSAI ${esc(r.fssaiNumber)}</p>` : ""}</div>
<p><b>Tax invoice ${esc(bill.billNumber)}</b></p><p class="muted">${esc(when(bill.payment?.paidAt ?? bill.paidAt))}${bill.tableNumber ? ` · Table ${esc(bill.tableNumber)}` : ""}</p>
<table>${(bill.items ?? []).map((i) => `<tr><td>${esc(i.quantity)} × ${esc(i.name)}</td><td class="n">${esc(money(i.lineTotal))}</td></tr>`).join("")}
${lines.map((l) => `<tr><td class="muted">${esc(l.label)}${l.sublabel ? ` <small>(${esc(l.sublabel)})</small>` : ""}</td><td class="n">${esc(signedLine(l))}</td></tr>`).join("")}
<tr class="t"><td>Total paid</td><td class="n">${esc(total)}</td></tr></table>
<p class="muted" style="margin-top:10px">Paid ${esc(bill.payment?.method ?? bill.paymentMethod ?? "")}${bill.payment?.transactionId ? ` · Ref ${esc(bill.payment.transactionId)}` : ""}</p>
<script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

export default function Invoice({ restaurantId, tableId, razorpayOrderId }) {
  const { data: bill, isLoading, isError } = useQuery({
    queryKey: ["invoice", restaurantId, tableId, razorpayOrderId ?? null],
    queryFn: () => menuApi.getInvoice(restaurantId, tableId, razorpayOrderId).then((r) => r.data.data.bill),
    enabled: !!restaurantId && !!tableId,
    retry: 2,
    staleTime: Infinity,
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading your invoice…</p>;
  if (isError || !bill) return null;
  const { lines, total } = invoiceRows(bill);
  const r = bill.restaurant ?? {};

  return (
    <section className="w-full max-w-sm rounded-2xl border border-brand-cream/70 bg-white p-4 text-left text-sm" aria-label="Invoice">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 font-bold">
            <FileText className="h-4 w-4 text-brand-orange" /> Invoice {bill.billNumber}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {r.name}
            {r.gstNumber ? ` · GSTIN ${r.gstNumber}` : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">{when(bill.payment?.paidAt ?? bill.paidAt)}</p>
        </div>
        <button
          type="button"
          onClick={() => printInvoice(bill)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-brand-cream px-2.5 py-1.5 text-xs font-bold text-brand-orange"
        >
          <Download className="h-3.5 w-3.5" /> Download / Print
        </button>
      </div>
      <div className="border-t border-brand-cream/70 pt-2">
        {(bill.items ?? []).map((i) => (
          <div key={`${i.name}-${i.unitPrice}`} className="flex justify-between py-0.5">
            <span className="text-muted-foreground">
              {i.quantity} × {i.name}
            </span>
            <span>{money(i.lineTotal)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-1 border-t border-brand-cream/70 pt-2">
        {lines.map((l) => (
          <div key={l.key} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{l.label}</span>
            <span className={l.amountPaise < 0 ? "text-brand-green" : undefined}>{signedLine(l)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-dashed border-brand-cream pt-2 text-base font-bold">
          <span>Total paid</span>
          <span>{total}</span>
        </div>
      </div>
      {bill.payment?.transactionId ? (
        <p className="mt-2 text-[11px] text-muted-foreground">Payment ref {bill.payment.transactionId}</p>
      ) : null}
    </section>
  );
}

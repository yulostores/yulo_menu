// Assistance requests — POST /api/restaurants/:id/requests, already public/no-login
// (see request.controller.js on the backend). "Request bill" just notifies a waiter, who
// settles it in person (cash/card machine) — for paying online without a waiter, see the
// Bill tab (src/screens/Bill.jsx), which reuses the same TableSession -> Bill primitives.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, Droplet, Receipt } from "lucide-react";

import { useCreateRequest } from "@/hooks/useOrder";
import { useTableSession } from "@/context/TableSessionContext";
import Layout from "@/components/Layout";

const OPTIONS = [
  { type: "call_waiter", label: "Call a waiter", icon: Bell },
  { type: "water", label: "Request water", icon: Droplet },
  { type: "bill", label: "Request the bill", icon: Receipt },
];

export default function Help() {
  const navigate = useNavigate();
  const { session } = useTableSession();
  const createRequest = useCreateRequest(session.restaurantId);
  const [sent, setSent] = useState(null);

  async function send(type) {
    if (!session.tableId) return;
    setSent(null);
    try {
      await createRequest.mutateAsync({ type, tableId: session.tableId });
      setSent(type);
    } catch {
      // surfaced via createRequest.isError below
    }
  }

  if (!session.restaurantId || !session.tableId) {
    return (
      <Layout title="Help" showNav activeNav="Help">
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          Scan a table QR code first.
        </p>
      </Layout>
    );
  }

  return (
    <Layout title="Help" showNav activeNav="Help">
      <div className="space-y-3 px-4 py-4">
        {createRequest.isError ? (
          <p className="rounded-lg bg-[#FCE9E4] px-3 py-2 text-sm text-brand-maroon">
            Couldn&apos;t send that — please try again.
          </p>
        ) : null}

        {OPTIONS.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => send(type)}
            disabled={createRequest.isPending}
            className="flex w-full items-center justify-between rounded-2xl border border-brand-cream/70 bg-white p-4 text-left transition hover:border-brand-orange disabled:opacity-60"
          >
            <span className="flex items-center gap-3 text-sm font-bold">
              <Icon className="h-4.5 w-4.5 text-brand-orange" />
              {label}
            </span>
            {sent === type ? <CheckCircle2 className="h-4 w-4 text-brand-green" /> : null}
          </button>
        ))}

        {sent ? (
          <p className="rounded-xl bg-[#E8F5EC] px-3 py-2.5 text-center text-sm font-medium text-brand-green">
            Sent — your waiter has been notified.
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => navigate("/bill")}
          className="w-full text-center text-[12px] font-medium text-brand-orange underline underline-offset-2"
        >
          Or pay your bill online now, without a waiter
        </button>
      </div>
    </Layout>
  );
}

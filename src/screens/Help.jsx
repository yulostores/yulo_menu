// Assistance requests — POST /api/restaurants/:id/requests, already public/no-login
// (see request.controller.js on the backend). "Request bill" is how a guest asks to pay
// and leave — settlement itself stays waiter-mediated (TableSession -> Bill), no payment
// gateway wired into this app for v1.

import { useState } from "react";
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
      </div>
    </Layout>
  );
}

// How a guest's round (one order in the table's session) is described on screen.
//
// Every round a guest places from the table QR goes to the restaurant first: it is created
// 'placed' and waits there until the owner accepts it ('confirmed', then the kitchen takes
// over) or rejects it ('cancelled' with a reason). Nobody answering within the restaurant's
// approval window cancels it automatically. See yulo_backend
// services/orderApproval.service.js.

export const AWAITING_APPROVAL = "placed";

export const STATUS_LABEL = {
  placed: "Waiting for the restaurant",
  confirmed: "Accepted",
  preparing: "Preparing",
  ready: "Ready to serve",
  served: "Served",
  delivered: "Served",
  cancelled: "Cancelled",
};

export function statusLabel(status) {
  return STATUS_LABEL[status] ?? status ?? "Order";
}

// yulo_backend Order.cancelledBy: 'restaurant' | 'kitchen' | 'waiter' | 'customer' |
// 'admin' | 'system' ('system' is the approval timeout, but an admin cancel lands there too
// — so for it the server's own reason is shown).
// Always ends in a full stop, whatever punctuation (or none) the reason was typed with, so
// the screen can append another sentence after it.
export function cancellationMessage(order) {
  const reason = order?.cancellationReason?.trim().replace(/[.!\s]+$/, "") || null;
  switch (order?.cancelledBy) {
    case "restaurant":
    case "kitchen":
    case "waiter": {
      const lead = order.acceptedAt
        ? "The restaurant cancelled this round"
        : "The restaurant couldn't take this round";
      return reason ? `${lead}: ${reason}.` : `${lead}.`;
    }
    case "customer":
      // A signed-in customer who ordered from the QR can cancel a waiting round from the
      // Yulo app.
      return "You cancelled this round.";
    case "system":
      return reason ? `${reason}. This round was cancelled.` : "This round was cancelled.";
    default:
      return reason ? `This round was cancelled: ${reason}.` : "This round was cancelled.";
  }
}

export function formatCountdown(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

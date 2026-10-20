import client from "./client";

// Every endpoint here is public — no auth header, ever. See
// yulo_backend/server/routes/restaurant.routes.js for the full contract.

// One key per cart submission (see screens/Cart.jsx): a retry of the same submission —
// a network blip, a double-tap — reuses it, and the server answers 200 with the order it
// already placed instead of placing it twice.
export function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const menuApi = {
  getRestaurant: (restaurantId) => client.get(`/restaurants/${restaurantId}`),

  // Returns { menu: [{ _id, name, subCategories: [{ _id, name, items }], items }] }
  getMenu: (restaurantId) => client.get(`/restaurants/${restaurantId}/menu`),

  getTable: (restaurantId, tableId) =>
    client.get(`/restaurants/${restaurantId}/tables/${tableId}`),

  // The guest's current open session (if any order has been placed yet this visit).
  getSession: (restaurantId, tableId) =>
    client.get(`/restaurants/${restaurantId}/tables/${tableId}/session`),

  // The guest order endpoint — no login, no tableSessionId to track client-side (the
  // server opens/reuses the session by tableId).
  placeOrder: (restaurantId, tableId, body, idempotencyKey) =>
    client.post(`/restaurants/${restaurantId}/tables/${tableId}/orders`, body, {
      headers: { "Idempotency-Key": idempotencyKey ?? newIdempotencyKey() },
    }),

  // "Call waiter" / "Request bill" — type: "call_waiter" | "water" | "bill" | "other"
  createRequest: (restaurantId, { type, note, tableId }) =>
    client.post(`/restaurants/${restaurantId}/requests`, { type, note, tableId }),

  // The live running bill for the table's open session — recomputed on every call
  // (see billing.service.js's assembleBill), so it's always current with whatever's
  // been ordered so far this visit.
  getBill: (restaurantId, tableId) =>
    client.get(`/restaurants/${restaurantId}/tables/${tableId}/bill`),

  // Starts — or resumes — paying the bill online and locks the sitting against new rounds
  // while payment is in flight (publicBill.controller.js's payBill). Calling it again hands
  // back the SAME Razorpay order while it can still be paid for this amount.
  // → { bill, razorpayOrder | null, reused, paymentSimulated }. razorpayOrder is null only
  // when the server runs in payment-simulation mode (local/dev) — see payBillSimulate.
  payBill: (restaurantId, tableId) =>
    client.post(`/restaurants/${restaurantId}/tables/${tableId}/bill/pay`),

  // Dev/local-only stand-in for a real payment. The route only exists while the server's
  // payment simulation is on (404 otherwise) — never in production.
  payBillSimulate: (restaurantId, tableId) =>
    client.post(`/restaurants/${restaurantId}/tables/${tableId}/bill/pay/simulate`),

  // Where a payment stands, for when verify failed or never answered: a webhook may have
  // settled the bill anyway. Named by the Razorpay order the guest was paying, so it never
  // reports another party's bill. → { bill: { status, paid, sessionStatus, refund, … } | null }
  getBillPaymentStatus: (restaurantId, tableId, razorpayOrderId) =>
    client.get(`/restaurants/${restaurantId}/tables/${tableId}/bill/payment`, {
      params: razorpayOrderId ? { razorpayOrderId } : {},
    }),

  verifyBillPayment: (restaurantId, tableId, signature) =>
    client.post(`/restaurants/${restaurantId}/tables/${tableId}/bill/verify`, signature),

  // The guest backed out of the Razorpay checkout without completing it — reopens the
  // session for ordering/retrying. 409 PAYMENT_IN_PROGRESS while a payment for the bill is
  // authorized or captured: the guest may have paid and only lost the confirmation, so the
  // caller keeps polling getBillPaymentStatus instead.
  cancelBillPayment: (restaurantId, tableId) =>
    client.post(`/restaurants/${restaurantId}/tables/${tableId}/bill/cancel`),

  // Public app switches — payments.paymentSimulationEnabled says whether the simulated
  // stand-in may be used (local/dev only).
  getAppConfig: () => client.get(`/app/config`),
};

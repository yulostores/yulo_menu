import client from "./client";

// Every endpoint here is public — no auth header, ever. See
// yulo_backend/server/routes/restaurant.routes.js for the full contract.

function idempotencyKey() {
  // Guards against a duplicate order on a network retry / double-tap.
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
  placeOrder: (restaurantId, tableId, body) =>
    client.post(`/restaurants/${restaurantId}/tables/${tableId}/orders`, body, {
      headers: { "Idempotency-Key": idempotencyKey() },
    }),

  // "Call waiter" / "Request bill" — type: "call_waiter" | "water" | "bill" | "other"
  createRequest: (restaurantId, { type, note, tableId }) =>
    client.post(`/restaurants/${restaurantId}/requests`, { type, note, tableId }),

  // The live running bill for the table's open session — recomputed on every call
  // (see billing.service.js's assembleBill), so it's always current with whatever's
  // been ordered so far this visit.
  getBill: (restaurantId, tableId) =>
    client.get(`/restaurants/${restaurantId}/tables/${tableId}/bill`),

  // Creates the Razorpay order for the current bill total and locks the session against
  // new orders while payment is in flight (see publicBill.controller.js's payBill).
  // razorpayOrder in the response is null when the server has no gateway key configured
  // — callers fall back to payBillSimulate below.
  payBill: (restaurantId, tableId) =>
    client.post(`/restaurants/${restaurantId}/tables/${tableId}/bill/pay`),

  // Dev/local-only stand-in for when the server has no Razorpay key configured.
  payBillSimulate: (restaurantId, tableId) =>
    client.post(`/restaurants/${restaurantId}/tables/${tableId}/bill/pay/simulate`),

  verifyBillPayment: (restaurantId, tableId, signature) =>
    client.post(`/restaurants/${restaurantId}/tables/${tableId}/bill/verify`, signature),

  // The guest backed out of the Razorpay checkout without completing it — reopens the
  // session for ordering/retrying.
  cancelBillPayment: (restaurantId, tableId) =>
    client.post(`/restaurants/${restaurantId}/tables/${tableId}/bill/cancel`),
};

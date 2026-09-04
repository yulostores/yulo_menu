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
};
